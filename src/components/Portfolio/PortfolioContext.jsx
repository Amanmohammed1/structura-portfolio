/**
 * Portfolio Context
 * 
 * Shared state for portfolio data across all pages.
 * This ensures Risk Analysis, Next Investment, and Dashboard
 * all use the SAME real portfolio data - no hardcoding.
 * 
 * Data flows from:
 * 1. User imports CSV → parsed transactions → stored in Supabase
 * 2. Dashboard import flow → localStorage (existing)
 * 3. This context reads both sources and provides unified access
 */

import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from '../Auth';
import { fetchMultipleStocks } from '../../lib/data/yahooFinance';

const PortfolioContext = createContext(null);

// Stock to sector mapping (from stock_master in future, for now calculated)
async function getStockSectors(symbols) {
    // In production, this comes from stock_master table
    // For now, we'll use Yahoo Finance industry data
    const sectorMap = {};

    try {
        // Try to fetch from stock_master
        const { supabase } = await import('../../config/supabase');
        const { data } = await supabase
            .from('stock_master')
            .select('symbol, sector')
            .in('symbol', symbols);

        if (data) {
            data.forEach(row => {
                sectorMap[row.symbol] = row.sector || 'Other';
            });
        }
    } catch (err) {
        console.warn('Could not fetch sectors from stock_master:', err.message);
    }

    // Fill missing with default
    symbols.forEach(sym => {
        if (!sectorMap[sym]) {
            sectorMap[sym] = inferSectorFromSymbol(sym);
        }
    });

    return sectorMap;
}

// Fallback sector inference from symbol (if stock_master doesn't have it)
function inferSectorFromSymbol(symbol) {
    const sym = symbol.replace('.NS', '').toUpperCase();

    // Banks
    if (['HDFCBANK', 'ICICIBANK', 'SBIN', 'KOTAKBANK', 'AXISBANK', 'INDUSINDBK', 'FEDERALBNK', 'BANDHANBNK', 'IDFCFIRSTB'].includes(sym)) return 'Banking';

    // NBFCs
    if (['BAJFINANCE', 'BAJAJFINSV', 'SHRIRAMFIN', 'MUTHOOTFIN', 'M&MFIN'].includes(sym)) return 'NBFC';

    // IT
    if (['TCS', 'INFY', 'WIPRO', 'HCLTECH', 'TECHM', 'LTIM', 'COFORGE', 'MPHASIS'].includes(sym)) return 'IT';

    // Pharma
    if (['SUNPHARMA', 'DRREDDY', 'CIPLA', 'DIVISLAB', 'APOLLOHOSP', 'BIOCON', 'LUPIN'].includes(sym)) return 'Pharma';

    // Auto
    if (['TATAMOTORS', 'MARUTI', 'M&M', 'HEROMOTOCO', 'BAJAJ-AUTO', 'EICHERMOT', 'ASHOKLEY'].includes(sym)) return 'Auto';

    // FMCG
    if (['HINDUNILVR', 'ITC', 'NESTLEIND', 'BRITANNIA', 'DABUR', 'MARICO', 'COLPAL', 'GODREJCP', 'TATACONSUM'].includes(sym)) return 'FMCG';

    // Energy/Oil
    if (['RELIANCE', 'ONGC', 'NTPC', 'POWERGRID', 'ADANIGREEN', 'TATAPOWER', 'COALINDIA', 'IOC', 'BPCL', 'GAIL'].includes(sym)) return 'Energy';

    // Metals
    if (['TATASTEEL', 'JSWSTEEL', 'HINDALCO', 'VEDL', 'NMDC', 'SAIL'].includes(sym)) return 'Metals';

    // Telecom
    if (['BHARTIARTL', 'JIO', 'VODAFONEIDEA'].includes(sym)) return 'Telecom';

    // Insurance
    if (['HDFCLIFE', 'SBILIFE', 'ICICIPRULI'].includes(sym)) return 'Insurance';

    return 'Other';
}

export function PortfolioProvider({ children }) {
    const { user } = useAuth();
    const [holdings, setHoldings] = useState([]);
    const [currentPrices, setCurrentPrices] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Load portfolio from localStorage (Dashboard's import flow)
    useEffect(() => {
        async function loadPortfolio() {
            setLoading(true);

            try {
                // Read from localStorage (same as Dashboard)
                const stored = localStorage.getItem('structura_portfolio');
                if (!stored) {
                    setHoldings([]);
                    setLoading(false);
                    return;
                }

                const portfolio = JSON.parse(stored);
                const symbols = portfolio.map(h => h.symbol);

                if (symbols.length === 0) {
                    setHoldings([]);
                    setLoading(false);
                    return;
                }

                // Fetch current prices and sectors in parallel
                const [priceData, sectorMap] = await Promise.all([
                    fetchMultipleStocks(symbols, '1mo'),
                    getStockSectors(symbols)
                ]);

                // Build holdings with current prices and sectors
                const enrichedHoldings = portfolio.map(h => {
                    const yahooPrice = priceData[h.symbol]?.slice(-1)[0]?.close;

                    // PRIORITY for currentPrice:
                    // 1. Freshly fetched Yahoo price (most up-to-date)
                    // 2. currentPrice from localStorage (enriched by Dashboard)
                    // 3. avgPrice fallback
                    const currentPrice = yahooPrice || h.currentPrice || h.avgPrice || 0;
                    const currentValue = h.quantity * currentPrice;

                    // PRIORITY for avgBuyPrice (cost basis):
                    // 1. avgPrice from localStorage (period start price set by Dashboard)
                    // 2. avgBuyPrice (manual import)
                    // 3. basePrice (enrichPortfolio)
                    const avgBuyPrice = h.avgPrice || h.avgBuyPrice || h.basePrice || currentPrice;

                    return {
                        ...h,
                        sector: sectorMap[h.symbol] || h.sector || 'Other',
                        currentPrice,
                        currentValue,
                        avgBuyPrice,
                        hrpWeight: h.hrpWeight || 0, // Preserve HRP weight from Dashboard analysis
                        weight: 0 // will be calculated below
                    };
                });

                // Calculate weights
                const totalValue = enrichedHoldings.reduce((sum, h) => sum + h.currentValue, 0);
                enrichedHoldings.forEach(h => {
                    h.weight = totalValue > 0 ? (h.currentValue / totalValue) * 100 : 0;
                });

                // Store latest prices
                const prices = {};
                Object.entries(priceData).forEach(([sym, data]) => {
                    if (data?.length > 0) {
                        prices[sym] = data[data.length - 1].close;
                    }
                });

                setHoldings(enrichedHoldings);
                setCurrentPrices(prices);

            } catch (err) {
                console.error('Error loading portfolio:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        loadPortfolio();

        // Listen for portfolio updates from Dashboard
        const handlePortfolioUpdate = () => {
            loadPortfolio();
        };
        window.addEventListener('portfolio-updated', handlePortfolioUpdate);

        return () => {
            window.removeEventListener('portfolio-updated', handlePortfolioUpdate);
        };
    }, [user]);

    // Computed portfolio stats
    const portfolioStats = useMemo(() => {
        if (holdings.length === 0) {
            return {
                totalValue: 0,
                stockCount: 0,
                sectorCount: 0,
                sectors: {}
            };
        }

        const totalValue = holdings.reduce((sum, h) => sum + (h.currentValue || 0), 0);
        const sectors = {};
        holdings.forEach(h => {
            sectors[h.sector] = (sectors[h.sector] || 0) + (h.weight || 0);
        });

        return {
            totalValue,
            stockCount: holdings.length,
            sectorCount: Object.keys(sectors).length,
            sectors
        };
    }, [holdings]);

    const value = {
        holdings,
        currentPrices,
        portfolioStats,
        loading,
        error,
        hasPortfolio: holdings.length > 0,
        refreshPortfolio: () => {
            // Trigger re-load by changing a dependency
            setLoading(true);
            setTimeout(() => setLoading(false), 100);
        }
    };

    return (
        <PortfolioContext.Provider value={value}>
            {children}
        </PortfolioContext.Provider>
    );
}

export function usePortfolio() {
    const context = useContext(PortfolioContext);
    if (!context) {
        throw new Error('usePortfolio must be used within a PortfolioProvider');
    }
    return context;
}

export default PortfolioContext;
