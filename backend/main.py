import os
import io
import json
from datetime import datetime
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, Request, HTTPException, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, EmailStr
from pymongo import MongoClient
from bson import ObjectId
from groq import Groq
import pandas as pd
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash

load_dotenv()

app = FastAPI(title="L&D Platform API", version="2.0.0")

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# --- Pydantic Models ---

class AuthModel(BaseModel):
    username: str
    password: str

class BatchModel(BaseModel):
    name: str
    manager_id: str

class InternModel(BaseModel):
    Name: str
    Email: EmailStr
    EmpID: str
    manager_id: str
    batch_id: str

class ScoreUpdateModel(BaseModel):
    EmpID: str
    subject: str
    score: float
    total_marks: Optional[int] = None
    manager_id: str
    batch_id: str

class SubjectDeleteModel(BaseModel):
    subject: str
    manager_id: str
    batch_id: str

class SubjectUpdateModel(BaseModel):
    old_name: str
    new_name: Optional[str] = None
    total_marks: Optional[int] = None
    manager_id: str
    batch_id: str

class FeedbackColumnModel(BaseModel):
    name: str
    manager_id: str
    batch_id: str

class FeedbackCellUpdateModel(BaseModel):
    EmpID: str
    column: str
    text: str
    manager_id: str
    batch_id: str

class ChatQueryModel(BaseModel):
    query: str
    manager_id: str
    batch_id: str

# --- Root & Health ---

@app.get("/")
async def index():
    return {"status": "ok", "message": "L&D Platform API is live. Use /docs for interactive documentation."}

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "L&D Backend (FastAPI) is running"}

# --- Auth Routes ---

@app.post("/api/register")
async def register(data: AuthModel):
    if managers_collection.find_one({'username': data.username}):
        raise HTTPException(status_code=400, detail="Username already exists")
    
    hashed_password = generate_password_hash(data.password)
    manager_id = str(ObjectId())
    managers_collection.insert_one({
        'manager_id': manager_id,
        'username': data.username,
        'password': hashed_password
    })
    return {
        "message": "Manager registered", 
        "manager_id": manager_id,
        "username": data.username
    }

@app.post("/api/login")
async def login(data: AuthModel):
    manager = managers_collection.find_one({'username': data.username})
    if not manager or not check_password_hash(manager['password'], data.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return {
        "message": "Login successful",
        "manager_id": manager['manager_id'],
        "username": manager['username']
    }

# --- Batch Management ---

@app.post("/api/batches", status_code=201)
async def create_batch(data: BatchModel):
    batch_id = str(ObjectId())
    batches_collection.insert_one({
        'batch_id': batch_id,
        'manager_id': data.manager_id,
        'name': data.name
    })
    return {"message": "Batch created", "batch_id": batch_id, "name": data.name}

@app.get("/api/batches")
async def get_batches(manager_id: str):
    batches = list(batches_collection.find({'manager_id': manager_id}, {'_id': 0}))
    return batches

# --- Intern Registration & Management ---

@app.post("/api/interns", status_code=201)
async def create_intern(data: InternModel):
    # Check if exists in this batch
    if interns_collection.find_one({'EmpID': data.EmpID, 'manager_id': data.manager_id, 'batch_id': data.batch_id}):
        raise HTTPException(status_code=400, detail="Intern with this EmpID already exists in this batch")
        
    interns_collection.insert_one(data.model_dump())
    return {"message": "Intern added successfully"}

@app.get("/api/interns")
async def get_interns(manager_id: str, batch_id: str):
    try:
        interns = list(interns_collection.find({'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0}))
        return interns
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Score Management ---

@app.get("/api/scores")
async def get_scores(manager_id: str, batch_id: str):
    try:
        interns = list(interns_collection.find({'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0}))
        scores = list(scores_collection.find({'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0}))
        
        scores_map = {s['EmpID']: s.get('scores', {}) for s in scores}
        
        combined_data = []
        for intern in interns:
            intern_scores = scores_map.get(intern['EmpID'], {})
            combined_data.append({**intern, **intern_scores})
            
        return combined_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/update-score")
async def update_score(data: ScoreUpdateModel):
    try:
        # Update scores per intern
        scores_collection.update_one(
            {'EmpID': data.EmpID, 'manager_id': data.manager_id, 'batch_id': data.batch_id},
            {'$set': {f'scores.{data.subject}': data.score}},
            upsert=True
        )
        
        # Track subjects with total_marks
        if data.total_marks is not None:
            subjects_collection.update_one(
                {'manager_id': data.manager_id, 'batch_id': data.batch_id},
                {'$pull': {'list': {'$in': [{'name': data.subject}, data.subject]}}},
                upsert=True
            )
            subjects_collection.update_one(
                {'manager_id': data.manager_id, 'batch_id': data.batch_id},
                {'$addToSet': {'list': {'name': data.subject, 'total_marks': int(data.total_marks)}}},
                upsert=True
            )
        
        return {"message": "Score updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/subjects")
async def get_subjects(manager_id: str, batch_id: str):
    try:
        res = subjects_collection.find_one({'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0})
        raw_list = res.get('list', []) if res else []
        
        standardized_list = []
        for item in raw_list:
            if isinstance(item, dict):
                standardized_list.append(item)
            else:
                standardized_list.append({'name': item, 'total_marks': 100})
                
        return standardized_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/subjects")
async def delete_subject(data: SubjectDeleteModel):
    try:
        subjects_collection.update_one(
            {'manager_id': data.manager_id, 'batch_id': data.batch_id},
            {'$pull': {'list': {'$in': [{'name': data.subject}, data.subject]}}}
        )
        scores_collection.update_many(
            {'manager_id': data.manager_id, 'batch_id': data.batch_id},
            {'$unset': {f'scores.{data.subject}': ""}}
        )
        return {"message": f"Subject {data.subject} deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/subjects")
async def update_subject(data: SubjectUpdateModel):
    try:
        subjects_doc = subjects_collection.find_one({'manager_id': data.manager_id, 'batch_id': data.batch_id})
        if subjects_doc:
            new_list = []
            found = False
            for item in subjects_doc.get('list', []):
                item_name = item['name'] if isinstance(item, dict) else item
                if item_name == data.old_name:
                    found = True
                    new_item = {
                        'name': data.new_name if data.new_name else data.old_name,
                        'total_marks': int(data.total_marks) if data.total_marks is not None else (item.get('total_marks', 100) if isinstance(item, dict) else 100)
                    }
                    new_list.append(new_item)
                else:
                    new_list.append(item)
            
            if found:
                subjects_collection.update_one(
                    {'_id': subjects_doc['_id']},
                    {'$set': {'list': new_list}}
                )
                if data.new_name and data.new_name != data.old_name:
                    scores_collection.update_many(
                        {'manager_id': data.manager_id, 'batch_id': data.batch_id},
                        {'$rename': {f'scores.{data.old_name}': f'scores.{data.new_name}'}}
                    )
        return {"message": "Subject updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Feedback Management ---

@app.get("/api/feedback-columns")
async def get_feedback_columns(manager_id: str, batch_id: str):
    try:
        res = db.feedback_columns.find_one({'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0})
        return res.get('list', []) if res else []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/feedback-columns", status_code=201)
async def add_feedback_column(data: FeedbackColumnModel):
    try:
        db.feedback_columns.update_one(
            {'manager_id': data.manager_id, 'batch_id': data.batch_id},
            {'$addToSet': {'list': data.name}},
            upsert=True
        )
        return {"message": "Column added"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/feedback-columns")
async def delete_feedback_column(data: FeedbackColumnModel):
    try:
        db.feedback_columns.update_one(
            {'manager_id': data.manager_id, 'batch_id': data.batch_id},
            {'$pull': {'list': data.name}}
        )
        feedback_collection.delete_many({'manager_id': data.manager_id, 'batch_id': data.batch_id, 'column': data.name})
        return {"message": "Column deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/feedback-grid")
async def get_feedback_grid(manager_id: str, batch_id: str):
    try:
        interns = list(interns_collection.find({'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0}))
        feedbacks = list(feedback_collection.find({'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0}))
        
        feedback_map = {}
        for f in feedbacks:
            eid = f['EmpID']
            col = f.get('column', 'General')
            if eid not in feedback_map: feedback_map[eid] = {}
            feedback_map[eid][col] = f['text']
            
        combined = []
        for intern in interns:
            combined.append({**intern, 'feedbacks': feedback_map.get(intern['EmpID'], {})})
            
        return combined
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/update-feedback-cell")
async def update_feedback_cell(data: FeedbackCellUpdateModel):
    try:
        feedback_collection.update_one(
            {'EmpID': data.EmpID, 'manager_id': data.manager_id, 'batch_id': data.batch_id, 'column': data.column},
            {'$set': {'text': data.text, 'date': datetime.now().isoformat()}},
            upsert=True
        )
        return {"message": "Feedback updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Report & Detail View ---

@app.get("/api/reports/{emp_id}")
async def get_report(emp_id: str, manager_id: str, batch_id: str):
    try:
        intern = interns_collection.find_one({'EmpID': emp_id, 'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0})
        score_doc = scores_collection.find_one({'EmpID': emp_id, 'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0})
        feedbacks = list(feedback_collection.find({'EmpID': emp_id, 'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0}))
        
        subjects_doc = subjects_collection.find_one({'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0})
        subjects_list = subjects_doc.get('list', []) if subjects_doc else []
        
        return {
            "intern": intern,
            "scores": score_doc.get('scores', {}) if score_doc else {},
            "feedbacks": feedbacks,
            "subjects": subjects_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Excel Operations ---

@app.post("/api/upload-interns")
async def upload_interns(
    manager_id: str = Form(...),
    batch_id: str = Form(...),
    file: UploadFile = File(...)
):
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        required_columns = ['Name', 'Email', 'EmpID']
        if not all(col in df.columns for col in required_columns):
            raise HTTPException(status_code=400, detail=f"Invalid format. Required: {required_columns}")
        
        interns_data = df[required_columns].to_dict('records')
        for intern in interns_data:
            intern['manager_id'] = manager_id
            intern['batch_id'] = batch_id
            interns_collection.update_one(
                {'EmpID': str(intern['EmpID']), 'manager_id': manager_id, 'batch_id': batch_id},
                {'$set': intern},
                upsert=True
            )
        return {"message": "Interns uploaded"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload-feedback")
async def upload_feedback(
    manager_id: str = Form(...),
    batch_id: str = Form(...),
    file: UploadFile = File(...)
):
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        if 'EmpID' not in df.columns or 'Feedback' not in df.columns:
            raise HTTPException(status_code=400, detail="Excel must have EmpID and Feedback columns")
            
        for _, row in df.iterrows():
            feedback_collection.insert_one({
                'EmpID': str(row['EmpID']),
                'manager_id': manager_id,
                'batch_id': batch_id,
                'text': row['Feedback'],
                'column': 'General',
                'date': datetime.now().isoformat()
            })
        return {"message": "Feedback uploaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/export-scores")
async def export_scores(manager_id: str, batch_id: str):
    try:
        interns = list(interns_collection.find({'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0}))
        scores = list(scores_collection.find({'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0}))
        subjects_doc = subjects_collection.find_one({'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0})
        subjects_list = subjects_doc.get('list', []) if subjects_doc else []
        
        scores_map = {s['EmpID']: s.get('scores', {}) for s in scores}
        
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
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Performance Grid')
        output.seek(0)
        
        batch = batches_collection.find_one({'batch_id': batch_id})
        batch_name = batch['name'] if batch else "Batch"
        filename = f"Scores_{batch_name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.xlsx"
        
        headers = {
            'Content-Disposition': f'attachment; filename="{filename}"'
        }
        return StreamingResponse(
            output,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers=headers
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Chatbot ---

@app.post("/api/chat")
async def chat(data: ChatQueryModel):
    try:
        interns = list(interns_collection.find({'manager_id': data.manager_id, 'batch_id': data.batch_id}, {'_id': 0}))
        scores = list(scores_collection.find({'manager_id': data.manager_id, 'batch_id': data.batch_id}, {'_id': 0}))
        feedbacks = list(feedback_collection.find({'manager_id': data.manager_id, 'batch_id': data.batch_id}, {'_id': 0}))
        
        context = f"Batch Data:\nInterns: {json.dumps(interns)}\nScores: {json.dumps(scores)}\nFeedbacks: {json.dumps(feedbacks)}"
        
        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are an L&D assistant. Analyze provided data and answer manager queries."},
                {"role": "user", "content": f"Context: {context}\n\nQuery: {data.query}"}
            ]
        )
        return {"response": completion.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
