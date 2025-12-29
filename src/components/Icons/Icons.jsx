/**
 * Premium Icon Library
 * SVG icons to replace emojis throughout the app
 * Designed to match the Structura aesthetic
 */

import React from 'react';

// Icon wrapper with consistent sizing and animation
const IconWrapper = ({ children, size = 20, className = '', animate = false }) => (
    <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={`structura-icon ${className} ${animate ? 'icon-animate' : ''}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        {children}
    </svg>
);

// Import/Upload icon
export const ImportIcon = ({ size, className }) => (
    <IconWrapper size={size} className={className}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
    </IconWrapper>
);

// Analyze/Search icon 
export const AnalyzeIcon = ({ size, className }) => (
    <IconWrapper size={size} className={className}>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        <path d="M8 11h6M11 8v6" />
    </IconWrapper>
);

// Refresh/Reload icon
export const RefreshIcon = ({ size, className, animate }) => (
    <IconWrapper size={size} className={className} animate={animate}>
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </IconWrapper>
);

// Clear/X icon
export const ClearIcon = ({ size, className }) => (
    <IconWrapper size={size} className={className}>
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
    </IconWrapper>
);

// Back/Arrow icon
export const BackIcon = ({ size, className }) => (
    <IconWrapper size={size} className={className}>
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
    </IconWrapper>
);

// Warning icon
export const WarningIcon = ({ size, className }) => (
    <IconWrapper size={size} className={className}>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </IconWrapper>
);

// Success/Check icon
export const CheckIcon = ({ size, className }) => (
    <IconWrapper size={size} className={className}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </IconWrapper>
);

// Portfolio/Briefcase icon
export const PortfolioIcon = ({ size, className }) => (
    <IconWrapper size={size} className={className}>
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </IconWrapper>
);

// Chart/Analytics icon
export const ChartIcon = ({ size, className }) => (
    <IconWrapper size={size} className={className}>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
    </IconWrapper>
);

// Risk/Shield icon
export const RiskIcon = ({ size, className }) => (
    <IconWrapper size={size} className={className}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </IconWrapper>
);

// Target icon
export const TargetIcon = ({ size, className }) => (
    <IconWrapper size={size} className={className}>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
    </IconWrapper>
);

// Trend Up icon
export const TrendUpIcon = ({ size, className }) => (
    <IconWrapper size={size} className={className}>
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
    </IconWrapper>
);

// Trend Down icon
export const TrendDownIcon = ({ size, className }) => (
    <IconWrapper size={size} className={className}>
        <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
        <polyline points="17 18 23 18 23 12" />
    </IconWrapper>
);

// Settings/Gear icon
export const SettingsIcon = ({ size, className }) => (
    <IconWrapper size={size} className={className}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </IconWrapper>
);

// Info icon
export const InfoIcon = ({ size, className }) => (
    <IconWrapper size={size} className={className}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
    </IconWrapper>
);

// Plus icon
export const PlusIcon = ({ size, className }) => (
    <IconWrapper size={size} className={className}>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </IconWrapper>
);

// Structure/Hierarchy icon (brand icon)
export const StructureIcon = ({ size, className }) => (
    <IconWrapper size={size} className={className}>
        <circle cx="12" cy="5" r="3" />
        <circle cx="6" cy="19" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <path d="M12 12L6 16" />
        <path d="M12 12L18 16" />
    </IconWrapper>
);

// Lightbulb/Tip icon
export const TipIcon = ({ size, className }) => (
    <IconWrapper size={size} className={className}>
        <path d="M9 18h6M10 22h4M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </IconWrapper>
);

// Folder/File icon
export const FolderIcon = ({ size, className }) => (
    <IconWrapper size={size} className={className}>
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </IconWrapper>
);

export default {
    ImportIcon,
    AnalyzeIcon,
    RefreshIcon,
    ClearIcon,
    BackIcon,
    WarningIcon,
    CheckIcon,
    PortfolioIcon,
    ChartIcon,
    RiskIcon,
    TargetIcon,
    TrendUpIcon,
    TrendDownIcon,
    SettingsIcon,
    InfoIcon,
    PlusIcon,
    StructureIcon,
    TipIcon,
    FolderIcon,
};
