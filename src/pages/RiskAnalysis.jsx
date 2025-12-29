/**
 * Structura 2.0 - Risk Analysis Page
 * 
 * Features:
 * - Sector concentration heatmap
 * - Stress test scenarios
 * - VaR calculation
 * - Historical crash simulation
 * 
 * All data comes from real user portfolio via PortfolioContext.
 * NO HARDCODED DEMO DATA.
 */

import { useState, useMemo } from 'react';
import { usePortfolio } from '../components/Portfolio';
import {
    calculateSectorConcentration,
    runStressTests,
    simulateHistoricalCrashes
} from '../lib/analytics/stressTest';
import '../components/Dashboard/Dashboard.css';
import './RiskAnalysis.css';

// Severity color mapping
const getSeverityColor = (severity) => {
    switch (severity) {
        case 'SEVERE': return '#ef4444';
        case 'SIGNIFICANT': return '#f59e0b';
        case 'MODERATE': return '#10b981';
        default: return '#6366f1';
    }
};

export function RiskAnalysisPage() {
    const { holdings, loading, hasPortfolio } = usePortfolio();
    const [activeView, setActiveView] = useState('concentration');

    // Sector concentration analysis - from REAL portfolio data
    const sectorAnalysis = useMemo(() => {
        if (holdings.length === 0) return null;
        return calculateSectorConcentration(holdings);
    }, [holdings]);

    // Stress tests - from REAL portfolio data
    const stressTests = useMemo(() => {
        if (holdings.length === 0) return [];
        return runStressTests(holdings);
    }, [holdings]);

    // Historical crashes - from REAL portfolio data
    const crashSimulations = useMemo(() => {
        if (holdings.length === 0) return [];
        return simulateHistoricalCrashes(holdings);
    }, [holdings]);

    // Loading state
    if (loading) {
        return (
            <div className="risk-analysis-page">
                <div className="loading-state">
                    <div className="loading-spinner" />
                    <p>Analyzing your portfolio risk...</p>
                </div>
            </div>
        );
    }

    // No portfolio state
    if (!hasPortfolio) {
        return (
            <div className="risk-analysis-page">
                <header className="page-header">
                    <h1>🔮 Risk Analysis</h1>
                    <p>Understand your portfolio's vulnerabilities before they happen</p>
                </header>
                <div className="empty-state">
                    <h3>No Portfolio Found</h3>
                    <p>Import your portfolio first to see risk analysis.</p>
                    <p>Go to <strong>Dashboard</strong> and import your stocks.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="risk-analysis-page">
            <header className="page-header">
                <h1>🔮 Risk Analysis</h1>
                <p>Understand your portfolio's vulnerabilities before they happen</p>
            </header>

            {/* View Selector */}
            <div className="view-selector">
                <button
                    className={`view-btn ${activeView === 'concentration' ? 'active' : ''}`}
                    onClick={() => setActiveView('concentration')}
                >
                    Sector Concentration
                </button>
                <button
                    className={`view-btn ${activeView === 'stress' ? 'active' : ''}`}
                    onClick={() => setActiveView('stress')}
                >
                    Stress Tests
                </button>
                <button
                    className={`view-btn ${activeView === 'crashes' ? 'active' : ''}`}
                    onClick={() => setActiveView('crashes')}
                >
                    Historical Crashes
                </button>
            </div>

            {/* Sector Concentration View */}
            {activeView === 'concentration' && (
                <div className="concentration-view">
                    <div className="risk-level-card">
                        <span className="risk-label">Concentration Risk</span>
                        <span className={`risk-badge ${sectorAnalysis.concentrationRisk.toLowerCase()}`}>
                            {sectorAnalysis.concentrationRisk}
                        </span>
                        <p className="risk-description">
                            Your portfolio is diversified across {sectorAnalysis.equivalentSectors.toFixed(1)} equivalent sectors.
                            {sectorAnalysis.concentrationRisk === 'HIGH' && ' Consider diversifying further.'}
                        </p>
                    </div>

                    <div className="sector-breakdown">
                        <h3>Sector Allocation</h3>
                        <div className="sector-bars">
                            {sectorAnalysis.sortedSectors.map(([sector, weight]) => (
                                <div key={sector} className="sector-bar-row">
                                    <span className="sector-name">{sector}</span>
                                    <div className="sector-bar-container">
                                        <div
                                            className="sector-bar-fill"
                                            style={{
                                                width: `${Math.min(weight, 100)}%`,
                                                background: weight > 25
                                                    ? 'linear-gradient(90deg, #ef4444, #f97316)'
                                                    : 'linear-gradient(90deg, #6366f1, #8b5cf6)'
                                            }}
                                        />
                                    </div>
                                    <span className="sector-weight">{weight.toFixed(1)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recommendations */}
                    {sectorAnalysis.recommendations.length > 0 && (
                        <div className="recommendations-section">
                            <h3>Recommendations</h3>
                            {sectorAnalysis.recommendations.map((rec, idx) => (
                                <div key={idx} className={`recommendation-card ${rec.type.toLowerCase()}`}>
                                    <span className="rec-type">{rec.type}</span>
                                    <p className="rec-message">{rec.message}</p>
                                    <p className="rec-suggestion">{rec.suggestion}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Stress Tests View */}
            {activeView === 'stress' && (
                <div className="stress-tests-view">
                    <div className="stress-grid">
                        {stressTests.map((scenario, idx) => (
                            <div
                                key={idx}
                                className="stress-card"
                                style={{ borderColor: getSeverityColor(scenario.severity) }}
                            >
                                <div className="stress-header">
                                    <h4>{scenario.name}</h4>
                                    <span
                                        className="severity-badge"
                                        style={{ background: getSeverityColor(scenario.severity) }}
                                    >
                                        {scenario.severity}
                                    </span>
                                </div>
                                <p className="stress-description">{scenario.description}</p>
                                <div className="stress-impact">
                                    <span className="impact-label">Portfolio Impact</span>
                                    <span className="impact-value" style={{ color: getSeverityColor(scenario.severity) }}>
                                        {scenario.portfolioDropPercent.toFixed(1)}%
                                    </span>
                                    <span className="impact-amount">
                                        ₹{Math.abs(scenario.portfolioImpact).toLocaleString('en-IN')}
                                    </span>
                                </div>
                                {scenario.stockImpacts.length > 0 && (
                                    <div className="affected-stocks">
                                        <span className="affected-label">Most Affected:</span>
                                        <div className="affected-list">
                                            {scenario.stockImpacts.slice(0, 3).map(stock => (
                                                <span key={stock.symbol} className="affected-stock">
                                                    {stock.symbol.replace('.NS', '')} ({stock.impact}%)
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Historical Crashes View */}
            {activeView === 'crashes' && (
                <div className="crashes-view">
                    <div className="portfolio-beta-card">
                        <span className="beta-label">Portfolio Beta</span>
                        <span className="beta-value">{crashSimulations[0]?.portfolioBeta?.toFixed(2) || '1.00'}</span>
                        <p className="beta-description">
                            {crashSimulations[0]?.portfolioBeta > 1
                                ? `Your portfolio moves ${((crashSimulations[0]?.portfolioBeta - 1) * 100).toFixed(0)}% more than the market`
                                : `Your portfolio is ${((1 - crashSimulations[0]?.portfolioBeta) * 100).toFixed(0)}% less volatile than the market`
                            }
                        </p>
                    </div>

                    <div className="crashes-grid">
                        {crashSimulations.map((crash, idx) => (
                            <div key={idx} className="crash-card">
                                <div className="crash-header">
                                    <h4>{crash.name}</h4>
                                    <span className="crash-period">{crash.period}</span>
                                </div>
                                <div className="crash-comparison">
                                    <div className="comparison-item nifty">
                                        <span className="comp-label">NIFTY 50</span>
                                        <span className="comp-value">{crash.niftyReturn.toFixed(1)}%</span>
                                    </div>
                                    <div className="comparison-arrow">→</div>
                                    <div className={`comparison-item portfolio ${crash.betterThanNifty ? 'better' : 'worse'}`}>
                                        <span className="comp-label">Your Portfolio</span>
                                        <span className="comp-value">{crash.estimatedPortfolioReturn.toFixed(1)}%</span>
                                    </div>
                                </div>
                                <p className="crash-interpretation">{crash.interpretation}</p>
                                <div className="crash-recovery">
                                    <span className="recovery-label">Historical recovery:</span>
                                    <span className="recovery-value">{crash.recovery} days</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default RiskAnalysisPage;
