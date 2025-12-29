/**
 * HRP Main Entry Point
 * Orchestrates the full HRP workflow
 */

import {
    calculateLogReturns,
    calculateSimpleReturns,
    alignReturns,
    calculateCorrelationMatrix,
    calculateCovarianceMatrix,
    correlationToDistance,
} from './correlation.js';

import {
    hierarchicalCluster,
    getQuasiDiagonalOrder,
    linkageToHierarchy,
} from './clustering.js';

import {
    recursiveBisection,
    equalWeights,
    inverseVolatilityWeights,
    formatWeights,
    riskContribution,
} from './weights.js';

import {
    runBacktest,
    compareStrategies,
} from './backtest.js';

/**
 * Run full HRP analysis
 * @param {Object} priceData - { symbol: [{ date, close }] }
 * @returns {Object} - Complete HRP results
 */
export function runHRP(priceData) {
    // Step 1: Calculate LOG returns for correlation/covariance (standard practice)
    const logReturns = calculateLogReturns(priceData);
    const alignedLogReturns = alignReturns(logReturns);
    const { symbols, matrix: logReturnsMatrix } = alignedLogReturns;

    if (symbols.length < 2) {
        throw new Error('Need at least 2 assets for HRP analysis');
    }

    // Step 1b: Calculate SIMPLE returns for backtest display (what users expect)
    const simpleReturns = calculateSimpleReturns(priceData);
    const alignedSimpleReturns = alignReturns(simpleReturns);
    const { matrix: simpleReturnsMatrix } = alignedSimpleReturns;

    // Step 2: Calculate correlation and covariance from LOG returns (standard for HRP)
    const correlation = calculateCorrelationMatrix(alignedLogReturns);
    const covariance = calculateCovarianceMatrix(alignedLogReturns);

    // Step 3: Convert correlation to distance
    const distanceMatrix = correlationToDistance(correlation.matrix);

    // Step 4: Hierarchical clustering
    const linkage = hierarchicalCluster(distanceMatrix);

    // Step 5: Get quasi-diagonal order
    const sortOrder = getQuasiDiagonalOrder(linkage, symbols.length);

    // Step 6: Recursive bisection for weights
    const hrpWeights = recursiveBisection(covariance.matrix, sortOrder);
    const eqWeights = equalWeights(symbols.length);
    const ivWeights = inverseVolatilityWeights(covariance.matrix);

    // Step 7: Calculate risk contributions
    const hrpRiskContrib = riskContribution(hrpWeights, covariance.matrix);

    // Step 8: Build hierarchy for visualization
    const hierarchy = linkageToHierarchy(linkage, symbols);

    // Step 9: Get dates from price data (use the aligned length, get from stock with most data)
    const alignedLength = simpleReturnsMatrix.length;

    // Find a stock with data length >= alignedLength
    let dateSource = symbols[0];
    for (const sym of symbols) {
        if (priceData[sym]?.length >= alignedLength + 1) {
            dateSource = sym;
            break;
        }
    }

    // Get dates from the last 'alignedLength' days of data
    const allDates = priceData[dateSource]?.map(p => p.date) || [];
    const dates = allDates.slice(allDates.length - alignedLength - 1); // Include offset for returns calculation

    return {
        symbols,
        correlation: correlation.matrix,
        covariance: covariance.matrix,
        distanceMatrix,
        linkage,
        sortOrder,
        hierarchy,
        weights: {
            hrp: formatWeights(hrpWeights, symbols),
            equalWeight: formatWeights(eqWeights, symbols),
            inverseVol: formatWeights(ivWeights, symbols),
        },
        rawWeights: {
            hrp: hrpWeights,
            equalWeight: eqWeights,
            inverseVol: ivWeights,
        },
        riskContribution: hrpRiskContrib.map((rc, i) => ({
            symbol: symbols[i],
            contribution: rc,
            percentage: (rc * 100).toFixed(2) + '%',
        })),
        // Use SIMPLE returns for backtest (correct for cumulative return calculation)
        returnsMatrix: simpleReturnsMatrix,
        dates: dates.slice(1), // Skip first date (no return for first day)
    };
}

/**
 * Run backtest comparison
 * @param {Object} hrpResult - Result from runHRP
 * @param {number[]} niftyReturns - Optional NIFTY 50 index daily returns
 * @returns {Object} - Backtest comparison
 */
export function runBacktestComparison(hrpResult, niftyReturns = null) {
    const { rawWeights, returnsMatrix, dates, symbols } = hrpResult;

    // Run backtests with SIMPLE returns (correct for cumulative formula)
    const hrpBacktest = runBacktest({
        weights: rawWeights.hrp,
        returnsMatrix,
        dates,
        name: 'HRP',
    });

    const eqBacktest = runBacktest({
        weights: rawWeights.equalWeight,
        returnsMatrix,
        dates,
        name: 'Equal Weight',
    });

    const ivBacktest = runBacktest({
        weights: rawWeights.inverseVol,
        returnsMatrix,
        dates,
        name: 'Inverse Volatility',
    });

    const backtests = [hrpBacktest, eqBacktest, ivBacktest];

    // Add NIFTY 50 benchmark if returns available
    if (niftyReturns && niftyReturns.length > 0) {
        // NIFTY 50 is a single-asset "strategy" with 100% weight
        const niftyBacktest = runBacktest({
            weights: [1],
            returnsMatrix: niftyReturns.map(r => [r]),  // Convert to matrix format
            dates: dates.slice(0, niftyReturns.length),
            name: 'NIFTY 50',
        });
        backtests.push(niftyBacktest);
    }

    return {
        backtests,
        comparison: compareStrategies(backtests),
    };
}

// Re-export all modules
export * from './correlation.js';
export * from './clustering.js';
export * from './weights.js';
export * from './backtest.js';
