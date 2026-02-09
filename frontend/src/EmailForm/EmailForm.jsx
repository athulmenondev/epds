import React, { useState } from 'react';
import './EmailForm.scss';

const EmailForm = ({ onAnalyze }) => {
    const [emailType, setEmailType] = useState('receiving'); // 'receiving' or 'sending'
    const [content, setContent] = useState('');
    const [recipient, setRecipient] = useState(''); // Added for DLP check

    const handleSubmit = () => {
        if (!content.trim()) {
            alert("Please paste some content first!");
            return;
        }

        // We send the mode and content back to App.jsx
        // 'receiving' maps to Phishing check, 'sending' maps to DLP check
        onAnalyze({ 
            mode: emailType === 'sending' ? 'outgoing' : 'incoming', 
            content: content,
            recipient: recipient || "external@unknown.com" 
        });
    };

    return (
        <div className="container">
            <div className="toggleContainer">
                <button 
                    className={emailType === 'sending' ? 'active' : ''} 
                    onClick={() => setEmailType('sending')}
                >
                    Sending Mode (DLP)
                </button>
                <button 
                    className={emailType === 'receiving' ? 'active' : ''} 
                    onClick={() => setEmailType('receiving')}
                >
                    Receiving Mode (Phishing)
                </button>
            </div>

            {/* Show recipient field only when in Sending Mode */}
            {emailType === 'sending' && (
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
                placeholder={emailType === 'sending' ? "Analyze for confidential leaks..." : "Analyze for phishing threats..."} 
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