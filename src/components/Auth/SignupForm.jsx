import { useState } from 'react';
import { useAuth } from './AuthProvider';
import './Auth.css';

export function SignupForm({ onToggleMode, onSuccess }) {
    const { signUp, error: authError } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            await signUp(email, password);
            setSuccess(true);
        } catch (err) {
            setError(err.message || 'Failed to create account');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="auth-form-container">
                <div className="auth-success">
                    <div className="success-icon">✓</div>
                    <h2>Check Your Email</h2>
                    <p>
                        We've sent a confirmation link to <strong>{email}</strong>.
                        <br />
                        Please verify your email to continue.
                    </p>
                    <button
                        type="button"
                        className="btn"
                        onClick={onToggleMode}
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-form-container">
            <div className="auth-form-header">
                <h2>Create Account</h2>
                <p className="text-muted">Start building portfolios</p>
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
                        placeholder="Min. 6 characters"
                        required
                        autoComplete="new-password"
                        minLength={6}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        autoComplete="new-password"
                    />
                </div>

                <button
                    type="submit"
                    className="btn btn-primary w-full"
                    disabled={loading}
                >
                    {loading ? (
                        <span className="terminal-loader">Creating account</span>
                    ) : (
                        'Create Account'
                    )}
                </button>
            </form>

            <div className="auth-footer">
                <p>
                    Already have an account?{' '}
                    <button
                        type="button"
                        className="btn-link"
                        onClick={onToggleMode}
                    >
                        Sign in
                    </button>
                </p>
            </div>
        </div>
    );
}

export default SignupForm;
