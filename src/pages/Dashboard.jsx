import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../components/Auth';
import { PortfolioImport } from '../components/Import';
import { HealthScore, RebalancingSuggestions } from '../components/Analytics';
import {
    Dendrogram,
    Heatmap,
    PerformanceChart,
    WeightsTable,
    StrategyComparison,
} from '../components/Visualizations';
import { usePrices, useHRP } from '../hooks';
import { formatMetrics } from '../lib/hrp/backtest';
import { calculateHealthScore } from '../lib/analytics/portfolioHealth';
import {
    generateRebalancingSuggestions,
    estimateRebalancingImpact,
    generateSummaryText,
    groupSuggestions,
} from '../lib/analytics/rebalancing';
import { enrichPortfolio, calculateWeights } from '../data/demoPortfolios';
import { getAssetName } from '../data/assetUniverse';
import { ProfessorGuide, AnimatedProfessor, ProfessorToggle } from '../components/Guide';
import {
    ImportIcon,
    AnalyzeIcon,
    RefreshIcon,
    ClearIcon,
    BackIcon,
    WarningIcon,
    InfoIcon
} from '../components/Icons';
import {
    GlassCard,
    MorphButton,
    FloatingOrbs,
    MetricCard,
    NeonText,
    SparkLine
} from '../components/PremiumUI';
import FlowExplainer from '../components/Dashboard/FlowExplainer';
import '../components/Dashboard/Dashboard.css';


export function DashboardPage() {
    const { user, signOut } = useAuth();
    const { prices, loading: pricesLoading, error: pricesError, progress, fetchPrices } = usePrices();
    const { result, backtest, loading: analyzing, error: hrpError, analyze, visualizationData, chartData } = useHRP();

    const [showImport, setShowImport] = useState(false);
    const [showAllHoldings, setShowAllHoldings] = useState(false);
    const [showProfessor, setShowProfessor] = useState(false);
    const [showExplainer, setShowExplainer] = useState(() => {
        // Show explainer if user hasn't seen it before
        const hasSeen = localStorage.getItem('structura_explainer_seen');
        return !hasSeen;
    });

    // Load persisted state from localStorage
    const [portfolio, setPortfolio] = useState(() => {
        try {
            const savedPortfolio = localStorage.getItem('structura_portfolio_meta');
            const savedHoldings = localStorage.getItem('structura_portfolio');
            if (savedPortfolio && savedHoldings) {
                const meta = JSON.parse(savedPortfolio);
                const holdings = JSON.parse(savedHoldings);
                return { name: meta.name || 'My Portfolio', holdings, source: meta.source || 'restored' };
            }
        } catch (e) { console.warn('Could not restore portfolio:', e); }
        return null;
    });

    const [dateRange, setDateRange] = useState(() => {
        return localStorage.getItem('structura_date_range') || '1y';
    });

    // Persist dateRange to localStorage
    useEffect(() => {
        localStorage.setItem('structura_date_range', dateRange);
    }, [dateRange]);

    // Handle portfolio import - saves to localStorage for other pages
    const handleImport = useCallback((importedPortfolio) => {
        // FIRST: Close the import modal immediately
        setShowImport(false);

        setPortfolio(importedPortfolio);

        // Save to localStorage so My Portfolio, Risk, Advisor pages can read it
        // PortfolioContext reads from this key
        localStorage.setItem('structura_portfolio', JSON.stringify(importedPortfolio.holdings));

        // Save portfolio metadata for Dashboard state restoration
        localStorage.setItem('structura_portfolio_meta', JSON.stringify({
            name: importedPortfolio.name,
            source: importedPortfolio.source
        }));

        // Dispatch custom event to notify other pages that portfolio changed
        window.dispatchEvent(new CustomEvent('portfolio-updated'));

        // Clear any existing analysis when importing new portfolio
        // Wrap in try/catch to prevent errors from breaking the flow
        try {
            if (result) {
                analyze(null); // Reset HRP result
            }
        } catch (e) {
            console.warn('Error resetting HRP analysis:', e.message);
        }
    }, [result, analyze]);

    // Analyze portfolio
    const handleAnalyze = useCallback(async () => {
        if (!portfolio || portfolio.holdings.length < 2) return;

        const symbols = portfolio.holdings.map(h => h.symbol);

        // Fetch portfolio stocks + NIFTY 50 index for benchmark
        const allSymbols = [...symbols, '^NSEI'];
        const priceData = await fetchPrices(allSymbols, dateRange);

        // Extract NIFTY 50 data (if available)
        const niftyData = priceData['^NSEI'] || null;

        // Remove NIFTY from portfolio data (it's a benchmark, not a holding)
        const portfolioData = { ...priceData };
        delete portfolioData['^NSEI'];

        if (Object.keys(portfolioData).length >= 2) {
            analyze(portfolioData, niftyData);
        }
    }, [portfolio, dateRange, fetchPrices, analyze]);

    // Clear analysis but keep portfolio
    const clearAnalysis = useCallback(() => {
        analyze(null);
    }, [analyze]);

    // Clear everything and start fresh
    const clearAll = useCallback(() => {
        setPortfolio(null);
        analyze(null);
    }, [analyze]);

    // AUTO-ANALYZE: Trigger HRP analysis when a new portfolio is imported
    const prevPortfolio = useRef(null);
    useEffect(() => {
        // Only trigger if portfolio changed AND it's a new import (not null)
        if (portfolio && portfolio !== prevPortfolio.current && portfolio.holdings?.length >= 2) {
            console.log('📊 New portfolio imported - auto-analyzing...');

            const symbols = portfolio.holdings.map(h => h.symbol);
            const allSymbols = [...symbols, '^NSEI']; // Include NIFTY benchmark

            fetchPrices(allSymbols, dateRange).then(priceData => {
                const niftyData = priceData['^NSEI'] || null;
                const portfolioData = { ...priceData };
                delete portfolioData['^NSEI'];

                if (Object.keys(portfolioData).length >= 2) {
                    analyze(portfolioData, niftyData);
                }
            }).catch(err => {
                console.error('Auto-analyze failed:', err.message);
            });
        }
        prevPortfolio.current = portfolio;
    }, [portfolio, dateRange, fetchPrices, analyze]);

    // Auto re-analyze when date range changes (if portfolio exists and was analyzed)
    const prevDateRange = useRef(dateRange);
    useEffect(() => {
        if (prevDateRange.current !== dateRange && portfolio && result) {
            console.log(`📊 Date range changed: ${prevDateRange.current} → ${dateRange}`);

            // Date range changed while we have an analysis - re-run with NIFTY benchmark
            const symbols = portfolio.holdings.map(h => h.symbol);
            const allSymbols = [...symbols, '^NSEI']; // Include NIFTY 50 benchmark!

            console.log(`📊 Fetching ${allSymbols.length} symbols for range: ${dateRange}`);

            fetchPrices(allSymbols, dateRange).then(priceData => {
                console.log(`📊 Fetched ${Object.keys(priceData).length} stocks`);

                // Extract NIFTY 50 data
                const niftyData = priceData['^NSEI'] || null;
                console.log(`📊 NIFTY data points: ${niftyData?.length || 0}`);
                if (niftyData && niftyData.length > 0) {
                    console.log(`📊 NIFTY range: ${niftyData[0]?.date} to ${niftyData[niftyData.length - 1]?.date}`);
                    console.log(`📊 NIFTY start: ${niftyData[0]?.close}, end: ${niftyData[niftyData.length - 1]?.close}`);
                }

                // Remove NIFTY from portfolio data
                const portfolioData = { ...priceData };
                delete portfolioData['^NSEI'];

                if (Object.keys(portfolioData).length >= 2) {
                    analyze(portfolioData, niftyData); // Pass niftyData!
                }
            });
        }
        prevDateRange.current = dateRange;
    }, [dateRange, portfolio, result, fetchPrices, analyze]);

    // Enrich holdings with current prices and calculate weights
    const enrichedHoldings = useMemo(() => {
        if (!portfolio || !prices || Object.keys(prices).length === 0) {
            return portfolio?.holdings || [];
        }

        const currentPrices = {};
        Object.entries(prices).forEach(([symbol, priceList]) => {
            if (priceList && priceList.length > 0) {
                currentPrices[symbol] = priceList[priceList.length - 1];
            }
        });

        // Pass full price history for period-based P&L calculation
        const enriched = enrichPortfolio(portfolio.holdings, currentPrices, prices);
        return calculateWeights(enriched);
    }, [portfolio, prices]);

    // Update localStorage with enriched data after analysis (for My Portfolio page)
    useEffect(() => {
        if (enrichedHoldings.length > 0 && prices && Object.keys(prices).length > 0) {
            // Merge HRP weights if result is available
            const holdingsWithWeights = enrichedHoldings.map(h => {
                // result.weights.hrp is an ARRAY of {symbol, weight, percentage}
                // Find the matching weight by symbol
                const hrpEntry = result?.weights?.hrp?.find(w => w.symbol === h.symbol);
                const hrpWeight = hrpEntry?.weight; // This is 0-1 decimal

                return {
                    ...h,
                    // Use HRP weight if available (convert to %), otherwise current weight
                    hrpWeight: hrpWeight !== undefined ? hrpWeight * 100 : h.weight,
                    // Use period start price as avgPrice for P&L
                    avgPrice: h.basePrice || h.currentPrice,
                    sector: h.sector || 'Other',
                };
            });

            // Save enriched data to localStorage
            localStorage.setItem('structura_portfolio', JSON.stringify(holdingsWithWeights));
            window.dispatchEvent(new CustomEvent('portfolio-updated'));
        }
    }, [enrichedHoldings, prices, result]);

    // Calculate health score
    const healthScore = useMemo(() => {
        if (enrichedHoldings.length === 0) return null;

        return calculateHealthScore(
            enrichedHoldings,
            result?.correlation || null,
            result?.symbols || []
        );
    }, [enrichedHoldings, result]);

    // Calculate rebalancing suggestions
    const rebalancing = useMemo(() => {
        if (!result || enrichedHoldings.length === 0) return null;

        const suggestions = generateRebalancingSuggestions(
            enrichedHoldings,
            result.weights.hrp
        );

        const impact = healthScore
            ? estimateRebalancingImpact(healthScore, suggestions)
            : null;

        const summary = generateSummaryText(suggestions, impact);

        return { suggestions, impact, summary };
    }, [result, enrichedHoldings, healthScore]);

    const isLoading = pricesLoading || analyzing;

    // Calculate portfolio totals
    const portfolioTotals = useMemo(() => {
        if (enrichedHoldings.length === 0) return null;

        const invested = enrichedHoldings.reduce((sum, h) => sum + (h.investedValue || 0), 0);
        const current = enrichedHoldings.reduce((sum, h) => sum + (h.currentValue || 0), 0);
        const pnl = current - invested;
        const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;

        return { invested, current, pnl, pnlPercent };
    }, [enrichedHoldings]);


    return (
        <div className="dashboard-content">
            {/* Portfolio Actions Bar - only show when portfolio exists */}
            {portfolio && (
                <div className="portfolio-actions">
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowImport(true)}
                    >
                        <ImportIcon size={16} /> Import
                    </button>

                    <div className="portfolio-summary">
                        <span className="portfolio-name">{portfolio.name}</span>
                        <span className="stock-count">{portfolio.holdings.length} stocks</span>
                    </div>

                    <div className="date-range-buttons">
                        {['1y', '2y', '3y', '5y'].map(range => (
                            <button
                                key={range}
                                className={`date-btn ${dateRange === range ? 'active' : ''}`}
                                onClick={() => setDateRange(range)}
                            >
                                {range.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    <button
                        className="btn btn-primary analyze-btn"
                        disabled={portfolio.holdings.length < 2 || isLoading}
                        onClick={handleAnalyze}
                    >
                        {isLoading ? (
                            <><RefreshIcon size={16} animate /> Analyzing...</>
                        ) : result ? (
                            <><RefreshIcon size={16} /> Re-analyze</>
                        ) : (
                            <><AnalyzeIcon size={16} /> Analyze</>
                        )}
                    </button>

                    {result && (
                        <button className="btn btn-ghost" onClick={clearAnalysis}>
                            <ClearIcon size={14} /> Clear
                        </button>
                    )}

                    <button className="btn btn-ghost" onClick={clearAll}>
                        <BackIcon size={14} /> Reset
                    </button>
                </div>
            )}

            {/* Main Dashboard Content */}
            {isLoading && (
                <div className="loading-overlay">
                    <div className="loading-content">
                        <div className="loading-spinner" />
                        <div className="loading-text">
                            {pricesLoading ? 'Fetching Market Data' : 'Running HRP Analysis'}
                        </div>
                        {pricesLoading && (
                            <div className="loading-progress">{progress.status}</div>
                        )}
                    </div>
                </div>
            )}

            {(pricesError || hrpError) && (
                <div className="auth-error" style={{ margin: '1rem 0' }}>
                    <WarningIcon size={18} className="icon-warning" />
                    <span style={{ marginLeft: '8px' }}>{pricesError || hrpError}</span>
                </div>
            )}

            {!portfolio && (
                <div className="empty-state premium-empty">
                    <FloatingOrbs count={4} />
                    <GlassCard glow className="welcome-card">
                        <div className="welcome-content">
                            <div className="welcome-icon">
                                <div className="icon-3d">
                                    <div className="icon-face front">◈</div>
                                    <div className="icon-face back">◈</div>
                                </div>
                            </div>
                            <h2><NeonText color="cyan">Welcome to Structura</NeonText></h2>
                            <p className="welcome-text">
                                Experience next-gen portfolio intelligence powered by
                                <strong> Hierarchical Risk Parity</strong>. Get AI-driven insights,
                                health scoring, and smart rebalancing suggestions.
                            </p>
                            <div className="welcome-features">
                                <div className="feature-item">
                                    <span className="feature-icon">🎯</span>
                                    <span>Risk Optimization</span>
                                </div>
                                <div className="feature-item">
                                    <span className="feature-icon">📊</span>
                                    <span>Correlation Analysis</span>
                                </div>
                                <div className="feature-item">
                                    <span className="feature-icon">✨</span>
                                    <span>Smart Rebalancing</span>
                                </div>
                            </div>
                            <MorphButton
                                variant="primary"
                                onClick={() => setShowImport(true)}
                                icon={<ImportIcon size={18} />}
                            >
                                Get Started
                            </MorphButton>
                        </div>
                    </GlassCard>
                </div>
            )}

            {portfolio && !result && !isLoading && (
                <div className="portfolio-overview">
                    {/* Flow Explainer - Shows how Structura works */}
                    {showExplainer && (
                        <FlowExplainer
                            onDismiss={() => {
                                setShowExplainer(false);
                                localStorage.setItem('structura_explainer_seen', 'true');
                            }}
                        />
                    )}

                    <header className="main-header">
                        <h2>{portfolio.name}</h2>
                        {portfolioTotals && (
                            <div className="portfolio-value">
                                <span className="value-label">Current Value</span>
                                <span className="value-amount">₹{(portfolioTotals.current / 100000).toFixed(2)}L</span>
                                <span className={`value-change ${portfolioTotals.pnl >= 0 ? 'positive' : 'negative'}`}>
                                    {portfolioTotals.pnl >= 0 ? '+' : ''}₹{Math.abs(portfolioTotals.pnl).toLocaleString()}
                                    ({portfolioTotals.pnlPercent >= 0 ? '+' : ''}{portfolioTotals.pnlPercent.toFixed(2)}%)
                                </span>
                            </div>
                        )}
                    </header>

                    <div className="empty-state" style={{ minHeight: '300px' }}>
                        <p>Click "Analyze Portfolio" to get health score and optimization suggestions</p>
                    </div>
                </div>
            )}

            {portfolio && result && (
                <div className="dashboard-grid fade-in">
                    {/* Header with Portfolio Value */}
                    <header className="main-header">
                        <h2>{portfolio.name}</h2>
                        {portfolioTotals && (
                            <div className="portfolio-value">
                                <span className="value-amount">₹{(portfolioTotals.current / 100000).toFixed(2)}L</span>
                                <span className={`value-change ${portfolioTotals.pnl >= 0 ? 'positive' : 'negative'}`}>
                                    {portfolioTotals.pnl >= 0 ? '+' : ''}{portfolioTotals.pnlPercent.toFixed(2)}%
                                </span>
                            </div>
                        )}
                    </header>

                    {/* Row 1: Health Score + Rebalancing */}
                    <div className="grid-row half">
                        <div className="dashboard-panel">
                            <div className="panel-header">
                                <span className="panel-title">Portfolio Health</span>
                            </div>
                            <div className="panel-body">
                                <HealthScore health={healthScore} />
                            </div>
                        </div>

                        <div className="dashboard-panel">
                            <div className="panel-header">
                                <span className="panel-title">Rebalancing Suggestions</span>
                            </div>
                            <div className="panel-body">
                                <RebalancingSuggestions
                                    suggestions={rebalancing?.suggestions}
                                    summary={rebalancing?.summary}
                                    impact={rebalancing?.impact}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Dendrogram */}
                    <div className="grid-row full">
                        <div className="dashboard-panel">
                            <div className="panel-header">
                                <span className="panel-title">Asset Clustering</span>
                                <span className="text-xs text-muted">
                                    Similar assets are grouped together
                                </span>
                            </div>
                            <div className="panel-body">
                                <Dendrogram
                                    hierarchy={visualizationData?.hierarchy}
                                    symbols={result.symbols.map(s => getAssetName(s))}
                                    width={window.innerWidth < 768
                                        ? window.innerWidth - 48
                                        : Math.min(900, window.innerWidth - 340)}
                                    height={window.innerWidth < 768
                                        ? Math.min(300, result.symbols.length * 18)
                                        : Math.max(250, result.symbols.length * 22)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Row 3: Heatmap + Weights */}
                    <div className="grid-row half">
                        <div className="dashboard-panel">
                            <div className="panel-header">
                                <span className="panel-title">Correlation Matrix</span>
                            </div>
                            <div className="panel-body">
                                <Heatmap
                                    correlationMatrix={visualizationData?.correlationMatrix}
                                    symbols={result.symbols.map(s => getAssetName(s))}
                                    sortOrder={result.sortOrder}
                                    width={window.innerWidth < 768
                                        ? window.innerWidth - 48
                                        : Math.min(400, (window.innerWidth - 400) / 2)}
                                    height={window.innerWidth < 768
                                        ? window.innerWidth - 48
                                        : Math.min(400, (window.innerWidth - 400) / 2)}
                                />
                            </div>
                        </div>

                        <div className="dashboard-panel">
                            <div className="panel-header">
                                <span className="panel-title">HRP Optimal Weights</span>
                            </div>
                            <div className="panel-body">
                                <WeightsTable
                                    weights={visualizationData?.weights?.map(w => ({
                                        ...w,
                                        symbol: getAssetName(w.symbol),
                                    }))}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Row 4: Performance Chart (Equity Curve) */}
                    {chartData && chartData.series && (
                        <div className="grid-row full">
                            <div className="dashboard-panel">
                                <div className="panel-header">
                                    <span className="panel-title">Performance Over Time</span>
                                    <span className="text-xs text-muted">
                                        Cumulative returns comparison
                                    </span>
                                </div>
                                <div className="panel-body">
                                    <PerformanceChart
                                        series={chartData.series}
                                        dates={chartData.dates}
                                        width={window.innerWidth < 768
                                            ? window.innerWidth - 48
                                            : Math.min(850, window.innerWidth - 380)}
                                        height={window.innerWidth < 768 ? 250 : 350}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Row 5: Strategy Comparison */}
                    {chartData && (
                        <div className="grid-row full">
                            <div className="dashboard-panel">
                                <div className="panel-header">
                                    <span className="panel-title">Strategy Comparison</span>
                                    <span className="text-xs text-muted">
                                        Historical performance simulation
                                    </span>
                                </div>
                                <div className="panel-body">
                                    <StrategyComparison strategies={chartData.metrics} />
                                    <div className="methodology-disclaimer">
                                        <InfoIcon size={16} className="icon-warning" style={{ marginRight: '8px' }} />
                                        <strong>Methodology Note:</strong> This backtest uses static weights
                                        calculated from full-period correlations (in-sample). Real returns would
                                        require periodic rebalancing. Past performance ≠ future results.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Import Modal */}
            {showImport && (
                <PortfolioImport
                    onImport={handleImport}
                    onClose={() => setShowImport(false)}
                />
            )}

            {/* Professor Guide - Interactive animated guide */}
            {showProfessor ? (
                <AnimatedProfessor
                    page="dashboard"
                    onDismiss={() => setShowProfessor(false)}
                />
            ) : (
                <ProfessorToggle onClick={() => setShowProfessor(true)} />
            )}
        </div>
    );
}

export default DashboardPage;
