import pandas as pd
import glob
import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier

# 1. Load Data
path = os.path.join(os.path.dirname(__file__), 'data') 
all_files = glob.glob(os.path.join(path, "*.csv"))
li = []

for filename in all_files:
    df = pd.read_csv(filename)
    df.columns = [c.lower().strip() for c in df.columns]
    # Unify text/label columns
    if 'body' in df.columns: df.rename(columns={'body': 'text'}, inplace=True)
    elif 'message' in df.columns: df.rename(columns={'message': 'text'}, inplace=True)
    elif 'text_combined' in df.columns: df.rename(columns={'text_combined': 'text'}, inplace=True)
    if 'class' in df.columns: df.rename(columns={'class': 'label'}, inplace=True)
    
    if 'text' in df.columns and 'label' in df.columns:
        li.append(df[['text', 'label']])

data = pd.concat(li, axis=0, ignore_index=True).dropna()

# 2. Vectorization & Training
vectorizer = TfidfVectorizer(stop_words='english', max_features=5000)
X = vectorizer.fit_transform(data['text'])
y = data['label']

model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
model.fit(X, y)

# 3. SAVE THE MODEL
joblib.dump(model, 'phishing_model.pkl')
joblib.dump(vectorizer, 'vectorizer.pkl')

print("Success: Model and Vectorizer saved!")
