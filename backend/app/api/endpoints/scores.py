from fastapi import APIRouter, HTTPException
from app.schemas.all_models import ScoreUpdateModel
from app.core.database import interns_collection, scores_collection, subjects_collection

router = APIRouter(prefix="/api", tags=["scores"])

@router.get("/scores")
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

@router.post("/update-score")
async def update_score(data: ScoreUpdateModel):
    try:
        # 1. Update the actual score
        scores_collection.update_one(
            {'EmpID': data.EmpID, 'manager_id': data.manager_id, 'batch_id': data.batch_id},
            {'$set': {f'scores.{data.subject}': data.score}},
            upsert=True
        )
        
        # 2. Sync subjects list
        if data.total_marks is not None:
            subj_doc = subjects_collection.find_one({'manager_id': data.manager_id, 'batch_id': data.batch_id})
            existing_list = []
            if subj_doc:
                existing_list = subj_doc.get('list') or subj_doc.get('subjects') or []
            
            new_list = []
            found = False
            for item in existing_list:
                iname = item['name'] if isinstance(item, dict) else item
                if iname == data.subject:
                    found = True
                    new_list.append({"name": data.subject, "total_marks": int(data.total_marks)})
                else:
                    new_list.append(item if isinstance(item, dict) else {"name": item, "total_marks": 100})
            
            if not found:
                new_list.append({"name": data.subject, "total_marks": int(data.total_marks)})
                
            subjects_collection.update_one(
                {'manager_id': data.manager_id, 'batch_id': data.batch_id},
                {'$set': {'list': new_list}, '$unset': {'subjects': ""}},
                upsert=True
            )
        
        return {"message": "Score updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
