import pandas as pd
import glob
import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score

# ==========================================
# 1. Load and Merge Data
# ==========================================
# Path points to the 'data' folder in your project directory
path = os.path.join(os.path.dirname(__file__), 'data') 
all_files = glob.glob(os.path.join(path, "*.csv"))

li = []

if not all_files:
    print(f"Error: No CSV files found in {path}. Check your directory structure.")
else:
    for filename in all_files:
        try:
            df = pd.read_csv(filename)
            # Standardize column names
            df.columns = [c.lower().strip() for c in df.columns]
            
            # UNIFY TEXT COLUMNS: Handle 'body', 'message', and 'text_combined'
            if 'body' in df.columns: 
                df.rename(columns={'body': 'text'}, inplace=True)
            elif 'message' in df.columns: 
                df.rename(columns={'message': 'text'}, inplace=True)
            elif 'text_combined' in df.columns: 
                df.rename(columns={'text_combined': 'text'}, inplace=True)
            
            # UNIFY LABEL COLUMNS: Handle 'class' or 'status'
            if 'class' in df.columns: 
                df.rename(columns={'class': 'label'}, inplace=True)
            
            # Ensure we only keep 'text' and 'label' columns
            if 'text' in df.columns and 'label' in df.columns:
                li.append(df[['text', 'label']])
            else:
                print(f"Skipping {os.path.basename(filename)}: Required columns not found. (Found: {list(df.columns)})")
        except Exception as e:
            print(f"Could not read {filename}: {e}")

# Proceed only if data was loaded
if not li:
    print("Error: No valid data found. Script exiting.")
    exit()

# Final merged dataframe
data = pd.concat(li, axis=0, ignore_index=True).dropna()
print(f"Total rows loaded: {len(data)}")

# ==========================================
# 2. Split Data (80% Train, 20% Test)
# ==========================================
X_train, X_test, y_train, y_test = train_test_split(
    data['text'], data['label'], test_size=0.2, random_state=42
)

# ==========================================
# 3. Text to Numbers (Vectorization)
# ==========================================
print("Vectorizing text data...")
vectorizer = TfidfVectorizer(stop_words='english', max_features=5000)
X_train_tfidf = vectorizer.fit_transform(X_train)
X_test_tfidf = vectorizer.transform(X_test)

# ==========================================
# 4. Train Random Forest
# ==========================================
print("Training the Random Forest model... (this may take a minute)")
rf = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
rf.fit(X_train_tfidf, y_train)

# ==========================================
# 5. Evaluate
# ==========================================
y_pred = rf.predict(X_test_tfidf)
print("\n--- Model Performance ---")
print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
print(classification_report(y_test, y_pred))

# ==========================================
# 6. Save Model and Vectorizer
# ==========================================
joblib.dump(rf, 'phishing_rf_model.pkl')
joblib.dump(vectorizer, 'tfidf_vectorizer.pkl')
print("\nModel and Vectorizer saved as .pkl files!")

# ==========================================
# 7. Quick Test Function
# ==========================================
def predict_email(email_content):
    email_tfidf = vectorizer.transform([email_content])
    prediction = rf.predict(email_tfidf)[0]
    return "PHISHING" if prediction == 1 else "SAFE (Ham)"

# Example usage
print("-" * 30)
test_email = "Your Amazon order has a problem. Click here to verify your payment info immediately."
print(f"Test Email: {test_email}")
print(f"Prediction: {predict_email(test_email)}")
