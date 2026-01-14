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
        print("Please ensure you ran 'python3 train.py' successfully first.")
        return None, None
    
    # This loads the "Large Model" (200 trees + modern data)
    model = joblib.load(MODEL_PATH)
    vectorizer = joblib.load(VECTORIZER_PATH)
    return model, vectorizer

# ==========================================
# 2. Text Preprocessing
# ==========================================
def clean_email_text(text):
    # Remove newline characters, carriage returns, and tabs
    text = text.replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
    
    # Replace URLs with a placeholder so the model focuses on content context
    text = re.sub(r'http\S+|www\S+|https\S+', 'url_link', text, flags=re.MULTILINE)
    
    # Convert to lowercase and remove extra whitespace
    text = " ".join(text.lower().split())
    
    return text

# ==========================================
# 3. Main Logic
# ==========================================
def main():
    # Load the trained brain and translator
    model, vectorizer = load_resources()
    if not model: return

    # Check for the input file
    if not os.path.exists(INPUT_FILE):
        print(f"❌ Error: '{INPUT_FILE}' not found in the project folder.")
        print("Action: Create a file named 'mail.txt' and paste an email inside it.")
        return

    # Read the content from your mail.txt
    with open(INPUT_FILE, 'r', encoding='utf-8', errors='ignore') as f:
        raw_content = f.read()

    if len(raw_content.strip()) < 5:
        print("⚠️  The mail.txt file is too empty. Paste more content to test.")
        return

    print(f"🔍 System: Scanning content from '{INPUT_FILE}'...")

    # 1. Clean the text (Removes newline issues)
    cleaned_text = clean_email_text(raw_content)

    # 2. Vectorize (Convert text to the Large Model's number format)
    transformed_data = vectorizer.transform([cleaned_text])

    # 3. Predict Probability & Final Result
    # [Safe Probability, Phishing Probability]
    probabilities = model.predict_proba(transformed_data)[0]
    prediction = model.predict(transformed_data)[0]
    
    confidence = probabilities[prediction] * 100

    # 4. Display Results
    print("\n" + "="*50)
    print("           PHISHING DETECTION REPORT")
    print("="*50)
    
    if prediction == 1:
        print(f"VERDICT:    [ ⚠️  PHISHING DETECTED ]")
        print(f"CONFIDENCE: {confidence:.2f}%")
        print("\nReasoning: Found strong linguistic patterns used by scammers.")
    else:
        print(f"VERDICT:    [ ✅ SAFE / LEGITIMATE ]")
        print(f"CONFIDENCE: {confidence:.2f}%")
        print("\nReasoning: Content matches standard communication patterns.")
    
    print("="*50)

if __name__ == "__main__":
    main()
