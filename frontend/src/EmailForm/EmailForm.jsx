import React, { useState } from 'react';
import './EmailForm.scss';

const EmailForm = ({ onAnalyze, mode, loading, content: propContent, setContent: propSetContent, recipient: propRecipient, setRecipient: propSetRecipient, setIsManualEdit }) => {
    const [localMode, setLocalMode] = useState('receiving');
    const [localContent, setLocalContent] = useState('');
    const [localRecipient, setLocalRecipient] = useState('');

    const currentMode = mode || localMode;
    const content = propContent !== undefined ? propContent : localContent;
    const setContent = propSetContent || setLocalContent;
    const recipient = propRecipient !== undefined ? propRecipient : localRecipient;
    const setRecipient = propSetRecipient || setLocalRecipient;

    const handleSubmit = () => {
        onAnalyze({
            mode: currentMode === 'sending' ? 'outgoing' : 'incoming',
            content: content,
            recipient: recipient || '',
        });
    };

    const handleKeyDown = (e) => {
        // Ctrl+Enter to submit
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            if (!loading) handleSubmit();
        }
    };

    return (
        <div className="container">
            {/* Internal mode toggle (hidden when parent controls mode) */}
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

            {/* Recipient field (Sending Mode only) */}
            {currentMode === 'sending' && (
                <input
                    type="email"
                    id="recipient-input"
                    className="recipientInput"
                    placeholder="Recipient email (e.g., boss@company.com)"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    disabled={loading}
                />
            )}

            <textarea
                id="content-input"
                className="inputArea"
                placeholder={
                    currentMode === 'sending'
                        ? 'Type here or click Analyze to check draft...'
                        : 'Paste email here or click Analyze to scan open email...'
                }
                value={content}
                onChange={(e) => { 
                    setContent(e.target.value); 
                    if (setIsManualEdit) setIsManualEdit(true); 
                }}
                onKeyDown={handleKeyDown}
                disabled={loading}
            />

            <button
                id="analyze-button"
                className={`submitBtn ${loading ? 'is-loading' : ''}`}
                onClick={handleSubmit}
                disabled={loading}
            >
                {loading ? (
                    <span className="btn-loading">
                        <span className="btn-spinner"></span>
                        Analyzing...
                    </span>
                ) : (
                    <>
                        {currentMode === 'sending' ? '🔍 Scan for DLP' : '🛡️ Analyze Content'}
                    </>
                )}
            </button>

            <p className="form-hint">
                {currentMode === 'sending'
                    ? 'Leave empty to auto-scan your compose draft'
                    : 'Leave empty to auto-scan the currently open email'}
            </p>
        </div>
    );
};

export default EmailForm;