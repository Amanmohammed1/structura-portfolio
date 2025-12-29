import { useState } from 'react';
import { useAuth } from './AuthProvider';
import './Auth.css';

export function LoginForm({ onToggleMode, onSuccess }) {
    const { signIn, error: authError } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
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

    return (
        <div className="auth-form-container">
            <div className="auth-form-header">
                <h2>Login</h2>
                <p className="text-muted">Access your portfolio</p>
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
                        'Sign In'
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
