/**
 * Sidebar Navigation Component
 * Premium dark theme with custom SVG icons and active states
 */

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

const NAV_ITEMS = [
    { path: '/', icon: ChartIcon, label: 'Dashboard', description: 'Overview & Optimize' },
    { path: '/portfolio', icon: PortfolioIcon, label: 'My Portfolio', description: 'Track Actual P&L' },
    { path: '/risk', icon: RiskIcon, label: 'Risk Analysis', description: 'Stress Tests & VaR' },
    { path: '/advisor', icon: TipIcon, label: 'Next Investment', description: 'AI Recommendations' },
];

export function Sidebar() {
    const { user, signOut } = useAuth();
    const location = useLocation();

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="logo">
                    <span className="logo-icon">
                        <StructureIcon size={24} />
                    </span>
                    <div className="logo-text">
                        <span className="logo-name">Structura</span>
                        <span className="logo-version">2.0</span>
                    </div>
                </div>
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
                <button className="sign-out-btn" onClick={signOut} title="Sign Out">
                    <LogoutIcon size={18} />
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;

