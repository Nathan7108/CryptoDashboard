#!/bin/sh

# Start the backend FastAPI server
echo "Starting FastAPI Backend on Port 8000..."
cd /app/backend
uvicorn main:app --host 0.0.0.0 --port 8000 &

# Start the frontend (React or Vue.js) server
echo "Starting Frontend on Port 3000..."
cd /app/frontend
npm start &

# Keep the container running
tail -f /dev/null
