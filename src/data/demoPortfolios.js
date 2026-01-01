/**
 * Smart Demo Portfolios - QUANTITATIVE
 * Fetches from generate-portfolios Edge Function
 * Portfolios ranked by: momentum, volatility, Sharpe ratio
 * ZERO HARDCODED STOCK LISTS
 */

import { supabase } from '../config/supabase';

// Cache for portfolios
let portfoliosCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes (portfolios are computationally expensive)

/**
 * Fetch quantitative portfolios from Edge Function
 */
export async function fetchDemoPortfolios() {
    // Return cache if fresh
    if (portfoliosCache && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
        return portfoliosCache;
    }

    try {
        console.log('Fetching quantitative portfolios...');

        const { data, error } = await supabase.functions.invoke('generate-portfolios');

        if (error) throw error;
        if (!data?.portfolios) throw new Error('No portfolios returned');

        portfoliosCache = data.portfolios;
        cacheTimestamp = Date.now();

        console.log(`✓ Loaded ${Object.keys(portfoliosCache).length} smart portfolios`);
        return portfoliosCache;

    } catch (err) {
        console.error('Failed to fetch quantitative portfolios:', err.message);
        // Return fallback if function fails
        return getFallbackPortfolios();
    }
}

/**
 * Minimal fallback if Edge Function fails
 */
async function getFallbackPortfolios() {
    // Fetch any NIFTY 50 stocks from database as fallback
    try {
        const { data } = await supabase
            .from('stock_master')
            .select('symbol, trading_symbol, name, sector')
            .eq('is_nifty50', true)
            .eq('is_active', true)
            .limit(10);

        const holdings = (data || []).map(s => ({
            symbol: s.symbol,
            tradingSymbol: s.trading_symbol,
            name: s.name,
            sector: s.sector,
            quantity: 10,
        }));

        return {
            nifty_50: {
                name: 'NIFTY 50',
                description: 'Top 10 NIFTY 50 stocks',
                holdings,
                metrics: { avgReturn: null, avgVolatility: null },
            },
        };
    } catch {
        return {};
    }
}

/**
 * Get portfolio options for UI (sync - uses cached data)
 */
export function getDemoPortfolioOptions() {
    if (!portfoliosCache) {
        // Return loading placeholders until async load completes
        return [
            { key: 'high_growth', name: 'High Growth', description: 'Loading quantitative data...', holdingsCount: 10 },
            { key: 'low_volatility', name: 'Low Volatility', description: 'Loading quantitative data...', holdingsCount: 10 },
            { key: 'balanced', name: 'Balanced', description: 'Loading quantitative data...', holdingsCount: 10 },
            { key: 'sector_diversified', name: 'Sector Diversified', description: 'Loading quantitative data...', holdingsCount: 10 },
            { key: 'conservative', name: 'Conservative', description: 'Loading quantitative data...', holdingsCount: 10 },
        ];
    }

    return Object.entries(portfoliosCache).map(([key, p]) => ({
        key,
        name: p.name,
        description: p.description,
        methodology: p.methodology,
        holdingsCount: p.holdings?.length || 0,
        avgReturn: p.metrics?.avgReturn,
        avgVolatility: p.metrics?.avgVolatility,
    }));
}

/**
 * Get specific portfolio
 */
export function getDemoPortfolio(key) {
    if (!portfoliosCache) return null;
    return portfoliosCache[key] || null;
}

/**
 * Enrich portfolio with real price data
 * priceHistory: { symbol: [{ date, close, ... }] }
 */
export function enrichPortfolio(holdings, currentPrices = {}, priceHistory = {}) {
    return holdings.map(h => {
        const symbol = h.symbol;

        // Get current price (last price in history)
        const priceData = currentPrices[symbol];
        const currentPrice = priceData?.close || null;
        const hasRealPrice = currentPrice !== null;

        // Get period start price (first price in history)
        const historyData = priceHistory[symbol];
        const periodStartPrice = historyData && historyData.length > 0
            ? historyData[0].close
            : null;

        // Base price for calculations
        const basePrice = periodStartPrice || currentPrice || 1000;
        const quantity = h.quantity || 10;

        const investedValue = quantity * basePrice;
        const currentValue = hasRealPrice ? quantity * currentPrice : investedValue;

        // Period return from actual prices
        const periodReturn = (hasRealPrice && periodStartPrice)
            ? ((currentPrice / periodStartPrice) - 1) * 100
            : (h.returns1Y || 0); // Use pre-calculated if no fresh data

        return {
            ...h,
            quantity,
            currentPrice: currentPrice || basePrice,
            basePrice,
            investedValue,
            currentValue,
            // PRESERVE original pnl from broker (Upstox) if available, otherwise calculate
            pnl: h.pnl !== undefined ? h.pnl : (hasRealPrice ? currentValue - investedValue : 0),
            pnlPercent: periodReturn,
            hasRealPrice,
            weight: 0,
        };
    });
}

export function calculateWeights(holdings) {
    const total = holdings.reduce((s, h) => s + h.currentValue, 0);
    return holdings.map(h => ({ ...h, weight: total > 0 ? (h.currentValue / total) * 100 : 0 }));
}

// Initialize cache on module load
fetchDemoPortfolios().catch(console.error);

export default {
    fetchDemoPortfolios,
    getDemoPortfolioOptions,
    getDemoPortfolio,
    enrichPortfolio,
    calculateWeights,
};
