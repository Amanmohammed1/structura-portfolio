/**
 * Tax-Aware Rebalancing
 * 
 * Indian tax rules for equity:
 * - LTCG (>1 year): 10% above ₹1 lakh exemption
 * - STCG (<1 year): 15%
 * - STT already paid on sell (included in calculations)
 * 
 * This module calculates:
 * 1. Tax impact of selling a stock
 * 2. Optimal rebalancing path (minimize taxes)
 * 3. Wait suggestions (when to sell)
 */

// Tax rates (Union Budget 2024-25)
const TAX_RATES = {
    STCG: 0.15,         // Short-term capital gains (< 1 year)
    LTCG: 0.10,         // Long-term capital gains (> 1 year)
    LTCG_EXEMPTION: 100000,  // ₹1 lakh annual exemption on LTCG
    STT_SELL: 0.001,    // Securities Transaction Tax on sell (0.1%)
    CESS: 0.04          // 4% cess on tax
};

/**
 * Calculate days between two dates
 */
function daysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

/**
 * Determine if gain is STCG or LTCG
 * @param {Date} buyDate
 * @param {Date} sellDate
 * @returns {'STCG' | 'LTCG'}
 */
export function getGainType(buyDate, sellDate = new Date()) {
    const holdingDays = daysBetween(buyDate, sellDate);
    return holdingDays > 365 ? 'LTCG' : 'STCG';
}

/**
 * Calculate tax on capital gain
 * @param {number} gain - Capital gain in rupees
 * @param {string} gainType - 'STCG' or 'LTCG'
 * @param {number} [ltcgUsed=0] - LTCG exemption already used this FY
 * @returns {Object} - Tax breakdown
 */
export function calculateTax(gain, gainType, ltcgUsed = 0) {
    if (gain <= 0) {
        return {
            taxableGain: 0,
            tax: 0,
            cess: 0,
            totalTax: 0,
            effectiveRate: 0,
            gainType
        };
    }

    let taxableGain = gain;
    let exemptionUsed = 0;

    if (gainType === 'LTCG') {
        // LTCG has ₹1 lakh annual exemption
        const exemptionRemaining = Math.max(0, TAX_RATES.LTCG_EXEMPTION - ltcgUsed);
        exemptionUsed = Math.min(gain, exemptionRemaining);
        taxableGain = gain - exemptionUsed;
    }

    const rate = gainType === 'STCG' ? TAX_RATES.STCG : TAX_RATES.LTCG;
    const baseTax = taxableGain * rate;
    const cess = baseTax * TAX_RATES.CESS;
    const totalTax = baseTax + cess;
    const effectiveRate = gain > 0 ? (totalTax / gain) * 100 : 0;

    return {
        gain,
        taxableGain,
        exemptionUsed,
        baseTax,
        cess,
        totalTax,
        effectiveRate,
        gainType
    };
}

/**
 * Calculate sell impact for a specific stock holding
 * @param {Object} holding - Stock holding details
 * @param {number} currentPrice - Current market price
 * @param {number} sellQuantity - Quantity to sell
 * @returns {Object} - Complete sell impact analysis
 */
export function calculateSellImpact(holding, currentPrice, sellQuantity = null) {
    const qty = sellQuantity || holding.quantity;
    const sellValue = qty * currentPrice;
    const costBasis = qty * holding.avgBuyPrice;
    const capitalGain = sellValue - costBasis;

    // STT on sell
    const stt = sellValue * TAX_RATES.STT_SELL;

    // Determine gain type based on first buy
    const gainType = getGainType(holding.firstBuyDate);

    // Calculate tax
    const taxDetails = calculateTax(capitalGain, gainType);

    // Net proceeds
    const netProceeds = sellValue - stt - taxDetails.totalTax;

    // Days to LTCG (if currently STCG)
    const holdingDays = daysBetween(holding.firstBuyDate, new Date());
    const daysToLTCG = holdingDays < 365 ? 365 - holdingDays : 0;

    return {
        quantity: qty,
        currentPrice,
        sellValue,
        costBasis,
        capitalGain,
        capitalGainPercent: costBasis > 0 ? ((capitalGain / costBasis) * 100).toFixed(2) : 0,
        stt,
        ...taxDetails,
        netProceeds,
        holdingDays,
        daysToLTCG,
        waitRecommendation: daysToLTCG > 0 && daysToLTCG <= 60 && capitalGain > 0
            ? `Wait ${daysToLTCG} days to convert STCG to LTCG and save ${((TAX_RATES.STCG - TAX_RATES.LTCG) * capitalGain).toFixed(0)} in taxes`
            : null
    };
}

/**
 * Calculate tax-loss harvesting opportunities
 * @param {Array<Object>} holdings - Current holdings with gain/loss info
 * @param {Array<Object>} gains - Realized gains this FY
 * @returns {Object} - Tax-loss harvesting suggestions
 */
export function findTaxLossHarvesting(holdings, realizedGainsThisFY = 0) {
    const lossMakingStocks = holdings.filter(h => h.unrealizedGain < 0);

    // Sort by loss amount (largest loss first)
    lossMakingStocks.sort((a, b) => a.unrealizedGain - b.unrealizedGain);

    const opportunities = lossMakingStocks.map(stock => {
        const loss = Math.abs(stock.unrealizedGain);
        const gainType = getGainType(stock.firstBuyDate);

        // Tax savings from harvesting this loss
        const taxRate = gainType === 'STCG' ? TAX_RATES.STCG : TAX_RATES.LTCG;
        const potentialTaxSavings = loss * taxRate * (1 + TAX_RATES.CESS);

        // Can offset against gains
        const offsetAmount = Math.min(loss, realizedGainsThisFY);
        const actualSavings = offsetAmount * taxRate * (1 + TAX_RATES.CESS);

        return {
            symbol: stock.symbol,
            tradingSymbol: stock.tradingSymbol,
            unrealizedLoss: loss,
            gainType,
            potentialTaxSavings,
            offsetableAgainstGains: offsetAmount,
            actualSavings,
            recommendation: realizedGainsThisFY > 0 && loss > 10000
                ? `Sell to offset ₹${offsetAmount.toFixed(0)} against gains, saving ₹${actualSavings.toFixed(0)} in taxes`
                : loss > 10000
                    ? `Consider booking loss of ₹${loss.toFixed(0)} to carry forward`
                    : 'Loss too small to harvest'
        };
    });

    return {
        opportunities: opportunities.filter(o => o.unrealizedLoss > 5000),
        totalHarvestable: lossMakingStocks.reduce((s, h) => s + Math.abs(h.unrealizedGain), 0),
        realizedGainsThisFY,
        maxOffset: Math.min(
            lossMakingStocks.reduce((s, h) => s + Math.abs(h.unrealizedGain), 0),
            realizedGainsThisFY
        )
    };
}

/**
 * Generate tax-aware rebalancing plan
 * Instead of "sell X, buy Y", suggest optimal path
 * @param {Array<Object>} currentHoldings
 * @param {Object} targetWeights - { symbol: targetWeight }
 * @param {number} currentPrices - { symbol: price }
 * @returns {Object} - Rebalancing plan with tax implications
 */
export function generateTaxAwareRebalancingPlan(currentHoldings, targetWeights, currentPrices) {
    const totalValue = currentHoldings.reduce((sum, h) => {
        return sum + (h.quantity * (currentPrices[h.symbol] || h.avgBuyPrice));
    }, 0);

    const trades = [];
    let totalTaxIfExecutedNow = 0;
    let totalTaxIfWaitForLTCG = 0;

    currentHoldings.forEach(holding => {
        const currentPrice = currentPrices[holding.symbol] || holding.avgBuyPrice;
        const currentValue = holding.quantity * currentPrice;
        const currentWeight = (currentValue / totalValue) * 100;
        const targetWeight = targetWeights[holding.symbol] || 0;
        const weightDiff = targetWeight - currentWeight;

        if (Math.abs(weightDiff) < 2) {
            // Within tolerance, no action needed
            return;
        }

        if (weightDiff < -2) {
            // Need to reduce position
            const reduceValue = Math.abs(weightDiff / 100) * totalValue;
            const reduceQty = Math.floor(reduceValue / currentPrice);

            const sellImpact = calculateSellImpact(holding, currentPrice, reduceQty);

            totalTaxIfExecutedNow += sellImpact.totalTax;

            // Calculate tax if wait for LTCG
            if (sellImpact.gainType === 'STCG' && sellImpact.capitalGain > 0) {
                const ltcgTax = calculateTax(sellImpact.capitalGain, 'LTCG');
                totalTaxIfWaitForLTCG += ltcgTax.totalTax;
            } else {
                totalTaxIfWaitForLTCG += sellImpact.totalTax;
            }

            trades.push({
                action: 'SELL',
                symbol: holding.symbol,
                tradingSymbol: holding.tradingSymbol,
                quantity: reduceQty,
                value: reduceValue,
                reason: `Reduce from ${currentWeight.toFixed(1)}% to ${targetWeight}%`,
                taxImpact: sellImpact,
                priority: weightDiff < -10 ? 'HIGH' : 'MEDIUM'
            });
        } else if (weightDiff > 2) {
            // Need to increase position
            const increaseValue = (weightDiff / 100) * totalValue;
            const increaseQty = Math.floor(increaseValue / currentPrice);

            trades.push({
                action: 'BUY',
                symbol: holding.symbol,
                tradingSymbol: holding.tradingSymbol,
                quantity: increaseQty,
                value: increaseValue,
                reason: `Increase from ${currentWeight.toFixed(1)}% to ${targetWeight}%`,
                taxImpact: null, // No tax on buying
                priority: weightDiff > 10 ? 'HIGH' : 'MEDIUM'
            });
        }
    });

    // Check for new positions in target that aren't in current
    Object.entries(targetWeights).forEach(([symbol, targetWeight]) => {
        const hasPosition = currentHoldings.some(h => h.symbol === symbol);
        if (!hasPosition && targetWeight > 2) {
            const value = (targetWeight / 100) * totalValue;
            const price = currentPrices[symbol] || 1000;

            trades.push({
                action: 'BUY',
                symbol,
                quantity: Math.floor(value / price),
                value,
                reason: `Add new position at ${targetWeight}%`,
                taxImpact: null,
                priority: targetWeight > 10 ? 'HIGH' : 'MEDIUM'
            });
        }
    });

    // Sort: BUY first (use cash), then SELL with LTCG first, then STCG
    trades.sort((a, b) => {
        if (a.action === 'BUY' && b.action === 'SELL') return -1;
        if (a.action === 'SELL' && b.action === 'BUY') return 1;
        if (a.taxImpact && b.taxImpact) {
            // Prefer selling LTCG over STCG
            if (a.taxImpact.gainType !== b.taxImpact.gainType) {
                return a.taxImpact.gainType === 'LTCG' ? -1 : 1;
            }
        }
        return 0;
    });

    const taxSavingsIfWait = totalTaxIfExecutedNow - totalTaxIfWaitForLTCG;

    return {
        trades,
        totalValue,
        summary: {
            sellTrades: trades.filter(t => t.action === 'SELL').length,
            buyTrades: trades.filter(t => t.action === 'BUY').length,
            totalTaxIfExecutedNow,
            totalTaxIfWaitForLTCG,
            taxSavingsIfWait,
            recommendation: taxSavingsIfWait > 5000
                ? `Consider waiting for some holdings to become LTCG to save ₹${taxSavingsIfWait.toFixed(0)}`
                : 'Execute rebalancing as planned'
        },
        alternatives: generateAlternatives(trades)
    };
}

/**
 * Generate alternative rebalancing approaches
 */
function generateAlternatives(trades) {
    const sellTrades = trades.filter(t => t.action === 'SELL');

    return [
        {
            name: 'Execute Now',
            description: 'Sell and buy immediately',
            pros: ['Immediate rebalancing', 'Target allocation achieved'],
            cons: ['May incur STCG tax']
        },
        {
            name: 'Wait for LTCG',
            description: 'Wait for holdings to become long-term before selling',
            pros: ['Lower tax rate (10% vs 15%)', 'LTCG exemption available'],
            cons: ['Portfolio stays imbalanced', 'Market conditions may change']
        },
        {
            name: 'Gradual Rebalancing',
            description: 'Use future investments to gradually shift allocation',
            pros: ['No selling required', 'Zero tax impact'],
            cons: ['Takes time to achieve target', 'Depends on new investments']
        }
    ];
}

/**
 * Calculate days until a holding becomes LTCG
 */
export function getDaysToLTCG(buyDate) {
    const holdingDays = daysBetween(buyDate, new Date());
    return Math.max(0, 365 - holdingDays);
}

/**
 * Get LTCG calendar - when will each holding become LTCG?
 */
export function getLTCGCalendar(holdings) {
    return holdings
        .filter(h => getGainType(h.firstBuyDate) === 'STCG')
        .map(h => ({
            symbol: h.symbol,
            tradingSymbol: h.tradingSymbol,
            buyDate: h.firstBuyDate,
            ltcgDate: new Date(new Date(h.firstBuyDate).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            daysRemaining: getDaysToLTCG(h.firstBuyDate),
            unrealizedGain: h.unrealizedGain || 0
        }))
        .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

export default {
    TAX_RATES,
    getGainType,
    calculateTax,
    calculateSellImpact,
    findTaxLossHarvesting,
    generateTaxAwareRebalancingPlan,
    getDaysToLTCG,
    getLTCGCalendar
};
