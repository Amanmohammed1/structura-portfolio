/**
 * Upstox OAuth Callback Page
 * Handles the redirect from Upstox after user authorizes
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

                // Use Vercel API route for token exchange (server-side, Vercel IPs)
                const tokenResponse = await fetch('/api/upstox-token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ code })
                });

                const tokenData = await tokenResponse.json();

                if (!tokenData.access_token) {
                    console.error('Token exchange failed:', tokenData);
                    throw new Error(tokenData.error || tokenData.details?.errors?.[0]?.message || 'Token exchange failed');
                }

                setStatus('Fetching your holdings...');

                // Fetch holdings via Vercel API route
                const holdingsResponse = await fetch('/api/upstox-holdings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ accessToken: tokenData.access_token })
                });

                const holdingsData = await holdingsResponse.json();

                if (!holdingsData.holdings) {
                    throw new Error(holdingsData.error || 'Failed to fetch holdings');
                }

                // Store in localStorage for import
                localStorage.setItem('upstox_holdings', JSON.stringify({
                    holdings: holdingsData.holdings,
                    fetchedAt: new Date().toISOString(),
                    count: holdingsData.count
                }));

                setStatus(`Found ${holdingsData.count} stocks! Redirecting...`);

                // Redirect to dashboard with flag to auto-import
                setTimeout(() => {
                    navigate('/?import=upstox');
                }, 1500);

            } catch (err) {
                console.error('Upstox callback error:', err);
                setError(err.message);
            }
        }

        handleCallback();
    }, [searchParams, navigate]);

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

export default UpstoxCallbackPage;
