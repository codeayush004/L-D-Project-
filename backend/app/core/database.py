from pymongo import MongoClient
from .config import settings

client = MongoClient(settings.MONGO_URI, tlsAllowInvalidCertificates=True)
db = client[settings.DATABASE_NAME]

managers_collection = db.managers
interns_collection = db.interns
scores_collection = db.scores
feedback_collection = db.feedback
subjects_collection = db.subjects
batches_collection = db.batches
feedback_columns_collection = db.feedback_columns
