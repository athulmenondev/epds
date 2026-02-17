import os
import re
import json
import joblib
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
# Enable CORS so your React frontend can talk to this Debian-hosted backend
CORS(app)

# ==========================================
# 1. INCOMING SIDE: Random Forest Logic
# ==========================================
try:
    # Load the "brain" trained in your train.py
    model = joblib.load('phishing_rf_model.pkl')
    vectorizer = joblib.load('tfidf_vectorizer.pkl')
    print("✓ Phishing Model & Vectorizer loaded successfully.")
except Exception as e:
    print(f"✗ Error loading ML models: {e}. Ensure .pkl files exist.")

# ==========================================
# 2. OUTGOING SIDE: Multi-Stage DLP Logic
# ==========================================
class MultiStageDLP:
    def __init__(self, policy_path='policies.json'):
        # STAGE 1: Global Baseline Rules (Always Active)
        self.global_patterns = {
            "Credit Card": r"\b(?:\d[ -]*?){13,16}\b",
            "SSN": r"\b\d{3}-\d{2}-\d{4}\b",
            "RSA Private Key": r"-----BEGIN .* PRIVATE KEY-----"
        }
        
        self.policy_path = policy_path
        self.custom_keywords = []
        self.custom_patterns = {}
        self.internal_domains = []
        self.load_policies()

    def load_policies(self):
        """Loads custom rules from the JSON file"""
        if os.path.exists(self.policy_path):
            with open(self.policy_path, 'r') as f:
                data = json.load(f)
                self.custom_keywords = data.get('restricted_keywords', [])
                self.custom_patterns = data.get('patterns', {})
                self.internal_domains = data.get('internal_domains', [])
            print(f"✓ Policies loaded from {self.policy_path}")
        else:
            print(f"⚠️ {self.policy_path} not found. Using global rules only.")

    def inspect(self, content, recipient_email):
        violations = []
        
        # --- STAGE 1: GLOBAL REGEX CHECK ---
        for name, pattern in self.global_patterns.items():
            if re.search(pattern, content):
                violations.append(f"Global Security Alert: {name} detected.")

        # --- STAGE 2: CUSTOM JSON REGEX CHECK ---
        for name, pattern in self.custom_patterns.items():
            if re.search(pattern, content):
                violations.append(f"Company Policy Alert: {name} detected.")

        # --- STAGE 3: CUSTOM KEYWORD CHECK ---
        found_keywords = [w for w in self.custom_keywords if w.lower() in content.lower()]
        if found_keywords:
            violations.append(f"Restricted Keywords: {', '.join(found_keywords)}")

        # --- STAGE 4: CONTEXTUAL (DOMAIN) CHECK ---
        # Checks if recipient is outside allowed domains
        is_external = not any(recipient_email.endswith(domain) for domain in self.internal_domains)
        
        is_safe = len(violations) == 0
        
        # If violations exist and it's going outside, it's a critical failure
        if not is_safe and is_external:
            violations.append("Unauthorized external distribution of sensitive data.")

        return {"is_safe": is_safe, "violations": violations}

# Initialize the sending-side engine
dlp_pipeline = MultiStageDLP()

# ==========================================
# 3. API ROUTES
# ==========================================

# ROUTE 1: Incoming Phishing Detection
@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        email_content = data.get('content', '')
        
        if not email_content:
            return jsonify({'error': 'No content provided'}), 400

        # Transform text and predict using Random Forest
        vectorized_text = vectorizer.transform([email_content])
        prediction = model.predict(vectorized_text)[0]
        # Probability of being Phishing (Class 1)
        probability = model.predict_proba(vectorized_text)[0][1]

        return jsonify({
            'prediction': 'Phishing' if prediction == 1 else 'Legitimate',
            'confidence': round(probability * 100, 2),
            'status': 'success'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ROUTE 2: Outgoing Data Loss Prevention (DLP)
@app.route('/analyze-outgoing', methods=['POST'])
def analyze_outgoing():
    try:
        data = request.get_json()
        email_content = data.get('content', '')
        recipient = data.get('recipient', 'external@unknown.com')

        if not email_content:
            return jsonify({'error': 'No content provided'}), 400

        # Run the Multi-Stage Engine
        report = dlp_pipeline.inspect(email_content, recipient)

        # Standardize response for React ResultDisplay.jsx
        # 'Phishing' label is used to trigger Red UI warning in frontend
        return jsonify({
            'prediction': 'Legitimate' if report["is_safe"] else 'Phishing',
            'confidence': 99.0 if not report["is_safe"] else 95.0,
            'status': 'success',
            'violations': report["violations"]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==========================================
# 4. RUN SERVER
# ==========================================
if __name__ == '__main__':
    # Running on 7860 to match your Debian setup
    app.run(host='0.0.0.0', port=7860, debug=True)