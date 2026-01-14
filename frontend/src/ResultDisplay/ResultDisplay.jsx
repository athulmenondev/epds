import React from 'react';
import './ResultDisplay.scss';

const ResultDisplay = ({ result }) => {
    if (!result) return null;
    return (
        <div className={`result-card ${result.is_phishing ? 'phish' : 'safe'}`}>
            <h2>{result.is_phishing ? '⚠️ Suspicious' : '✅ Looks Safe'}</h2>
            <p>{result.message}</p>
        </div>
    );
};
export default ResultDisplay;