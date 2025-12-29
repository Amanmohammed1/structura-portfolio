/**
 * HRP Backtest Engine
 * Compare HRP vs Equal-Weight vs Benchmark returns
 */

import { mean, std } from './correlation.js';

/**
 * Calculate cumulative returns from daily returns
 * @param {number[]} returns - Daily returns
 * @returns {number[]} - Cumulative returns (starting at 1)
 */
export function cumulativeReturns(returns) {
    const cumulative = [1];
    for (const r of returns) {
        cumulative.push(cumulative[cumulative.length - 1] * (1 + r));
    }
    return cumulative;
}

/**
 * Calculate portfolio returns given weights and asset returns
 * @param {number[]} weights
 * @param {number[][]} returnsMatrix - Each row is a time period, each column is an asset
 * @returns {number[]} - Portfolio daily returns
 */
export function portfolioReturns(weights, returnsMatrix) {
    return returnsMatrix.map(row =>
        row.reduce((sum, r, i) => sum + weights[i] * r, 0)
    );
}

/**
 * Calculate Sharpe ratio
 * @param {number[]} returns - Daily returns
 * @param {number} [riskFreeRate=0.02] - Annual risk-free rate
 * @param {number} [tradingDays=252]
 * @returns {number}
 */
export function sharpeRatio(returns, riskFreeRate = 0.02, tradingDays = 252) {
    if (returns.length < 2) return 0;

    const dailyRf = riskFreeRate / tradingDays;
    const excessReturns = returns.map(r => r - dailyRf);
    const avgExcess = mean(excessReturns);
    const stdDev = std(excessReturns);

    if (stdDev === 0) return 0;

    return (avgExcess / stdDev) * Math.sqrt(tradingDays);
}

/**
 * Calculate Sortino ratio (downside risk adjusted)
 * @param {number[]} returns
 * @param {number} [riskFreeRate=0.02]
 * @param {number} [tradingDays=252]
 * @returns {number}
 */
export function sortinoRatio(returns, riskFreeRate = 0.02, tradingDays = 252) {
    if (returns.length < 2) return 0;

    const dailyRf = riskFreeRate / tradingDays;
    const excessReturns = returns.map(r => r - dailyRf);
    const avgExcess = mean(excessReturns);

    // Downside deviation: only negative returns
    const negativeReturns = excessReturns.filter(r => r < 0);
    if (negativeReturns.length === 0) return Infinity;

    const downsideStd = Math.sqrt(
        negativeReturns.reduce((sum, r) => sum + r * r, 0) / negativeReturns.length
    );

    if (downsideStd === 0) return 0;

    return (avgExcess / downsideStd) * Math.sqrt(tradingDays);
}

/**
 * Calculate maximum drawdown
 * @param {number[]} cumulativeReturns
 * @returns {{ maxDrawdown: number, drawdownStart: number, drawdownEnd: number }}
 */
export function maxDrawdown(cumulativeReturns) {
    let maxDD = 0;
    let peak = cumulativeReturns[0];
    let ddStart = 0;
    let ddEnd = 0;
    let tempStart = 0;

    for (let i = 1; i < cumulativeReturns.length; i++) {
        if (cumulativeReturns[i] > peak) {
            peak = cumulativeReturns[i];
            tempStart = i;
        }

        const dd = (peak - cumulativeReturns[i]) / peak;
        if (dd > maxDD) {
            maxDD = dd;
            ddStart = tempStart;
            ddEnd = i;
        }
    }

    return { maxDrawdown: maxDD, drawdownStart: ddStart, drawdownEnd: ddEnd };
}

/**
 * Calculate CAGR (Compound Annual Growth Rate)
 * @param {number[]} cumulativeReturns
 * @param {number} [tradingDays=252]
 * @returns {number}
 */
export function cagr(cumulativeReturns, tradingDays = 252) {
    if (cumulativeReturns.length < 2) return 0;

    const totalReturn = cumulativeReturns[cumulativeReturns.length - 1] / cumulativeReturns[0];
    const years = (cumulativeReturns.length - 1) / tradingDays;

    if (years <= 0) return 0;

    return Math.pow(totalReturn, 1 / years) - 1;
}

/**
 * Calculate annualized volatility
 * @param {number[]} returns
 * @param {number} [tradingDays=252]
 * @returns {number}
 */
export function annualizedVolatility(returns, tradingDays = 252) {
    return std(returns) * Math.sqrt(tradingDays);
}

/**
 * Calculate Calmar ratio (CAGR / MaxDrawdown)
 * @param {number} cagr
 * @param {number} maxDrawdown
 * @returns {number}
 */
export function calmarRatio(cagr, maxDrawdown) {
    if (maxDrawdown === 0) return 0;
    return cagr / maxDrawdown;
}

/**
 * Run full backtest
 * @param {Object} params
 * @param {number[]} params.weights - Portfolio weights
 * @param {number[][]} params.returnsMatrix - Daily returns matrix
 * @param {string[]} params.dates - Date strings
 * @param {string} params.name - Strategy name
 * @returns {Object} - Backtest results
 */
export function runBacktest({ weights, returnsMatrix, dates, name }) {
    const portReturns = portfolioReturns(weights, returnsMatrix);
    const cumReturns = cumulativeReturns(portReturns);

    const dd = maxDrawdown(cumReturns);
    const cagrVal = cagr(cumReturns);
    const vol = annualizedVolatility(portReturns);
    const sharpe = sharpeRatio(portReturns);
    const sortino = sortinoRatio(portReturns);
    const calmar = calmarRatio(cagrVal, dd.maxDrawdown);

    return {
        name,
        weights,
        returns: portReturns,
        cumulativeReturns: cumReturns,
        dates,
        metrics: {
            totalReturn: (cumReturns[cumReturns.length - 1] - 1) * 100,
            cagr: cagrVal * 100,
            volatility: vol * 100,
            sharpeRatio: sharpe,
            sortinoRatio: sortino,
            maxDrawdown: dd.maxDrawdown * 100,
            calmarRatio: calmar,
        },
    };
}

/**
 * Compare multiple strategies
 * @param {Object[]} backtests - Array of backtest results
 * @returns {Object} - Comparison table
 */
export function compareStrategies(backtests) {
    const metrics = [
        'totalReturn',
        'cagr',
        'volatility',
        'sharpeRatio',
        'sortinoRatio',
        'maxDrawdown',
        'calmarRatio',
    ];

    const comparison = {};

    metrics.forEach(metric => {
        comparison[metric] = {};
        backtests.forEach(bt => {
            comparison[metric][bt.name] = bt.metrics[metric];
        });
    });

    return comparison;
}

/**
 * Format backtest results for display
 * @param {Object} backtest
 * @returns {Object[]}
 */
export function formatMetrics(backtest) {
    const { metrics } = backtest;

    return [
        {
            name: 'Total Return',
            value: `${metrics.totalReturn.toFixed(2)}%`,
            isPositive: metrics.totalReturn > 0,
        },
        {
            name: 'CAGR',
            value: `${metrics.cagr.toFixed(2)}%`,
            isPositive: metrics.cagr > 0,
        },
        {
            name: 'Volatility',
            value: `${metrics.volatility.toFixed(2)}%`,
            isPositive: false,
            isNeutral: true,
        },
        {
            name: 'Sharpe Ratio',
            value: metrics.sharpeRatio.toFixed(2),
            isPositive: metrics.sharpeRatio > 0,
        },
        {
            name: 'Sortino Ratio',
            value: metrics.sortinoRatio.toFixed(2),
            isPositive: metrics.sortinoRatio > 0,
        },
        {
            name: 'Max Drawdown',
            value: `${metrics.maxDrawdown.toFixed(2)}%`,
            isPositive: false,
            isNegative: true,
        },
        {
            name: 'Calmar Ratio',
            value: metrics.calmarRatio.toFixed(2),
            isPositive: metrics.calmarRatio > 0,
        },
    ];
}
