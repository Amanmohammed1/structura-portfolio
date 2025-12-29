/**
 * Target Allocation Slider Component
 * Interactive sliders for adjusting sector target weights
 */

import { useState, useEffect } from 'react';
import './AllocationSlider.css';

// Default target allocation (same as in nextInvestment.js)
export const DEFAULT_TARGET_ALLOCATION = {
    Banking: 15,
    IT: 15,
    FMCG: 10,
    Pharma: 10,
    Auto: 8,
    Energy: 8,
    Metals: 7,
    Cement: 5,
    Insurance: 5,
    Telecom: 5,
    Infra: 4,
    'Consumer': 4,
    Other: 4,
};

export function AllocationSliders({ sectors = [], currentAllocation = {}, onChange }) {
    const [targetAllocation, setTargetAllocation] = useState(() => ({ ...DEFAULT_TARGET_ALLOCATION }));
    const [isLocked, setIsLocked] = useState(true);

    // Calculate total and rebalance if needed
    const total = Object.values(targetAllocation).reduce((sum, v) => sum + v, 0);

    const handleSliderChange = (sector, value) => {
        const newValue = parseInt(value, 10);
        const oldValue = targetAllocation[sector] || 0;
        const diff = newValue - oldValue;

        // Rebalance other sectors proportionally
        const updated = { ...targetAllocation };
        updated[sector] = newValue;

        // Distribute the difference among other sectors
        const otherSectors = Object.keys(updated).filter(s => s !== sector);
        const totalOther = otherSectors.reduce((sum, s) => sum + updated[s], 0);

        if (totalOther > 0 && diff !== 0) {
            otherSectors.forEach(s => {
                const proportion = updated[s] / totalOther;
                updated[s] = Math.max(0, Math.round(updated[s] - diff * proportion));
            });
        }

        setTargetAllocation(updated);
        onChange?.(updated);
    };

    const resetToDefault = () => {
        setTargetAllocation({ ...DEFAULT_TARGET_ALLOCATION });
        onChange?.(DEFAULT_TARGET_ALLOCATION);
    };

    // Get sectors to display (prefer provided sectors, fall back to defaults)
    const displaySectors = sectors.length > 0
        ? sectors
        : Object.keys(DEFAULT_TARGET_ALLOCATION);

    return (
        <div className="allocation-sliders">
            <div className="sliders-header">
                <h4>Target Sector Allocation</h4>
                <div className="header-actions">
                    <span className={`total-badge ${Math.abs(total - 100) > 1 ? 'warning' : ''}`}>
                        Total: {total}%
                    </span>
                    <button
                        className="lock-btn"
                        onClick={() => setIsLocked(!isLocked)}
                        title={isLocked ? 'Unlock to edit' : 'Lock editing'}
                    >
                        {isLocked ? (
                            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                <path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h2c0-1.66 1.34-3 3-3s3 1.34 3 3v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z" />
                            </svg>
                        )}
                    </button>
                    <button className="reset-btn" onClick={resetToDefault}>
                        Reset
                    </button>
                </div>
            </div>

            <div className={`sliders-grid ${isLocked ? 'locked' : ''}`}>
                {displaySectors.map(sector => {
                    const current = currentAllocation[sector] || 0;
                    const target = targetAllocation[sector] || 0;
                    const gap = target - current;

                    return (
                        <div key={sector} className="slider-row">
                            <div className="slider-label">
                                <span className="sector-name">{sector}</span>
                                <span className={`gap-indicator ${gap > 2 ? 'underweight' : gap < -2 ? 'overweight' : 'neutral'}`}>
                                    {gap > 2 ? `+${gap.toFixed(0)}% needed` : gap < -2 ? `${gap.toFixed(0)}% over` : '✓'}
                                </span>
                            </div>
                            <div className="slider-track-wrapper">
                                <div className="current-marker" style={{ left: `${Math.min(100, current)}%` }} />
                                <input
                                    type="range"
                                    min="0"
                                    max="40"
                                    value={target}
                                    onChange={(e) => handleSliderChange(sector, e.target.value)}
                                    disabled={isLocked}
                                    className="allocation-slider"
                                />
                                <div className="slider-fill" style={{ width: `${(target / 40) * 100}%` }} />
                            </div>
                            <span className="target-value">{target}%</span>
                        </div>
                    );
                })}
            </div>

            <p className="sliders-hint">
                Adjust targets to see how recommendations change. Current allocation shown as markers.
            </p>
        </div>
    );
}

export default AllocationSliders;
