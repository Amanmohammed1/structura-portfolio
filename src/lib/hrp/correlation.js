/**
 * HRP Correlation Module
 * Calculates returns, correlation matrices, and covariance matrices
 */

/**
 * Calculate log returns from price data
 * Used for correlation/covariance matrices (standard practice)
 * @param {Object} priceData - { symbol: [{ date, close }] }
 * @returns {Object} - { symbol: [returns] }
 */
export function calculateLogReturns(priceData) {
    const returns = {};

    // Null safety check
    if (!priceData || typeof priceData !== 'object') {
        console.warn('calculateLogReturns: priceData is null or not an object');
        return returns;
    }

    Object.entries(priceData).forEach(([symbol, prices]) => {
        if (!prices || prices.length < 2) {
            returns[symbol] = [];
            return;
        }

        returns[symbol] = [];
        for (let i = 1; i < prices.length; i++) {
            const prevClose = prices[i - 1].close;
            const currClose = prices[i].close;
            if (prevClose > 0 && currClose > 0) {
                returns[symbol].push(Math.log(currClose / prevClose));
            }
        }
    });

    return returns;
}

/**
 * Calculate SIMPLE (arithmetic) returns from price data
 * Used for display to users and cumulative return calculations
 * @param {Object} priceData - { symbol: [{ date, close }] }
 * @returns {Object} - { symbol: [returns] }
 */
export function calculateSimpleReturns(priceData) {
    const returns = {};

    // Null safety check
    if (!priceData || typeof priceData !== 'object') {
        console.warn('calculateSimpleReturns: priceData is null or not an object');
        return returns;
    }

    Object.entries(priceData).forEach(([symbol, prices]) => {
        if (!prices || prices.length < 2) {
            returns[symbol] = [];
            return;
        }

        returns[symbol] = [];
        for (let i = 1; i < prices.length; i++) {
            const prevClose = prices[i - 1].close;
            const currClose = prices[i].close;
            if (prevClose > 0 && currClose > 0) {
                // Simple return: (P1 - P0) / P0 = P1/P0 - 1
                returns[symbol].push((currClose / prevClose) - 1);
            }
        }
    });

    return returns;
}

/**
 * Align returns to common date period
 * Filters out stocks with insufficient data (< 50% of max) to avoid truncation issues
 * @param {Object} returns - { symbol: [returns] }
 * @param {number} [minRatio=0.5] - Minimum data ratio relative to max length
 * @returns {Object} - { symbols: [], matrix: [[]], excludedSymbols: [] }
 */
export function alignReturns(returns, minRatio = 0.5) {
    const allSymbols = Object.keys(returns);
    if (allSymbols.length === 0) return { symbols: [], matrix: [], excludedSymbols: [] };

    // Get lengths for all symbols
    const lengths = allSymbols.map(s => ({ symbol: s, length: returns[s].length }));
    const maxLength = Math.max(...lengths.map(l => l.length));
    const minRequired = Math.floor(maxLength * minRatio);

    // Filter to symbols with sufficient data
    const includedSymbols = [];
    const excludedSymbols = [];

    lengths.forEach(({ symbol, length }) => {
        if (length >= minRequired) {
            includedSymbols.push(symbol);
        } else {
            excludedSymbols.push({ symbol, length, required: minRequired });
        }
    });

    if (excludedSymbols.length > 0) {
        console.warn(`⚠ Excluded ${excludedSymbols.length} stocks with insufficient data for selected range:`,
            excludedSymbols.map(e => `${e.symbol}(${e.length}/${e.required})`).join(', '));
    }

    if (includedSymbols.length === 0) {
        return { symbols: [], matrix: [], excludedSymbols };
    }

    // Get the minimum length among included symbols
    const alignLength = Math.min(...includedSymbols.map(s => returns[s].length));

    console.log(`📊 Aligning ${includedSymbols.length} stocks to ${alignLength} data points`);

    // Create aligned matrix (use last N data points for each symbol)
    const matrix = [];
    for (let i = 0; i < alignLength; i++) {
        const row = includedSymbols.map(s => {
            const data = returns[s];
            // Use the LAST 'alignLength' data points (most recent)
            const offset = data.length - alignLength;
            return data[offset + i] ?? 0;
        });
        matrix.push(row);
    }

    return { symbols: includedSymbols, matrix, excludedSymbols };
}

/**
 * Calculate mean of array
 * @param {number[]} arr
 * @returns {number}
 */
export function mean(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Calculate standard deviation
 * @param {number[]} arr
 * @param {number} [mu] - Optional pre-calculated mean
 * @returns {number}
 */
export function std(arr, mu = null) {
    if (arr.length < 2) return 0;
    const m = mu ?? mean(arr);
    const variance = arr.reduce((acc, val) => acc + Math.pow(val - m, 2), 0) / (arr.length - 1);
    return Math.sqrt(variance);
}

/**
 * Calculate Pearson correlation between two arrays
 * @param {number[]} x
 * @param {number[]} y
 * @returns {number}
 */
export function pearsonCorrelation(x, y) {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;

    const meanX = mean(x.slice(0, n));
    const meanY = mean(y.slice(0, n));

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
        const dx = x[i] - meanX;
        const dy = y[i] - meanY;
        numerator += dx * dy;
        denomX += dx * dx;
        denomY += dy * dy;
    }

    const denominator = Math.sqrt(denomX * denomY);
    if (denominator === 0) return 0;

    return numerator / denominator;
}

/**
 * Calculate correlation matrix from returns matrix
 * @param {Object} alignedReturns - { symbols: [], matrix: [[]] }
 * @returns {Object} - { symbols: [], matrix: [[]] }
 */
export function calculateCorrelationMatrix(alignedReturns) {
    const { symbols, matrix } = alignedReturns;
    const n = symbols.length;

    if (n === 0 || matrix.length === 0) {
        return { symbols: [], matrix: [] };
    }

    // Transpose to get returns by asset
    const assetReturns = symbols.map((_, i) => matrix.map(row => row[i]));

    // Calculate correlation matrix
    const corrMatrix = [];
    for (let i = 0; i < n; i++) {
        const row = [];
        for (let j = 0; j < n; j++) {
            if (i === j) {
                row.push(1);
            } else if (j < i) {
                row.push(corrMatrix[j][i]); // Symmetric
            } else {
                row.push(pearsonCorrelation(assetReturns[i], assetReturns[j]));
            }
        }
        corrMatrix.push(row);
    }

    return { symbols, matrix: corrMatrix };
}

/**
 * Calculate covariance matrix from returns matrix
 * @param {Object} alignedReturns - { symbols: [], matrix: [[]] }
 * @returns {Object} - { symbols: [], matrix: [[]] }
 */
export function calculateCovarianceMatrix(alignedReturns) {
    const { symbols, matrix } = alignedReturns;
    const n = symbols.length;
    const T = matrix.length;

    if (n === 0 || T < 2) {
        return { symbols: [], matrix: [] };
    }

    // Transpose to get returns by asset
    const assetReturns = symbols.map((_, i) => matrix.map(row => row[i]));

    // Calculate means
    const means = assetReturns.map(returns => mean(returns));

    // Calculate covariance matrix
    const covMatrix = [];
    for (let i = 0; i < n; i++) {
        const row = [];
        for (let j = 0; j < n; j++) {
            if (j < i) {
                row.push(covMatrix[j][i]); // Symmetric
            } else {
                let cov = 0;
                for (let t = 0; t < T; t++) {
                    cov += (assetReturns[i][t] - means[i]) * (assetReturns[j][t] - means[j]);
                }
                row.push(cov / (T - 1));
            }
        }
        covMatrix.push(row);
    }

    return { symbols, matrix: covMatrix };
}

/**
 * Convert correlation to distance: d = sqrt(0.5 * (1 - corr))
 * @param {number[][]} corrMatrix
 * @returns {number[][]}
 */
export function correlationToDistance(corrMatrix) {
    return corrMatrix.map(row =>
        row.map(corr => Math.sqrt(0.5 * (1 - corr)))
    );
}

/**
 * Calculate annualized volatility
 * @param {number[]} returns - Daily returns
 * @param {number} [tradingDays=252] - Trading days per year
 * @returns {number}
 */
export function annualizedVolatility(returns, tradingDays = 252) {
    return std(returns) * Math.sqrt(tradingDays);
}

/**
 * Get diagonal of covariance matrix (variances)
 * @param {number[][]} covMatrix
 * @returns {number[]}
 */
export function getDiagonal(covMatrix) {
    return covMatrix.map((row, i) => row[i]);
}
