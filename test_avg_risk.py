import requests
import time

def test_predictions():
    url = "http://localhost:8000/predict"
    user = "testuser_avg"
    
    # 1. Safe Command (Expect Low Risk)
    payload1 = {"command": "ls -la", "username": user, "role": "user"}
    try:
        resp1 = requests.post(url, json=payload1)
        data1 = resp1.json()
        print(f"Pred 1: {data1}")
        score1 = data1['risk_score']
    except Exception as e:
        print(f"Failed to connect: {e}")
        return

    # 2. Risky Command (Expect High Risk)
    payload2 = {"command": "rm -rf /", "username": user, "role": "user"}
    resp2 = requests.post(url, json=payload2)
    data2 = resp2.json()
    print(f"Pred 2: {data2}")
    score2 = data2['risk_score']
    
    # 3. Verify Average
    avg_reported = data2['average_risk_score']
    avg_calculated = (score1 + score2) / 2
    
    print(f"\nScore 1: {score1}")
    print(f"Score 2: {score2}")
    print(f"Reported Avg: {avg_reported}")
    print(f"Calculated Avg: {avg_calculated}")
    
    if abs(avg_reported - avg_calculated) < 0.05:
        print("\n[SUCCESS] Average Risk Score Verified!")
    else:
        print("\n[FAILURE] Average Risk Score Mismatch!")

if __name__ == "__main__":
    # Wait for server to be ready
    time.sleep(2)
    test_predictions()
