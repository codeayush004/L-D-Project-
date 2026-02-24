from fastapi import APIRouter, HTTPException
from app.core.database import interns_collection, scores_collection, feedback_collection, subjects_collection

router = APIRouter(prefix="/api/reports", tags=["reports"])

@router.get("/{emp_id}")
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
