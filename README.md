# 🛡️ PhishGuard

## AI-Powered Email Phishing Detection & Security Assistant

Detect phishing threats and prevent confidential data leaks using machine learning, automated analysis, and browser extension integration.

---

## ✨ Overview

**PhishGuard** is an intelligent email security system designed to protect users from phishing attacks and accidental data exposure. The project combines machine learning-based text analysis with real-time backend inference and planned browser extension automation to provide contextual security insights directly within Gmail.

The long-term vision is to evolve from a phishing detection prototype into a full AI-powered email security assistant capable of both incoming threat detection and outgoing data protection.

---

## 🚀 Current Features (Implemented)

- React-based frontend (demo interface for development testing)
- Flask backend API
- TF-IDF text vectorization
- Random Forest classifier for phishing detection
- Confidence score prediction
- SCSS styling with glassmorphism and dark mode
- Hugging Face Space endpoint communication (if applicable)

### Current Workflow

```
User Input → React Frontend → Flask API (/predict)
         → Text Preprocessing
         → TF-IDF Vectorization
         → Random Forest Model
         → Verdict + Confidence Score
         → UI Display
```

---

## 🧠 Machine Learning Pipeline

### Training Process

1. Dataset containing labeled phishing and legitimate emails.
2. Text preprocessing:
   - Lowercasing
   - URL normalization
   - Cleaning and normalization.
3. TF-IDF vectorization converts text into feature vectors.
4. Random Forest classifier trained on labeled data.
5. Model serialized and saved as:

```
phishing_rf_model.pkl
```

### Inference Process

- Incoming text undergoes identical preprocessing.
- Vectorized features passed into trained model.
- Backend returns classification verdict and probability score.

---

## 🏗️ System Architecture

### Frontend

- React
- SCSS styling
- Glassmorphism UI
- Dark mode design

(Currently serves as prototype interface and will be replaced by browser extension UI.)

### Backend

- Flask API
- Runs on port 7860
- CORS enabled
- Handles ML inference and decision logic.

---

## 🔮 Future Roadmap

### 1️⃣ Gmail Browser Extension (Incoming Email Protection)

The React UI will evolve into a browser extension integrated with Gmail.

Planned features:

- Automatically extract:
  - Sender email
  - Subject line
  - Message content.
- Send structured data to backend for analysis.

#### Multi-Model Backend Architecture

**Sender Analysis Model:**
- Detect spoofed domains
- Identify suspicious sender patterns
- Analyze metadata-based risk signals.

**Content Analysis Model:**
- Detect phishing language patterns
- Identify social engineering signals using NLP.

A decision engine combines outputs to generate final risk score and verdict.

Extension will inject a contextual security panel directly inside Gmail.

---

### 2️⃣ Outgoing Email Security (Data Loss Prevention)

Additional protection will monitor outgoing emails before sending.

Workflow:

- Extension observes Gmail compose window.
- Capture outgoing content and sender/recipient data.
- Send to backend for analysis.
- Backend checks for confidential or sensitive information using specialized models trained on organization-specific keywords or patterns.

Possible outcomes:

- Warning displayed before sending sensitive data.
- Event logging for audit purposes.
- Real-time security feedback inside extension UI.

---

### ⭐ Bonus Features (Planned)

#### Phishing Interaction Reporting

- Detect when user clicks suspicious or phishing links.
- Send event data to centralized backend including:
  - User identifier
  - URL clicked
  - Timestamp
  - Risk classification.

#### Confidential Data Sharing Tracking

- Log events when sensitive content is detected in outgoing emails.
- Record recipient information and risk category for monitoring and auditing.

---

## 🔁 Future Data Flow

```
Gmail → Browser Extension
      → Backend API
          → Sender Model
          → Content Model
          → Decision Engine
      → Security Verdict
      → Extension UI Panel
```

---

## 🎯 Project Goals

- Real-time phishing detection.
- Prevent accidental confidential data sharing.
- Provide contextual security feedback within email workflow.
- Modular machine learning architecture.
- Scalable toward enterprise-grade email security systems.

---

## 🛠️ Tech Stack

- React
- SCSS
- Flask
- Python
- Scikit-learn
- Random Forest
- TF-IDF
- Browser Extension APIs (Planned)

---

## 📌 Project Status

🚧 Active Development

- MVP phishing detection complete.
- Gmail extension integration in progress.

---

## 🤝 Contributions

Ideas, improvements, and security suggestions are welcome.

---

Built with ❤️ for smarter email security.