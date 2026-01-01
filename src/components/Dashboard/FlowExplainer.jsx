/**
 * Flow Explainer Component
 * Guides users through what Structura does - Citadel Perspective
 * Clear step-by-step explanation of the analysis process
 */

import { useState } from 'react';
import './FlowExplainer.css';

export function FlowExplainer({ onDismiss }) {
    const [currentStep, setCurrentStep] = useState(0);

    const steps = [
        {
            icon: '📊',
            title: 'Import Your Portfolio',
            description: 'Connect Upstox or upload CSV. We capture your current holdings and their market values.',
            detail: 'We only care about WHAT you own and HOW MUCH - not when you bought it.',
        },
        {
            icon: '🔬',
            title: 'Analyze Asset Behavior',
            description: 'We study how your stocks moved together over the last year (252 trading days).',
            detail: 'This reveals hidden correlations - stocks that crash together are dangerous.',
        },
        {
            icon: '⚖️',
            title: 'Calculate Risk Structure',
            description: 'HRP algorithm finds the optimal weight for each stock to minimize portfolio risk.',
            detail: 'Highly correlated stocks get penalized. Diversified stocks get rewarded.',
        },
        {
            icon: '📋',
            title: 'Get Rebalancing Actions',
            description: 'See exact ₹ amounts to buy/sell to achieve the risk-optimal structure.',
            detail: 'Example: "Sell ₹50,000 of HDFC. Buy ₹30,000 of Sun Pharma."',
        },
    ];

    const currentStepData = steps[currentStep];

    return (
        <div className="flow-explainer">
            <div className="explainer-header">
                <div className="explainer-badge">How It Works</div>
                {onDismiss && (
                    <button className="explainer-dismiss" onClick={onDismiss}>
                        Got it ✓
                    </button>
                )}
            </div>

            <div className="explainer-content">
                <div className="explainer-icon">{currentStepData.icon}</div>
                <div className="explainer-step-label">Step {currentStep + 1} of {steps.length}</div>
                <h3 className="explainer-title">{currentStepData.title}</h3>
                <p className="explainer-description">{currentStepData.description}</p>
                <p className="explainer-detail">{currentStepData.detail}</p>
            </div>

            <div className="explainer-nav">
                <div className="explainer-dots">
                    {steps.map((_, i) => (
                        <button
                            key={i}
                            className={`explainer-dot ${i === currentStep ? 'active' : ''}`}
                            onClick={() => setCurrentStep(i)}
                        />
                    ))}
                </div>
                <div className="explainer-buttons">
                    <button
                        className="explainer-btn"
                        onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                        disabled={currentStep === 0}
                    >
                        ← Back
                    </button>
                    <button
                        className="explainer-btn primary"
                        onClick={() => {
                            if (currentStep < steps.length - 1) {
                                setCurrentStep(currentStep + 1);
                            } else if (onDismiss) {
                                onDismiss();
                            }
                        }}
                    >
                        {currentStep === steps.length - 1 ? 'Start →' : 'Next →'}
                    </button>
                </div>
            </div>

            {/* Key Insight Box */}
            <div className="explainer-insight">
                <div className="insight-icon">💡</div>
                <div className="insight-text">
                    <strong>Key Insight:</strong> We don't tell you how much money you made yesterday.
                    We tell you how to <em>keep that money</em> tomorrow.
                </div>
            </div>
        </div>
    );
}

export default FlowExplainer;
