/**
 * Zerodha OAuth Callback Page
 * Handles the OAuth redirect from Zerodha Kite Connect
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { fetchSectorCache, getSector } from '../data/assetUniverse';

export function ZerodhaCallbackPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('Processing...');
    const [error, setError] = useState('');

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

                // Save to localStorage - match the format Dashboard expects
                localStorage.setItem('upstox_holdings', JSON.stringify({ holdings: enrichedHoldings }));
                localStorage.setItem('structura_import_source', 'zerodha');

                setStatus('Import complete! Redirecting...');

                // Redirect to dashboard with import flag
                setTimeout(() => {
                    navigate('/?import=upstox'); // Reuse same import flow
                }, 1000);

            } catch (err) {
                console.error('Zerodha callback error:', err);
                setError(err.message || 'Failed to import holdings');
            }
        }

        handleCallback();
    }, [searchParams, navigate]);

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
                    background: 'linear-gradient(135deg, #387ed1, #2962B5)',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                }}>
                    📈
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
                        <h2 style={{ marginBottom: '1rem' }}>Importing from Zerodha</h2>
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
