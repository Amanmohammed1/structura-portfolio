/**
 * Universe Filter for HRP
 * 
 * Filters stocks before HRP analysis to prevent bad recommendations:
 * 1. Penny Stock Filter: Price >= ₹20
 * 2. Data Quality Filter: Min 60 days of data, no flatlines
 * 3. Momentum Mask: Exclude stocks below 200 DMA from BUY recommendations
 * 
 * This transforms "Naive HRP" into "Constrained HRP" (institutional approach)
 */

/**
 * Calculate variance of an array
 */
function calculateVariance(prices) {
    if (!prices || prices.length < 2) return 0;
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const squaredDiffs = prices.map(p => Math.pow(p - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / prices.length;
}

/**
 * Calculate Simple Moving Average
 */
function calculateSMA(prices, period) {
    if (!prices || prices.length < period) return null;
    const relevantPrices = prices.slice(-period);
    return relevantPrices.reduce((a, b) => a + b, 0) / period;
}

/**
 * Pre-filter universe before HRP calculation
 * Returns { included: [...], excluded: [{ symbol, reason }] }
 */
export function filterUniverse(holdings, priceData, options = {}) {
    const {
        minPrice = 20,           // Minimum price to include (₹)
        minDataDays = 60,        // Minimum days of price history
        minVariance = 0.0001,    // Minimum price variance (no flatlines)
    } = options;

    const included = [];
    const excluded = [];

    for (const holding of holdings) {
        const symbol = holding.symbol;
        const currentPrice = holding.currentPrice || 0;
        const data = priceData[symbol] || [];

        // 1. Penny Stock Filter
        if (currentPrice < minPrice) {
            excluded.push({
                symbol,
                reason: `Low price (₹${currentPrice.toFixed(0)} < ₹${minPrice})`,
                holding
            });
            continue;
        }

        // 2. Data Quality Filter - Minimum days
        if (data.length < minDataDays) {
            excluded.push({
                symbol,
                reason: `Insufficient data (${data.length} < ${minDataDays} days)`,
                holding
            });
            continue;
        }

        // 3. Data Quality Filter - No flatlines (zero variance)
        const prices = data.slice(-60).map(d => d.close);
        const variance = calculateVariance(prices);
        if (variance < minVariance) {
            excluded.push({
                symbol,
                reason: 'Flatline data (no price movement)',
                holding
            });
            continue;
        }

        // Passed all filters
        included.push(holding);
    }

    console.log(`Universe filter: ${included.length} included, ${excluded.length} excluded`);
    if (excluded.length > 0) {
        console.log('Excluded stocks:', excluded.map(e => `${e.symbol}: ${e.reason}`).join(', '));
    }

    return { included, excluded };
}

/**
 * Apply momentum mask to HRP weights
 * Stocks below 200 DMA get weight = 0 with reason
 */
export function applyMomentumMask(holdings, priceData, hrpWeights) {
    const results = [];

    for (const holding of holdings) {
        const symbol = holding.symbol;
        const data = priceData[symbol] || [];
        const currentPrice = holding.currentPrice || 0;
        const currentWeight = holding.currentWeight || 0;
        const hrpWeight = hrpWeights[symbol] || 0;

        // Get existing HRP recommendation
        let recommendation = {
            ...holding,
            hrpWeight,
            action: null,
            actionReason: null,
            excluded: false,
            excludedReason: null,
        };

        // Calculate 200 DMA if enough data
        if (data.length >= 200) {
            const prices = data.slice(-200).map(d => d.close);
            const dma200 = calculateSMA(prices, 200);

            if (dma200 && currentPrice < dma200) {
                // Stock is below 200 DMA - apply momentum mask
                recommendation.excluded = true;
                recommendation.excludedReason = 'Below 200 DMA (negative momentum)';

                // If HRP says BUY but stock is falling, suppress
                if (hrpWeight > currentWeight) {
                    recommendation.hrpWeight = currentWeight; // Keep current, don't add
                    recommendation.action = 'HOLD';
                    recommendation.actionReason = 'Excluded from BUY due to negative momentum';
                }
            }
        } else if (data.length >= 50) {
            // Use 50 DMA for stocks with less history
            const prices = data.slice(-50).map(d => d.close);
            const dma50 = calculateSMA(prices, 50);

            if (dma50 && currentPrice < dma50) {
                recommendation.excluded = true;
                recommendation.excludedReason = 'Below 50 DMA (negative momentum)';

                if (hrpWeight > currentWeight) {
                    recommendation.hrpWeight = currentWeight;
                    recommendation.action = 'HOLD';
                    recommendation.actionReason = 'Excluded from BUY due to negative momentum';
                }
            }
        }

        // Determine action if not already set
        if (!recommendation.action) {
            const weightDiff = hrpWeight - currentWeight;
            if (Math.abs(weightDiff) < 1) {
                recommendation.action = 'HOLD';
                recommendation.actionReason = 'Near optimal allocation';
            } else if (weightDiff > 0) {
                recommendation.action = 'BUY';
                recommendation.actionReason = 'Increase allocation for risk diversification';
            } else {
                // SELL - but with better messaging
                if (currentWeight > 15) {
                    recommendation.action = 'TRIM';
                    recommendation.actionReason = 'Reduce concentration risk (weight > 15%)';
                } else {
                    recommendation.action = 'REDUCE';
                    recommendation.actionReason = 'Reduce for better diversification';
                }
            }
        }

        results.push(recommendation);
    }

    return results;
}

/**
 * Create filtered price data for HRP calculation
 * Only includes stocks that passed the filter
 */
export function filterPriceData(priceData, includedSymbols) {
    const filtered = {};
    for (const symbol of includedSymbols) {
        if (priceData[symbol]) {
            filtered[symbol] = priceData[symbol];
        }
    }
    return filtered;
}

export default {
    filterUniverse,
    applyMomentumMask,
    filterPriceData,
};
