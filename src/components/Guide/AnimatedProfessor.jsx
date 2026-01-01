/**
 * Animated Professor Component
 * Rick & Morty style animated guide that explains page elements
 * Moves to elements and explains them with speech bubbles
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import './AnimatedProfessor.css';

// Professor messages for each page - ONLY references elements that exist on each page
const PROFESSOR_SCRIPTS = {
    dashboard: [
        {
            message: "Welcome to your Structure Optimizer!",
            detail: "I analyze HOW your stocks move together - not how much money you made. The past is sunk cost, let's optimize the future!",
            target: null
        },
        {
            message: "First, import your portfolio.",
            detail: "Click the Import button to bring in your holdings from Upstox or manually add them.",
            target: '.btn-primary' // Import button
        },
        {
            message: "Then click ANALYZE!",
            detail: "I'll fetch 1 year of price data and run HRP (Hierarchical Risk Parity) to find correlations.",
            target: '.analyze-btn'
        },
        {
            message: "Your Portfolio Health Score",
            detail: "This grades your portfolio structure from A to F. Based on concentration, sector balance, and correlations.",
            target: '.health-score-card'
        },
        {
            message: "The Correlation Heatmap",
            detail: "Green = stocks move together (risky!). Red = opposites (good diversification). Hover each cell to see the exact correlation.",
            target: '.heatmap-container'
        },
        {
            message: "Optimal Weights Table",
            detail: "HRP calculates the best weight for each stock to minimize overall risk. Compare it with your current weights!",
            target: '.weights-table-container'
        },
        {
            message: "Rebalancing Suggestions",
            detail: "These tell you what to buy/sell to achieve optimal structure. Priority levels from P1 (urgent) to P3 (optional).",
            target: '.rebalancing-suggestions'
        }
    ],
    portfolio: [
        {
            message: "Your Current Holdings",
            detail: "This page shows what you own right now. The VALUE column is current market price × quantity.",
            target: null
        },
        {
            message: "Sector Breakdown",
            detail: "See how your money is distributed across sectors. Heavy concentration in one sector = higher risk!",
            target: '.portfolio-summary-grid'
        },
        {
            message: "P&L Column",
            detail: "This comes directly from your broker (Upstox). It's your actual profit/loss based on buy price.",
            target: '.holdings-table'
        }
    ],
    risk: [
        {
            message: "Risk Analysis Page",
            detail: "Here we stress-test your portfolio against historical crashes. How would you have fared in 2008 or COVID?",
            target: null
        },
        {
            message: "Historical Crash Simulations",
            detail: "These cards show estimated losses if a historical crash happened again today.",
            target: '.crash-simulations'
        },
        {
            message: "Value at Risk (VaR)",
            detail: "With 95% confidence, your daily loss won't exceed this percentage. Lower is better!",
            target: '.var-section'
        }
    ],
    advisor: [
        {
            message: "Next Investment Advisor",
            detail: "Based on your portfolio gaps, I recommend new stocks that would improve your diversification.",
            target: null
        },
        {
            message: "Gap Analysis",
            detail: "Shows which sectors you're underweight in. Fill these gaps for better balance!",
            target: '.gap-analysis'
        },
        {
            message: "Stock Recommendations",
            detail: "Momentum, volatility, and diversification scores. Higher stars = better fit for your portfolio.",
            target: '.stock-cards'
        }
    ]
};

// Rick Sanchez style SVG character - smaller for movement
const RickCharacter = ({ isSpeaking, size = 80 }) => (
    <svg
        className={`rick-character ${isSpeaking ? 'speaking' : ''}`}
        viewBox="0 0 100 120"
        width={size}
        height={size * 1.2}
    >
        {/* Lab coat body */}
        <ellipse cx="50" cy="100" rx="28" ry="18" fill="#f0f0f0" stroke="#ccc" strokeWidth="1.5" />

        {/* Neck */}
        <rect x="44" y="72" width="12" height="12" fill="#E8D5C9" rx="2" />

        {/* Head */}
        <ellipse cx="50" cy="45" rx="32" ry="28" fill="#E8D5C9" />

        {/* Rick's spiky blue/gray hair */}
        <path
            d="M20 35 Q10 15 28 22 Q22 5 42 12 Q45 -2 58 12 Q75 2 72 22 Q90 15 80 35"
            fill="#B8D4E3"
            stroke="#8FB9D3"
            strokeWidth="1.5"
        />
        <path d="M22 38 Q8 28 18 42" fill="#B8D4E3" />
        <path d="M78 38 Q92 28 82 42" fill="#B8D4E3" />

        {/* Unibrow */}
        <path d="M28 32 Q40 26 50 30 Q60 26 72 32" stroke="#555" strokeWidth="2.5" fill="none" />

        {/* Eyes - large and round like Rick */}
        <ellipse cx="38" cy="42" rx="10" ry="11" fill="white" stroke="#333" strokeWidth="0.5" />
        <ellipse cx="62" cy="42" rx="10" ry="11" fill="white" stroke="#333" strokeWidth="0.5" />

        {/* Pupils - look in direction */}
        <circle className="pupil" cx="40" cy="44" r="4" fill="#333" />
        <circle className="pupil" cx="64" cy="44" r="4" fill="#333" />

        {/* Bags under eyes */}
        <path d="M28 52 Q38 56 48 52" stroke="#D4B8A8" strokeWidth="1" fill="none" />
        <path d="M52 52 Q62 56 72 52" stroke="#D4B8A8" strokeWidth="1" fill="none" />

        {/* Drool/tired expression line */}
        <path d="M35 60 Q50 65 65 60" stroke="#D4B8A8" strokeWidth="0.5" fill="none" />

        {/* Mouth - animated when speaking */}
        <ellipse className="mouth" cx="50" cy="62" rx="10" ry={isSpeaking ? 6 : 2} fill="#8B4513" />
        {isSpeaking && <ellipse cx="50" cy="64" rx="8" ry="3" fill="#FFB6C1" />}
    </svg>
);

// Speech bubble with tail pointing to character
const SpeechBubble = ({ message, detail, onNext, onDismiss, hasNext, position }) => (
    <div className="rick-speech-bubble" style={position}>
        <div className="speech-content">
            <p className="speech-main">{message}</p>
            {detail && <p className="speech-detail">{detail}</p>}
        </div>
        <div className="speech-buttons">
            <button className="btn-skip" onClick={onDismiss}>Skip</button>
            <button className="btn-next" onClick={onNext}>
                {hasNext ? 'Next →' : 'Got it ✓'}
            </button>
        </div>
    </div>
);

export function AnimatedProfessor({ page = 'dashboard', onDismiss }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [position, setPosition] = useState({ left: 20, bottom: 20 });
    const [isMoving, setIsMoving] = useState(false);
    const [highlightedElement, setHighlightedElement] = useState(null);
    const professorRef = useRef(null);

    const scripts = PROFESSOR_SCRIPTS[page] || PROFESSOR_SCRIPTS.dashboard;
    const currentScript = scripts[currentStep];

    // Speaking animation cycle
    useEffect(() => {
        setIsSpeaking(true);
        const timer = setTimeout(() => setIsSpeaking(false), 2500);
        return () => clearTimeout(timer);
    }, [currentStep]);

    // Move professor to target element
    useEffect(() => {
        // Remove previous highlight
        if (highlightedElement) {
            highlightedElement.classList.remove('rick-highlight');
        }

        if (!currentScript?.target) {
            // No target - position at bottom left
            setPosition({ left: 20, bottom: 20, top: 'auto' });
            return;
        }

        const targetEl = document.querySelector(currentScript.target);
        if (!targetEl) {
            setPosition({ left: 20, bottom: 20, top: 'auto' });
            return;
        }

        // Highlight the target
        setHighlightedElement(targetEl);
        targetEl.classList.add('rick-highlight');
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Calculate position near the target
        setTimeout(() => {
            const rect = targetEl.getBoundingClientRect();
            const professorWidth = 80;
            const professorHeight = 100;

            // Position to the left of the element, or below if not enough space
            let left = rect.left - professorWidth - 20;
            let top = rect.top + (rect.height / 2) - (professorHeight / 2);

            // Bounds checking
            if (left < 10) left = rect.right + 20;
            if (top < 10) top = 10;
            if (top > window.innerHeight - professorHeight - 200) {
                top = window.innerHeight - professorHeight - 220;
            }

            setIsMoving(true);
            setPosition({ left, top, bottom: 'auto' });
            setTimeout(() => setIsMoving(false), 300);
        }, 400);

    }, [currentStep, currentScript]);

    const handleNext = useCallback(() => {
        if (highlightedElement) {
            highlightedElement.classList.remove('rick-highlight');
        }
        if (currentStep < scripts.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleDismiss();
        }
    }, [currentStep, scripts.length, highlightedElement]);

    const handleDismiss = useCallback(() => {
        if (highlightedElement) {
            highlightedElement.classList.remove('rick-highlight');
        }
        onDismiss?.();
    }, [highlightedElement, onDismiss]);

    if (!currentScript) return null;

    return (
        <div
            ref={professorRef}
            className={`rick-professor ${isMoving ? 'moving' : ''}`}
            style={{
                position: 'fixed',
                left: position.left,
                top: position.top,
                bottom: position.bottom,
                zIndex: 10000,
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
        >
            <RickCharacter isSpeaking={isSpeaking} size={80} />
            <SpeechBubble
                message={currentScript.message}
                detail={currentScript.detail}
                onNext={handleNext}
                onDismiss={handleDismiss}
                hasNext={currentStep < scripts.length - 1}
            />
            <div className="step-indicator">
                {currentStep + 1} / {scripts.length}
            </div>
        </div>
    );
}

// Toggle button - appears on all pages
export function ProfessorToggle({ onClick }) {
    return (
        <button className="rick-toggle" onClick={onClick} title="Ask Rick!">
            <span className="rick-emoji">�</span>
            <span className="rick-label">Ask Rick</span>
        </button>
    );
}

export default AnimatedProfessor;
