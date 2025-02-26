import os
import time
import asyncio
import requests
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from datetime import datetime

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

# ---------------------------
# Endpoints for Market Data
# ---------------------------

# Endpoint to get historical data for a specific coin
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

# ---------------------------
# TStore Write Functions
# ---------------------------

def tstore_set(key, metadata):
    tstore_api_url = "http://borg-ci.transpara.com:10001/write/write-data"
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer your_tstore_api_key"
    }
    
    import time,json

    current_ts_microseconds = int(time.time() * 1_000_000)

    payload =   {  
        key: [
            {
                "ts": current_ts_microseconds,
                "v": float(metadata.get("priceUsd"))
            }
        ]
}
    try:
        response = requests.post(tstore_api_url, json=payload, headers=headers)
        response.raise_for_status()
        print(f"Successfully updated {key} in TStore.")
    except Exception as e:
        print(f"Error updating {key} in TStore:", e)


def update_tstore_with_crypto_prices():
    url = f"{COINCAP_API_URL}/assets?limit=500"
    headers = {"Authorization": f"Bearer {COINCAP_API_KEY}"}
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()  # Expecting a "data" key containing a list of coins
        for coin in data.get("data", []):
            symbol = coin.get("symbol")
            tstore_key = f"crypto|symbol={symbol.lower()}"  # e.g., crypto_btc
            metadata = {
                "id": coin.get("id"),
                "name": coin.get("name"),
                "rank": coin.get("rank"),
                "priceUsd": coin.get("priceUsd"),
                "marketCapUsd": coin.get("marketCapUsd"),
            }
            tstore_set(tstore_key, metadata)
        print("TStore update complete.")
    except Exception as e:
        print("Error updating TStore:", e)


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

@app.websocket("/ws/market")
async def websocket_market(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


async def market_data_broadcaster():
    while True:
        await asyncio.sleep(5)
        try:
            url = f"{COINCAP_API_URL}/assets?limit=500"
            headers = {"Authorization": f"Bearer {COINCAP_API_KEY}"}
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            await manager.broadcast(data)
            print("Broadcasted market data update")
            
            update_tstore_with_crypto_prices()
        except Exception as e:
            print("Error in background broadcaster:", e)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(market_data_broadcaster())
@app.get("/api/read_current/{symbol}")
def api_read_current(symbol: str):
    data = read_current_value(symbol)
    if data is None:
        raise HTTPException(status_code=500, detail="Error reading current value")
    return data

if __name__ == '__main__':
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
