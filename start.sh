#!/bin/sh
# Start the frontend in the background
cd frontend && npm start &
# Start the FastAPI backend using uvicorn
cd backend && uvicorn app:app --host 0.0.0.0 --port 8000
