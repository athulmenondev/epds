import React, { useState, useContext, useEffect, useCallback } from 'react';
import { ThemeContext } from './ThemeContext';
import EmailForm from './EmailForm/EmailForm';
import ResultDisplay from './ResultDisplay/ResultDisplay';
import Footer from './Footer/Footer';
import { quickDLPScan } from './utils/domScraper';
import './App.scss';

// ─── Configuration ──────────────────────────────────────────────────────────────
const API_CONFIG = {
  // Primary: local Flask backend
  LOCAL: 'http://localhost:5000',
  // Fallback: Hugging Face hosted backend
  REMOTE: 'https://athulmenondev-epds.hf.space',
};

// Detect if running inside the Chrome extension context
const isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;

function App() {
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('receiving'); // 'receiving' or 'sending'
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [emailRecipient, setEmailRecipient] = useState('');

  // ─── API Base URL Selection ─────────────────────────────────────────────────
  const getApiUrl = useCallback(() => {
    // Extension mode: try local first, content script relays through background
    return API_CONFIG.LOCAL;
  }, []);

  // ─── Send Analysis Request ─────────────────────────────────────────────────
  const sendToBackend = useCallback(async (type, senderOrRecipient, content) => {
    setLoading(true);
    setError(null);
    setStatusMessage(type === 'inbound' ? 'Running phishing analysis...' : 'Scanning for DLP violations...');

    const endpoint = type === 'inbound' ? '/predict' : '/analyze-outgoing';
    const bodyData = { content };

    if (type === 'inbound') {
      bodyData.sender_id = senderOrRecipient;
    } else {
      bodyData.recipient = senderOrRecipient;
    }

    try {
      let responseData;

      if (isExtension) {
        // ── Extension Mode: Relay through background.js to avoid CORS ──────
        responseData = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage(
            {
              type: 'API_REQUEST',
              payload: {
                url: `${getApiUrl()}${endpoint}`,
                method: 'POST',
                body: bodyData,
              },
            },
            (response) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
              }
              if (response && response.success) {
                resolve(response.data);
              } else {
                reject(new Error(response?.error || 'API request failed'));
              }
            }
          );
        });
      } else {
        // ── Standalone Mode: Direct fetch ──────────────────────────────────
        const res = await fetch(`${getApiUrl()}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData),
        });

        if (!res.ok) {
          throw new Error(`Server responded with status: ${res.status}`);
        }

        responseData = await res.json();
      }

      // ── Normalize response to handle both API formats ──────────────────
      // Backend may return { prediction, confidence } or { label, confidence_score }
      const normalizedResult = normalizeResult(responseData, type);
      setResult(normalizedResult);
      setStatusMessage('');

    } catch (e) {
      console.error('PhishGuard: API Error', e);

      // Fallback: try remote API
      try {
        setStatusMessage('Local server unavailable. Trying remote...');
        const fallbackRes = await fetch(`${API_CONFIG.REMOTE}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData),
        });

        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          setResult(normalizeResult(fallbackData, type));
          setStatusMessage('');
          setLoading(false);
          return;
        }
      } catch {
        // Both failed
      }

      setError(`Connection failed: ${e.message}. Ensure the Flask server is running.`);
      setResult({
        prediction: 'Error',
        confidence: 0,
        status: 'offline',
        details: 'Unable to reach analysis server.',
      });
      setStatusMessage('');
    } finally {
      setLoading(false);
    }
  }, [getApiUrl]);

  // ─── Normalize API Response ─────────────────────────────────────────────────
  // Handles both { label, confidence_score } and { prediction, confidence }
  function normalizeResult(data, type) {
    if (data.error) {
      return {
        prediction: 'Error',
        confidence: 0,
        details: data.error,
      };
    }

    // Map 'label' → 'prediction' and 'confidence_score' → 'confidence'
    const prediction = data.prediction || data.label || 'Unknown';
    const confidence = data.confidence ?? (data.confidence_score != null ? data.confidence_score * 100 : 0);
    const violations = data.violations || [];
    const status = data.status || 'success';

    return {
      prediction,
      confidence: Math.round(confidence * 100) / 100,
      status,
      violations,
      details: data.details || data.message || '',
    };
  }

  // ─── Scrape & Analyze Trigger ───────────────────────────────────────────────
  const handleAnalyze = useCallback((formData) => {
    setResult(null);
    setError(null);

    // ── Case 1: Manual content provided via form ──────────────────────────
    if (formData && formData.content && formData.content.trim()) {
      const type = mode === 'receiving' ? 'inbound' : 'outbound';
      let id = 'manual-check@unknown.com';
      if (mode === 'sending' && formData.recipient) {
        id = formData.recipient;
      }

      // Quick client-side DLP pre-check for sending mode
      if (mode === 'sending') {
        const quickScan = quickDLPScan(formData.content);
        if (quickScan.hasViolations) {
          setStatusMessage(`⚡ Quick scan flagged: ${quickScan.matches.join(', ')}`);
        }
      }

      sendToBackend(type, id, formData.content);
      return;
    }

    // ── Case 2: Extension mode — scrape from active tab ───────────────────
    if (isExtension) {
      const messageType = mode === 'receiving' ? 'SCRAPE_EMAIL' : 'SCRAPE_DRAFT';
      setLoading(true);
      setStatusMessage(mode === 'receiving' ? 'Scraping open email...' : 'Scraping compose draft...');

      chrome.runtime.sendMessage({ type: messageType }, (response) => {
        if (chrome.runtime.lastError) {
          setError(`Scrape failed: ${chrome.runtime.lastError.message}`);
          setLoading(false);
          setStatusMessage('');
          return;
        }

        if (response && response.success && response.data) {
          // eslint-disable-next-line no-unused-vars
          const { content, sender, recipient, subject } = response.data;

          if (!content || !content.trim()) {
            setError('No email content found. Make sure an email is open in your mailbox tab.');
            setLoading(false);
            setStatusMessage('');
            return;
          }

          // Update UI text boxes
          setEmailContent(content);
          if (mode === 'sending') {
            setEmailRecipient(recipient || '');
          }

          // Quick DLP pre-check for drafts
          if (mode === 'sending') {
            const quickScan = quickDLPScan(content);
            if (quickScan.hasViolations) {
              setStatusMessage(`⚡ Quick scan flagged: ${quickScan.matches.join(', ')}`);
            }
          }

          const type = mode === 'receiving' ? 'inbound' : 'outbound';
          const id = mode === 'receiving' ? (sender || 'unknown') : (recipient || 'unknown');
          sendToBackend(type, id, content);
        } else {
          setError(response?.error || 'Failed to scrape email content.');
          setLoading(false);
          setStatusMessage('');
        }
      });
    } else {
      // ── Case 3: No content in standalone mode ─────────────────────────
      // Fallback: use window.postMessage for legacy content-script bridge
      const type = mode === 'receiving' ? 'SCRAPE_OPEN_EMAIL' : 'SCRAPE_COMPOSE_DRAFT';
      window.postMessage({ type }, '*');
    }
  }, [mode, sendToBackend]);

  // ─── Legacy Message Listener (for content-script postMessage bridge) ────────
  useEffect(() => {
    const listener = (event) => {
      if (event.source !== window) return;
      if (!event.data || !event.data.type) return;

      // Handle scraped email data from content script
      if (event.data.type === 'GMAIL_DATA') {
        const { sender, content } = event.data.payload;
        setEmailContent(content);
        sendToBackend('inbound', sender, content);
      }

      // Handle scraped compose data from content script
      if (event.data.type === 'COMPOSE_DATA') {
        const { recipient, content } = event.data.payload;
        setEmailContent(content);
        setEmailRecipient(recipient || '');
        sendToBackend('outbound', recipient, content);
      }

      // Handle analysis results relayed by content script
      if (event.data.type === 'ANALYSIS_COMPLETE') {
        const { result: data, mode: resultMode } = event.data.payload;
        setResult(normalizeResult(data, resultMode === 'dlp' ? 'outbound' : 'inbound'));
        setLoading(false);
        setStatusMessage('');
      }

      if (event.data.type === 'ANALYSIS_ERROR') {
        console.error('Analysis Error:', event.data.payload.error);
        setLoading(false);
        setStatusMessage('');
        setError(event.data.payload.error || 'Analysis failed.');
        setResult({
          prediction: 'Error',
          confidence: 0,
          details: 'Check extension logs.',
        });
      }
    };

    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [sendToBackend]);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={`app-wrapper ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
      <div className="background-blobs">
        <div className="blob blob1"></div>
        <div className="blob blob2"></div>
      </div>

      <button className="theme-btn" onClick={toggleTheme} id="theme-toggle">
        {isDarkMode ? '☀️ Light' : '🌙 Dark'}
      </button>

      <header className="header">
        <div className="logo-container">
          <img
            src={chrome.runtime?.getURL ? chrome.runtime.getURL('logo.png') : './logo.png'}
            alt="PhishGuard Logo"
            className="logo"
          />
          <h1>PhishGuard</h1>
        </div>
        <div className="mode-tabs">
          <button
            id="mode-receiving"
            className={mode === 'receiving' ? 'active' : ''}
            onClick={() => { setMode('receiving'); setResult(null); setError(null); setEmailContent(''); setEmailRecipient(''); }}
          >
            🛡️ Receiving (Phishing)
          </button>
          <button
            id="mode-sending"
            className={mode === 'sending' ? 'active' : ''}
            onClick={() => { setMode('sending'); setResult(null); setError(null); setEmailContent(''); setEmailRecipient(''); }}
          >
            📤 Sending (DLP)
          </button>
        </div>
      </header>

      <main className="main-content">
        <EmailForm 
          onAnalyze={handleAnalyze} 
          mode={mode} 
          loading={loading} 
          content={emailContent}
          setContent={setEmailContent}
          recipient={emailRecipient}
          setRecipient={setEmailRecipient}
        />

        {/* Loading State with Spinner */}
        {loading && (
          <div className="loader-container" id="analysis-loader">
            <div className="loader-spinner"></div>
            <p>{statusMessage || 'Analyzing with Random Forest...'}</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="error-banner" id="error-message">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Quick DLP status (shown during loading) */}
        {statusMessage && statusMessage.startsWith('⚡') && !loading && (
          <div className="quick-scan-banner" id="quick-scan-result">
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Results */}
        {result && !loading && <ResultDisplay result={result} mode={mode} />}
      </main>

      <Footer />
    </div>
  );
}

export default App;