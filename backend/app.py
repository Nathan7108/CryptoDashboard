# app.py
from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import os
import time
from dotenv import load_dotenv
from flask_socketio import SocketIO, emit

load_dotenv()

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

COINCAP_API_URL = "https://api.coincap.io/v2"
COINCAP_API_KEY = os.getenv("COINCAP_API_KEY", "your_api_key_here")

@app.route('/api/market', methods=['GET'])
def get_market_data():
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
    try:
        range_option = request.args.get('range', '24hr')
        end = int(time.time() * 1000)  # current time in ms
        start = None
        api_interval = None

        if range_option == 'max':
            start = 0
            api_interval = 'd1'
        elif range_option == '1yr':
            start = end - (365 * 24 * 60 * 60 * 1000)
            api_interval = 'h12'
        elif range_option == '3m':
            start = end - (90 * 24 * 60 * 60 * 1000)
            api_interval = 'h12'
        elif range_option == '1m':
            start = end - (30 * 24 * 60 * 60 * 1000)
            api_interval = 'h1'
        elif range_option == '1hr':
            start = end - (60 * 60 * 1000)
            api_interval = 'm1'
        elif range_option == '7d':
            start = end - (7 * 24 * 60 * 60 * 1000)
            api_interval = 'h1'
        elif range_option == '24hr':
            start = end - (24 * 60 * 60 * 1000)
            api_interval = 'm5'
        else:
            start = end - (24 * 60 * 60 * 1000)
            api_interval = 'm5'

        url = f"{COINCAP_API_URL}/assets/{coin_id}/history?start={start}&end={end}&interval={api_interval}"
        headers = {"Authorization": f"Bearer {COINCAP_API_KEY}"}
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()
        return jsonify(data)
    except Exception as e:
        print("Error in get_history:", e)
        return jsonify({"error": "Unhandled exception", "details": str(e)}), 500

def background_thread():
    """
    Background thread that fetches market data every 5 seconds and emits it via SocketIO.
    """
    while True:
        time.sleep(5)
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
    socketio.start_background_task(background_thread)

@socketio.on('disconnect')
def handle_disconnect():
    print("Client disconnected")

if __name__ == '__main__':
    socketio.run(app, debug=True)
