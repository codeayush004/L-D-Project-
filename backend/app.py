import os
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv
from groq import Groq
import pandas as pd
from bson import ObjectId
import json
import io

from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

load_dotenv()

app = Flask(__name__)
CORS(app)

# MongoDB Setup
client = MongoClient(os.getenv('MONGO_URI'))
db = client[os.getenv("DATABASE_NAME", "ld_platform")]
managers_collection = db.managers
interns_collection = db.interns
scores_collection = db.scores
feedback_collection = db.feedback
subjects_collection = db.subjects
batches_collection = db.batches
# Groq Setup
groq_client = Groq(api_key=os.getenv('GROQ_API_KEY'))

@app.route('/', methods=['GET'])
def index():
    return jsonify({"status": "ok", "message": "L&D Platform API is live. Use /api/health for more details."}), 200

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "L&D Backend is running"}), 200

# --- Auth Routes ---

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if managers_collection.find_one({'username': username}):
        return jsonify({"error": "Username already exists"}), 400
    
    hashed_password = generate_password_hash(password)
    manager_id = str(ObjectId())
    managers_collection.insert_one({
        'manager_id': manager_id,
        'username': username,
        'password': hashed_password
    })
    return jsonify({
        "message": "Manager registered", 
        "manager_id": manager_id,
        "username": username
    }), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    manager = managers_collection.find_one({'username': username})
    if not manager or not check_password_hash(manager['password'], password):
        return jsonify({"error": "Invalid credentials"}), 401
    
    return jsonify({
        "message": "Login successful",
        "manager_id": manager['manager_id'],
        "username": manager['username']
    }), 200

# --- Intern Registration ---

@app.route('/api/interns', methods=['POST'])
def create_intern():
    data = request.json
    name = data.get('Name')
    email = data.get('Email')
    emp_id = data.get('EmpID')
    manager_id = data.get('manager_id')
    batch_id = data.get('batch_id')
    
    if not all([name, email, emp_id, manager_id, batch_id]):
        return jsonify({"error": "Missing required fields"}), 400
        
    # Check if exists in this batch
    if interns_collection.find_one({'EmpID': emp_id, 'manager_id': manager_id, 'batch_id': batch_id}):
        return jsonify({"error": "Intern with this EmpID already exists in this batch"}), 400
        
    interns_collection.insert_one({
        'Name': name,
        'Email': email,
        'EmpID': emp_id,
        'manager_id': manager_id,
        'batch_id': batch_id
    })
    return jsonify({"message": "Intern added successfully"}), 201

# --- Batch Management ---

@app.route('/api/batches', methods=['POST'])
def create_batch():
    data = request.json
    name = data.get('name')
    manager_id = data.get('manager_id')
    
    if not name or not manager_id:
        return jsonify({"error": "Missing name or manager_id"}), 400
        
    batch_id = str(ObjectId())
    batches_collection.insert_one({
        'batch_id': batch_id,
        'manager_id': manager_id,
        'name': name
    })
    return jsonify({"message": "Batch created", "batch_id": batch_id, "name": name}), 201

@app.route('/api/batches', methods=['GET'])
def get_batches():
    manager_id = request.args.get('manager_id')
    if not manager_id:
        return jsonify({"error": "Missing manager_id"}), 400
        
    batches = list(batches_collection.find({'manager_id': manager_id}, {'_id': 0}))
    return jsonify(batches), 200

# --- Protected Routes (Filtering by manager_id & batch_id) ---

# 1. Upload Interns (Excel)
@app.route('/api/upload-interns', methods=['POST'])
def upload_interns():
    manager_id = request.form.get('manager_id')
    batch_id = request.form.get('batch_id')
    if not manager_id or not batch_id:
        return jsonify({"error": "Authorization required or batch_id missing"}), 403

    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    
    try:
        df = pd.read_excel(file)
        required_columns = ['Name', 'Email', 'EmpID']
        if not all(col in df.columns for col in required_columns):
            return jsonify({"error": f"Invalid format. Required: {required_columns}"}), 400
        
        interns_data = df[required_columns].to_dict('records')
        for intern in interns_data:
            intern['manager_id'] = manager_id
            intern['batch_id'] = batch_id
            interns_collection.update_one(
                {'EmpID': intern['EmpID'], 'manager_id': manager_id, 'batch_id': batch_id},
                {'$set': intern},
                upsert=True
            )
        return jsonify({"message": "Interns uploaded"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/interns', methods=['GET'])
def get_interns():
    manager_id = request.args.get('manager_id')
    batch_id = request.args.get('batch_id')
    if not manager_id or not batch_id:
        return jsonify({"error": "Authorization required or batch_id missing"}), 403
    try:
        interns = list(interns_collection.find({'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0}))
        return jsonify(interns), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 2. Get/Update Scores
@app.route('/api/scores', methods=['GET'])
def get_scores():
    manager_id = request.args.get('manager_id')
    batch_id = request.args.get('batch_id')
    if not manager_id or not batch_id:
        return jsonify({"error": "Authorization required or batch_id missing"}), 403
    try:
        interns = list(interns_collection.find({'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0}))
        scores = list(scores_collection.find({'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0}))
        
        scores_map = {s['EmpID']: s.get('scores', {}) for s in scores}
        
        combined_data = []
        for intern in interns:
            intern_scores = scores_map.get(intern['EmpID'], {})
            combined_data.append({**intern, **intern_scores})
            
        return jsonify(combined_data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/update-score', methods=['POST'])
def update_score():
    data = request.json
    emp_id = data.get('EmpID')
    subject = data.get('subject') # name
    score = data.get('score')
    total_marks = data.get('total_marks')
    manager_id = data.get('manager_id')
    batch_id = data.get('batch_id')
    
    if not manager_id or not batch_id:
        return jsonify({"error": "Authorization required or batch_id missing"}), 403
    
    try:
        # Update scores per intern
        scores_collection.update_one(
            {'EmpID': emp_id, 'manager_id': manager_id, 'batch_id': batch_id},
            {'$set': {f'scores.{subject}': score}},
            upsert=True
        )
        
        # Track subjects with total_marks
        if total_marks is not None:
            # Upsert specifically for this subject name to update total_marks if it changed
            subjects_collection.update_one(
                {'manager_id': manager_id, 'batch_id': batch_id},
                {'$pull': {'list': {'$in': [{'name': subject}, subject]}}},
                upsert=True
            )
            subjects_collection.update_one(
                {'manager_id': manager_id, 'batch_id': batch_id},
                {'$addToSet': {'list': {'name': subject, 'total_marks': int(total_marks)}}},
                upsert=True
            )
        
        return jsonify({"message": "Score updated"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/subjects', methods=['DELETE'])
def delete_subject():
    data = request.json
    subject = data.get('subject') # name
    manager_id = data.get('manager_id')
    batch_id = data.get('batch_id')
    
    if not all([subject, manager_id, batch_id]):
        return jsonify({"error": "Missing parameters"}), 400
        
    try:
        # 1. Remove from subjects list (Handle both object and potential legacy string)
        subjects_collection.update_one(
            {'manager_id': manager_id, 'batch_id': batch_id},
            {'$pull': {'list': {'$in': [{'name': subject}, subject]}}}
        )
        
        # 2. Cleanup scores for all interns in this batch
        scores_collection.update_many(
            {'manager_id': manager_id, 'batch_id': batch_id},
            {'$unset': {f'scores.{subject}': ""}}
        )
        
        return jsonify({"message": f"Subject {subject} deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/subjects', methods=['PUT'])
def update_subject():
    data = request.json
    old_name = data.get('old_name')
    new_name = data.get('new_name')
    total_marks = data.get('total_marks')
    manager_id = data.get('manager_id')
    batch_id = data.get('batch_id')
    
    if not all([old_name, manager_id, batch_id]):
        return jsonify({"error": "Missing parameters"}), 400
        
    try:
        subjects_doc = subjects_collection.find_one({'manager_id': manager_id, 'batch_id': batch_id})
        if subjects_doc:
            new_list = []
            found = False
            for item in subjects_doc.get('list', []):
                # Handle both object and legacy string
                item_name = item['name'] if isinstance(item, dict) else item
                if item_name == old_name:
                    found = True
                    # Create/Update as object
                    new_item = {
                        'name': new_name if new_name else old_name,
                        'total_marks': int(total_marks) if total_marks is not None else (item.get('total_marks', 100) if isinstance(item, dict) else 100)
                    }
                    new_list.append(new_item)
                else:
                    new_list.append(item)
            
            if found:
                subjects_collection.update_one(
                    {'_id': subjects_doc['_id']},
                    {'$set': {'list': new_list}}
                )
            
                # 2. If name changed, rename score key in scores_collection
                if new_name and new_name != old_name:
                    scores_collection.update_many(
                        {'manager_id': manager_id, 'batch_id': batch_id},
                        {'$rename': {f'scores.{old_name}': f'scores.{new_name}'}}
                    )
        
        return jsonify({"message": "Subject updated"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/subjects', methods=['GET'])
def get_subjects():
    manager_id = request.args.get('manager_id')
    batch_id = request.args.get('batch_id')
    if not manager_id or not batch_id:
        return jsonify({"error": "Authorization required or batch_id missing"}), 403
    try:
        res = subjects_collection.find_one({'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0})
        raw_list = res.get('list', []) if res else []
        
        # Standardize: Ensure all items are objects {name, total_marks}
        standardized_list = []
        for item in raw_list:
            if isinstance(item, dict):
                standardized_list.append(item)
            else:
                standardized_list.append({'name': item, 'total_marks': 100})
                
        return jsonify(standardized_list), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 3. Upload Feedback
@app.route('/api/upload-feedback', methods=['POST'])
def upload_feedback():
    manager_id = request.form.get('manager_id')
    batch_id = request.form.get('batch_id')
    if not manager_id or not batch_id:
        return jsonify({"error": "Authorization required or batch_id missing"}), 403
    
    file = request.files.get('file')
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    try:
        df = pd.read_excel(file)
        if 'EmpID' not in df.columns or 'Feedback' not in df.columns:
            return jsonify({"error": "Excel must have EmpID and Feedback columns"}), 400
            
        for _, row in df.iterrows():
            feedback_collection.insert_one({
                'EmpID': str(row['EmpID']),
                'manager_id': manager_id,
                'batch_id': batch_id,
                'text': row['Feedback'],
                'column': 'General', # Default column
                'date': datetime.now().isoformat()
            })
        return jsonify({"message": "Feedback uploaded successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- Feedback Grid Routes ---

@app.route('/api/feedback-columns', methods=['GET'])
def get_feedback_columns():
    manager_id = request.args.get('manager_id')
    batch_id = request.args.get('batch_id')
    try:
        res = db.feedback_columns.find_one({'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0})
        return jsonify(res.get('list', []) if res else []), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/feedback-columns', methods=['POST'])
def add_feedback_column():
    data = request.json
    name = data.get('name')
    manager_id = data.get('manager_id')
    batch_id = data.get('batch_id')
    try:
        db.feedback_columns.update_one(
            {'manager_id': manager_id, 'batch_id': batch_id},
            {'$addToSet': {'list': name}},
            upsert=True
        )
        return jsonify({"message": "Column added"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/feedback-columns', methods=['DELETE'])
def delete_feedback_column():
    data = request.json
    name = data.get('name')
    manager_id = data.get('manager_id')
    batch_id = data.get('batch_id')
    try:
        db.feedback_columns.update_one(
            {'manager_id': manager_id, 'batch_id': batch_id},
            {'$pull': {'list': name}}
        )
        # Cleanup feedbacks for this column
        feedback_collection.delete_many({'manager_id': manager_id, 'batch_id': batch_id, 'column': name})
        return jsonify({"message": "Column deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/feedback-grid', methods=['GET'])
def get_feedback_grid():
    manager_id = request.args.get('manager_id')
    batch_id = request.args.get('batch_id')
    try:
        interns = list(interns_collection.find({'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0}))
        feedbacks = list(feedback_collection.find({'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0}))
        
        # Structure: {EmpID: {ColumnName: FeedbackText}}
        feedback_map = {}
        for f in feedbacks:
            eid = f['EmpID']
            col = f.get('column', 'General')
            if eid not in feedback_map: feedback_map[eid] = {}
            feedback_map[eid][col] = f['text']
            
        combined = []
        for intern in interns:
            combined.append({**intern, 'feedbacks': feedback_map.get(intern['EmpID'], {})})
            
        return jsonify(combined), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/update-feedback-cell', methods=['POST'])
def update_feedback_cell():
    data = request.json
    emp_id = data.get('EmpID')
    column = data.get('column')
    text = data.get('text')
    manager_id = data.get('manager_id')
    batch_id = data.get('batch_id')
    try:
        feedback_collection.update_one(
            {'EmpID': emp_id, 'manager_id': manager_id, 'batch_id': batch_id, 'column': column},
            {'$set': {'text': text, 'date': datetime.now().isoformat()}},
            upsert=True
        )
        return jsonify({"message": "Feedback updated"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 4. Chatbot
@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    user_query = data.get('query')
    manager_id = data.get('manager_id')
    batch_id = data.get('batch_id')
    
    if not manager_id or not batch_id:
        return jsonify({"error": "Authorization required or batch_id missing"}), 403
    
    try:
        interns = list(interns_collection.find({'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0}))
        scores = list(scores_collection.find({'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0}))
        feedbacks = list(feedback_collection.find({'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0}))
        
        context = f"Batch Data:\nInterns: {json.dumps(interns)}\nScores: {json.dumps(scores)}\nFeedbacks: {json.dumps(feedbacks)}"
        
        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are an L&D assistant. Analyze provided data and answer manager queries."},
                {"role": "user", "content": f"Context: {context}\n\nQuery: {user_query}"}
            ]
        )
        return jsonify({"response": completion.choices[0].message.content}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 5. Reports
@app.route('/api/reports/<emp_id>', methods=['GET'])
def get_report(emp_id):
    manager_id = request.args.get('manager_id')
    batch_id = request.args.get('batch_id')
    if not manager_id or not batch_id:
        return jsonify({"error": "Authorization required or batch_id missing"}), 403
    
    try:
        intern = interns_collection.find_one({'EmpID': emp_id, 'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0})
        score_doc = scores_collection.find_one({'EmpID': emp_id, 'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0})
        feedbacks = list(feedback_collection.find({'EmpID': emp_id, 'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0}))
        
        # Fetch subject metadata for total marks
        subjects_doc = subjects_collection.find_one({'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0})
        subjects_list = subjects_doc.get('list', []) if subjects_doc else []
        
        return jsonify({
            "intern": intern,
            "scores": score_doc.get('scores', {}) if score_doc else {},
            "feedbacks": feedbacks,
            "subjects": subjects_list
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/export-scores', methods=['GET'])
def export_scores():
    manager_id = request.args.get('manager_id')
    batch_id = request.args.get('batch_id')
    if not manager_id or not batch_id:
        return jsonify({"error": "Authorization required or batch_id missing"}), 403
    
    try:
        # Get data same way as get_scores
        interns = list(interns_collection.find({'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0}))
        scores = list(scores_collection.find({'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0}))
        subjects_doc = subjects_collection.find_one({'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0})
        subjects_list = subjects_doc.get('list', []) if subjects_doc else []
        
        # Build score map
        scores_map = {s['EmpID']: s.get('scores', {}) for s in scores}
        
        # Prepare list for DataFrame
        export_data = []
        for intern in interns:
            row = {
                'Name': intern['Name'],
                'EmpID': intern['EmpID'],
                'Email': intern['Email']
            }
            intern_scores = scores_map.get(intern['EmpID'], {})
            for s in subjects_list:
                s_name = s['name'] if isinstance(s, dict) else s
                s_total = s['total_marks'] if isinstance(s, dict) else 100
                col_header = f"{s_name} (Total: {s_total})"
                row[col_header] = intern_scores.get(s_name, 0)
            
            export_data.append(row)
            
        df = pd.DataFrame(export_data)
        
        # Create Excel in memory
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Performance Grid')
        
        output.seek(0)
        
        # Get batch name for filename
        batch = batches_collection.find_one({'batch_id': batch_id})
        batch_name = batch['name'] if batch else "Batch"
        filename = f"Scores_{batch_name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.xlsx"
        
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
