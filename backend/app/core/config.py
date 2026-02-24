import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    MONGO_URI = os.getenv("MONGO_URI")
    DATABASE_NAME = os.getenv("DATABASE_NAME", "ld_platform")
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")

settings = Settings()
