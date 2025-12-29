/**
 * HRP Weight Calculation Module
 * Implements recursive bisection for weight allocation (Lopez de Prado)
 */

import { getDiagonal } from './correlation.js';

/**
 * Calculate inverse variance weight for a subset of assets
 * @param {number[][]} covMatrix - Full covariance matrix
 * @param {number[]} indices - Indices of assets in subset
 * @returns {number} - Inverse variance weight
 */
function getClusterVariance(covMatrix, indices) {
    if (indices.length === 0) return 1;
    if (indices.length === 1) {
        return covMatrix[indices[0]][indices[0]];
    }

    // Get submatrix
    const subCov = indices.map(i =>
        indices.map(j => covMatrix[i][j])
    );

    // Equal weight within cluster
    const n = indices.length;
    const weights = Array(n).fill(1 / n);

    // Portfolio variance: w' * Cov * w
    let variance = 0;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            variance += weights[i] * weights[j] * subCov[i][j];
        }
    }

    return variance;
}

/**
 * Recursive bisection for HRP weight allocation
 * @param {number[][]} covMatrix - Covariance matrix
 * @param {number[]} sortOrder - Quasi-diagonal order of assets
 * @returns {number[]} - Weights array (in original asset order)
 */
export function recursiveBisection(covMatrix, sortOrder) {
    const n = sortOrder.length;
    if (n === 0) return [];
    if (n === 1) return [1];

    // Initialize weights to 1
    const weights = Array(n).fill(1);

    // Stack-based iteration (avoids deep recursion)
    const stack = [{ start: 0, end: n }];

    while (stack.length > 0) {
        const { start, end } = stack.pop();
        const size = end - start;

        if (size <= 1) continue;

        // Split in half
        const mid = Math.floor((start + end) / 2);

        // Get left and right cluster indices (in original order)
        const leftIndices = sortOrder.slice(start, mid);
        const rightIndices = sortOrder.slice(mid, end);

        // Calculate cluster variances
        const leftVar = getClusterVariance(covMatrix, leftIndices);
        const rightVar = getClusterVariance(covMatrix, rightIndices);

        // Inverse variance allocation
        const totalInvVar = 1 / leftVar + 1 / rightVar;
        const leftAlloc = (1 / leftVar) / totalInvVar;
        const rightAlloc = (1 / rightVar) / totalInvVar;

        // Update weights
        for (let i = start; i < mid; i++) {
            weights[i] *= leftAlloc;
        }
        for (let i = mid; i < end; i++) {
            weights[i] *= rightAlloc;
        }

        // Add sub-clusters to stack
        if (mid - start > 1) {
            stack.push({ start, end: mid });
        }
        if (end - mid > 1) {
            stack.push({ start: mid, end });
        }
    }

    // Map weights back to original order
    const originalWeights = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
        originalWeights[sortOrder[i]] = weights[i];
    }

    // Normalize to sum to 1
    const sum = originalWeights.reduce((a, b) => a + b, 0);
    return originalWeights.map(w => w / sum);
}

/**
 * Calculate equal weights
 * @param {number} n - Number of assets
 * @returns {number[]}
 */
export function equalWeights(n) {
    return Array(n).fill(1 / n);
}

/**
 * Calculate inverse volatility weights
 * @param {number[][]} covMatrix
 * @returns {number[]}
 */
export function inverseVolatilityWeights(covMatrix) {
    const variances = getDiagonal(covMatrix);
    const invVols = variances.map(v => 1 / Math.sqrt(Math.max(v, 1e-10)));
    const sum = invVols.reduce((a, b) => a + b, 0);
    return invVols.map(w => w / sum);
}

/**
 * Calculate minimum variance weights (simplified, no short-selling)
 * Uses iterative optimization
 * @param {number[][]} covMatrix
 * @param {number} [iterations=100]
 * @returns {number[]}
 */
export function minVarianceWeights(covMatrix, iterations = 100) {
    const n = covMatrix.length;
    if (n === 0) return [];

    // Start with equal weights
    let weights = Array(n).fill(1 / n);

    for (let iter = 0; iter < iterations; iter++) {
        // Calculate marginal contributions
        const marginalContrib = [];
        for (let i = 0; i < n; i++) {
            let contrib = 0;
            for (let j = 0; j < n; j++) {
                contrib += covMatrix[i][j] * weights[j];
            }
            marginalContrib.push(contrib);
        }

        // Update weights (inverse of marginal contribution)
        const invMC = marginalContrib.map(mc => 1 / Math.max(mc, 1e-10));
        const sum = invMC.reduce((a, b) => a + b, 0);
        weights = invMC.map(w => w / sum);
    }

    return weights;
}

/**
 * Format weights as percentage with symbol labels
 * @param {number[]} weights
 * @param {string[]} symbols
 * @returns {Object[]} - [{ symbol, weight, percentage }]
 */
export function formatWeights(weights, symbols) {
    return weights.map((w, i) => ({
        symbol: symbols[i],
        weight: w,
        percentage: (w * 100).toFixed(2) + '%',
    })).sort((a, b) => b.weight - a.weight);
}

/**
 * Calculate portfolio variance given weights and covariance matrix
 * @param {number[]} weights
 * @param {number[][]} covMatrix
 * @returns {number}
 */
export function portfolioVariance(weights, covMatrix) {
    const n = weights.length;
    let variance = 0;

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            variance += weights[i] * weights[j] * covMatrix[i][j];
        }
    }

    return variance;
}

/**
 * Calculate risk contribution of each asset
 * @param {number[]} weights
 * @param {number[][]} covMatrix
 * @returns {number[]}
 */
export function riskContribution(weights, covMatrix) {
    const n = weights.length;
    const variance = portfolioVariance(weights, covMatrix);
    const volatility = Math.sqrt(variance);

    if (volatility === 0) return weights.map(() => 0);

    const contributions = [];
    for (let i = 0; i < n; i++) {
        let marginal = 0;
        for (let j = 0; j < n; j++) {
            marginal += covMatrix[i][j] * weights[j];
        }
        contributions.push((weights[i] * marginal) / variance);
    }

    return contributions;
}
