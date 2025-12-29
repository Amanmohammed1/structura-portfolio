/**
 * Next Investment Advisor
 * 
 * Recommends what to buy based on:
 * 1. Gap Analysis - What's missing in your portfolio?
 * 2. Factor Scoring - Momentum, Value, Quality, Low Vol
 * 3. Correlation Optimization - Add stocks that diversify
 * 4. Amount Allocation - How much in each recommended stock
 */

import { calculateSectorConcentration, analyzeNewStockImpact } from './stressTest.js';

// ============================================
// FACTOR DEFINITIONS
// ============================================

/**
 * Calculate momentum score (12-month return rank)
 * @param {number} return1Y - 1-year return percentage
 * @param {number} return3M - 3-month return percentage
 * @returns {number} - Score 0-100
 */
export function calculateMomentumScore(return1Y, return3M) {
    // Weight: 70% 12M, 30% 3M
    const weightedReturn = (return1Y * 0.7) + (return3M * 0.3);

    // Convert to 0-100 scale (assuming -50% to +100% range)
    const score = Math.max(0, Math.min(100, ((weightedReturn + 50) / 150) * 100));
    return score;
}

/**
 * Calculate value score (inverse of valuation)
 * @param {number} pe - Price to Earnings ratio
 * @param {number} pb - Price to Book ratio
 * @returns {number} - Score 0-100 (higher = more undervalued)
 */
export function calculateValueScore(pe, pb) {
    if (!pe || !pb || pe < 0) return 50; // Neutral for missing data

    // Lower P/E and P/B = higher value score
    // P/E score: 0 at PE=50+, 100 at PE<=5
    const peScore = Math.max(0, Math.min(100, (1 - (pe - 5) / 45) * 100));

    // P/B score: 0 at PB=10+, 100 at PB<=0.5
    const pbScore = Math.max(0, Math.min(100, (1 - (pb - 0.5) / 9.5) * 100));

    return (peScore * 0.6) + (pbScore * 0.4);
}

/**
 * Calculate quality score
 * @param {number} roe - Return on Equity
 * @param {number} debtEquity - Debt to Equity ratio
 * @param {number} profitGrowth - Profit growth rate
 * @returns {number} - Score 0-100
 */
export function calculateQualityScore(roe, debtEquity, profitGrowth) {
    // ROE score: 0 at ROE<=0, 100 at ROE>=30
    const roeScore = roe ? Math.max(0, Math.min(100, (roe / 30) * 100)) : 50;

    // Debt score: 100 at D/E=0, 0 at D/E>=2
    const debtScore = debtEquity !== undefined ? Math.max(0, 100 - (debtEquity * 50)) : 50;

    // Profit growth: 0 at -20%, 100 at +30%
    const growthScore = profitGrowth ? Math.max(0, Math.min(100, ((profitGrowth + 20) / 50) * 100)) : 50;

    return (roeScore * 0.4) + (debtScore * 0.3) + (growthScore * 0.3);
}

/**
 * Calculate low volatility score
 * @param {number} volatility - Annualized volatility
 * @returns {number} - Score 0-100 (higher = lower volatility)
 */
export function calculateLowVolScore(volatility) {
    if (!volatility || volatility <= 0) return 50;

    // Lower volatility = higher score
    // 0% vol = 100 score, 60% vol = 0 score
    return Math.max(0, Math.min(100, (1 - volatility / 60) * 100));
}

/**
 * Calculate composite factor score
 */
export function calculateCompositeScore(stock, strategy = 'balanced') {
    const momentum = calculateMomentumScore(stock.return1Y || 0, stock.return3M || 0);
    const value = calculateValueScore(stock.pe, stock.pb);
    const quality = calculateQualityScore(stock.roe, stock.debtEquity, stock.profitGrowth);
    const lowVol = calculateLowVolScore(stock.volatility);

    let weights;
    switch (strategy) {
        case 'aggressive':
            weights = { momentum: 0.5, value: 0.1, quality: 0.3, lowVol: 0.1 };
            break;
        case 'conservative':
            weights = { momentum: 0.1, value: 0.3, quality: 0.4, lowVol: 0.2 };
            break;
        case 'value':
            weights = { momentum: 0.2, value: 0.5, quality: 0.2, lowVol: 0.1 };
            break;
        case 'momentum':
            weights = { momentum: 0.6, value: 0.1, quality: 0.2, lowVol: 0.1 };
            break;
        case 'balanced':
        default:
            weights = { momentum: 0.3, value: 0.25, quality: 0.3, lowVol: 0.15 };
    }

    const composite = (
        momentum * weights.momentum +
        value * weights.value +
        quality * weights.quality +
        lowVol * weights.lowVol
    );

    return {
        momentum,
        value,
        quality,
        lowVol,
        composite,
        rating: composite >= 80 ? 5 : composite >= 65 ? 4 : composite >= 50 ? 3 : composite >= 35 ? 2 : 1
    };
}

// ============================================
// GAP ANALYSIS
// ============================================

// Target sector allocation (Indian market optimal diversification)
const TARGET_ALLOCATION = {
    'Banking': 15,
    'IT': 15,
    'NBFC': 10,
    'Pharma': 10,
    'FMCG': 10,
    'Auto': 8,
    'Energy': 8,
    'Metals': 5,
    'Telecom': 5,
    'Insurance': 5,
    'Infra': 4,
    'Cement': 3,
    'Chemicals': 2
};

/**
 * Analyze gaps in current portfolio
 * @param {Array<{sector: string, weight: number}>} holdings
 * @returns {Object} - Gap analysis
 */
export function analyzePortfolioGaps(holdings) {
    const { sectorWeights } = calculateSectorConcentration(holdings);

    const gaps = [];
    const overweight = [];

    Object.entries(TARGET_ALLOCATION).forEach(([sector, target]) => {
        const current = sectorWeights[sector] || 0;
        const diff = current - target;

        if (diff < -5) {
            gaps.push({
                sector,
                current: current.toFixed(1),
                target,
                gap: Math.abs(diff).toFixed(1),
                priority: Math.abs(diff) > 10 ? 'HIGH' : 'MEDIUM'
            });
        } else if (diff > 10) {
            overweight.push({
                sector,
                current: current.toFixed(1),
                target,
                excess: diff.toFixed(1)
            });
        }
    });

    return {
        gaps: gaps.sort((a, b) => parseFloat(b.gap) - parseFloat(a.gap)),
        overweight: overweight.sort((a, b) => parseFloat(b.excess) - parseFloat(a.excess)),
        isWellDiversified: gaps.filter(g => g.priority === 'HIGH').length === 0,
        missingSectors: Object.keys(TARGET_ALLOCATION).filter(s => !sectorWeights[s] || sectorWeights[s] < 2)
    };
}

// ============================================
// RECOMMENDATION ENGINE
// ============================================

/**
 * Generate next investment recommendations
 * @param {Array<Object>} currentHoldings - Current portfolio holdings
 * @param {Array<Object>} stockUniverse - Available stocks to choose from
 * @param {number} investmentAmount - Amount to invest
 * @param {string} strategy - Investment strategy
 * @returns {Array<Object>} - Ranked recommendations
 */
export function generateRecommendations(currentHoldings, stockUniverse, investmentAmount, strategy = 'balanced') {
    const gapAnalysis = analyzePortfolioGaps(currentHoldings);
    const currentSymbols = new Set(currentHoldings.map(h => h.symbol));

    // Filter to stocks not already held
    const candidates = stockUniverse.filter(s => !currentSymbols.has(s.symbol));

    // Score each candidate
    const scoredCandidates = candidates.map(stock => {
        const factorScore = calculateCompositeScore(stock, strategy);

        // Gap filling bonus (if sector is underweight)
        const sectorGap = gapAnalysis.gaps.find(g => g.sector === stock.sector);
        const gapBonus = sectorGap ? parseFloat(sectorGap.gap) * 2 : 0;

        // Penalty for adding to overweight sector
        const isOverweight = gapAnalysis.overweight.some(o => o.sector === stock.sector);
        const overweightPenalty = isOverweight ? 20 : 0;

        // Diversification analysis
        const impact = analyzeNewStockImpact(currentHoldings, {
            symbol: stock.symbol,
            sector: stock.sector,
            amount: investmentAmount / 3 // Assume 3-stock split
        });
        const diversificationBonus = impact.diversificationImprovement ? 10 : 0;

        const totalScore = factorScore.composite + gapBonus - overweightPenalty + diversificationBonus;

        return {
            ...stock,
            factorScore,
            gapBonus,
            overweightPenalty,
            diversificationImpact: impact.hhiChange,
            totalScore,
            reasoning: generateReasoning(stock, sectorGap, factorScore, impact)
        };
    });

    // Sort by total score
    const ranked = scoredCandidates.sort((a, b) => b.totalScore - a.totalScore);

    // Take top candidates and allocate amount
    const topN = Math.min(5, ranked.length);

    // Calculate weights that sum to 1.0 (higher rank = more weight)
    // Weights: rank 1 = 5, rank 2 = 4, ..., rank 5 = 1, total = 15
    const weightSum = (topN * (topN + 1)) / 2;

    let remainingAmount = investmentAmount;
    const recommendations = ranked.slice(0, topN).map((stock, idx) => {
        const rankPoints = topN - idx; // 5, 4, 3, 2, 1 for top 5
        const weight = rankPoints / weightSum; // 5/15 = 0.33, 4/15 = 0.27, etc.

        // Calculate suggested amount (round to nearest 1000, ensure at least 1000)
        let suggestedAmount = Math.round((investmentAmount * weight) / 1000) * 1000;
        suggestedAmount = Math.max(1000, suggestedAmount);

        // For last stock, allocate remaining to ensure exact sum
        if (idx === topN - 1) {
            suggestedAmount = Math.max(1000, remainingAmount);
        } else {
            remainingAmount -= suggestedAmount;
        }

        return {
            rank: idx + 1,
            ...stock,
            suggestedAmount,
            suggestedQuantity: stock.currentPrice ? Math.floor(suggestedAmount / stock.currentPrice) : null
        };
    });

    return {
        recommendations,
        gapAnalysis,
        strategy,
        investmentAmount,
        summary: generateSummary(recommendations, gapAnalysis)
    };
}

/**
 * Generate human-readable reasoning for recommendation
 */
function generateReasoning(stock, sectorGap, factorScore, impact) {
    const reasons = [];

    // Factor-based reasons
    if (factorScore.momentum >= 70) {
        reasons.push(`Strong momentum (top ${100 - factorScore.momentum}% performer)`);
    }
    if (factorScore.quality >= 70) {
        reasons.push('High quality fundamentals');
    }
    if (factorScore.value >= 70) {
        reasons.push('Attractively valued');
    }
    if (factorScore.lowVol >= 70) {
        reasons.push('Low volatility - defensive');
    }

    // Gap-based reasons
    if (sectorGap) {
        reasons.push(`Fills ${stock.sector} sector gap (you have ${sectorGap.current}%, target ${sectorGap.target}%)`);
    }

    // Diversification reasons
    if (impact.diversificationImprovement) {
        reasons.push('Improves portfolio diversification');
    }

    return reasons.length ? reasons.join('. ') + '.' : 'Adds sector exposure.';
}

/**
 * Generate summary text
 */
function generateSummary(recommendations, gapAnalysis) {
    const parts = [];

    if (gapAnalysis.gaps.length > 0) {
        const topGaps = gapAnalysis.gaps.slice(0, 2).map(g => g.sector).join(' and ');
        parts.push(`Your portfolio is underweight in ${topGaps}.`);
    }

    if (recommendations.length > 0) {
        const topPick = recommendations[0];
        parts.push(`Top recommendation: ${topPick.tradingSymbol || topPick.symbol} (${topPick.sector}).`);
        parts.push(topPick.reasoning);
    }

    return parts.join(' ');
}

// ============================================
// QUICK SUGGESTIONS (No full analysis)
// ============================================

/**
 * Quick sector-based suggestions
 * @param {Array<{sector: string}>} holdings
 * @returns {Array<string>} - Suggested sectors
 */
export function getSuggestedSectors(holdings) {
    const { missingSectors } = analyzePortfolioGaps(holdings);

    // Prioritize defensive sectors if portfolio is volatile
    const defensiveMissing = missingSectors.filter(s => ['Pharma', 'FMCG', 'IT'].includes(s));
    const growthMissing = missingSectors.filter(s => ['Banking', 'NBFC', 'Auto'].includes(s));

    return {
        defensive: defensiveMissing,
        growth: growthMissing,
        all: missingSectors
    };
}

export default {
    calculateMomentumScore,
    calculateValueScore,
    calculateQualityScore,
    calculateLowVolScore,
    calculateCompositeScore,
    analyzePortfolioGaps,
    generateRecommendations,
    getSuggestedSectors,
    TARGET_ALLOCATION
};
