from fastapi import APIRouter, HTTPException
from bson import ObjectId
from werkzeug.security import generate_password_hash, check_password_hash
from app.schemas.all_models import AuthModel
from app.core.database import managers_collection

router = APIRouter(prefix="/api", tags=["auth"])

@router.post("/register")
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

@router.post("/login")
async def login(data: AuthModel):
    login_username = data.username.strip().lower()
    print(f"[DEBUG] Login attempt for: {login_username}")
    
    manager = managers_collection.find_one({'username': {'$regex': f'^{login_username}$', '$options': 'i'}})
    
    if not manager:
        print(f"[DEBUG] User not found: {login_username}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not check_password_hash(manager['password'], data.password):
        print(f"[DEBUG] Password mismatch for: {login_username}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    print(f"[DEBUG] Login successful: {login_username}")
    return {
        "message": "Login successful",
        "manager_id": manager['manager_id'],
        "username": manager['username']
    }
