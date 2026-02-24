from fastapi import APIRouter
from app.core.database import interns_collection, scores_collection, subjects_collection, batches_collection

router = APIRouter(prefix="/api/debug", tags=["debug"])

@router.post("/fix-orphans")
async def fix_orphans(manager_id: str, batch_id: str):
    res1 = interns_collection.update_many({'manager_id': manager_id, 'batch_id': {'$exists': False}}, {'$set': {'batch_id': batch_id}})
    res2 = scores_collection.update_many({'manager_id': manager_id, 'batch_id': {'$exists': False}}, {'$set': {'batch_id': batch_id}})
    res3 = subjects_collection.update_many({'manager_id': manager_id, 'batch_id': {'$exists': False}}, {'$set': {'batch_id': batch_id}})
    return {"interns_fixed": res1.modified_count, "scores_fixed": res2.modified_count, "subjects_fixed": res3.modified_count}

@router.get("/inspect-db")
async def inspect_db():
    batches = list(batches_collection.find({}, {'_id': 0}))
    subjects = list(subjects_collection.find({}, {'_id': 0}))
    interns_count = interns_collection.count_documents({})
    return {"batches": batches, "subjects": subjects, "interns_count": interns_count}
