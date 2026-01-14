import joblib

# 1. Load the saved "brain" and "translator"
model = joblib.load('phishing_model.pkl')
vectorizer = joblib.load('vectorizer.pkl')

def detect_phishing(email_text):
    # The text MUST be transformed by the same vectorizer used in training
    transformed_text = vectorizer.transform([email_text])
    prediction = model.predict(transformed_text)[0]
    
    if prediction == 1:
        return "⚠️ ALERT: This looks like a PHISHING email."
    else:
        return "✅ This email seems SAFE."

# Example Usage:
user_input = input("Paste email content here: ")
result = detect_phishing(user_input)
print(result)
