import { useState } from 'react';
import { useAuth } from './AuthProvider';
import './Auth.css';

// Google Icon SVG
const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
        <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009.003 18z" fill="#34A853" />
        <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
        <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.428 0 9.002 0A8.997 8.997 0 00.957 4.958L3.964 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335" />
    </svg>
);

export function LoginForm({ onToggleMode, onSuccess }) {
    const { signIn, signInWithGoogle, error: authError } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signIn(email, password);
            onSuccess?.();
        } catch (err) {
            setError(err.message || 'Failed to sign in');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setError('');
        setGoogleLoading(true);
        try {
            await signInWithGoogle();
            // Redirect happens automatically via Supabase OAuth
        } catch (err) {
            setError(err.message || 'Failed to sign in with Google');
            setGoogleLoading(false);
        }
    };

    return (
        <div className="auth-form-container">
            <div className="auth-form-header">
                <h2>Login</h2>
                <p className="text-muted">Access your portfolio</p>
            </div>

            {/* Google Sign-In Button - Primary CTA */}
            <button
                type="button"
                className="btn-google"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
            >
                <GoogleIcon />
                {googleLoading ? 'Connecting...' : 'Continue with Google'}
            </button>

            <div className="auth-divider">
                <span>or</span>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
                {(error || authError) && (
                    <div className="auth-error">
                        <span className="error-icon">⚠</span>
                        {error || authError}
                    </div>
                )}

                <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="trader@example.com"
                        required
                        autoComplete="email"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        autoComplete="current-password"
                    />
                </div>

                <button
                    type="submit"
                    className="btn btn-primary w-full"
                    disabled={loading}
                >
                    {loading ? (
                        <span className="terminal-loader">Authenticating</span>
                    ) : (
                        'Sign In with Email'
                    )}
                </button>
            </form>

            <div className="auth-footer">
                <p>
                    Don't have an account?{' '}
                    <button
                        type="button"
                        className="btn-link"
                        onClick={onToggleMode}
                    >
                        Sign up
                    </button>
                </p>
            </div>
        </div>
    );
}

export default LoginForm;
