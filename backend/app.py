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
    Fetches coin market data using the /assets endpoint.
    This endpoint returns detailed information including coin names.
    """
    url = f"{COINCAP_API_URL}/assets"
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
    Fetches historical price data for a specific coin.
    Optional query parameter 'interval' (default: 'm1' for 1 minute).
    """
    interval = request.args.get('interval', 'm1')
    url = f"{COINCAP_API_URL}/assets/{coin_id}/history?interval={interval}"
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
        url = f"{COINCAP_API_URL}/assets"
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
