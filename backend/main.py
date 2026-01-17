# 1. Import necessary tools
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib

# 2. Initialize the Flask application
app = Flask(__name__)

# 3. Enable CORS (Cross-Origin Resource Sharing)
# This is CRITICAL. By default, browsers block a frontend (like React) 
# from talking to a backend on a different port. This line allows it.
CORS(app)

# 4. Load your saved Model and Vectorizer
# We do this OUTSIDE the route so they stay in memory (fast).
model = joblib.load('phishing_rf_model.pkl')
vectorizer = joblib.load('tfidf_vectorizer.pkl')

# 5. Define the "Predict" Route
# We use 'POST' because we are sending data (the email text) to the server.
@app.route('/predict', methods=['POST'])
def predict():
    try:
        # a. Get the JSON data sent by the frontend
        data = request.get_json()
        email_content = data.get('content', '')

        if not email_content:
            return jsonify({'error': 'No content provided'}), 400

        # b. Transform the text
        # The model doesn't understand "Dear Customer". 
        # The vectorizer turns it into the same number patterns used in training.
        print(email_content)
        vectorized_text = vectorizer.transform([email_content])

        # c. Make the prediction
        # prediction[0] will be 1 (Phishing) or 0 (Legitimate)
        prediction = model.predict(vectorized_text)[0]
        
        # d. Get the probability (confidence score)
        # predict_proba returns [[prob_0, prob_1]]. We want prob_1 (Phishing).
        probability = model.predict_proba(vectorized_text)[0][1]
        print("pred=", prediction, "prob=", probability)
        # e. Send the response back as JSON
        return jsonify({
            'prediction': 'Phishing' if prediction == 1 else 'Legitimate',
            'confidence': round(probability * 100, 2),
            'status': 'success'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 6. Run the server
if __name__ == '__main__':
    # We run on port 5000. 'debug=True' means the server restarts 
    # automatically if you change the code.
    app.run(host='0.0.0.0', port=5000, debug=True)