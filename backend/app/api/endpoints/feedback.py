from fastapi import APIRouter, HTTPException
from datetime import datetime
from app.schemas.all_models import FeedbackColumnModel, FeedbackCellUpdateModel
from app.core.database import feedback_collection, feedback_columns_collection, interns_collection

router = APIRouter(prefix="/api", tags=["feedback"])

@router.get("/feedback-columns")
async def get_feedback_columns(manager_id: str, batch_id: str):
    try:
        res = feedback_columns_collection.find_one({'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0})
        return res.get('list', []) if res else []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/feedback-columns", status_code=201)
async def add_feedback_column(data: FeedbackColumnModel):
    try:
        feedback_columns_collection.update_one(
            {'manager_id': data.manager_id, 'batch_id': data.batch_id},
            {'$addToSet': {'list': data.name}},
            upsert=True
        )
        return {"message": "Column added"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/feedback-columns")
async def delete_feedback_column(data: FeedbackColumnModel):
    try:
        feedback_columns_collection.update_one(
            {'manager_id': data.manager_id, 'batch_id': data.batch_id},
            {'$pull': {'list': data.name}}
        )
        feedback_collection.delete_many({'manager_id': data.manager_id, 'batch_id': data.batch_id, 'column': data.name})
        return {"message": "Column deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/feedback-grid")
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

@router.post("/update-feedback-cell")
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
