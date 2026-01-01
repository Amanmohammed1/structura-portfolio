/**
 * Animated Professor Component
 * Rick & Morty style animated guide that explains page elements
 * Can navigate to and highlight different parts of the UI
 */

import { useState, useEffect, useCallback } from 'react';
import './AnimatedProfessor.css';

// Professor messages for each page context
const PROFESSOR_SCRIPTS = {
    dashboard: {
        intro: {
            message: "Welcome to your Structure Optimizer! I'm here to help you understand what we're doing.",
            detail: "We analyze HOW your stocks move together, not how much money you made.",
            target: null
        },
        holdings: {
            message: "These are your current holdings.",
            detail: "Notice we're showing CURRENT VALUE and WEIGHT - that's your exposure. The structure matters, not when you bought.",
            target: '.holdings-table'
        },
        analyze: {
            message: "Click ANALYZE to run HRP!",
            detail: "HRP (Hierarchical Risk Parity) will look at 1 year of price movements to find correlations and calculate optimal weights.",
            target: '.analyze-btn'
        },
        correlation: {
            message: "This is the Correlation Matrix.",
            detail: "Green = stocks move together. Red = they move opposite. If two stocks are green, you're doubled up on the same risk!",
            target: '.heatmap-container'
        },
        weights: {
            message: "Here's the magic - Optimal Weights!",
            detail: "HRP penalizes correlated stocks. If HDFC and ICICI move together, it suggests reducing one.",
            target: '.weights-table'
        },
        rebalancing: {
            message: "These are your ACTION items.",
            detail: "See the ₹ amounts? That's exactly how much to buy or sell to achieve optimal structure.",
            target: '.rebalancing-section'
        }
    },
    portfolio: {
        intro: {
            message: "This shows your Current Holdings.",
            detail: "Important: The P&L here comes from your broker (Upstox). We don't calculate it differently.",
            target: null
        },
        pnl: {
            message: "P&L from Broker",
            detail: "This is exactly what Upstox sends us - your actual profit/loss based on your cost basis.",
            target: '.pnl-column'
        }
    },
    risk: {
        intro: {
            message: "Risk Analysis Dashboard",
            detail: "Here we stress-test your portfolio against historical crashes and calculate risk metrics.",
            target: null
        },
        var: {
            message: "Value at Risk (VaR)",
            detail: "This tells you: 'With 95% confidence, you won't lose more than X% in a single day.'",
            target: '.var-metric'
        }
    }
};

// Professor SVG character - animated with CSS
const ProfessorCharacter = ({ isSpeaking, isPointing, direction = 'right' }) => (
    <svg
        className={`professor-character ${isSpeaking ? 'speaking' : ''} ${isPointing ? 'pointing' : ''}`}
        viewBox="0 0 120 150"
        width="120"
        height="150"
    >
        {/* Lab coat body */}
        <ellipse cx="60" cy="120" rx="35" ry="25" fill="#f0f0f0" stroke="#ddd" strokeWidth="2" />

        {/* Neck */}
        <rect x="52" y="85" width="16" height="15" fill="#fdd" rx="3" />

        {/* Head */}
        <ellipse cx="60" cy="55" rx="38" ry="35" fill="#fdd" />

        {/* Wild hair (Rick-style) */}
        <path
            d="M25 40 Q20 20 35 25 Q30 10 50 15 Q55 0 70 15 Q85 5 90 25 Q100 20 95 45"
            fill="#ADD8E6"
            stroke="#87CEEB"
            strokeWidth="2"
        />
        <path d="M28 45 Q15 35 22 50" fill="#ADD8E6" />
        <path d="M92 45 Q105 35 98 50" fill="#ADD8E6" />

        {/* Eyebrows */}
        <path d="M35 38 Q42 32 50 38" stroke="#555" strokeWidth="3" fill="none" />
        <path d="M70 38 Q78 32 85 38" stroke="#555" strokeWidth="3" fill="none" />

        {/* Eyes */}
        <ellipse cx="42" cy="50" rx="10" ry="12" fill="white" />
        <ellipse cx="78" cy="50" rx="10" ry="12" fill="white" />
        <circle className="pupil left" cx="44" cy="52" r="5" fill="#333" />
        <circle className="pupil right" cx="80" cy="52" r="5" fill="#333" />

        {/* Nose */}
        <path d="M55 55 Q60 70 65 55" stroke="#daa" strokeWidth="2" fill="none" />

        {/* Mouth - animated when speaking */}
        <ellipse className="mouth" cx="60" cy="75" rx="12" ry={isSpeaking ? 8 : 4} fill="#c44" />

        {/* Pointing arm (optional) */}
        {isPointing && (
            <g className={`pointing-arm ${direction}`}>
                <line x1="95" y1="100" x2="140" y2="80" stroke="#fdd" strokeWidth="12" strokeLinecap="round" />
                <circle cx="145" cy="78" r="8" fill="#fdd" />
            </g>
        )}
    </svg>
);

// Speech bubble component
const SpeechBubble = ({ message, detail, onNext, onDismiss, hasNext }) => (
    <div className="professor-speech-bubble">
        <div className="speech-content">
            <p className="speech-message">{message}</p>
            {detail && <p className="speech-detail">{detail}</p>}
        </div>
        <div className="speech-actions">
            <button className="speech-btn dismiss" onClick={onDismiss}>Got it!</button>
            {hasNext && <button className="speech-btn next" onClick={onNext}>Next →</button>}
        </div>
    </div>
);

export function AnimatedProfessor({ page = 'dashboard', onDismiss }) {
    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [highlightedElement, setHighlightedElement] = useState(null);

    const pageScript = PROFESSOR_SCRIPTS[page] || PROFESSOR_SCRIPTS.dashboard;
    const steps = Object.values(pageScript);
    const currentMessage = steps[currentStep];

    // Enter animation
    useEffect(() => {
        setTimeout(() => setIsVisible(true), 100);
    }, []);

    // Speaking animation
    useEffect(() => {
        if (currentMessage) {
            setIsSpeaking(true);
            const timer = setTimeout(() => setIsSpeaking(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [currentStep, currentMessage]);

    // Highlight target element
    useEffect(() => {
        if (currentMessage?.target) {
            const el = document.querySelector(currentMessage.target);
            if (el) {
                setHighlightedElement(el);
                el.classList.add('professor-highlight');
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
        return () => {
            if (highlightedElement) {
                highlightedElement.classList.remove('professor-highlight');
            }
        };
    }, [currentStep, currentMessage]);

    const handleNext = useCallback(() => {
        if (highlightedElement) {
            highlightedElement.classList.remove('professor-highlight');
        }
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleDismiss();
        }
    }, [currentStep, steps.length, highlightedElement]);

    const handleDismiss = useCallback(() => {
        if (highlightedElement) {
            highlightedElement.classList.remove('professor-highlight');
        }
        setIsVisible(false);
        setTimeout(() => onDismiss?.(), 300);
    }, [highlightedElement, onDismiss]);

    if (!currentMessage) return null;

    return (
        <div className={`animated-professor ${isVisible ? 'visible' : ''}`}>
            <div className="professor-wrapper">
                <ProfessorCharacter
                    isSpeaking={isSpeaking}
                    isPointing={!!currentMessage.target}
                    direction="right"
                />
                <SpeechBubble
                    message={currentMessage.message}
                    detail={currentMessage.detail}
                    onNext={handleNext}
                    onDismiss={handleDismiss}
                    hasNext={currentStep < steps.length - 1}
                />
            </div>

            {/* Step indicator */}
            <div className="professor-steps">
                {steps.map((_, i) => (
                    <div
                        key={i}
                        className={`step-dot ${i === currentStep ? 'active' : ''} ${i < currentStep ? 'done' : ''}`}
                    />
                ))}
            </div>
        </div>
    );
}

// Toggle button to call the professor
export function ProfessorToggle({ onClick }) {
    return (
        <button className="professor-toggle" onClick={onClick} title="Ask Professor">
            <span className="toggle-icon">🧑‍🔬</span>
            <span className="toggle-text">Ask Prof</span>
        </button>
    );
}

export default AnimatedProfessor;
