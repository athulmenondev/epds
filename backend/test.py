import joblib
import os
import re

# ==========================================
# 1. Configuration & Loading
# ==========================================
MODEL_PATH = 'phishing_rf_model.pkl'
VECTORIZER_PATH = 'tfidf_vectorizer.pkl'
INPUT_FILE = 'mail.txt'

def load_resources():
    if not os.path.exists(MODEL_PATH) or not os.path.exists(VECTORIZER_PATH):
        print("❌ Error: Model or Vectorizer files not found!")
        print("Please run your training script (train.py) first.")
        return None, None
    
    model = joblib.load(MODEL_PATH)
    vectorizer = joblib.load(VECTORIZER_PATH)
    return model, vectorizer

# ==========================================
# 2. Text Preprocessing
# ==========================================
def clean_email_text(text):
    # Remove newline characters, carriage returns, and tabs
    text = text.replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
    
    # Replace URLs with a placeholder to keep features consistent
    text = re.sub(r'http\S+|www\S+|https\S+', 'url_link', text, flags=re.MULTILINE)
    
    # Convert to lowercase and remove extra whitespace
    text = " ".join(text.lower().split())
    
    return text

# ==========================================
# 3. Main Execution
# ==========================================
def main():
    # Load the "brain"
    model, vectorizer = load_resources()
    if not model: return

    # Check if the text file exists
    if not os.path.exists(INPUT_FILE):
        print(f"❌ Error: '{INPUT_FILE}' not found.")
        print("Please create a file named 'mail.txt' and paste your email content inside it.")
        return

    # Read the content from the file
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        raw_content = f.read()

    if len(raw_content.strip()) < 5:
        print("⚠️  The mail.txt file is empty or too short. Please add more content.")
        return

    print("🔄 Processing email from mail.txt...")

    # 1. Clean the input
    cleaned_text = clean_email_text(raw_content)

    # 2. Vectorize (Translate to numbers)
    transformed_data = vectorizer.transform([cleaned_text])

    # 3. Predict Probability & Class
    probabilities = model.predict_proba(transformed_data)[0]
    prediction = model.predict(transformed_data)[0]
    confidence = probabilities[prediction] * 100

    # 4. Display Results
    print("\n" + "="*50)
    print("           DETECTION RESULTS")
    print("="*50)
    
    if prediction == 1:
        print(f"STATUS:     [ ⚠️  PHISHING DETECTED ]")
        print(f"CONFIDENCE: {confidence:.2f}%")
        print("\nREASONING: The model identified patterns commonly found in")
        print("fraudulent emails (urgent language, suspicious links, etc).")
    else:
        print(f"STATUS:     [ ✅ SAFE / LEGITIMATE ]")
        print(f"CONFIDENCE: {confidence:.2f}%")
        print("\nREASONING: The model identified patterns consistent with")
        print("standard personal or business communication.")
    
    print("="*50)

if __name__ == "__main__":
    main()
