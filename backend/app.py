# app.py
from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import os
import time
from dotenv import load_dotenv
from flask_socketio import SocketIO, emit

# Load environment variables from .env
load_dotenv()

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Base URL and API key for CoinCap
COINCAP_API_URL = "https://api.coincap.io/v2"
COINCAP_API_KEY = os.getenv("COINCAP_API_KEY", "your_api_key_here")

@app.route('/api/market', methods=['GET'])
def get_market_data():
    """
    Fetches coin market data using the /assets endpoint with a limit of 500.
    This endpoint returns detailed information including coin names.
    """
    url = f"{COINCAP_API_URL}/assets?limit=500"
    headers = {"Authorization": f"Bearer {COINCAP_API_KEY}"}
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
    except requests.RequestException as e:
        return jsonify({"error": "Failed to fetch market data", "details": str(e)}), 500

    data = response.json()
    return jsonify(data)

@app.route('/api/history/<coin_id>', methods=['GET'])
def get_history(coin_id):
    """
    Fetches historical price data for a specific coin based on a custom range.
    Use the query parameter 'range' with one of these options: max, 1yr, 3m, 1m, 7d, 24hr.
    The endpoint calculates the appropriate start and end timestamps and sets a suitable interval.
    """
    range_option = request.args.get('range', '24hr')
    end = int(time.time() * 1000)  # current time in ms
    start = None
    api_interval = None

    if range_option == 'max':
        # "max" data from the beginning; CoinCap expects a start of 0 for maximum range
        start = 0
        api_interval = 'd1'
    elif range_option == '1yr':
        start = end - (365 * 24 * 60 * 60 * 1000)
        api_interval = 'd1'
    elif range_option == '3m':
        start = end - (90 * 24 * 60 * 60 * 1000)
        api_interval = 'h12'
    elif range_option == '1m':
        start = end - (30 * 24 * 60 * 60 * 1000)
        api_interval = 'h1'
    elif range_option == '7d':
        start = end - (7 * 24 * 60 * 60 * 1000)
        api_interval = 'h1'
    elif range_option == '24hr':
        start = end - (24 * 60 * 60 * 1000)
        api_interval = 'm5'
    else:
        # Default to 24hr if unrecognized
        start = end - (24 * 60 * 60 * 1000)
        api_interval = 'm5'

    url = f"{COINCAP_API_URL}/assets/{coin_id}/history?start={start}&end={end}&interval={api_interval}"
    headers = {"Authorization": f"Bearer {COINCAP_API_KEY}"}
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
    except requests.RequestException as e:
        return jsonify({"error": "Failed to fetch historical data", "details": str(e)}), 500

    data = response.json()
    return jsonify(data)

def background_thread():
    """
    Background thread that fetches market data every 10 seconds and emits it via SocketIO.
    """
    while True:
        time.sleep(10)
        url = f"{COINCAP_API_URL}/assets?limit=500"
        headers = {"Authorization": f"Bearer {COINCAP_API_KEY}"}
        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            socketio.emit('market_data', data)
            print("Emitted market data update")
        except Exception as e:
            print("Error in background thread:", e)

@socketio.on('connect')
def handle_connect():
    print("Client connected")
    # Start the background thread when a client connects.
    socketio.start_background_task(background_thread)

@socketio.on('disconnect')
def handle_disconnect():
    print("Client disconnected")

if __name__ == '__main__':
    socketio.run(app, debug=True)
