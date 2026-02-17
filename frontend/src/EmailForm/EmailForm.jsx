import React, { useState } from 'react';
import './EmailForm.scss';

const EmailForm = ({ onAnalyze, mode }) => {
    // If mode is passed from props, use it. Otherwise use internal state.
    const [localMode, setLocalMode] = useState('receiving');
    const [content, setContent] = useState('');
    const [recipient, setRecipient] = useState('');

    const currentMode = mode || localMode;

    const handleSubmit = () => {
        // Validation removed to support auto-scraping.
        // If content is empty, App.jsx triggers the scraper.
        
        onAnalyze({ 
            mode: currentMode === 'sending' ? 'outgoing' : 'incoming', 
            content: content,
            recipient: recipient || "" 
        });
    };

    return (
        <div className="container">
            {/* If mode is controlled by parent (extension), hide these tabs or keep them sync. 
                For now, we hide them if 'mode' prop is present to avoid confusion with the header tabs. */}
            {!mode && (
                <div className="toggleContainer">
                    <button 
                        className={localMode === 'sending' ? 'active' : ''} 
                        onClick={() => setLocalMode('sending')}
                    >
                        Sending Mode (DLP)
                    </button>
                    <button 
                        className={localMode === 'receiving' ? 'active' : ''} 
                        onClick={() => setLocalMode('receiving')}
                    >
                        Receiving Mode (Phishing)
                    </button>
                </div>
            )}

            {/* Show recipient field only when in Sending Mode */}
            {currentMode === 'sending' && (
                <input 
                    type="email" 
                    className="recipientInput"
                    placeholder="Recipient email (e.g., boss@company.com)" 
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    style={{ marginBottom: '10px', width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
            )}

            <textarea 
                className="inputArea" 
                placeholder={currentMode === 'sending' ? "Type here or click Analyze to check draft..." : "Paste email here or click Analyze to scan open email..."} 
                value={content} 
                onChange={(e) => setContent(e.target.value)} 
            />

            <button className="submitBtn" onClick={handleSubmit}>
                Analyze Content
            </button>
        </div>
    );
};

export default EmailForm;