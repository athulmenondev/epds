import React, { useState } from 'react';
import './EmailForm.scss';

const EmailForm = ({ onAnalyze }) => {
    const [emailType, setEmailType] = useState('receiving');
    const [content, setContent] = useState('');

    return (
        <div className="container">
            <div className="toggleContainer">
                <button className={emailType === 'sending' ? 'active' : ''} onClick={() => setEmailType('sending')}>Sending</button>
                <button className={emailType === 'receiving' ? 'active' : ''} onClick={() => setEmailType('receiving')}>Receiving</button>
            </div>
            <textarea className="inputArea" placeholder="Paste email content here..." value={content} onChange={(e) => setContent(e.target.value)} />
            <button className="submitBtn" onClick={() => onAnalyze({ emailType, content })}>Analyze Content</button>
        </div>
    );
};
export default EmailForm;