/**
 * Structura 2.0 - Next Investment Advisor Page
 * 
 * Features:
 * - Portfolio gap analysis
 * - Stock recommendations with reasoning
 * - Factor scores (Momentum, Value, Quality)
 * - Amount allocation suggestions
 * 
 * All data from real portfolio via PortfolioContext.
 * Momentum calculated from price data.
 * Fundamentals (P/E, ROE) will come from Upstox API.
 */

import { useState, useMemo, useEffect } from 'react';
import { usePortfolio } from '../components/Portfolio';
import {
    analyzePortfolioGaps,
    generateRecommendations
} from '../lib/analytics/nextInvestment';
import { fetchMultipleStocks } from '../lib/data/yahooFinance';
import { ProfessorGuide } from '../components/Guide';
import { TipIcon, CheckIcon, WarningIcon, TargetIcon } from '../components/Icons';
import '../components/Dashboard/Dashboard.css';
import './NextInvestment.css';

// Strategy options - these are configuration, not hardcoded data
const STRATEGIES = [
    { id: 'balanced', name: 'Balanced', description: 'Mix of growth and stability' },
    { id: 'aggressive', name: 'High Growth', description: 'Focus on momentum and returns' },
    { id: 'conservative', name: 'Conservative', description: 'Emphasis on quality and low volatility' },
    { id: 'value', name: 'Value Hunting', description: 'Focus on undervalued stocks' },
];

// NIFTY 50 stocks to recommend from - fetched from stock_master
async function fetchRecommendationUniverse() {
    try {
        const { supabase } = await import('../config/supabase');
        const { data } = await supabase
            .from('stock_master')
            .select('symbol, name, sector')
            .eq('is_nifty50', true)
            .limit(50);
        return data || [];
    } catch (err) {
        console.error('Error fetching universe:', err);
        return [];
    }
}

// Calculate momentum from price data
function calculateMomentumFromPrices(priceData) {
    if (!priceData || priceData.length < 20) {
        return { return1Y: 0, return3M: 0, volatility: 30 };
    }

    const prices = priceData.map(p => p.close);
    const latest = prices[prices.length - 1];

    // 1Y return (or all available)
    const yearAgo = prices[0];
    const return1Y = yearAgo > 0 ? ((latest - yearAgo) / yearAgo) * 100 : 0;

    // 3M return (last ~63 trading days)
    const threeMonthsAgo = prices[Math.max(0, prices.length - 63)];
    const return3M = threeMonthsAgo > 0 ? ((latest - threeMonthsAgo) / threeMonthsAgo) * 100 : 0;

    // Volatility (standard deviation of daily returns, annualized)
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
        returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
    const variance = returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / returns.length;
    const dailyVol = Math.sqrt(variance);
    const annualVol = dailyVol * Math.sqrt(252) * 100;

    return { return1Y, return3M, volatility: annualVol, currentPrice: latest };
}

// Format currency
const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
};

// Star rating component
const StarRating = ({ score, max = 5 }) => {
    const stars = Math.round((score / 100) * max);
    return (
        <span className="star-rating">
            {[...Array(max)].map((_, i) => (
                <span key={i} className={i < stars ? 'star filled' : 'star'}>★</span>
            ))}
        </span>
    );
};

export function NextInvestmentPage() {
    const { holdings, loading: portfolioLoading, hasPortfolio } = usePortfolio();
    const [investmentAmount, setInvestmentAmount] = useState(50000);
    const [selectedStrategy, setSelectedStrategy] = useState('balanced');
    const [universe, setUniverse] = useState([]);
    const [loadingUniverse, setLoadingUniverse] = useState(true);

    // Fetch stock universe with momentum data
    useEffect(() => {
        async function loadUniverse() {
            setLoadingUniverse(true);

            // Get NIFTY 50 stocks from database
            const stocks = await fetchRecommendationUniverse();

            if (stocks.length === 0) {
                setLoadingUniverse(false);
                return;
            }

            // Get current holding symbols to exclude
            const heldSymbols = new Set(holdings.map(h => h.symbol));
            const candidates = stocks.filter(s => !heldSymbols.has(s.symbol));

            // Fetch price data for top candidates (limit to 20 for performance)
            const topSymbols = candidates.slice(0, 20).map(s => s.symbol);
            const priceData = await fetchMultipleStocks(topSymbols, '1y');

            // Calculate momentum for each
            const enriched = candidates.slice(0, 20).map(stock => {
                const prices = priceData[stock.symbol] || [];
                const momentum = calculateMomentumFromPrices(prices);

                return {
                    ...stock,
                    tradingSymbol: stock.symbol.replace('.NS', ''),
                    ...momentum,
                    // Fundamentals will come from Upstox API - use placeholder for now
                    pe: null,
                    pb: null,
                    roe: null,
                    debtEquity: null
                };
            });

            setUniverse(enriched);
            setLoadingUniverse(false);
        }

        if (hasPortfolio) {
            loadUniverse();
        } else {
            setLoadingUniverse(false);
        }
    }, [holdings, hasPortfolio]);

    // Gap analysis - from REAL portfolio
    const gapAnalysis = useMemo(() => {
        if (holdings.length === 0) return { gaps: [], overweight: [] };
        return analyzePortfolioGaps(holdings);
    }, [holdings]);

    // Generate recommendations - from REAL data
    const recommendations = useMemo(() => {
        if (holdings.length === 0 || universe.length === 0) {
            return { recommendations: [], summary: 'Loading...' };
        }
        return generateRecommendations(holdings, universe, investmentAmount, selectedStrategy);
    }, [holdings, universe, investmentAmount, selectedStrategy]);

    // Loading state
    if (portfolioLoading || loadingUniverse) {
        return (
            <div className="next-investment-page">
                <div className="loading-state">
                    <div className="loading-spinner" />
                    <p>Analyzing investment opportunities...</p>
                </div>
            </div>
        );
    }

    // No portfolio state
    if (!hasPortfolio) {
        return (
            <div className="next-investment-page">
                <header className="page-header">
                    <h1>💡 Next Investment Advisor</h1>
                    <p>AI-powered recommendations based on your portfolio gaps</p>
                </header>
                <div className="empty-state">
                    <h3>No Portfolio Found</h3>
                    <p>Import your portfolio first to get personalized recommendations.</p>
                    <p>Go to <strong>Dashboard</strong> and import your stocks.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="next-investment-page">
            <header className="page-header">
                <h1><TipIcon size={28} className="icon-primary" /> Next Investment Advisor</h1>
                <p>AI-powered recommendations based on your portfolio gaps</p>
            </header>

            {/* Investment Amount Input */}
            <div className="investment-input-section">
                <div className="input-group">
                    <label>Investment Amount</label>
                    <div className="amount-input-wrapper">
                        <span className="currency-symbol">₹</span>
                        <input
                            type="number"
                            value={investmentAmount}
                            onChange={(e) => setInvestmentAmount(parseInt(e.target.value) || 0)}
                            min={10000}
                            step={10000}
                        />
                    </div>
                    <div className="quick-amounts">
                        {[25000, 50000, 100000, 250000].map(amt => (
                            <button
                                key={amt}
                                className={`quick-btn ${investmentAmount === amt ? 'active' : ''}`}
                                onClick={() => setInvestmentAmount(amt)}
                            >
                                {formatCurrency(amt)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="strategy-group">
                    <label>Investment Strategy</label>
                    <div className="strategy-pills">
                        {STRATEGIES.map(s => (
                            <button
                                key={s.id}
                                className={`strategy-pill ${selectedStrategy === s.id ? 'active' : ''}`}
                                onClick={() => setSelectedStrategy(s.id)}
                            >
                                <span className="strategy-name">{s.name}</span>
                                <span className="strategy-desc">{s.description}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Gap Analysis Section */}
            <div className="gap-analysis-section">
                <h2>Portfolio Gap Analysis</h2>
                <div className="gap-cards">
                    {gapAnalysis.gaps.slice(0, 4).map((gap, idx) => (
                        <div key={idx} className={`gap-card ${gap.priority.toLowerCase()}`}>
                            <span className="gap-sector">{gap.sector}</span>
                            <div className="gap-visual">
                                <span className="current-label">Current: {gap.current}%</span>
                                <div className="gap-bar">
                                    <div
                                        className="filled"
                                        style={{ width: `${(parseFloat(gap.current) / gap.target) * 100}%` }}
                                    />
                                </div>
                                <span className="target-label">Target: {gap.target}%</span>
                            </div>
                            <span className={`gap-badge ${gap.priority.toLowerCase()}`}>
                                -{gap.gap}% Gap
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recommendations */}
            <div className="recommendations-section">
                <h2>Recommended Investments</h2>
                <p className="summary-text">{recommendations.summary}</p>

                <div className="recommendation-cards">
                    {recommendations.recommendations.map((rec, idx) => (
                        <div key={rec.symbol} className="recommendation-card">
                            <div className="rec-rank">#{rec.rank}</div>
                            <div className="rec-header">
                                <div className="rec-stock-info">
                                    <span className="rec-symbol">{rec.tradingSymbol}</span>
                                    <span className="rec-sector">{rec.sector}</span>
                                </div>
                                <div className="rec-amount">
                                    <span className="amount-label">Invest</span>
                                    <span className="amount-value">{formatCurrency(rec.suggestedAmount)}</span>
                                    {rec.suggestedQuantity && (
                                        <span className="amount-qty">~{rec.suggestedQuantity} shares</span>
                                    )}
                                </div>
                            </div>

                            <div className="rec-reasoning">
                                <p>{rec.reasoning}</p>
                            </div>

                            <div className="factor-scores">
                                <div className="factor">
                                    <span className="factor-name">Momentum</span>
                                    <StarRating score={rec.factorScore.momentum} />
                                </div>
                                <div className="factor">
                                    <span className="factor-name">Value</span>
                                    <StarRating score={rec.factorScore.value} />
                                </div>
                                <div className="factor">
                                    <span className="factor-name">Quality</span>
                                    <StarRating score={rec.factorScore.quality} />
                                </div>
                                <div className="factor">
                                    <span className="factor-name">Stability</span>
                                    <StarRating score={rec.factorScore.lowVol} />
                                </div>
                            </div>

                            <div className="rec-footer">
                                <span className="composite-score">
                                    Score: {rec.factorScore.composite.toFixed(0)}/100
                                </span>
                                <span className={`diversification-tag ${rec.diversificationImpact < 0 ? 'positive' : 'negative'}`}>
                                    {rec.diversificationImpact < 0 ? (
                                        <><CheckIcon size={14} /> Improves Diversification</>
                                    ) : (
                                        <><WarningIcon size={14} /> Increases Concentration</>
                                    )}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Disclaimer */}
            <div className="disclaimer">
                <p>
                    <WarningIcon size={16} className="icon-warning" />
                    <span style={{ marginLeft: '8px' }}>These are algorithmic suggestions based on factor analysis, not financial advice.
                        Always do your own research before investing.</span>
                </p>
            </div>

            {/* Professor Guide */}
            <ProfessorGuide
                page="advisor"
                state="idle"
                strategy={selectedStrategy}
            />
        </div>
    );
}

export default NextInvestmentPage;
