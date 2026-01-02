/**
 * Zerodha OAuth Callback Page
 * Handles the OAuth redirect from Zerodha Kite Connect
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { fetchSectorCache, getSector } from '../data/assetUniverse';

// Table styles
const thStyle = {
    padding: '0.75rem 1rem',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
};

const tdStyle = {
    padding: '0.75rem 1rem',
    fontSize: '0.9rem'
};

export function ZerodhaCallbackPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('Processing...');
    const [error, setError] = useState('');
    const [holdings, setHoldings] = useState(null);
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        async function handleCallback() {
            const requestToken = searchParams.get('request_token');
            const errorParam = searchParams.get('status');

            if (errorParam === 'error') {
                setError('Zerodha login was cancelled or failed');
                return;
            }

            if (!requestToken) {
                setError('No request token received from Zerodha');
                return;
            }

            try {
                setStatus('Exchanging token...');

                // Exchange token and get holdings
                const { data, error: fetchError } = await supabase.functions.invoke('zerodha-auth', {
                    body: { action: 'exchange_token', request_token: requestToken }
                });

                if (fetchError || !data?.success) {
                    throw new Error(data?.error || fetchError?.message || 'Failed to fetch holdings');
                }

                setStatus(`Found ${data.count} holdings. Enriching with sectors...`);

                // Fetch sectors for the holdings
                const symbols = data.holdings.map(h => h.tradingSymbol);
                await fetchSectorCache(symbols);

                // Enrich holdings with sectors
                const enrichedHoldings = data.holdings.map(h => ({
                    ...h,
                    sector: getSector(h.tradingSymbol) || 'Other',
                }));

                // Show preview instead of auto-importing
                setHoldings(enrichedHoldings);
                setShowPreview(true);
                setStatus(`Found ${enrichedHoldings.length} stocks from Zerodha`);

            } catch (err) {
                console.error('Zerodha callback error:', err);
                setError(err.message || 'Failed to import holdings');
            }
        }

        handleCallback();
    }, [searchParams, navigate]);

    // Confirm import - save to localStorage and redirect
    const handleConfirmImport = () => {
        localStorage.setItem('upstox_holdings', JSON.stringify({
            holdings,
            fetchedAt: new Date().toISOString(),
            count: holdings.length
        }));
        localStorage.setItem('structura_import_source', 'zerodha');
        navigate('/?import=upstox');
    };

    // Cancel import
    const handleCancel = () => {
        navigate('/');
    };

    // Calculate totals for preview
    const totalValue = holdings?.reduce((sum, h) => sum + (h.currentValue || 0), 0) || 0;
    const totalPnL = holdings?.reduce((sum, h) => sum + (h.pnl || 0), 0) || 0;

    // Preview UI
    if (showPreview && holdings) {
        return (
            <div className="dashboard-content" style={{
                minHeight: '100vh',
                padding: '2rem'
            }}>
                <div className="glass-card" style={{
                    maxWidth: '900px',
                    margin: '0 auto',
                    padding: '2rem'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <div style={{
                            width: '60px',
                            height: '60px',
                            margin: '0 auto 1rem',
                            borderRadius: '12px',
                            overflow: 'hidden'
                        }}>
                            <img
                                src="/kite_logo.png"
                                alt="Zerodha Kite"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        </div>
                        <h2 style={{ color: 'var(--accent-cyan)', marginBottom: '0.5rem' }}>
                            Zerodha Portfolio Preview
                        </h2>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            Review your holdings before importing
                        </p>
                    </div>

                    {/* Summary Stats */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '1rem',
                        marginBottom: '2rem'
                    }}>
                        <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>Total Stocks</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                                {holdings.length}
                            </div>
                        </div>
                        <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>Total Value</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--accent-green)' }}>
                                ₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </div>
                        </div>
                        <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>Total P&L</div>
                            <div style={{
                                fontSize: '1.5rem',
                                fontWeight: 600,
                                color: totalPnL >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
                            }}>
                                {totalPnL >= 0 ? '+' : ''}₹{totalPnL.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </div>
                        </div>
                    </div>

                    {/* Holdings Table */}
                    <div style={{
                        maxHeight: '400px',
                        overflowY: 'auto',
                        marginBottom: '2rem',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '8px'
                    }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{
                                background: 'var(--glass-bg)',
                                position: 'sticky',
                                top: 0
                            }}>
                                <tr>
                                    <th style={thStyle}>Symbol</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>Qty</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>Avg Price</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>LTP</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>P&L</th>
                                </tr>
                            </thead>
                            <tbody>
                                {holdings.map((h, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                        <td style={tdStyle}>
                                            <div style={{ fontWeight: 500 }}>{h.tradingSymbol}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                                {h.sector}
                                            </div>
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'right' }}>{h.quantity}</td>
                                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                                            ₹{h.avgPrice?.toFixed(2)}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                                            ₹{h.currentPrice?.toFixed(2)}
                                        </td>
                                        <td style={{
                                            ...tdStyle,
                                            textAlign: 'right',
                                            fontWeight: 500,
                                            color: h.pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
                                        }}>
                                            {h.pnl >= 0 ? '+' : ''}₹{h.pnl?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Action Buttons */}
                    <div style={{
                        display: 'flex',
                        gap: '1rem',
                        justifyContent: 'center'
                    }}>
                        <button
                            className="btn"
                            onClick={handleCancel}
                            style={{
                                padding: '0.75rem 2rem',
                                background: 'transparent',
                                border: '1px solid var(--glass-border)'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleConfirmImport}
                            style={{
                                padding: '0.75rem 2rem',
                                background: 'linear-gradient(135deg, #387ed1, #2962B5)'
                            }}
                        >
                            Import {holdings.length} Holdings
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Loading/Error UI
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0a0a0a, #1a1a2e)',
            color: 'white',
            fontFamily: 'system-ui, sans-serif',
        }}>
            <div style={{
                textAlign: 'center',
                padding: '3rem',
                background: 'rgba(30, 30, 46, 0.8)',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                maxWidth: '400px',
            }}>
                {/* Zerodha Logo */}
                <div style={{
                    width: '80px',
                    height: '80px',
                    margin: '0 auto 1.5rem',
                    borderRadius: '16px',
                    overflow: 'hidden'
                }}>
                    <img
                        src="/kite_logo.png"
                        alt="Zerodha Kite"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                </div>

                {error ? (
                    <>
                        <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>Import Failed</h2>
                        <p style={{ color: '#a0a0a0', marginBottom: '1.5rem' }}>{error}</p>
                        <button
                            onClick={() => navigate('/')}
                            style={{
                                background: 'linear-gradient(135deg, #387ed1, #2962B5)',
                                color: 'white',
                                border: 'none',
                                padding: '0.75rem 2rem',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                cursor: 'pointer',
                            }}
                        >
                            Back to Dashboard
                        </button>
                    </>
                ) : (
                    <>
                        <h2 style={{ marginBottom: '1rem' }}>Connecting to Zerodha</h2>
                        <p style={{ color: '#a0a0a0', marginBottom: '1.5rem' }}>{status}</p>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            border: '3px solid rgba(56, 126, 209, 0.3)',
                            borderTopColor: '#387ed1',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            margin: '0 auto',
                        }} />
                    </>
                )}
            </div>

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

export default ZerodhaCallbackPage;
