from fastapi import APIRouter, HTTPException
from app.schemas.all_models import InternModel
from app.core.database import interns_collection, scores_collection, feedback_collection

router = APIRouter(prefix="/api/interns", tags=["interns"])

@router.post("", status_code=201)
async def create_intern(data: InternModel):
    interns_collection.update_one(
        {'EmpID': data.EmpID, 'manager_id': data.manager_id, 'batch_id': data.batch_id},
        {'$set': data.model_dump()},
        upsert=True
    )
    return {"message": "Intern saved"}

@router.put("")
async def update_intern(data: InternModel):
    interns_collection.update_one(
        {'EmpID': data.EmpID, 'manager_id': data.manager_id, 'batch_id': data.batch_id},
        {'$set': {'Name': data.Name, 'Email': data.Email}}
    )
    return {"message": "Intern bio updated"}

@router.delete("")
async def delete_intern(emp_id: str, manager_id: str, batch_id: str):
    interns_collection.delete_one({'EmpID': emp_id, 'manager_id': manager_id, 'batch_id': batch_id})
    scores_collection.delete_one({'EmpID': emp_id, 'manager_id': manager_id, 'batch_id': batch_id})
    feedback_collection.delete_many({'EmpID': emp_id, 'manager_id': manager_id, 'batch_id': batch_id})
    return {"message": "Intern deleted"}

@router.get("")
async def get_interns(manager_id: str, batch_id: str):
    try:
        interns = list(interns_collection.find({'manager_id': manager_id, 'batch_id': batch_id}, {'_id': 0}))
        return interns
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
