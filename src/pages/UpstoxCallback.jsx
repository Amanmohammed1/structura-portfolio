/**
 * Upstox OAuth Callback Page
 * Handles the redirect from Upstox after user authorizes
 * Now includes portfolio preview before confirming import
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../config/supabase';
import '../components/Dashboard/Dashboard.css';

export function UpstoxCallbackPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('Processing...');
    const [error, setError] = useState(null);
    const [holdings, setHoldings] = useState(null);
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        async function handleCallback() {
            const code = searchParams.get('code');
            const errorParam = searchParams.get('error');

            if (errorParam) {
                setError(`Authorization failed: ${errorParam}`);
                return;
            }

            if (!code) {
                setError('No authorization code received');
                return;
            }

            try {
                setStatus('Exchanging token...');

                // Exchange code for access token via Edge Function
                const { data: tokenData, error: tokenError } = await supabase.functions.invoke('upstox-auth', {
                    body: { action: 'exchange_token', code }
                });

                if (tokenError || !tokenData?.access_token) {
                    console.error('Token exchange failed:', tokenData, tokenError);
                    throw new Error(tokenData?.error || 'Token exchange failed');
                }

                setStatus('Fetching your holdings...');

                // Fetch holdings via Edge Function
                const { data: holdingsData, error: holdingsError } = await supabase.functions.invoke('upstox-auth', {
                    body: { action: 'get_holdings', accessToken: tokenData.access_token }
                });

                if (holdingsError || !holdingsData?.holdings) {
                    throw new Error(holdingsData?.error || 'Failed to fetch holdings');
                }

                // Show preview instead of auto-importing
                setHoldings(holdingsData.holdings);
                setShowPreview(true);
                setStatus(`Found ${holdingsData.count} stocks`);

            } catch (err) {
                console.error('Upstox callback error:', err);
                setError(err.message);
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
        navigate('/?import=upstox');
    };

    // Cancel import
    const handleCancel = () => {
        navigate('/');
    };

    // Calculate totals for preview
    const totalValue = holdings?.reduce((sum, h) => sum + (h.currentValue || 0), 0) || 0;

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
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
                        <h2 style={{ color: 'var(--accent-green)', marginBottom: '0.5rem' }}>
                            Portfolio Preview
                        </h2>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            Review your holdings before importing
                        </p>
                    </div>

                    {/* Summary Stats */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
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
                                    <th style={{ ...thStyle, textAlign: 'right' }}>Current</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {holdings.map((h, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                        <td style={tdStyle}>
                                            <div style={{ fontWeight: 500 }}>{h.tradingSymbol || h.symbol}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                                {h.name?.substring(0, 25)}
                                            </div>
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'right' }}>{h.quantity}</td>
                                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                                            ₹{h.avgBuyPrice?.toFixed(2)}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                                            ₹{h.currentPrice?.toFixed(2)}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 500 }}>
                                            ₹{h.currentValue?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
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
                                background: 'var(--accent-green)',
                                fontWeight: 600
                            }}
                        >
                            ✓ Confirm Import
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Loading/Error UI
    return (
        <div className="dashboard-content" style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div className="glass-card" style={{
                padding: '3rem',
                textAlign: 'center',
                maxWidth: '400px'
            }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                    {error ? '❌' : '🔗'}
                </div>
                <h2 style={{ marginBottom: '1rem', color: error ? 'var(--accent-red)' : 'var(--accent-cyan)' }}>
                    {error ? 'Connection Failed' : 'Connecting Upstox'}
                </h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                    {error || status}
                </p>
                {error && (
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/')}
                        style={{ marginTop: '1.5rem' }}
                    >
                        Back to Dashboard
                    </button>
                )}
            </div>
        </div>
    );
}

// Table styles
const thStyle = {
    padding: '0.75rem 1rem',
    textAlign: 'left',
    fontSize: '0.85rem',
    color: 'var(--text-tertiary)',
    fontWeight: 500
};

const tdStyle = {
    padding: '0.75rem 1rem',
    fontSize: '0.9rem'
};

export default UpstoxCallbackPage;
