from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import re

app = Flask(__name__)
CORS(app)

# 1. Load Phishing Model (Incoming)
# Make sure these files are in the same directory as main.py
try:
    model = joblib.load('phishing_rf_model.pkl')
    vectorizer = joblib.load('tfidf_vectorizer.pkl')
except Exception as e:
    print(f"Error loading models: {e}. Did you run train.py first?")

# 2. Multi-Stage Inspection Engine (Outgoing)
class MultiStageDLP:
    def __init__(self, internal_domain="yourcollege.edu"):
        self.internal_domain = internal_domain
        self.patterns = {
            "Credit Card": r"\b(?:\d[ -]*?){13,16}\b",
            "SSN": r"\b\d{3}-\d{2}-\d{4}\b",
            "Secret Key": r"-----BEGIN .* PRIVATE KEY-----",
            "API Key": r"(?:key|api|token|secret)[-_=:\s]*[a-zA-Z0-9]{20,}"
        }
        self.keywords = ["confidential", "internal use only", "secret", "blueprint", "restricted"]

    def inspect(self, content, recipient_email):
        violations = []
        
        # Stage 1: Pattern Match
        for name, pattern in self.patterns.items():
            if re.search(pattern, content, re.IGNORECASE):
                violations.append(f"Sensitive Pattern: {name}")

        # Stage 2: Keyword Match
        found_words = [w for w in self.keywords if w in content.lower()]
        if found_words:
            violations.append(f"Restricted Words: {', '.join(found_words)}")

        # Stage 3: Contextual Check (External Recipient)
        is_external = not recipient_email.endswith(self.internal_domain)
        is_safe = len(violations) == 0
        
        # If violations exist and it's going outside, it's a critical failure
        if not is_safe and is_external:
            violations.append("Target: External Recipient (High Risk)")

        return {"is_safe": is_safe, "violations": violations}

# Initialize the pipeline
dlp_pipeline = MultiStageDLP(internal_domain="yourcollege.edu")

# --- ROUTE 1: INCOMING (PHISHING) ---
@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        email_content = data.get('content', '')
        if not email_content: 
            return jsonify({'error': 'No content provided'}), 400

        vectorized_text = vectorizer.transform([email_content])
        prediction = model.predict(vectorized_text)[0]
        # We get the probability of it being Phishing (class 1)
        probability = model.predict_proba(vectorized_text)[0][1]

        return jsonify({
            'prediction': 'Phishing' if prediction == 1 else 'Legitimate',
            'confidence': round(probability * 100, 2),
            'status': 'success'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- ROUTE 2: OUTGOING (CONFIDENTIALITY) ---
@app.route('/analyze-outgoing', methods=['POST'])
def analyze_outgoing():
    try:
        data = request.get_json()
        email_content = data.get('content', '')
        # Default recipient if frontend doesn't send one
        recipient = data.get('recipient', 'external@unknown.com')

        if not email_content:
            return jsonify({'error': 'No content provided'}), 400

        # Run the Multi-Stage Pipeline
        report = dlp_pipeline.inspect(email_content, recipient)

        # MAP TO FRONTEND FORMAT (ResultDisplay.jsx expects 'prediction' and 'confidence')
        # If NOT safe, we return "Phishing" so the UI turns Red
        return jsonify({
            'prediction': 'Legitimate' if report["is_safe"] else 'Phishing',
            'confidence': 99.0 if not report["is_safe"] else 95.0,
            'status': 'success',
            'violations': report["violations"]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Running on 7860 as per your i3/Debian setup
    app.run(host='0.0.0.0', port=7860, debug=True)