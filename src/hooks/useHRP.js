import { useState, useMemo, useCallback, useEffect } from 'react';
import { runHRP, runBacktestComparison } from '../lib/hrp';

// Storage key for HRP results
const HRP_STORAGE_KEY = 'structura_hrp_result';

/**
 * Hook for running HRP analysis
 * Now persists results to localStorage for cross-navigation persistence
 */
export function useHRP() {
    // Initialize from localStorage if available
    const [result, setResult] = useState(() => {
        try {
            const cached = localStorage.getItem(HRP_STORAGE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                // Only restore if not too old (1 hour)
                if (parsed.timestamp && (Date.now() - parsed.timestamp) < 3600000) {
                    return parsed.result;
                }
            }
        } catch (e) { console.warn('Could not restore HRP result:', e); }
        return null;
    });

    const [backtest, setBacktest] = useState(() => {
        try {
            const cached = localStorage.getItem(HRP_STORAGE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed.timestamp && (Date.now() - parsed.timestamp) < 3600000) {
                    return parsed.backtest;
                }
            }
        } catch (e) { /* ignore */ }
        return null;
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const analyze = useCallback((priceData, niftyData = null) => {
        setLoading(true);
        setError(null);

        try {
            // Run HRP analysis
            const hrpResult = runHRP(priceData);
            setResult(hrpResult);

            // Calculate NIFTY 50 simple returns with dates for alignment
            let niftyReturnsWithDates = null;
            if (niftyData && niftyData.length > 1) {
                niftyReturnsWithDates = [];
                for (let i = 1; i < niftyData.length; i++) {
                    const prevClose = niftyData[i - 1].close;
                    const currClose = niftyData[i].close;
                    if (prevClose > 0 && currClose > 0) {
                        niftyReturnsWithDates.push({
                            date: niftyData[i].date,
                            return: (currClose / prevClose) - 1
                        });
                    }
                }
            }

            // Align NIFTY returns with HRP dates
            let alignedNiftyReturns = null;
            if (niftyReturnsWithDates && hrpResult.dates) {
                const niftyByDate = {};
                niftyReturnsWithDates.forEach(r => { niftyByDate[r.date] = r.return; });

                alignedNiftyReturns = hrpResult.dates.map(date =>
                    niftyByDate[date] !== undefined ? niftyByDate[date] : 0
                );

                console.log(`NIFTY alignment: ${alignedNiftyReturns.filter(r => r !== 0).length}/${hrpResult.dates.length} dates matched`);
            }

            // Run backtest comparison with NIFTY 50 benchmark
            const backtestResult = runBacktestComparison(hrpResult, alignedNiftyReturns);
            setBacktest(backtestResult);

            // Persist to localStorage for cross-navigation persistence
            try {
                localStorage.setItem(HRP_STORAGE_KEY, JSON.stringify({
                    result: hrpResult,
                    backtest: backtestResult,
                    timestamp: Date.now()
                }));
            } catch (e) { console.warn('Could not cache HRP result:', e); }

            return { hrpResult, backtestResult };
        } catch (err) {
            setError(err.message);
            console.error('HRP analysis error:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const clear = useCallback(() => {
        setResult(null);
        setBacktest(null);
        setError(null);
        localStorage.removeItem(HRP_STORAGE_KEY);
    }, []);

    // Memoized derived data for visualizations
    const visualizationData = useMemo(() => {
        if (!result) return null;

        return {
            // For dendrogram
            hierarchy: result.hierarchy,

            // For heatmap - reorder correlation by quasi-diagonal order
            correlationMatrix: result.correlation,
            sortedSymbols: result.sortOrder.map(i => result.symbols[i]),
            sortedCorrelation: result.sortOrder.map(i =>
                result.sortOrder.map(j => result.correlation[i][j])
            ),

            // For weights table
            weights: result.weights.hrp,

            // For risk contribution chart
            riskContribution: result.riskContribution,
        };
    }, [result]);

    const chartData = useMemo(() => {
        if (!backtest) return null;

        const { backtests } = backtest;

        // Prepare data for performance chart
        const dates = backtests[0]?.dates || [];

        const series = backtests.map(bt => ({
            name: bt.name,
            data: bt.cumulativeReturns.slice(1).map((value, i) => ({
                date: dates[i],
                value: (value - 1) * 100, // Convert to percentage
            })),
        }));

        return {
            dates,
            series,
            metrics: backtests.map(bt => ({
                name: bt.name,
                ...bt.metrics,
            })),
        };
    }, [backtest]);

    return {
        result,
        backtest,
        loading,
        error,
        analyze,
        clear,
        visualizationData,
        chartData,
    };
}

export default useHRP;
