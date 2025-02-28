import os
import time
import asyncio
import requests
import json
import websockets
from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
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

# TStore headers for writing data
TSTORE_HEADERS = {
    "Content-Type": "application/json",
    "Authorization": "Bearer your_tstore_api_key"
}

# -----------------------------------------
# Section 1: Get Data from CoinCap
# -----------------------------------------

@app.get("/api/market")
def get_market_data():
    try:
        url = f"{COINCAP_API_URL}/assets?limit=500"
        headers = {"Authorization": f"Bearer {COINCAP_API_KEY}"}
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching market data: {e}")

@app.get("/api/history/{coin_id}")
def get_history(coin_id: str, range: str = "24hr"):
    try:
        end = int(time.time() * 1000)
        start = None
        api_interval = None

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

# -----------------------------------------
# Section 2: Write Data to TStore
# -----------------------------------------

def tstore_set(key, metadata):
    """Write current price data with current time to TStore."""
    tstore_api_url = "http://borg-ci.transpara.com:10001/write/write-data"
    current_ts_microseconds = int(time.time() * 1_000_000)
    payload = {
        key: [
            {
                "ts": current_ts_microseconds,
                "v": float(metadata.get("priceUsd"))
            }
        ]
    }
    try:
        response = requests.post(tstore_api_url, json=payload, headers=TSTORE_HEADERS)
        response.raise_for_status()
        print(f"Successfully updated {key} in TStore.")
    except Exception as e:
        print(f"Error updating {key} in TStore:", e)

def update_tstore_with_crypto_prices_batch():
    """Fetch current prices for up to 500 coins and write them in one batch to TStore."""
    tstore_api_url = "http://borg-ci.transpara.com:10001/write/write-data"
    url = f"{COINCAP_API_URL}/assets?limit=500"
    headers_cc = {"Authorization": f"Bearer {COINCAP_API_KEY}"}
    try:
        response = requests.get(url, headers=headers_cc)
        response.raise_for_status()
        data = response.json()
        
        current_ts_microseconds = int(time.time() * 1_000_000)
        batch_payload = {}
        for coin in data.get("data", []):
            symbol = coin.get("symbol")
            tstore_key = f"crypto|symbol={symbol.lower()}"
            batch_payload[tstore_key] = [
                {
                    "ts": current_ts_microseconds,
                    "v": float(coin.get("priceUsd"))
                }
            ]
        response = requests.post(tstore_api_url, json=batch_payload, headers=TSTORE_HEADERS)
        response.raise_for_status()
        print("TStore batch update complete.")
    except Exception as e:
        print("Error in batch updating TStore:", e)

def tstore_write_point_exact(tstore_key: str, unix_ms: int, price: float):
    """Write a historical data point with its exact timestamp to TStore."""
    tstore_api_url = "http://borg-ci.transpara.com:10001/write/write-data"
    ts_micro = unix_ms * 1000  # Convert ms to microseconds
    payload = {
        tstore_key: [
            {
                "ts": ts_micro,
                "v": price
            }
        ]
    }
    try:
        response = requests.post(tstore_api_url, json=payload, headers=TSTORE_HEADERS)
        response.raise_for_status()
        print(f"Successfully wrote data for {tstore_key} at {unix_ms} ms.")
    except Exception as e:
        print(f"Error writing {tstore_key} at {unix_ms} to TStore:", e)

# -----------------------------------------
# Section 3: Real-Time Data via WebSocket
# -----------------------------------------

async def run_coincap_websocket():
    """Connect to CoinCap WebSocket and write price updates to TStore every second."""
    url = "wss://ws.coincap.io/prices?assets=ALL"
    latest_prices = {}
    last_write_time = time.time()

    async with websockets.connect(url) as websocket:
        while True:
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=1)
                price_data = json.loads(message)
                for coin_id, price_str in price_data.items():
                    latest_prices[coin_id] = float(price_str)
            except asyncio.TimeoutError:
                pass

            now = time.time()
            if now - last_write_time >= 1.0:
                for coin_id, price_float in latest_prices.items():
                    tstore_key = f"crypto|symbol={coin_id.lower()}"
                    ts_micro = int(now * 1_000_000)
                    payload = {
                        tstore_key: [
                            {
                                "ts": ts_micro,
                                "v": price_float
                            }
                        ]
                    }
                    requests.post(
                        "http://borg-ci.transpara.com:10001/write/write-data",
                        json=payload,
                        headers=TSTORE_HEADERS
                    )
                last_write_time = now

# -----------------------------------------
# Section 4: WebSocket Connections for Broadcasting
# -----------------------------------------

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

# -----------------------------------------
# Section 5: Background Task for Live Data Updates
# -----------------------------------------

async def market_data_broadcaster():
    """Every second, fetch current data from CoinCap, broadcast it, and update TStore."""
    while True:
        await asyncio.sleep(1)
        try:
            url = f"{COINCAP_API_URL}/assets?limit=500"
            headers_cc = {"Authorization": f"Bearer {COINCAP_API_KEY}"}
            response = requests.get(url, headers=headers_cc)
            response.raise_for_status()
            data = response.json()

            await manager.broadcast(data)
            print("Broadcasted market data update")
            
            update_tstore_with_crypto_prices_batch()
        except Exception as e:
            print("Error in background broadcaster:", e)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(market_data_broadcaster())

# -----------------------------------------
# Section 6: Historical Data Storage
# -----------------------------------------

last_known_timestamps = {}

@app.get("/api/fetch_and_store_historical/{coin_id}")
def fetch_and_store_historical(coin_id: str):
    """Fetch new historical data for a coin and write each point with its exact timestamp to TStore."""
    start = last_known_timestamps.get(coin_id, 0)
    end = int(time.time() * 1000)
    api_interval = 'm1'
    
    url = f"{COINCAP_API_URL}/assets/{coin_id}/history?start={start}&end={end}&interval={api_interval}"
    headers_cc = {"Authorization": f"Bearer {COINCAP_API_KEY}"}

    try:
        response = requests.get(url, headers=headers_cc)
        response.raise_for_status()
        data = response.json()
        points = data.get("data", [])

        if not points:
            return {"status": "no new data", "coin_id": coin_id}

        num_written = 0
        max_timestamp = start

        for p in points:
            price_str = p.get("priceUsd")
            ts_ms = p.get("time")
            if price_str and ts_ms:
                price_float = float(price_str)
                tstore_key = f"crypto|symbol={coin_id.lower()}"
                tstore_write_point_exact(tstore_key, ts_ms, price_float)
                num_written += 1
                if ts_ms > max_timestamp:
                    max_timestamp = ts_ms

        last_known_timestamps[coin_id] = max_timestamp

        return {
            "status": "success",
            "coin_id": coin_id,
            "points_written": num_written,
            "last_timestamp_now": max_timestamp
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching/storing historical data for {coin_id}: {str(e)}")

# -----------------------------------------
# Section 7: Calculate & Store 24hr High/Low
# -----------------------------------------
@app.get("/api/update_24hrHistory/{coin_id}")
def update_24hr_history(coin_id: str):
    """
    Fetch historical data for the past 24 hours at 5-minute intervals.
    Store the values in TStore with proper timestamps for graphing.
    """
    try:
        # Define the full 24-hour window (in milliseconds)
        end = int(time.time() * 1000)
        start = end - (24 * 60 * 60 * 1000)
        api_interval = 'm5'  # 5-minute intervals
        
        # Fetch historical data from the CoinCap API
        url = f"{COINCAP_API_URL}/assets/{coin_id}/history?start={start}&end={end}&interval={api_interval}"
        headers = {"Authorization": f"Bearer {COINCAP_API_KEY}"}
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        history_data = response.json().get("data", [])
        
        if not history_data:
            return {"status": "no data", "coin_id": coin_id}
        
        # Prepare payload with proper timestamps for TStore
        payload = {}
        for point in history_data:
            price = float(point.get("priceUsd", 0))
            ts_ms = point.get("time")
            if ts_ms:
                ts_micro = ts_ms * 1000  # Convert milliseconds to microseconds
                tstore_key = f"crypto|symbol={coin_id.lower()},metric=priceHistory"
                if tstore_key not in payload:
                    payload[tstore_key] = []
                payload[tstore_key].append({
                    "ts": ts_micro,
                    "v": price
                })
        
        # Send the data to TStore
        tstore_resp = requests.post("http://borg-ci.transpara.com:10001/write/write-data",
                                    json=payload, headers=TSTORE_HEADERS)
        tstore_resp.raise_for_status()
        
        return {
            "status": "success",
            "coin_id": coin_id,
            "points_written": len(history_data)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating 24hr history for {coin_id}: {str(e)}")

@app.get("/api/update_24hrHighLow/{coin_id}")
def update_24hr_high_low(coin_id: str):
    try:
        # Define the full 24-hour window (in ms)
        end = int(time.time() * 1000)
        start = end - (24 * 60 * 60 * 1000)
        api_interval = 'm5'
        
        # Fetch all historical data from the past 24 hours
        url = f"{COINCAP_API_URL}/assets/{coin_id}/history?start={start}&end={end}&interval={api_interval}"
        headers = {"Authorization": f"Bearer {COINCAP_API_KEY}"}
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        history_data = response.json().get("data", [])
        
        if not history_data:
            return {"status": "no data", "coin_id": coin_id}
        
        # Extract valid price data and calculate the aggregated high and low
        prices = [float(point["priceUsd"]) for point in history_data if point.get("priceUsd")]
        if not prices:
            return {"status": "no valid prices", "coin_id": coin_id}
        
        high = max(prices)
        low = min(prices)
        
        ts_micro = int(time.time() * 1_000_000)  # Use the current time for the timestamp  
        key_high = f"crypto|symbol={coin_id.lower()},metric=24hrHigh"
        key_low = f"crypto|symbol={coin_id.lower()},metric=24hrLow"
        payload = {
            key_high: [{"ts": ts_micro, "v": high}],
            key_low: [{"ts": ts_micro, "v": low}]
        }
        
        tstore_resp = requests.post("http://borg-ci.transpara.com:10001/write/write-data",
                                    json=payload, headers=TSTORE_HEADERS)
        tstore_resp.raise_for_status()
        
        return {"status": "success", "24hrHigh": high, "24hrLow": low}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating 24hr high/low for {coin_id}: {str(e)}")

@app.get("/api/update_24hrPriceChange/{coin_id}")
def update_24hr_price_change(coin_id: str):
    try:
        # Define the full 24-hour window (in ms)
        end = int(time.time() * 1000)
        start = end - (24 * 60 * 60 * 1000)
        api_interval = 'm5'
        
        # Fetch all historical data from the past 24 hours
        url = f"{COINCAP_API_URL}/assets/{coin_id}/history?start={start}&end={end}&interval={api_interval}"
        headers = {"Authorization": f"Bearer {COINCAP_API_KEY}"}
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        history_data = response.json().get("data", [])
        
        if not history_data:
            return {"status": "no data", "coin_id": coin_id}
        
        # Extract the latest and oldest price data
        latest_price = float(history_data[-1]["priceUsd"])
        oldest_price = float(history_data[0]["priceUsd"])
        
        # Calculate the 24-hour price change (absolute and percentage)
        price_change = latest_price - oldest_price
        price_change_percent = ((latest_price - oldest_price) / oldest_price) * 100
        
        # Use the current timestamp to store data
        ts_micro = int(time.time() * 1_000_000)
        
        # Define TStore keys for price change and percentage change
        key_change = f"crypto|symbol={coin_id.lower()},metric=24hrChange"
        key_change_percent = f"crypto|symbol={coin_id.lower()},metric=24hrChangePercent"
        
        # Prepare the payload to send to TStore
        payload = {
            key_change: [{"ts": ts_micro, "v": price_change}],
            key_change_percent: [{"ts": ts_micro, "v": price_change_percent}]
        }
        
        # Send the data to TStore
        tstore_resp = requests.post("http://borg-ci.transpara.com:10001/write/write-data",
                                    json=payload, headers=TSTORE_HEADERS)
        tstore_resp.raise_for_status()
        
        return {
            "status": "success",
            "coin_id": coin_id,
            "24hrChange": price_change,
            "24hrChangePercent": price_change_percent
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating 24hr price change for {coin_id}: {str(e)}")

async def high_low_updater():
    """Fetch all coin IDs and update 24-hour high, low, and price change for each coin."""
    while True:
        try:
            # Fetch the list of all available coins from CoinCap
            url = f"{COINCAP_API_URL}/assets?limit=500"
            headers = {"Authorization": f"Bearer {COINCAP_API_KEY}"}
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            data = response.json().get("data", [])

            for coin in data:
                coin_id = coin.get("id")  
                if coin_id:
                    await asyncio.to_thread(update_24hr_high_low, coin_id)
                    await asyncio.to_thread(update_24hr_price_change, coin_id)
                    await asyncio.to_thread(update_24hr_history, coin_id)  

        
        except Exception as e:
            print(f"Error updating 24-hour metrics for all coins: {e}")
        # updates every 15mns
        await asyncio.sleep(900)  

previous_ema = None
smoothing_factor = 0.2  

def store_live_price(coin_id, price):
    global previous_ema
    if previous_ema is None:
        previous_ema = price
    else:
        previous_ema = (price * smoothing_factor) + (previous_ema * (1 - smoothing_factor))
    
    tstore_key = f"crypto|symbol={coin_id.lower()}"
    unix_ms = int(time.time() * 1000)
    tstore_write_point_exact(tstore_key, unix_ms, previous_ema)
@app.get("/api/coin_metrics/{coin_id}")
def get_coin_metrics(coin_id: str):
    try:
        url = f"{COINCAP_API_URL}/assets/{coin_id}"
        headers = {"Authorization": f"Bearer {COINCAP_API_KEY}"}
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json().get("data", {})

        # Calculate a 24hr change percentage.
        price = float(data.get("priceUsd", 0))
        change_24hr = float(data.get("changePercent24Hr", 0))
        market_cap = float(data.get("marketCapUsd", 0))
        volume_24hr = float(data.get("volumeUsd24Hr", 0))
        all_time_high = None  

        metrics = {
            "price": price,
            "change24hr": change_24hr,
            "marketCap": market_cap,
            "volume24hr": volume_24hr,
            "allTimeHigh": all_time_high,
        }
        return {"status": "success", "coin": coin_id, "metrics": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching coin metrics: {e}")

async def run_coincap_websocket():
    """Connect to CoinCap WebSocket and write each live price update to TStore."""
    url = "wss://ws.coincap.io/prices?assets=bitcoin"
    async with websockets.connect(url) as websocket:
        while True:
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=1)
                price_data = json.loads(message)
                # For each coin in the message, store the live price.
                for coin_id, price_str in price_data.items():
                    price = float(price_str)
                    store_live_price(coin_id, price)
            except asyncio.TimeoutError:
                continue

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(market_data_broadcaster())
    asyncio.create_task(high_low_updater())
    asyncio.create_task(run_coincap_websocket())


# -----------------------------------------
# End of Code
# -----------------------------------------
if __name__ == '__main__':
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
