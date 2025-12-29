/**
 * Professor Guide Component
 * An animated, context-aware guide that explains each page/section
 * Replaces generic emojis with a sophisticated animated character
 */

import { useState, useEffect } from 'react';
import './ProfessorGuide.css';

// Page-specific messages for the Professor
const PROFESSOR_MESSAGES = {
    dashboard: {
        idle: {
            greeting: "Welcome to your portfolio command center",
            details: "Import your holdings and I'll analyze diversification, correlations, and risk factors using Hierarchical Risk Parity."
        },
        analyzing: {
            greeting: "Crunching the numbers...",
            details: "Computing correlation matrices, clustering assets, and optimizing weights using Lopez de Prado's recursive bisection algorithm."
        },
        complete: {
            greeting: "Analysis complete!",
            details: "Your portfolio health score considers concentration risk, sector exposure, and correlation patterns. Higher scores indicate better diversification."
        }
    },
    portfolio: {
        idle: {
            greeting: "Your Portfolio Holdings",
            details: "P&L is calculated from the analysis period start date to today. Use the weight view toggle to compare different allocation strategies."
        },
        weightMode: {
            current: "📊 Current Weight shows your actual portfolio allocation based on market values. This reflects how your money is actually distributed today.",
            equal: "⚖️ Equal Weight assigns identical target % to each stock (e.g., 10 stocks = 10% each). Simple but ignores risk and correlation - may not be optimal.",
            hrp: "🧠 HRP Optimal uses Hierarchical Risk Parity to calculate risk-adjusted weights. Stocks with higher volatility or correlation get lower weights, improving diversification."
        },
        positive: {
            greeting: "Strong performance!",
            details: "Your portfolio is generating positive returns. Consider the HRP view to see if rebalancing could improve risk-adjusted returns."
        },
        negative: {
            greeting: "Market headwinds",
            details: "Some positions are underwater. The HRP view shows optimal weights that could help reduce portfolio volatility."
        }
    },
    risk: {
        idle: {
            greeting: "Risk Analysis Suite",
            details: "Stress tests simulate how your portfolio would perform during various market events."
        },
        highRisk: {
            greeting: "Elevated risk detected",
            details: "High sector concentration increases volatility. Consider diversifying into defensive sectors."
        },
        lowRisk: {
            greeting: "Well-balanced risk profile",
            details: "Your portfolio shows healthy diversification across sectors and risk factors."
        }
    },
    advisor: {
        idle: {
            greeting: "AI Investment Advisor",
            details: "Recommendations are ranked by momentum, quality, and gap-filling potential. No fundamental data is mocked."
        },
        strategy: {
            balanced: "Balanced strategy weights momentum and quality equally for steady growth.",
            aggressive: "High Growth strategy prioritizes momentum - higher returns, higher risk.",
            conservative: "Conservative strategy emphasizes quality and low volatility for stability.",
            value: "Value strategy seeks undervalued stocks with strong fundamentals."
        }
    }
};

export function ProfessorGuide({ page = 'dashboard', state = 'idle', strategy = null, weightMode = null, customMessage = null }) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isThinking, setIsThinking] = useState(false);
    const [displayMessage, setDisplayMessage] = useState({ greeting: '', details: '' });

    // Get the appropriate message based on page and state
    useEffect(() => {
        let message = PROFESSOR_MESSAGES[page]?.[state] || PROFESSOR_MESSAGES.dashboard.idle;

        // Handle strategy-specific messages for advisor
        if (page === 'advisor' && strategy && PROFESSOR_MESSAGES.advisor.strategy[strategy]) {
            message = {
                greeting: message.greeting,
                details: PROFESSOR_MESSAGES.advisor.strategy[strategy]
            };
        }

        // Handle weight mode explanations for portfolio page
        if (page === 'portfolio' && weightMode && PROFESSOR_MESSAGES.portfolio.weightMode[weightMode]) {
            message = {
                greeting: weightMode === 'current' ? 'Current Allocation' :
                    weightMode === 'equal' ? 'Equal Weight Strategy' : 'HRP Optimal Strategy',
                details: PROFESSOR_MESSAGES.portfolio.weightMode[weightMode]
            };
        }

        // Allow custom message override
        if (customMessage) {
            message = customMessage;
        }

        // Simulate "thinking" transition
        setIsThinking(true);
        const timer = setTimeout(() => {
            setDisplayMessage(message);
            setIsThinking(false);
        }, 300);

        return () => clearTimeout(timer);
    }, [page, state, strategy, weightMode, customMessage]);

    return (
        <div className={`professor-guide ${isExpanded ? 'expanded' : 'collapsed'}`}>
            <div className="professor-avatar" onClick={() => setIsExpanded(!isExpanded)}>
                <div className={`avatar-glow ${isThinking ? 'thinking' : ''}`}>
                    <svg viewBox="0 0 64 64" className="avatar-svg">
                        {/* Abstract geometric professor - nodes connected like a dendrogram */}
                        <defs>
                            <linearGradient id="professorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="var(--accent-cyan)" />
                                <stop offset="100%" stopColor="var(--accent-blue)" />
                            </linearGradient>
                        </defs>
                        {/* Central node (head) */}
                        <circle cx="32" cy="20" r="8" fill="url(#professorGrad)" />
                        {/* Body triangular shape */}
                        <path d="M32 28 L48 52 L16 52 Z" fill="url(#professorGrad)" opacity="0.8" />
                        {/* Connection dots (hierarchy visualization) */}
                        <circle cx="22" cy="40" r="3" fill="var(--accent-cyan)" />
                        <circle cx="42" cy="40" r="3" fill="var(--accent-cyan)" />
                        <circle cx="32" cy="46" r="3" fill="var(--accent-gold)" />
                        {/* Links */}
                        <line x1="32" y1="28" x2="22" y2="40" stroke="var(--accent-cyan)" strokeWidth="1" opacity="0.5" />
                        <line x1="32" y1="28" x2="42" y2="40" stroke="var(--accent-cyan)" strokeWidth="1" opacity="0.5" />
                        <line x1="32" y1="28" x2="32" y2="46" stroke="var(--accent-gold)" strokeWidth="1" opacity="0.5" />
                    </svg>
                </div>
            </div>

            {isExpanded && (
                <div className={`professor-speech ${isThinking ? 'typing' : ''}`}>
                    <div className="speech-bubble">
                        <h4 className="speech-greeting">{displayMessage.greeting}</h4>
                        <p className="speech-details">{displayMessage.details}</p>
                    </div>
                    <div className="speech-tail" />
                </div>
            )}
        </div>
    );
}

// Compact version for inline hints
export function ProfessorHint({ text, type = 'info' }) {
    return (
        <div className={`professor-hint ${type}`}>
            <div className="hint-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    {type === 'info' && (
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                    )}
                    {type === 'warning' && (
                        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                    )}
                    {type === 'success' && (
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    )}
                </svg>
            </div>
            <span className="hint-text">{text}</span>
        </div>
    );
}

export default ProfessorGuide;
