import { useState } from 'react';
import { LoginForm, SignupForm } from '../components/Auth';
import '../components/Auth/Auth.css';

export function LoginPage() {
    const [mode, setMode] = useState('login');

    return (
        <div className="login-page">
            <div className="login-background">
                <div className="grid-pattern" />
            </div>

            <div className="login-container">
                <div className="login-branding">
                    <h1 className="brand-logo">
                        <span className="brand-icon">◈</span>
                        STRUCTURA
                    </h1>
                    <p className="brand-tagline">
                        Hierarchical Risk Parity Portfolio Engine
                    </p>
                    <div className="brand-features">
                        <div className="feature">
                            <span className="feature-icon">⬡</span>
                            <span>HRP Algorithm</span>
                        </div>
                        <div className="feature">
                            <span className="feature-icon">◇</span>
                            <span>Real-time Data</span>
                        </div>
                        <div className="feature">
                            <span className="feature-icon">△</span>
                            <span>Risk Analytics</span>
                        </div>
                    </div>
                </div>

                <div className="login-form-wrapper">
                    {mode === 'login' ? (
                        <LoginForm onToggleMode={() => setMode('signup')} />
                    ) : (
                        <SignupForm onToggleMode={() => setMode('login')} />
                    )}
                </div>
            </div>

            <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .login-background {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #0a0a0a 0%, #111111 50%, #0a0a0a 100%);
          z-index: 0;
        }

        .grid-pattern {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(0, 188, 212, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 188, 212, 0.03) 1px, transparent 1px);
          background-size: 50px 50px;
        }

        .login-container {
          position: relative;
          z-index: 1;
          display: flex;
          gap: 4rem;
          align-items: center;
          max-width: 900px;
          padding: 2rem;
        }

        .login-branding {
          flex: 1;
          text-align: center;
        }

        .brand-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          font-size: 2.5rem;
          font-weight: 700;
          letter-spacing: 0.15em;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .brand-icon {
          color: var(--accent-cyan);
          font-size: 3rem;
        }

        .brand-tagline {
          color: var(--text-tertiary);
          font-size: 0.85rem;
          letter-spacing: 0.05em;
          margin-bottom: 2rem;
        }

        .brand-features {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          align-items: center;
        }

        .feature {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-secondary);
          font-size: 0.8rem;
        }

        .feature-icon {
          color: var(--accent-green);
        }

        .login-form-wrapper {
          flex: 1;
          min-width: 350px;
        }

        @media (max-width: 768px) {
          .login-container {
            flex-direction: column;
            gap: 2rem;
          }

          .login-branding {
            display: none;
          }

          .login-form-wrapper {
            min-width: 100%;
          }
        }
      `}</style>
        </div>
    );
}

export default LoginPage;
