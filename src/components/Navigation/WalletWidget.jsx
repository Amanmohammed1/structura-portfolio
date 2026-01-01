/**
 * Wallet Widget Component
 * Shows portfolio summary - always visible in sidebar
 * Citadel Perspective: Quick access to portfolio status
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './WalletWidget.css';

// Wallet Icon
const WalletIcon = ({ size = 18 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 4H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z" />
        <path d="M1 10h22" />
        <circle cx="18" cy="15" r="2" />
    </svg>
);

export function WalletWidget() {
    const navigate = useNavigate();
    const [holdings, setHoldings] = useState([]);

    useEffect(() => {
        // Load portfolio from localStorage
        const loadPortfolio = () => {
            const stored = localStorage.getItem('structura_portfolio');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    // structura_portfolio stores the holdings array directly
                    setHoldings(Array.isArray(parsed) ? parsed : parsed.holdings || []);
                } catch (e) {
                    console.error('Error parsing portfolio:', e);
                    setHoldings([]);
                }
            } else {
                setHoldings([]);
            }
        };

        loadPortfolio();

        // Listen for storage changes (when portfolio is imported)
        const handleStorage = () => loadPortfolio();
        window.addEventListener('storage', handleStorage);

        // Also listen for custom event
        window.addEventListener('portfolio-updated', handleStorage);

        // Reload on visibility change (when returning to tab)
        const handleVisibility = () => {
            if (!document.hidden) loadPortfolio();
        };
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('portfolio-updated', handleStorage);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, []);

    // Calculate totals
    const totalValue = holdings.reduce((sum, h) => sum + (h.currentValue || h.quantity * h.currentPrice || 0), 0);
    const stockCount = holdings.length;

    // No portfolio - show "Import" prompt
    if (stockCount === 0) {
        return (
            <div className="wallet-widget wallet-empty" onClick={() => navigate('/')}>
                <div className="wallet-icon">
                    <WalletIcon size={20} />
                </div>
                <div className="wallet-info">
                    <span className="wallet-label">No Portfolio</span>
                    <span className="wallet-action">Import to start →</span>
                </div>
            </div>
        );
    }

    return (
        <div className="wallet-widget" onClick={() => navigate('/')}>
            <div className="wallet-icon active">
                <WalletIcon size={20} />
            </div>
            <div className="wallet-info">
                <span className="wallet-value">
                    ₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
                <span className="wallet-stocks">
                    {stockCount} {stockCount === 1 ? 'stock' : 'stocks'}
                </span>
            </div>
        </div>
    );
}

export default WalletWidget;
