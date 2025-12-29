/**
 * 🌟 NEXT-GEN PREMIUM UI KIT
 * Mind-blowing, cutting-edge elements for the modern fintech experience
 * 
 * Features:
 * - 3D transforms with perspective
 * - Glassmorphism with dynamic blur
 * - Particle/Aurora animations
 * - Liquid morphing effects
 * - Spring-physics micro-interactions
 * - Neon glow aesthetics
 */

import React, { useState, useEffect, useRef } from 'react';
import './PremiumUI.css';

// ==========================================
// 🔮 ANIMATED 3D LOGO
// ==========================================
export function Logo3D({ size = 48 }) {
    return (
        <div className="logo-3d" style={{ width: size, height: size }}>
            <div className="logo-cube">
                <div className="cube-face front"></div>
                <div className="cube-face back"></div>
                <div className="cube-face left"></div>
                <div className="cube-face right"></div>
                <div className="cube-face top"></div>
                <div className="cube-face bottom"></div>
            </div>
            <div className="logo-glow"></div>
        </div>
    );
}

// ==========================================
// ✨ AURORA BACKGROUND
// ==========================================
export function AuroraBackground({ children, intensity = 'medium' }) {
    return (
        <div className={`aurora-bg aurora-${intensity}`}>
            <div className="aurora-layer aurora-1"></div>
            <div className="aurora-layer aurora-2"></div>
            <div className="aurora-layer aurora-3"></div>
            <div className="aurora-noise"></div>
            <div className="aurora-content">{children}</div>
        </div>
    );
}

// ==========================================
// 💎 GLASSMORPHIC CARD
// ==========================================
export function GlassCard({ children, className = '', glow = false, tilt = true }) {
    const cardRef = useRef(null);
    const [transform, setTransform] = useState('');
    const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });

    const handleMouseMove = (e) => {
        if (!tilt || !cardRef.current) return;

        const rect = cardRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        const rotateX = (y - 0.5) * -10;
        const rotateY = (x - 0.5) * 10;

        setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`);
        setGlowPos({ x: x * 100, y: y * 100 });
    };

    const handleMouseLeave = () => {
        setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    };

    return (
        <div
            ref={cardRef}
            className={`glass-card ${className} ${glow ? 'with-glow' : ''}`}
            style={{ transform }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <div className="glass-shine" style={{
                background: `radial-gradient(circle at ${glowPos.x}% ${glowPos.y}%, rgba(0, 212, 255, 0.15) 0%, transparent 50%)`
            }}></div>
            <div className="glass-border"></div>
            <div className="glass-content">{children}</div>
        </div>
    );
}

// ==========================================
// 🎯 MORPHING BUTTON
// ==========================================
export function MorphButton({ children, onClick, variant = 'primary', loading = false, icon = null }) {
    const [ripples, setRipples] = useState([]);

    const handleClick = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const newRipple = { x, y, id: Date.now() };
        setRipples(prev => [...prev, newRipple]);

        setTimeout(() => {
            setRipples(prev => prev.filter(r => r.id !== newRipple.id));
        }, 600);

        onClick?.(e);
    };

    return (
        <button
            className={`morph-btn morph-${variant} ${loading ? 'loading' : ''}`}
            onClick={handleClick}
            disabled={loading}
        >
            <span className="btn-bg"></span>
            <span className="btn-glow"></span>
            {ripples.map(ripple => (
                <span
                    key={ripple.id}
                    className="btn-ripple"
                    style={{ left: ripple.x, top: ripple.y }}
                />
            ))}
            <span className="btn-content">
                {loading ? (
                    <span className="btn-loader">
                        <span></span><span></span><span></span>
                    </span>
                ) : (
                    <>
                        {icon && <span className="btn-icon">{icon}</span>}
                        {children}
                    </>
                )}
            </span>
        </button>
    );
}

// ==========================================
// 📊 ANIMATED METRIC CARD
// ==========================================
export function MetricCard({ label, value, delta, deltaType = 'neutral', icon, animate = true }) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        if (!animate || typeof value !== 'number') {
            setDisplayValue(value);
            return;
        }

        const duration = 1500;
        const start = Date.now();
        const startVal = 0;

        const tick = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            // Easing function for smooth animation
            const eased = 1 - Math.pow(1 - progress, 4);
            setDisplayValue(startVal + (value - startVal) * eased);

            if (progress < 1) requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
    }, [value, animate]);

    return (
        <div className="metric-card">
            <div className="metric-bg">
                <div className="metric-orb orb-1"></div>
                <div className="metric-orb orb-2"></div>
            </div>
            <div className="metric-content">
                {icon && <div className="metric-icon">{icon}</div>}
                <div className="metric-data">
                    <span className="metric-label">{label}</span>
                    <span className="metric-value">
                        {typeof displayValue === 'number' ? displayValue.toFixed(1) : displayValue}
                    </span>
                    {delta !== undefined && (
                        <span className={`metric-delta ${deltaType}`}>
                            {deltaType === 'positive' ? '↑' : deltaType === 'negative' ? '↓' : ''}
                            {delta}
                        </span>
                    )}
                </div>
            </div>
            <div className="metric-shine"></div>
        </div>
    );
}

// ==========================================
// 🌊 LIQUID PROGRESS
// ==========================================
export function LiquidProgress({ value, max = 100, color = 'cyan' }) {
    const percentage = Math.min((value / max) * 100, 100);

    return (
        <div className="liquid-progress">
            <div className="liquid-container">
                <div
                    className={`liquid-fill liquid-${color}`}
                    style={{ height: `${percentage}%` }}
                >
                    <div className="liquid-wave wave-1"></div>
                    <div className="liquid-wave wave-2"></div>
                </div>
                <div className="liquid-value">{Math.round(percentage)}%</div>
            </div>
            <div className="liquid-glow" style={{ opacity: percentage / 100 }}></div>
        </div>
    );
}

// ==========================================
// 🎭 FLOATING ORBS
// ==========================================
export function FloatingOrbs({ count = 5 }) {
    return (
        <div className="floating-orbs">
            {[...Array(count)].map((_, i) => (
                <div
                    key={i}
                    className="orb"
                    style={{
                        '--delay': `${i * 0.5}s`,
                        '--size': `${20 + Math.random() * 40}px`,
                        '--x': `${Math.random() * 100}%`,
                        '--y': `${Math.random() * 100}%`,
                    }}
                />
            ))}
        </div>
    );
}

// ==========================================
// ⚡ NEON TEXT
// ==========================================
export function NeonText({ children, color = 'cyan', flicker = false }) {
    return (
        <span className={`neon-text neon-${color} ${flicker ? 'flicker' : ''}`}>
            {children}
        </span>
    );
}

// ==========================================
// 🎪 HOLOGRAPHIC BADGE
// ==========================================
export function HoloBadge({ children, variant = 'primary' }) {
    return (
        <span className={`holo-badge holo-${variant}`}>
            <span className="holo-shine"></span>
            <span className="holo-content">{children}</span>
        </span>
    );
}

// ==========================================
// 📈 SPARK LINE (Mini chart)
// ==========================================
export function SparkLine({ data = [], width = 80, height = 24, color = '#00d4ff' }) {
    if (!data.length) return null;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    const trend = data[data.length - 1] > data[0] ? 'up' : 'down';
    const trendColor = trend === 'up' ? '#00ff88' : '#ff5555';

    return (
        <div className="spark-line">
            <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
                <defs>
                    <linearGradient id={`spark-grad-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={trendColor} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={trendColor} stopOpacity="0" />
                    </linearGradient>
                </defs>
                <polygon
                    points={`0,${height} ${points} ${width},${height}`}
                    fill={`url(#spark-grad-${color.replace('#', '')})`}
                />
                <polyline
                    points={points}
                    fill="none"
                    stroke={trendColor}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <circle
                    cx={width}
                    cy={height - ((data[data.length - 1] - min) / range) * height}
                    r="3"
                    fill={trendColor}
                    className="spark-dot"
                />
            </svg>
        </div>
    );
}

// ==========================================
// 🎯 INTERACTIVE DIAL
// ==========================================
export function ScoreDial({ score, max = 100, label = 'Score' }) {
    const percentage = (score / max) * 100;
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (percentage / 100) * circumference;

    const getColor = () => {
        if (percentage >= 80) return '#00ff88';
        if (percentage >= 60) return '#00d4ff';
        if (percentage >= 40) return '#ffd700';
        return '#ff5555';
    };

    return (
        <div className="score-dial">
            <svg viewBox="0 0 100 100" className="dial-svg">
                <defs>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                <circle
                    cx="50" cy="50" r="45"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="8"
                />
                <circle
                    cx="50" cy="50" r="45"
                    fill="none"
                    stroke={getColor()}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                    filter="url(#glow)"
                    className="dial-progress"
                />
            </svg>
            <div className="dial-content">
                <span className="dial-value" style={{ color: getColor() }}>{score}</span>
                <span className="dial-label">{label}</span>
            </div>
            <div className="dial-glow" style={{ background: getColor() }}></div>
        </div>
    );
}

export default {
    Logo3D,
    AuroraBackground,
    GlassCard,
    MorphButton,
    MetricCard,
    LiquidProgress,
    FloatingOrbs,
    NeonText,
    HoloBadge,
    SparkLine,
    ScoreDial,
};
