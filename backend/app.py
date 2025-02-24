import os
import time
import asyncio
import requests
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

COINCAP_API_URL = "https://api.coincap.io/v2"
COINCAP_API_KEY = os.getenv("COINCAP_API_KEY", "your_api_key_here")

# API endpoint to get market data
@app.get("/api/market")
def get_market_data():
    url = f"{COINCAP_API_URL}/assets?limit=500"
    headers = {"Authorization": f"Bearer {COINCAP_API_KEY}"}
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch market data: {e}")
    return response.json()

# API endpoint to get historical data for a specific coin
@app.get("/api/history/{coin_id}")
def get_history(coin_id: str, range: str = "24hr"):
    try:
        end = int(time.time() * 1000)  # current time in ms
        start = None
        api_interval = None

        # Determine the start time and interval based on the range
        if range == 'max':
            start = 0
            api_interval = 'd1'
        elif range == '1yr':
            start = end - (365 * 24 * 60 * 60 * 1000)
            api_interval = 'h12'
        elif range == '3m':
            start = end - (90 * 24 * 60 * 60 * 1000)
            api_interval = 'h12'
        elif range == '1m':
            start = end - (30 * 24 * 60 * 60 * 1000)
            api_interval = 'h1'
        elif range == '1hr':
            start = end - (60 * 60 * 1000)
            api_interval = 'm1'
        elif range == '7d':
            start = end - (7 * 24 * 60 * 60 * 1000)
            api_interval = 'h1'
        elif range == '24hr':
            start = end - (24 * 60 * 60 * 1000)
            api_interval = 'm5'
        else:
            start = end - (24 * 60 * 60 * 1000)
            api_interval = 'm5'

        url = f"{COINCAP_API_URL}/assets/{coin_id}/history?start={start}&end={end}&interval={api_interval}"
        headers = {"Authorization": f"Bearer {COINCAP_API_KEY}"}
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unhandled exception: {e}")

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

manager = ConnectionManager()

# WebSocket endpoint for market data
@app.websocket("/ws/market")
async def websocket_market(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Background task to fetch and broadcast market data
async def market_data_broadcaster():
    while True:
        await asyncio.sleep(5)
        url = f"{COINCAP_API_URL}/assets?limit=500"
        headers = {"Authorization": f"Bearer {COINCAP_API_KEY}"}
        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            await manager.broadcast(data)
            print("Broadcasted market data update")
        except Exception as e:
            print("Error in background broadcaster:", e)

# Start the background task on application startup
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(market_data_broadcaster())

if __name__ == '__main__':
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
