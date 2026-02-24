from fastapi import APIRouter, HTTPException
from app.schemas.all_models import ScoreUpdateModel, SubjectDeleteModel, SubjectUpdateModel
from app.core.database import subjects_collection, scores_collection, interns_collection

router = APIRouter(prefix="/api/subjects", tags=["subjects"])

@router.get("")
async def get_subjects(manager_id: str, batch_id: str):
    try:
        doc = subjects_collection.find_one({'manager_id': manager_id, 'batch_id': batch_id})
        if not doc: return []
        
        raw_list = doc.get('list') or doc.get('subjects') or []
        standardized = []
        for item in raw_list:
            if isinstance(item, dict):
                standardized.append(item)
            else:
                standardized.append({"name": str(item), "total_marks": 100})
        return standardized
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("")
async def delete_subject(data: SubjectDeleteModel):
    try:
        # Pull matching object or raw string
        subjects_collection.update_one(
            {'manager_id': data.manager_id, 'batch_id': data.batch_id},
            {'$pull': {'list': {'name': data.subject}}}
        )
        subjects_collection.update_one(
            {'manager_id': data.manager_id, 'batch_id': data.batch_id},
            {'$pull': {'list': data.subject}}
        )
        # Clean up scores
        scores_collection.update_many(
            {'manager_id': data.manager_id, 'batch_id': data.batch_id},
            {'$unset': {f'scores.{data.subject}': ""}}
        )
        return {"message": f"Subject {data.subject} deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("")
async def update_subject(data: SubjectUpdateModel):
    try:
        subjects_doc = subjects_collection.find_one({'manager_id': data.manager_id, 'batch_id': data.batch_id})
        if subjects_doc:
            new_list = []
            found = False
            raw_list = subjects_doc.get('list') or subjects_doc.get('subjects') or []
            for item in raw_list:
                item_name = item['name'] if isinstance(item, dict) else item
                if item_name == data.old_name:
                    found = True
                    new_item = {
                        'name': data.new_name if data.new_name else data.old_name,
                        'total_marks': int(data.total_marks) if data.total_marks is not None else (item.get('total_marks', 100) if isinstance(item, dict) else 100)
                    }
                    new_list.append(new_item)
                else:
                    new_list.append(item if isinstance(item, dict) else {"name": item, "total_marks": 100})
            
            if found:
                subjects_collection.update_one(
                    {'_id': subjects_doc['_id']},
                    {'$set': {'list': new_list}, '$unset': {'subjects': ""}}
                )
                if data.new_name and data.new_name != data.old_name:
                    scores_collection.update_many(
                        {'manager_id': data.manager_id, 'batch_id': data.batch_id},
                        {'$rename': {f'scores.{data.old_name}': f'scores.{data.new_name}'}}
                    )
        return {"message": "Subject updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
