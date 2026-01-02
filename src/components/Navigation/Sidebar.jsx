/**
 * Sidebar Navigation Component
 * Premium dark theme with custom SVG icons and active states
 * Mobile-responsive with hamburger menu toggle
 */

import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../Auth';
import {
    ChartIcon,
    PortfolioIcon,
    RiskIcon,
    TipIcon,
    StructureIcon
} from '../Icons';
import WalletWidget from './WalletWidget';
import './Sidebar.css';

// Logout icon (not in main library)
const LogoutIcon = ({ size = 18 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
);

// Hamburger menu icon
const MenuIcon = ({ size = 24 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
);

// Close icon
const CloseIcon = ({ size = 24 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const NAV_ITEMS = [
    { path: '/', icon: ChartIcon, label: 'Dashboard', description: 'Structure Optimizer' },
    { path: '/portfolio', icon: PortfolioIcon, label: 'My Portfolio', description: 'Current Holdings' },
    { path: '/risk', icon: RiskIcon, label: 'Risk Analysis', description: 'Stress Tests & VaR' },
    { path: '/advisor', icon: TipIcon, label: 'Next Investment', description: 'Gap Analysis' },
];

export function Sidebar() {
    const { user, signOut } = useAuth();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);

    // Close sidebar when route changes (mobile)
    useEffect(() => {
        setIsOpen(false);
    }, [location.pathname]);

    // Close sidebar when clicking outside on mobile
    const handleOverlayClick = () => {
        setIsOpen(false);
    };

    // Handle opening sidebar - scroll to top on mobile
    const handleMenuClick = () => {
        if (!isOpen) {
            window.scrollTo({ top: 0, behavior: 'instant' });
        }
        setIsOpen(!isOpen);
    };

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                className="mobile-menu-btn"
                onClick={handleMenuClick}
                aria-label="Toggle menu"
            >
                {isOpen ? <CloseIcon size={24} /> : <MenuIcon size={24} />}
            </button>

            {/* Overlay for mobile */}
            {isOpen && <div className="sidebar-overlay" onClick={handleOverlayClick} />}

            {/* Sidebar */}
            <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="logo">
                        <span className="logo-icon">
                            <StructureIcon size={24} />
                        </span>
                        <div className="logo-text">
                            <span className="logo-name">Structura</span>
                        </div>
                    </div>
                    {/* Close button visible on mobile inside sidebar */}
                    <button className="mobile-close-btn" onClick={() => setIsOpen(false)}>
                        <CloseIcon size={20} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    <div className="nav-section">
                        <span className="nav-section-title">Tools</span>
                        {NAV_ITEMS.map(item => {
                            const IconComponent = item.icon;
                            return (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={({ isActive }) =>
                                        `nav-item ${isActive ? 'active' : ''}`
                                    }
                                    end={item.path === '/'}
                                    onClick={() => setIsOpen(false)}
                                >
                                    <span className="nav-icon">
                                        <IconComponent size={20} />
                                    </span>
                                    <div className="nav-content">
                                        <span className="nav-label">{item.label}</span>
                                        <span className="nav-description">{item.description}</span>
                                    </div>
                                </NavLink>
                            );
                        })}
                    </div>
                </nav>

                {/* Wallet Widget - Portfolio Quick View */}
                <WalletWidget />

                <div className="sidebar-footer">
                    {/* Legal Disclaimer */}
                    <div className="legal-disclaimer" style={{
                        fontSize: '0.6rem',
                        color: 'rgba(255,255,255,0.4)',
                        padding: '0.5rem 0.75rem',
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                        marginBottom: '0.5rem',
                        lineHeight: '1.4'
                    }}>
                        <span style={{ color: 'rgba(245, 158, 11, 0.7)' }}>⚠️</span> For educational purposes only. Not SEBI registered.
                        Not investment advice.
                    </div>

                    {/* LinkedIn CTA */}
                    <a
                        href="https://www.linkedin.com/in/aman-mohammed-2182b51b9/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="linkedin-cta"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 0.75rem',
                            background: 'linear-gradient(135deg, rgba(10, 102, 194, 0.2), rgba(10, 102, 194, 0.1))',
                            borderRadius: '8px',
                            marginBottom: '0.75rem',
                            textDecoration: 'none',
                            color: 'var(--color-text)',
                            fontSize: '0.75rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                        </svg>
                        <span style={{ flex: 1 }}>Built by <strong>Aman</strong> @ MS</span>
                        <span style={{ fontSize: '0.875rem' }}>👋</span>
                    </a>

                    <div className="user-info">
                        <div className="user-avatar">
                            {user?.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="user-details">
                            <span className="user-email">{user?.email || 'User'}</span>
                            <span className="user-plan">Free Plan</span>
                        </div>
                    </div>
                    <button
                        className="sign-out-btn"
                        onClick={async () => {
                            setIsOpen(false); // Close sidebar first
                            await signOut();  // Wait for signout
                        }}
                        title="Sign Out"
                    >
                        <LogoutIcon size={18} />
                    </button>
                </div>
            </aside>
        </>
    );
}

export default Sidebar;
