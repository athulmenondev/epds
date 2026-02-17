import React, { useState, useContext, useEffect } from 'react';
import { ThemeContext } from './ThemeContext';
import EmailForm from './EmailForm/EmailForm';
import ResultDisplay from './ResultDisplay/ResultDisplay';
import Footer from './Footer/Footer';
import './App.scss';

function App() {
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('receiving'); // 'receiving' or 'sending'

  // --- API Handlers ---

  const sendToBackend = (type, senderOrRecipient, content) => {
    setLoading(true);
    // Delegate fetch to Content Script (Extension) to avoid CORS and handle permissions
    window.postMessage({ 
        type: 'REACT_REQUEST_ANALYSIS', 
        payload: { 
            mode: type === 'inbound' ? 'phishing' : 'dlp',
            text: content,
            id: senderOrRecipient
        }
    }, "*");
  };

  // --- Scraper Trigger ---

  const handleAnalyze = (formData) => {
    setResult(null);

    // If form has content (Manual Mode), use it directly
    if (formData && formData.content && formData.content.trim()) {
         const type = mode === 'receiving' ? 'inbound' : 'outbound';
         
         // In manual mode, we might not have a real sender/recipient ID, 
         // so we use the form's recipient or a placeholder.
         let id = "manual-check@unknown.com";
         if (mode === 'sending' && formData.recipient) {
             id = formData.recipient;
         }
         
         sendToBackend(type, id, formData.content);
         return;
    }

    // Else (Extension Mode), trigger Scraper
    const type = mode === 'receiving' ? 'SCRAPE_OPEN_EMAIL' : 'SCRAPE_COMPOSE_DRAFT';
    window.postMessage({ type }, "*");
  };

  // --- Message Listener ---

  useEffect(() => {
    const listener = (event) => {
      // Handle Phishing (Inbound)
      if (event.data.type === 'GMAIL_DATA') {
        const { sender, content } = event.data.payload;
        sendToBackend('inbound', sender, content);
      }
      // Handle DLP (Outbound)
      if (event.data.type === 'COMPOSE_DATA') {
        const { recipient, content } = event.data.payload;
        sendToBackend('outbound', recipient, content);
      }
      
      // Handle Analysis Results from Extension
      if (event.data.type === 'ANALYSIS_COMPLETE') {
          const { result: data, mode } = event.data.payload;
          
          if (mode === 'dlp') {
              setResult({
                  prediction: data.status === 'violation' ? "DLP VIOLATION" : "Safe to Send",
                  confidence: data.status === 'violation' ? 100 : 0,
                  details: data.matches ? `Sensitive: ${data.matches.join(', ')}` : "No sensitive data found."
              });
          } else {
              setResult(data);
          }
          setLoading(false);
      }
      
      if (event.data.type === 'ANALYSIS_ERROR') {
          console.error("Analysis Error:", event.data.payload.error);
          setLoading(false);
          setResult({ prediction: "Error", confidence: 0, details: "Check extension logs." });
      }
    };

    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [mode]);

  return (
    <div className={`app-wrapper ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
      <div className="background-blobs">
        <div className="blob blob1"></div>
        <div className="blob blob2"></div>
      </div>

      <button className="theme-btn" onClick={toggleTheme}>
        {isDarkMode ? '☀️ Light' : '🌙 Dark'}
      </button>

      <header className="header">
        <div className="logo-container">
          <img 
            src={chrome.runtime?.getURL ? chrome.runtime.getURL('logo.png') : './logo.png'} 
            alt="Logo" 
            className="logo"
          />
          <h1>PhishGuard</h1>
        </div>
        <div className="mode-tabs">
          <button 
            className={mode === 'receiving' ? 'active' : ''} 
            onClick={() => setMode('receiving')}
          >
            Receiving (Phishing)
          </button>
          <button 
            className={mode === 'sending' ? 'active' : ''} 
            onClick={() => setMode('sending')}
          >
            Sending (DLP)
          </button>
        </div>
      </header>

      <main className="main-content">
        <EmailForm onAnalyze={handleAnalyze} mode={mode} />
        {loading && <div className="loader">Analyzing with Random Forest...</div>}
        {result && <ResultDisplay result={result} />}
      </main>

      <Footer />
    </div>
  );
}

export default App;

 // const handleAnalyze = async (formData) => {
  //   setLoading(true);
  //   setResult(null); // Reset UI before new request

  //   // LOG 1: Check what the Form is sending
  //   console.log("1. Sending to Flask:", formData.content);

  //   try {
  //     const res = await fetch('https://athulmenondev-epds.hf.space/predict', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       // We ensure the key is 'content' to match Flask's data.get('content')
  //       body: JSON.stringify({ content: formData.content })
  //     });

  //     if (!res.ok) {
  //       throw new Error(`Server responded with status: ${res.status}`);
  //     }

  //     const json = await res.json();

  //     // LOG 2: Check exactly what Python sent back
  //     console.log("2. Received from Flask:", json);

  //     // Save the json directly into state
  //     setResult(json);

  //   } catch (e) {
  //     console.error("3. Connection Error:", e);
  //     // Fallback result so the UI doesn't break
  //     setResult({
  //       prediction: "Error",
  //       confidence: 0,
  //       status: "offline",
  //       message: "Check if Flask server is running."
  //     });
  //   } finally {
  //     setLoading(false);
  //   }
  // };