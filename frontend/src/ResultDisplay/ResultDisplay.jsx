import React from 'react';
import './ResultDisplay.scss';

const ResultDisplay = ({ result }) => {
    // We must check if the STRING is exactly "Phishing"
    const isPhishing = result.prediction === "Phishing";

    return (
        <div className={`result-container ${isPhishing ? 'is-phishing' : 'is-safe'}`}>
            <h2>Verdict: {result.prediction}</h2>
            <p>The Random Forest is {result.confidence}% sure this is {result.prediction.toLowerCase()}.</p>

            {/* Visual indicator */}
            <div className="status-icon">
                {isPhishing ? "🚩 High Risk" : "✅ Low Risk"}
            </div>
        </div>
    );
};
export default ResultDisplay;