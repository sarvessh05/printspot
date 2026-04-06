import requests
import json
import random
import string
import sys

BASE_URL = "http://localhost:8080"
ADMIN_PASSWORD = "Sahil@123" # Match with your .env

def test_health():
    print("Testing /health ...", end=" ")
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            print("PASS ✅")
            return True
        else:
            print(f"FAIL ❌ (Status: {response.status_code})")
            return False
    except Exception as e:
        print(f"FAIL ❌ (Exception: {e})")
        return False

def test_pricing_get():
    print("Testing GET /api/settings/pricing ...", end=" ")
    try:
        response = requests.get(f"{BASE_URL}/api/settings/pricing")
        if response.status_code == 200:
            pricing = response.json()
            print(f"PASS ✅ (Pricing: B/W={pricing.get('bw', '??')}, Color={pricing.get('color', '??')})")
            return True
        else:
            print(f"FAIL ❌ (Status: {response.status_code})")
            return False
    except Exception as e:
        print(f"FAIL ❌ ({e})")
        return False

def test_pricing_update():
    print("Testing POST /api/settings/pricing ...", end=" ")
    test_pricing = {"bw": 3, "color": 15, "double_sided_discount": 0}
    headers = {"X-Admin-Password": ADMIN_PASSWORD, "Content-Type": "application/json"}
    try:
        response = requests.post(f"{BASE_URL}/api/settings/pricing", json=test_pricing, headers=headers)
        if response.status_code == 200:
            print("PASS ✅")
            return True
        else:
            print(f"FAIL ❌ (Status: {response.status_code})")
            print(f"DEBUG: Response: {response.text}")
            return False
    except Exception as e:
        print(f"FAIL ❌ ({e})")
        return False

def test_order_batch_create():
    print("Testing POST /api/orders/create-batch ...", end=" ")
    payload = {
        "items": [
            {
                "file_name": "test_batch_1.pdf",
                "file_url": "https://example.com/1.pdf",
                "copies": 1,
                "mode": "bw",
                "is_two_sided": False,
                "print_range": "All Pages",
                "total_pages": 5,
                "total_amount": 10,
                "unique_name": f"test_{random.randint(1000, 9999)}_1"
            },
            {
                "file_name": "test_batch_2.pdf",
                "file_url": "https://example.com/2.pdf",
                "copies": 2,
                "mode": "color",
                "is_two_sided": True,
                "print_range": "All Pages",
                "total_pages": 4,
                "total_amount": 30,
                "unique_name": f"test_{random.randint(1000, 9999)}_2"
            }
        ],
        "payment_id": "pay_test_001",
        "total_grand_amount": 40
    }
    try:
        response = requests.post(f"{BASE_URL}/api/orders/create-batch", json=payload)
        if response.status_code == 200:
            data = response.json()
            if "otp" in data:
                print(f"PASS ✅ (OTP: {data['otp']})")
                return data['otp']
            else:
                print("FAIL ❌ (No OTP in response)")
                return False
        else:
            print(f"FAIL ❌ (Status: {response.status_code}, Msg: {response.text})")
            return False
    except Exception as e:
        print(f"FAIL ❌ ({e})")
        return False

if __name__ == "__main__":
    print("-" * 40)
    print("PRINT SPOT CLOUD BACKEND SANITY CHECK")
    print("-" * 40)
    
    success = True
    if not test_health(): 
        print("\n[HINT] Is the admin-backend running? (uvicorn server:app)")
        sys.exit(1)
        
    test_pricing_get()
    test_pricing_update()
    otp = test_order_batch_create()
    
    print("-" * 40)
    print("Check complete. See above for results.")
    print("-" * 40)
