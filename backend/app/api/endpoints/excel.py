from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
import io
import pandas as pd
from datetime import datetime
from app.core.database import (
    interns_collection, scores_collection, subjects_collection, 
    feedback_collection, batches_collection
)

router = APIRouter(prefix="/api", tags=["excel"])

@router.post("/upload-interns")
async def upload_interns(
    manager_id: str = Form(...),
    batch_id: str = Form(...),
    file: UploadFile = File(...)
):
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        required_bio = ['Name', 'Email', 'EmpID']
        if not all(col in df.columns for col in required_bio):
            raise HTTPException(status_code=400, detail=f"Excel must at least contain: {required_bio}")
        
        potential_subjects = [col.strip() for col in df.columns if col.strip() not in required_bio and col.strip() not in ['manager_id', 'batch_id']]
        
        subj_doc = subjects_collection.find_one({'manager_id': manager_id, 'batch_id': batch_id})
        raw_existing = []
        if subj_doc:
            raw_existing = subj_doc.get('list') or subj_doc.get('subjects') or []
        
        existing_list = []
        existing_names = []
        for s in raw_existing:
            name = s['name'] if isinstance(s, dict) else s
            if name not in existing_names:
                existing_names.append(name)
                existing_list.append(s if isinstance(s, dict) else {"name": s, "total_marks": 100})
        
        new_subjects_added = False
        for col in potential_subjects:
            clean_name = col.split('(')[0].strip()
            if clean_name not in [s['name'] for s in existing_list]:
                total = 100
                if '(' in col and 'Total' in col:
                    try: total = int(col.split(':')[-1].replace(')', '').strip())
                    except: total = 100
                
                existing_list.append({"name": clean_name, "total_marks": total})
                new_subjects_added = True
        
        if new_subjects_added or not subj_doc:
            subjects_collection.update_one(
                {'manager_id': manager_id, 'batch_id': batch_id},
                {'$set': {'list': existing_list}, '$unset': {'subjects': ""}},
                upsert=True
            )

        interns_data = df.to_dict('records')
        for row in interns_data:
            emp_id = str(row['EmpID']).strip()
            intern_bio = {
                'Name': str(row['Name']).strip(),
                'Email': str(row['Email']).strip(),
                'EmpID': emp_id,
                'manager_id': manager_id,
                'batch_id': batch_id
            }
            interns_collection.update_one(
                {'EmpID': emp_id, 'manager_id': manager_id, 'batch_id': batch_id},
                {'$set': intern_bio},
                upsert=True
            )
            
            scores_to_save = {}
            for col in df.columns:
                stripped_col = col.strip()
                clean_name = stripped_col.split('(')[0].strip()
                if clean_name in [s['name'] for s in existing_list]:
                    val = row[col]
                    if pd.notnull(val) and (isinstance(val, (int, float, complex)) or hasattr(val, '__int__')):
                        scores_to_save[f"scores.{clean_name}"] = float(val)
            
            if scores_to_save:
                scores_collection.update_one(
                    {'EmpID': emp_id, 'manager_id': manager_id, 'batch_id': batch_id},
                    {'$set': scores_to_save},
                    upsert=True
                )
                
        return {"message": "Success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/export-scores")
async def export_scores(manager_id: str, batch_id: str):
    try:
        interns = list(interns_collection.find({'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0}))
        scores = list(scores_collection.find({'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0}))
        subjects_doc = subjects_collection.find_one({'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0})
        subjects_list = subjects_doc.get('list', []) if subjects_doc else []
        
        scores_map = {s['EmpID']: s.get('scores', {}) for s in scores}
        
        export_data = []
        for intern in interns:
            row = {'Name': intern['Name'], 'EmpID': intern['EmpID'], 'Email': intern['Email']}
            intern_scores = scores_map.get(intern['EmpID'], {})
            for s in subjects_list:
                s_name = s['name'] if isinstance(s, dict) else s
                s_total = s['total_marks'] if isinstance(s, dict) else 100
                row[f"{s_name} (Total: {s_total})"] = intern_scores.get(s_name, 0)
            export_data.append(row)
            
        df = pd.DataFrame(export_data)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Performance Grid')
        output.seek(0)
        
        batch = batches_collection.find_one({'batch_id': batch_id})
        batch_name = batch['name'] if batch else "Batch"
        filename = f"Scores_{batch_name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.xlsx"
        
        return StreamingResponse(
            output,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers={'Content-Disposition': f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
