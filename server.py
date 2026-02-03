from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import joblib
import pandas as pd
import uvicorn
import os
import datetime

# Initialize App
app = FastAPI(title="PAMA Threat Detection API")

# Allow CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Models
MODEL_PATH = "ml/best_model.pkl"
RISK_MODEL_PATH = "ml/risk_model.pkl"
VECT_PATH = "ml/vectorizer.pkl"
model = None
risk_model = None
vectorizer = None

try:
    if os.path.exists(MODEL_PATH) and os.path.exists(VECT_PATH) and os.path.exists(RISK_MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        risk_model = joblib.load(RISK_MODEL_PATH)
        vectorizer = joblib.load(VECT_PATH)
        print("[System] Models and Vectorizer loaded successfully.")
except Exception as e:
    print(f"[Error] Failed to load models: {str(e)}")

# --- In-Memory Incident Store ---
# In a real app, this would be a database
incidents = []
# Store user risk history: {username: [score1, score2, ...]}
user_history = {}

class CommandRequest(BaseModel):
    command: str
    username: str
    role: str

@app.get("/")
def home():
    return {"status": "online", "system": "PAMA Security Node"}

@app.post("/predict")
def predict_command(request: CommandRequest):
    if not model or not vectorizer:
        raise HTTPException(status_code=503, detail="Model not initialized")
    
    cmd = request.command
    
    # Predict Label
    vec_input = vectorizer.transform([cmd])
    prediction = model.predict(vec_input)[0]
    
    # Predict Risk Score
    current_risk_score = int(risk_model.predict(vec_input)[0])
    
    # Update User History with Timestamps
    if request.username not in user_history:
        user_history[request.username] = []
    
    now = datetime.datetime.now()
    user_history[request.username].append({"command": cmd, "score": current_risk_score, "time": now})
    
    # Calculate Daily Average (Today)
    today_scores = [x['score'] for x in user_history[request.username] if x['time'].date() == now.date()]
    daily_avg = sum(today_scores) / len(today_scores) if today_scores else 0.0
    
    # Calculate Weekly Total (Last 7 Days)
    week_start = now - datetime.timedelta(days=7)
    weekly_scores = [x['score'] for x in user_history[request.username] if x['time'] >= week_start]
    weekly_total = int(sum(weekly_scores))
    
    # Use Daily Average for the response
    avg_risk_score = daily_avg

    try:
        proba = model.predict_proba(vec_input)[0][1]
    except:
        proba = 0.0
        
    result_label = "risky" if prediction == 1 else "normal"
    
    # --- INCIDENT LOGGING ---
    # Log if it's RISKY and thresholds are exceeded: (Daily Avg > 8) OR (Weekly Total > 80)
    # The user asked for "if it happens [exceeded] the alert message should be sent"
    limit_exceeded = (daily_avg > 7) or (weekly_total >= 80)
    
    if result_label == "risky" and limit_exceeded:
        print(f"[ALERT] Risky command '{cmd}' by {request.username}")
        # Add to global list
        incident = {
            "id": len(incidents) + 1,
            "timestamp": datetime.datetime.now().strftime("%H:%M:%S"),
            "user": request.username,
            "command": cmd,
            "daily_avg": float(f"{daily_avg:.2f}"),
            "weekly_total": int(weekly_total),
            "read": False,
            "limit_exceeded": True
        }
        incidents.append(incident)
    
    return {
        "command": cmd,
        "prediction": result_label,
        "risk_score": current_risk_score,
        "average_risk_score": float(f"{avg_risk_score:.2f}"),
        "weekly_total_risk": int(weekly_total)
    }

@app.get("/notifications")
def get_notifications():
    # Return all for demo purposes, or just unread
    # Reversed to show newest first
    return incidents[::-1]

# New endpoint to fetch all commands for a specific user
@app.get("/user_commands/{username}")
def get_user_commands(username: str):
    # Return the list of command entries for the given user
    history = user_history.get(username, [])
    # Convert datetime objects to string for JSON serialization
    return [
        {
            "command": entry.get("command", ""),
            "score": entry.get("score", 0),
            "time": entry["time"].strftime("%Y-%m-%d %H:%M:%S")
        }
        for entry in history
    ]

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
