import requests
import json

URL = "http://localhost:8082/api/payments/create-order"
DATA = {"amount": 10}

try:
    response = requests.post(URL, json=DATA)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Connection Error: {e}")
