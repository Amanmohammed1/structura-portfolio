import { useState, useCallback } from 'react';
import { fetchMultipleStocks, getYahooRange } from '../lib/data/yahooFinance';

/**
 * Hook for fetching and managing price data using Yahoo Finance
 * No rate limits, parallel fetching, much faster than Alpha Vantage
 */
export function usePrices() {
    const [prices, setPrices] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });

    const fetchPrices = useCallback(async (symbols, dateRange = '1y') => {
        if (!symbols || symbols.length === 0) {
            return {};
        }

        setLoading(true);
        setError(null);
        setProgress({ current: 0, total: symbols.length, status: 'Fetching market data...' });

        try {
            const yahooRange = getYahooRange(dateRange);
            setProgress({ current: 0, total: symbols.length, status: `Fetching ${symbols.length} stocks...` });

            const { data, errors } = await fetchMultipleStocks(symbols, yahooRange);

            setPrices(data);
            setProgress({ current: symbols.length, total: symbols.length, status: 'Done!' });

            if (errors.length > 0) {
                const failedSymbols = errors.map(e => e.symbol.replace('.NS', '')).join(', ');
                setError(`Could not fetch: ${failedSymbols}`);
            }

            return data;
        } catch (err) {
            setError(err.message || 'Failed to fetch prices');
            console.error('Price fetch error:', err);
            return {};
        } finally {
            setLoading(false);
        }
    }, []);

    const clearCache = useCallback(() => {
        setPrices({});
        setError(null);
    }, []);

    return {
        prices,
        loading,
        error,
        progress,
        fetchPrices,
        clearCache,
    };
}

export default usePrices;
