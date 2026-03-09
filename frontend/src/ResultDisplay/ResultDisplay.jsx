import React from 'react';
import './ResultDisplay.scss';

const ResultDisplay = ({ result, mode }) => {
    // ─── Normalize prediction label ────────────────────────────────────────
    // Support both backend response formats:
    //   { prediction: "Phishing" | "Legitimate" }
    //   { label: "Phishing" | "Legitimate" }
    const prediction = result.prediction || result.label || 'Unknown';
    const confidence = result.confidence ?? (result.confidence_score != null ? result.confidence_score * 100 : 0);

    // ─── Detect risk level ─────────────────────────────────────────────────
    const isPhishing = prediction === 'Phishing' || prediction === 'DLP VIOLATION';
    const isError = prediction === 'Error';
    const isOutgoing = mode === 'sending';

    // ─── Dynamic strings ───────────────────────────────────────────────────
    const title = isError
        ? 'Analysis Error'
        : isOutgoing
            ? (isPhishing ? 'Policy Violation Detected' : 'Clear for Transmission')
            : (isPhishing ? 'Phishing Threat Detected' : 'Email Appears Safe');

    const description = isError
        ? 'Unable to complete analysis.'
        : isOutgoing
            ? `DLP Inspection finalized with ${confidence}% confidence.`
            : `Random Forest analysis finalized with ${confidence}% confidence.`;

    const recommendation = isError
        ? result.details || 'Check if the Flask server is running.'
        : isPhishing
            ? (isOutgoing
                ? 'CRITICAL: Do not send. Remove sensitive patterns or keywords identified below.'
                : 'WARNING: Do not interact. This email shows high-risk linguistic patterns.')
            : 'No immediate security threats were identified in this content.';

    // ─── Risk theme class ─────────────────────────────────────────────────
    const themeClass = isError ? 'is-error' : isPhishing ? 'is-phishing' : 'is-safe';

    return (
        <div className={`result-container ${themeClass}`} id="result-display">
            <div className="result-header">
                <div className="title-section">
                    <h2>{title}</h2>
                    <p className="meta">{description}</p>
                </div>
                <div className={`status-badge ${themeClass}`} id="risk-badge">
                    {isError
                        ? '❌ ERROR'
                        : isPhishing
                            ? '🚩 HIGH RISK'
                            : '✅ LOW RISK'}
                </div>
            </div>

            <hr className="divider" />

            {/* Pipeline Findings (DLP violations) */}
            {isOutgoing && isPhishing && result.violations && result.violations.length > 0 && (
                <div className="violations-area" id="violations-list">
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

            {/* System Recommendation */}
            <div className="action-box">
                <h4>System Recommendation:</h4>
                <p>{recommendation}</p>
            </div>

            {/* Confidence Progress Bar */}
            {!isError && (
                <div className="probability-wrapper">
                    <label>Confidence Level:</label>
                    <div className="progress-bar-bg">
                        <div
                            className={`progress-bar-fill ${themeClass}`}
                            style={{ width: `${Math.min(confidence, 100)}%` }}
                        ></div>
                    </div>
                    <span className="confidence-value">{confidence}%</span>
                </div>
            )}
        </div>
    );
};

export default ResultDisplay;