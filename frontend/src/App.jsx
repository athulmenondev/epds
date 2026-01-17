import React, { useState, useContext } from 'react';
import { ThemeContext } from './ThemeContext';
import EmailForm from './EmailForm/EmailForm';
import ResultDisplay from './ResultDisplay/ResultDisplay';
import Footer from './Footer/Footer';
import './App.scss';

function App() {
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);

  // result will hold the object: { prediction: "...", confidence: 00.0 }
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async (formData) => {
    setLoading(true);
    setResult(null); // Reset UI before new request

    // LOG 1: Check what the Form is sending
    console.log("1. Sending to Flask:", formData.content);

    try {
      const res = await fetch('https://athulmenondev-epds.hf.space/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // We ensure the key is 'content' to match Flask's data.get('content')
        body: JSON.stringify({ content: formData.content })
      });

      if (!res.ok) {
        throw new Error(`Server responded with status: ${res.status}`);
      }

      const json = await res.json();

      // LOG 2: Check exactly what Python sent back
      console.log("2. Received from Flask:", json);

      // Save the json directly into state
      setResult(json);

    } catch (e) {
      console.error("3. Connection Error:", e);
      // Fallback result so the UI doesn't break
      setResult({
        prediction: "Error",
        confidence: 0,
        status: "offline",
        message: "Check if Flask server is running."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`app-wrapper ${isDarkMode ? 'dark' : 'light'}`}>
      {/* Visual Background Blobs */}
      <div className="background-blobs">
        <div className="blob blob1"></div>
        <div className="blob blob2"></div>
      </div>

      {/* Theme Toggle Button */}
      <button className="theme-btn" onClick={toggleTheme}>
        {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
      </button>

      <header className="header">
        <div className="logo-container">
          <img src="/logo.png" alt="PhishGuard Logo" className="logo" />
          <h1>PhishGuard</h1>
        </div>
        <p>Random Forest Machine Learning Intelligence</p>
      </header>

      <main className="main-content">
        {/* Pass our handler to the Form */}
        <EmailForm onAnalyze={handleAnalyze} />

        {/* Loading State */}
        {loading && <div className="loader">Analyzing with Random Forest...</div>}

        {/* PASSING THE RESULT:
          Make sure ResultDisplay uses 'result.prediction' and 'result.confidence'
        */}
        {result && <ResultDisplay result={result} />}
      </main>

      <Footer />
    </div>
  );
}

export default App;