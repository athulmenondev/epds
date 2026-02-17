import React from 'react';
import './ResultDisplay.scss';

const ResultDisplay = ({ result }) => {
    // 1. Detect Mode: If 'violations' exists, it's an Outgoing (DLP) scan.
    const isOutgoing = result.hasOwnProperty('violations');
    const isHighRisk = result.prediction === "Phishing";

    // 2. Dynamic UI Strings
    const title = isOutgoing 
        ? (isHighRisk ? "Policy Violation Detected" : "Clear for Transmission") 
        : (isHighRisk ? "Phishing Threat Detected" : "Email Appears Safe");

    const description = isOutgoing
        ? `DLP Inspection finalized with ${result.confidence}% confidence.`
        : `Random Forest analysis finalized with ${result.confidence}% confidence.`;

    const recommendation = isHighRisk 
        ? (isOutgoing 
            ? "CRITICAL: Do not send. Remove sensitive patterns or keywords identified below." 
            : "WARNING: Do not interact. This email shows high-risk linguistic patterns.")
        : "No immediate security threats were identified in this content.";

    return (
        <div className={`result-container ${isHighRisk ? 'is-phishing' : 'is-safe'}`}>
            <div className="result-header">
                <div className="title-section">
                    <h2>{title}</h2>
                    <p className="meta">{description}</p>
                </div>
                <div className="status-badge">
                    {isHighRisk ? "🚩 HIGH RISK" : "✅ LOW RISK"}
                </div>
            </div>

            <hr className="divider" />

            {/* 3. Multi-Stage Pipeline Findings (Only shows if violations exist) */}
            {isOutgoing && isHighRisk && result.violations && result.violations.length > 0 && (
                <div className="violations-area">
                    <h3>Pipeline Findings:</h3>
                    <ul className="violation-list">
                        {result.violations.map((v, index) => (
                            <li key={index} className="violation-item">
                                <span className="warning-dot">●</span> {v}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* 4. Final Verdict and Action */}
            <div className="action-box">
                <h4>System Recommendation:</h4>
                <p>{recommendation}</p>
            </div>

            {/* Visual Probability Bar */}
            <div className="probability-wrapper">
                <label>Confidence Level:</label>
                <div className="progress-bar-bg">
                    <div 
                        className="progress-bar-fill" 
                        style={{ width: `${result.confidence}%` }}
                    ></div>
                </div>
                <span>{result.confidence}%</span>
            </div>
        </div>
    );
};

export default ResultDisplay;