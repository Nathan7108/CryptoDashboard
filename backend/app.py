import os
import time
import requests
import asyncio
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Base URL and API key for CoinCap
COINCAP_API_URL = "https://api.coincap.io/v2"
COINCAP_API_KEY = os.getenv("COINCAP_API_KEY", "your_api_key_here")

# TStore configuration
TSTORE_API_URL = "http://borg-ci.transpara.com:10001/write/write-data"
TSTORE_HEADERS = {
    "Content-Type": "application/json",
    "Authorization": "Bearer your_tstore_api_key"
}

def fetch_24hr_history(coin_id: str):
    """
    Fetch the 24-hour historical price data for the given coin using a 1-minute interval.
    (This will return up to 1440 data points.)
    """
    end = int(time.time() * 1000)
    start = end - (24 * 60 * 60 * 1000)
    api_interval = "m1"
    url = f"{COINCAP_API_URL}/assets/{coin_id}/history?start={start}&end={end}&interval={api_interval}"
    headers = {"Authorization": f"Bearer {COINCAP_API_KEY}"}
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print("Response Text:", response.text)
        raise HTTPException(status_code=response.status_code, detail="Error fetching 24hr history")
    data = response.json().get("data", [])
    print(f"Fetched {len(data)} 24hr points for {coin_id}")
    return data

def fetch_7d_history(coin_id: str, interval: str = "h1"):
    """
    Fetch historical price data for the last 7 days for the given coin.
    Default interval is "h1" (hourly). To use minute-level data, pass ?interval=m1.
    """
    end = int(time.time() * 1000)
    start = end - (7 * 24 * 60 * 60 * 1000)
    url = f"{COINCAP_API_URL}/assets/{coin_id}/history?start={start}&end={end}&interval={interval}"
    headers = {"Authorization": f"Bearer {COINCAP_API_KEY}"}
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print("Response Text:", response.text)
        raise HTTPException(status_code=response.status_code, detail="Error fetching 7d history")
    data = response.json().get("data", [])
    print(f"DEBUG: Fetched {len(data)} points for 7d history of {coin_id} with interval {interval}")
    return data



def store_24hr_history_to_tstore(coin_id: str, history_data: list):
    """
    Store the 24-hour historical data to TStore in one batch update.
    The data is stored under the key:
      crypto|symbol={coin_id.lower()},metric=24hrHistory
    Timestamps are converted from milliseconds to microseconds.
    """
    tstore_key = f"crypto|symbol={coin_id.lower()},metric=24hrHistory"
    points = []
    for point in history_data:
        ts = point.get("time")
        price_str = point.get("priceUsd")
        if ts and price_str:
            try:
                price = float(price_str)
            except Exception:
                continue
            ts_micro = ts * 1000  # convert ms to µs
            points.append({"ts": ts_micro, "v": price})
    if points:
        payload = { tstore_key: points }
        response = requests.post(TSTORE_API_URL, json=payload, headers=TSTORE_HEADERS)
        if response.status_code != 200:
            print("TStore response:", response.text)
            raise HTTPException(status_code=response.status_code, detail="Error storing 24hr history to TStore")
        print(f"✅ Successfully stored 24hr history for {coin_id} with {len(points)} points.")
        return True
    else:
        print("⚠️ No 24hr history points to store.")
        return False

def store_history_to_tstore(coin_id: str, history_data: list, metric: str):
    """
    Store the historical data to TStore in one batch update.
    The data is stored under the key:
      crypto|symbol={coin_id.lower()},metric={metric}
    Timestamps are converted from milliseconds to microseconds.
    """
    tstore_key = f"crypto|symbol={coin_id.lower()},metric={metric}"
    points = []
    for point in history_data:
        ts = point.get("time")
        price_str = point.get("priceUsd")
        if ts and price_str:
            try:
                price = float(price_str)
            except Exception:
                continue
            ts_micro = ts * 1000  # convert ms to µs
            points.append({"ts": ts_micro, "v": price})
    if points:
        payload = { tstore_key: points }
        response = requests.post(TSTORE_API_URL, json=payload, headers=TSTORE_HEADERS)
        if response.status_code != 200:
            print("TStore response:", response.text)
            raise HTTPException(status_code=response.status_code, detail="Error storing history to TStore")
        print(f"✅ Successfully stored {metric} history for {coin_id} with {len(points)} points.")
        return True
    else:
        print(f"⚠️ No {metric} history points to store.")
        return False
    
@app.get("/api/coins")
def get_top_coins():
    """
    Get the top 10 coins (by market cap) from CoinCap.
    """
    url = f"{COINCAP_API_URL}/assets?limit=10"
    headers = {"Authorization": f"Bearer {COINCAP_API_KEY}"}
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="Error fetching coins")
    return response.json()

@app.get("/api/24hr_history/{coin_id}")
def get_24hr_history(coin_id: str, store: bool = True):
    """
    Fetch the 24-hour historical price data (1-minute interval) for the given coin.
    If 'store=true' (default), the data is written to TStore under:
      crypto|symbol={coin_id.lower()},metric=24hrHistory
    """
    try:
        history_data = fetch_24hr_history(coin_id)
        stored = False
        if store:
            stored = store_24hr_history_to_tstore(coin_id, history_data)
        return {"status": "success", "coin": coin_id, "stored": stored, "points": len(history_data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching 24hr history for {coin_id}: {e}")

@app.get("/api/7d_history/{coin_id}")
def seven_day_history(coin_id: str, interval: str = "h1", store: bool = True):
    """
    Fetch the 7-day historical price data for the given coin.
    Default interval is "h1" (hourly data); to use minute-level data, pass ?interval=m1.
    If store=true (default), the data is also written to TStore under:
      crypto|symbol={coin_id.lower()},metric=7dHistory
    """
    try:
        history_data = fetch_7d_history(coin_id, interval)
        stored = False
        if store:
            stored = store_history_to_tstore(coin_id, history_data, "7dHistory")
        return {
            "status": "success",
            "coin": coin_id,
            "stored": stored,
            "points": len(history_data),
            "interval": interval
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching 7d history for {coin_id}: {e}")

@app.get("/api/kpi/{coin_id}")
def get_kpi(coin_id: str):
    """
    Return a KPI for the given coin: the latest price from the 24hr historical data.
    """
    try:
        history_data = fetch_24hr_history(coin_id)
        if not history_data:
            raise HTTPException(status_code=404, detail="No 24hr historical data found.")
        latest_point = history_data[-1]
        latest_price = float(latest_point.get("priceUsd", 0))
        return {"status": "success", "coin": coin_id, "latest_price": latest_price}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching KPI for {coin_id}: {e}")

async def update_24hr_history_task():
    """
    Background task to update the 24-hour history for a given coin every minute.
    (For example, updating Bitcoin. You can extend this to a list of coins.)
    """
    coin_id = "bitcoin"  # Change as needed
    while True:
        try:
            history_data = fetch_24hr_history(coin_id)
            store_24hr_history_to_tstore(coin_id, history_data)
            print(f"✅ Updated 24hr history for {coin_id} at {datetime.utcnow()}")
        except Exception as e:
            print(f"❌ Error updating 24hr history: {e}")
        await asyncio.sleep(60)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(update_24hr_history_task())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
