from fastapi import APIRouter, HTTPException
from groq import Groq
import os
import json
from app.schemas.all_models import ChatQueryModel
from app.core.database import interns_collection, scores_collection, feedback_collection, batches_collection

router = APIRouter(prefix="/api", tags=["chat"])
groq_client = Groq(api_key=os.getenv('GROQ_API_KEY'))

@router.post("/chat")
async def chat(data: ChatQueryModel):
    try:
        interns = list(interns_collection.find({'manager_id': data.manager_id, 'batch_id': data.batch_id}, {'_id': 0}))
        scores = list(scores_collection.find({'manager_id': data.manager_id, 'batch_id': data.batch_id}, {'_id': 0}))
        feedbacks = list(feedback_collection.find({'manager_id': data.manager_id, 'batch_id': data.batch_id}, {'_id': 0}))
        batch = batches_collection.find_one({'batch_id': data.batch_id})
        batch_name = batch['name'] if batch else "Unknown Batch"

        score_map = {s['EmpID']: s.get('scores', {}) for s in scores}
        feedback_map = {}
        for f in feedbacks:
            eid = f['EmpID']
            if eid not in feedback_map: feedback_map[eid] = []
            feedback_map[eid].append(f"{f.get('column', 'General')}: {f['text']}")

        context = f"Active Batch: {batch_name}\n\nIntern Profiles:\n"
        for i in interns:
            eid = i['EmpID']
            s = score_map.get(eid, {})
            f = feedback_map.get(eid, [])
            context += f"- {i['Name']} ({eid}):\n Scores: {json.dumps(s)}\n Feedback: {'; '.join(f)}\n\n"
        
        system_prompt = "You are a professional L&D Assistant."
        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Context:\n{context}\n\nQuery: {data.query}"}
            ]
        )
        return {"response": completion.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
