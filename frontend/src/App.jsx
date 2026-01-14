import React, { useState, useContext } from 'react';
import { ThemeContext } from './ThemeContext';
import EmailForm from './EmailForm/EmailForm';
import ResultDisplay from './ResultDisplay/ResultDisplay';
import Footer from './Footer/Footer';
import './App.scss';

function App() {
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  const [result, setResult] = useState(null);

  const handleAnalyze = async (data) => {
    try {
      const res = await fetch('http://localhost:5000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      setResult(json);
    } catch (e) {
      setResult({ is_phishing: true, message: "Backend offline." });
    }
  };

  return (
    <div className="app-wrapper">
      <div className="background-blobs">
        <div className="blob blob1"></div>
        <div className="blob blob2"></div>
      </div>

      <button className="theme-btn" onClick={toggleTheme}>
        {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
      </button>

      <header className="header">
        <div className="logo-container">
          <img src="/logo.png" alt="PhishGuard Logo" className="logo" />
          <h1>PhishGuard</h1>
        </div>
        <p>Material Intelligence Phishing Detection</p>
      </header>

      <main>
        <EmailForm onAnalyze={handleAnalyze} />
        <ResultDisplay result={result} />
      </main>

      <Footer />
    </div>
  );
}

export default App;