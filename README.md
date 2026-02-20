# L&D Platform

A premium dashboard for L&D managers to track intern performance, manage scores via Excel, and get insights from an AI assistant.

## Tech Stack
- **Frontend**: React (Vite), Vanilla CSS, Lucide icons.
- **Backend**: Flask (Python), MongoDB, Groq AI SDK.

## Setup Instructions

### Backend
1. Navigate to `backend/`
2. Create/Activate virtual environment: `python3 -m venv venv && source venv/bin/activate`
3. Install dependencies: `pip install -r requirements.txt` (or install manually: flask, pymongo, groq, pandas, openpyxl)
4. Create `.env` file with `MONGO_URI` and `GROQ_API_KEY`.
5. Run: `python app.py`

### Frontend
1. Navigate to `frontend/`
2. Install dependencies: `npm install`
3. Run: `npm run dev`

## Key Features
- **Intern Upload**: Bulk create intern profiles via Excel (`Name`, `Email`, `EmpID`).
- **Dynamic Score Grid**: Add subjects and update scores in real-time.
- **Feedback Management**: Upload feedback history for interns.
- **AI Assistant**: Ask questions about intern performance (e.g., "Who needs improvement in Python?").
