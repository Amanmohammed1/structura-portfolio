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
    { path: '/', icon: ChartIcon, label: 'Dashboard', description: 'Overview & Optimize' },
    { path: '/portfolio', icon: PortfolioIcon, label: 'My Portfolio', description: 'Track Actual P&L' },
    { path: '/risk', icon: RiskIcon, label: 'Risk Analysis', description: 'Stress Tests & VaR' },
    { path: '/advisor', icon: TipIcon, label: 'Next Investment', description: 'AI Recommendations' },
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

                <div className="sidebar-footer">
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
