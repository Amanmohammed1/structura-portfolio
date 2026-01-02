/**
 * Structura 2.0 - My Portfolio Page
 * 
 * Features:
 * - Actual P&L with real prices
 * - Rebalance Simulator: Shows what trades are needed to achieve target weights
 * - Three modes: Current (reality), Equal Weight, HRP Optimal
 */

import { useState, useMemo } from 'react';
import { usePortfolio } from '../components/Portfolio';
import { getAssetName } from '../data/assetUniverse';
import { ProfessorGuide } from '../components/Guide';
import { PortfolioIcon } from '../components/Icons';
import '../components/Dashboard/Dashboard.css';
import './MyPortfolio.css';

// Format currency in INR
const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
};

// Format percentage
const formatPercent = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '0%';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
};

// Simulation modes - only show meaningful comparisons
const SIMULATION_MODES = [
    {
        id: 'current',
        label: 'Current Holdings',
        description: 'What you actually own today',
        icon: '📊'
    },
    {
        id: 'hrp',
        label: 'HRP Optimal',
        description: 'Risk-adjusted optimal allocation',
        icon: '🧠'
    },
];

export function MyPortfolioPage() {
    const { holdings, portfolioStats, loading, hasPortfolio } = usePortfolio();
    const [simulationMode, setSimulationMode] = useState('current');

    // Calculate portfolio with simulation
    const { enrichedHoldings, totals, simulation } = useMemo(() => {
        if (!holdings || holdings.length === 0) {
            return { enrichedHoldings: [], totals: null, simulation: null };
        }

        const n = holdings.length;

        // Step 1: Calculate CURRENT state (reality)
        const totalCurrentValue = holdings.reduce((sum, h) => sum + (h.currentValue || 0), 0);

        const currentHoldings = holdings.map(h => {
            const avgBuyPrice = h.avgPrice || h.avgBuyPrice || h.basePrice || (h.currentPrice * 0.9);
            const investedValue = h.quantity * avgBuyPrice;

            // Use broker's P&L if available (Upstox sends this), otherwise calculate
            const pnl = h.pnl !== undefined ? h.pnl : (h.currentValue - investedValue);
            const pnlPercent = investedValue > 0 ? (pnl / investedValue) * 100 : 0;
            const currentWeight = totalCurrentValue > 0 ? (h.currentValue / totalCurrentValue) * 100 : 0;

            return {
                ...h,
                avgBuyPrice,
                investedValue,
                pnl,
                pnlPercent,
                currentWeight,
                currentQty: h.quantity,
                currentValue: h.currentValue,
            };
        });

        // Step 2: Calculate SIMULATED state based on mode
        let simulatedHoldings = currentHoldings;
        let simulationInfo = null;

        if (simulationMode !== 'current') {
            simulatedHoldings = currentHoldings.map(h => {
                // HRP weight from Dashboard analysis, fallback to equal weight
                const targetWeight = h.hrpWeight || (100 / n);

                // Calculate target value and quantity
                const targetValue = (targetWeight / 100) * totalCurrentValue;
                const targetQty = h.currentPrice > 0 ? targetValue / h.currentPrice : 0;
                const roundedTargetQty = Math.round(targetQty);

                // Calculate trade needed
                const sharesToTrade = roundedTargetQty - h.quantity;
                const tradeValue = sharesToTrade * h.currentPrice;

                return {
                    ...h,
                    targetWeight,
                    targetValue,
                    targetQty: roundedTargetQty,
                    sharesToTrade,
                    tradeValue,
                    action: sharesToTrade > 0 ? 'BUY' : sharesToTrade < 0 ? 'SELL' : 'HOLD',
                };
            });

            // Summary of simulation
            const totalBuys = simulatedHoldings.filter(h => h.action === 'BUY').length;
            const totalSells = simulatedHoldings.filter(h => h.action === 'SELL').length;
            const totalBuyValue = simulatedHoldings
                .filter(h => h.action === 'BUY')
                .reduce((sum, h) => sum + h.tradeValue, 0);
            const totalSellValue = simulatedHoldings
                .filter(h => h.action === 'SELL')
                .reduce((sum, h) => sum + Math.abs(h.tradeValue), 0);

            simulationInfo = {
                mode: simulationMode,
                totalBuys,
                totalSells,
                totalBuyValue,
                totalSellValue,
                netCashNeeded: totalBuyValue - totalSellValue,
            };
        }

        // Totals - use broker's P&L values when available
        const totalInvested = currentHoldings.reduce((sum, h) => sum + h.investedValue, 0);
        // Sum broker P&L if available, otherwise calculate
        const totalPnl = currentHoldings.reduce((sum, h) => sum + h.pnl, 0);
        const pnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

        return {
            enrichedHoldings: simulatedHoldings,
            totals: { totalInvested, totalCurrentValue, totalPnl, pnlPercent },
            simulation: simulationInfo,
        };
    }, [holdings, simulationMode]);

    // Loading state
    if (loading) {
        return (
            <div className="loading-overlay">
                <div className="loading-content">
                    <div className="loading-spinner" />
                    <div className="loading-text">Loading your portfolio...</div>
                </div>
            </div>
        );
    }

    // Empty state
    if (!hasPortfolio) {
        return (
            <div className="my-portfolio-page">
                <header className="portfolio-header">
                    <h1><PortfolioIcon size={28} /> My Portfolio</h1>
                    <p>View your current holdings</p>
                </header>
                <div className="empty-state">
                    <div className="empty-icon"><PortfolioIcon size={48} /></div>
                    <h3>No Portfolio Found</h3>
                    <p>Import your portfolio from the Dashboard to see your holdings and P&L here.</p>
                    <a href="/" className="btn btn-primary">Go to Dashboard</a>
                </div>
            </div>
        );
    }

    return (
        <div className="my-portfolio-page">
            <header className="portfolio-header">
                <h1><PortfolioIcon size={28} /> My Portfolio</h1>
                <p>Your current holdings & market exposure</p>
            </header>

            {/* Portfolio Summary Cards */}
            {totals && (
                <div className="portfolio-summary-grid">
                    <div className="summary-card total-value">
                        <span className="card-label">Current Value</span>
                        <span className="card-value">{formatCurrency(totals.totalCurrentValue)}</span>
                    </div>
                    <div className="summary-card invested">
                        <span className="card-label">Invested (Est.)</span>
                        <span className="card-value">{formatCurrency(totals.totalInvested)}</span>
                    </div>
                    <div className={`summary-card gain ${totals.totalPnl >= 0 ? 'positive' : 'negative'}`}>
                        <span className="card-label">Total Gain/Loss</span>
                        <span className="card-value">
                            {formatCurrency(totals.totalPnl)}
                            <span className="card-percent">{formatPercent(totals.pnlPercent)}</span>
                        </span>
                    </div>
                    <div className="summary-card stocks">
                        <span className="card-label">Holdings</span>
                        <span className="card-value">{enrichedHoldings.length} stocks</span>
                        <span className="card-sublabel">{portfolioStats?.sectorCount || 0} sectors</span>
                    </div>
                </div>
            )}

            {/* Simulation Mode Toggle */}
            <div className="simulation-section">
                <h3>📊 View Mode</h3>
                <div className="simulation-toggle">
                    {SIMULATION_MODES.map(mode => (
                        <button
                            key={mode.id}
                            className={`simulation-btn ${simulationMode === mode.id ? 'active' : ''}`}
                            onClick={() => setSimulationMode(mode.id)}
                        >
                            <span className="mode-icon">{mode.icon}</span>
                            <div className="mode-info">
                                <span className="mode-label">{mode.label}</span>
                                <span className="mode-description">{mode.description}</span>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Simulation Summary */}
                {simulation && (
                    <div className="simulation-summary">
                        <div className="summary-item">
                            <span className="label">Stocks to Buy:</span>
                            <span className="value buy">{simulation.totalBuys} ({formatCurrency(simulation.totalBuyValue)})</span>
                        </div>
                        <div className="summary-item">
                            <span className="label">Stocks to Sell:</span>
                            <span className="value sell">{simulation.totalSells} ({formatCurrency(simulation.totalSellValue)})</span>
                        </div>
                        <div className="summary-item net">
                            <span className="label">Net Cash Needed:</span>
                            <span className={`value ${simulation.netCashNeeded > 0 ? 'buy' : 'sell'}`}>
                                {simulation.netCashNeeded > 0 ? '+' : ''}{formatCurrency(simulation.netCashNeeded)}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Holdings Table */}
            <div className="holdings-section">
                <h2>
                    {simulationMode === 'current' ? 'Current Holdings' :
                        simulationMode === 'equal' ? 'Simulated: Equal Weight Allocation' :
                            'Simulated: HRP Optimal Allocation'}
                </h2>
                <table className="holdings-table">
                    <thead>
                        <tr>
                            <th>Stock</th>
                            <th>Sector</th>
                            <th>{simulationMode === 'current' ? 'Qty' : 'Current → Target Qty'}</th>
                            <th>Price</th>
                            <th>{simulationMode === 'current' ? 'Value' : 'Current → Target Value'}</th>
                            <th>{simulationMode === 'current' ? 'Weight' : 'Current → Target %'}</th>
                            {simulationMode !== 'current' && <th>Action</th>}
                            {simulationMode === 'current' && <th>P&L</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {enrichedHoldings.map(h => (
                            <tr key={h.symbol} className={simulationMode !== 'current' ? `row-${h.action?.toLowerCase()}` : ''}>
                                <td className="stock-cell">
                                    <span className="stock-symbol">{h.symbol.replace('.NS', '')}</span>
                                    <span className="stock-name">{getAssetName(h.symbol)}</span>
                                </td>
                                <td className="sector-cell">{h.sector}</td>
                                <td className="qty-cell">
                                    {simulationMode === 'current' ? (
                                        <span>{h.quantity}</span>
                                    ) : (
                                        <span className="qty-comparison">
                                            <span className="current">{h.currentQty}</span>
                                            <span className="arrow">→</span>
                                            <span className="target">{h.targetQty}</span>
                                        </span>
                                    )}
                                </td>
                                <td>{formatCurrency(h.currentPrice)}</td>
                                <td className="value-cell">
                                    {simulationMode === 'current' ? (
                                        <span>{formatCurrency(h.currentValue)}</span>
                                    ) : (
                                        <span className="value-comparison">
                                            <span className="current">{formatCurrency(h.currentValue)}</span>
                                            <span className="arrow">→</span>
                                            <span className="target">{formatCurrency(h.targetValue)}</span>
                                        </span>
                                    )}
                                </td>
                                <td className="weight-cell">
                                    {simulationMode === 'current' ? (
                                        <span>{h.currentWeight.toFixed(1)}%</span>
                                    ) : (
                                        <span className="weight-comparison">
                                            <span className="current">{h.currentWeight.toFixed(1)}%</span>
                                            <span className="arrow">→</span>
                                            <span className="target">{h.targetWeight.toFixed(1)}%</span>
                                        </span>
                                    )}
                                </td>
                                {simulationMode !== 'current' && (
                                    <td className={`action-cell ${h.action?.toLowerCase()}`}>
                                        {h.action === 'HOLD' ? (
                                            <span className="hold-badge">✓ Balanced</span>
                                        ) : (
                                            <span className="trade-badge">
                                                {h.action} {Math.abs(h.sharesToTrade)} shares
                                                <span className="trade-value">({formatCurrency(Math.abs(h.tradeValue))})</span>
                                            </span>
                                        )}
                                    </td>
                                )}
                                {simulationMode === 'current' && (
                                    <td className={h.pnl >= 0 ? 'positive' : 'negative'}>
                                        {formatCurrency(h.pnl)}
                                        <span className="pnl-percent">{formatPercent(h.pnlPercent)}</span>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="methodology-note">
                {simulationMode === 'current' && (
                    <><strong>Note:</strong> This shows your actual holdings. Use "Simulate" modes to see what trades would achieve different target allocations.</>
                )}
                {simulationMode === 'equal' && (
                    <><strong>Equal Weight:</strong> Each stock gets the same ₹ value allocated. Stocks with higher prices = fewer shares, lower prices = more shares.</>
                )}
                {simulationMode === 'hrp' && (
                    <><strong>HRP Optimal:</strong> Weights from Hierarchical Risk Parity - stocks with higher volatility or correlation get lower allocations to reduce portfolio risk.</>
                )}
            </div>

            {/* Professor Guide */}
            <ProfessorGuide
                page="portfolio"
                state="idle"
                weightMode={simulationMode}
            />
        </div>
    );
}

export default MyPortfolioPage;
