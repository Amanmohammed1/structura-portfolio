/**
 * Portfolio Stress Testing & Scenario Analysis
 * 
 * Forward-looking risk assessment:
 * - Sector crash scenarios
 * - Historical crash simulation
 * - VaR (Value at Risk)
 * - Interest rate sensitivity
 */

// ============================================
// SECTOR SENSITIVITY
// How much would portfolio drop if a sector crashes?
// ============================================

// Sector beta coefficients (how much each sector moves with NIFTY)
const SECTOR_BETAS = {
    'Banking': 1.3,
    'NBFC': 1.2,
    'IT': 0.9,
    'Auto': 1.1,
    'Pharma': 0.7,
    'FMCG': 0.6,
    'Metals': 1.4,
    'Energy': 1.0,
    'Telecom': 0.8,
    'Infra': 1.2,
    'Insurance': 0.9,
    'Defense': 0.8,
    'Cement': 1.1,
    'Chemicals': 1.0,
    'Other': 1.0
};

// Sector correlations (simplified - how correlated sectors are to each other)
const SECTOR_CORRELATIONS = {
    'Banking-NBFC': 0.85,
    'Banking-Insurance': 0.70,
    'IT-Pharma': 0.30,
    'Auto-Metals': 0.55,
    'FMCG-Pharma': 0.40,
    'Energy-Metals': 0.50,
};

/**
 * Calculate sector concentration risk
 * @param {Array<{symbol: string, sector: string, weight: number}>} holdings
 * @returns {Object} - Sector breakdown and concentration metrics
 */
export function calculateSectorConcentration(holdings) {
    const sectorWeights = {};
    let totalWeight = 0;

    holdings.forEach(h => {
        const sector = h.sector || 'Other';
        sectorWeights[sector] = (sectorWeights[sector] || 0) + (h.weight || 0);
        totalWeight += h.weight || 0;
    });

    // Normalize weights
    if (totalWeight > 0) {
        Object.keys(sectorWeights).forEach(s => {
            sectorWeights[s] = (sectorWeights[s] / totalWeight) * 100;
        });
    }

    // Herfindahl-Hirschman Index (concentration measure)
    // Higher = more concentrated
    const hhi = Object.values(sectorWeights).reduce((sum, w) => sum + (w * w), 0);

    // Equivalent number of sectors (1/HHI normalized)
    const equivalentSectors = 10000 / hhi;

    // Find dominant sector
    const sortedSectors = Object.entries(sectorWeights)
        .sort(([, a], [, b]) => b - a);

    return {
        sectorWeights,
        sortedSectors,
        topSector: sortedSectors[0] || ['None', 0],
        hhi,
        equivalentSectors,
        concentrationRisk: hhi > 2500 ? 'HIGH' : hhi > 1500 ? 'MODERATE' : 'LOW',
        recommendations: generateConcentrationRecommendations(sectorWeights)
    };
}

/**
 * Generate recommendations based on sector concentration
 */
function generateConcentrationRecommendations(sectorWeights) {
    const recommendations = [];
    const sorted = Object.entries(sectorWeights).sort(([, a], [, b]) => b - a);

    // Check for over-concentration
    sorted.forEach(([sector, weight]) => {
        if (weight > 40) {
            recommendations.push({
                type: 'WARNING',
                message: `${sector} sector is ${weight.toFixed(1)}% of portfolio - extremely concentrated`,
                suggestion: `Consider reducing ${sector} exposure below 25%`
            });
        } else if (weight > 25) {
            recommendations.push({
                type: 'CAUTION',
                message: `${sector} sector is ${weight.toFixed(1)}% of portfolio`,
                suggestion: `Consider diversifying into defensive sectors like Pharma/FMCG`
            });
        }
    });

    // Check for missing defensive sectors
    const defensiveSectors = ['Pharma', 'FMCG', 'IT'];
    const hasDefensive = defensiveSectors.some(s => (sectorWeights[s] || 0) > 5);

    if (!hasDefensive) {
        recommendations.push({
            type: 'SUGGESTION',
            message: 'No defensive sector exposure',
            suggestion: 'Consider adding Pharma, FMCG, or IT stocks for downside protection'
        });
    }

    return recommendations;
}

// ============================================
// STRESS TEST SCENARIOS
// ============================================

/**
 * Run stress tests on portfolio
 * @param {Array<{symbol: string, sector: string, weight: number, currentValue: number}>} holdings
 * @returns {Array<Object>} - Scenario results
 */
export function runStressTests(holdings) {
    const scenarios = [
        {
            name: 'Banking Sector Crash (-20%)',
            description: 'Banking & NBFC sectors fall 20%, others follow based on correlation',
            affectedSectors: { 'Banking': -20, 'NBFC': -18, 'Insurance': -10 }
        },
        {
            name: 'IT Sector Correction (-15%)',
            description: 'Global tech selloff affects IT sector',
            affectedSectors: { 'IT': -15 }
        },
        {
            name: 'Interest Rate Hike (RBI +0.5%)',
            description: 'Rate-sensitive sectors decline',
            affectedSectors: { 'Banking': -5, 'NBFC': -8, 'Auto': -7, 'Infra': -6 }
        },
        {
            name: 'Rupee Depreciation (-5%)',
            description: 'Rupee weakens, impacts importers',
            affectedSectors: { 'Auto': -8, 'Oil': -10, 'Pharma': 5, 'IT': 7 }
        },
        {
            name: 'Global Recession',
            description: 'Broad market decline, defensive sectors resilient',
            affectedSectors: {
                'Banking': -25, 'NBFC': -30, 'Auto': -20, 'Metals': -25,
                'IT': -15, 'Pharma': -5, 'FMCG': -8
            }
        },
        {
            name: 'Market Crash (2008-style)',
            description: 'Severe bear market (-40% NIFTY)',
            affectedSectors: Object.fromEntries(
                Object.keys(SECTOR_BETAS).map(s => [s, -40 * SECTOR_BETAS[s]])
            )
        },
        {
            name: 'COVID Crash (March 2020)',
            description: 'Panic selling, quick recovery scenario',
            affectedSectors: {
                'Banking': -35, 'NBFC': -40, 'Auto': -30, 'Telecom': -25,
                'Pharma': -15, 'FMCG': -20, 'IT': -25, 'Metals': -35
            }
        }
    ];

    return scenarios.map(scenario => {
        let portfolioImpact = 0;
        const stockImpacts = [];

        holdings.forEach(h => {
            const sectorDrop = scenario.affectedSectors[h.sector] || 0;
            const stockDrop = sectorDrop; // Simplified: stock moves with sector
            const impactValue = (h.currentValue || 0) * (stockDrop / 100);

            portfolioImpact += impactValue;

            if (stockDrop !== 0) {
                stockImpacts.push({
                    symbol: h.symbol,
                    sector: h.sector,
                    impact: stockDrop,
                    valueChange: impactValue
                });
            }
        });

        const totalValue = holdings.reduce((sum, h) => sum + (h.currentValue || 0), 0);
        const portfolioDropPercent = totalValue > 0 ? (portfolioImpact / totalValue) * 100 : 0;

        return {
            ...scenario,
            portfolioImpact,
            portfolioDropPercent,
            stockImpacts: stockImpacts.sort((a, b) => a.impact - b.impact),
            severity: Math.abs(portfolioDropPercent) > 20 ? 'SEVERE' :
                Math.abs(portfolioDropPercent) > 10 ? 'SIGNIFICANT' : 'MODERATE'
        };
    });
}

// ============================================
// VALUE AT RISK (VaR)
// ============================================

/**
 * Calculate Value at Risk (VaR)
 * @param {Array<{returns: number[]}>} stockReturns - Daily returns for each stock
 * @param {number[]} weights - Portfolio weights
 * @param {number} confidence - Confidence level (0.95 or 0.99)
 * @param {number} portfolioValue - Current portfolio value
 * @returns {Object} - VaR metrics
 */
export function calculateVaR(stockReturns, weights, confidence = 0.95, portfolioValue = 100000) {
    // Calculate portfolio daily returns
    const numDays = stockReturns[0]?.returns?.length || 0;
    if (numDays === 0 || !weights.length) {
        return { dailyVaR: 0, weeklyVaR: 0, monthlyVaR: 0 };
    }

    const portfolioReturns = [];
    for (let i = 0; i < numDays; i++) {
        let dayReturn = 0;
        for (let j = 0; j < stockReturns.length; j++) {
            dayReturn += (weights[j] || 0) * (stockReturns[j]?.returns?.[i] || 0);
        }
        portfolioReturns.push(dayReturn);
    }

    // Sort returns
    const sortedReturns = [...portfolioReturns].sort((a, b) => a - b);

    // Find percentile
    const alpha = 1 - confidence;
    const index = Math.floor(alpha * sortedReturns.length);
    const dailyVaRPercent = Math.abs(sortedReturns[index] || 0);

    // Calculate VaR in rupees
    const dailyVaR = portfolioValue * dailyVaRPercent;
    const weeklyVaR = dailyVaR * Math.sqrt(5);  // Scale by sqrt of time
    const monthlyVaR = dailyVaR * Math.sqrt(21);

    // Portfolio volatility
    const mean = portfolioReturns.reduce((s, r) => s + r, 0) / portfolioReturns.length;
    const variance = portfolioReturns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / (portfolioReturns.length - 1);
    const dailyVol = Math.sqrt(variance);
    const annualVol = dailyVol * Math.sqrt(252);

    return {
        dailyVaRPercent: dailyVaRPercent * 100,
        dailyVaR,
        weeklyVaR,
        monthlyVaR,
        dailyVolatility: dailyVol * 100,
        annualVolatility: annualVol * 100,
        confidence,
        interpretation: `At ${confidence * 100}% confidence, your portfolio won't lose more than ₹${dailyVaR.toFixed(0)} in a single day.`
    };
}

// ============================================
// HISTORICAL CRASH SIMULATION
// ============================================

const HISTORICAL_CRASHES = [
    {
        name: 'COVID Crash',
        period: 'Feb 19 - Mar 23, 2020',
        niftyReturn: -38.1,
        duration: 33, // trading days
        recovery: 140 // days to recover
    },
    {
        name: '2008 Global Financial Crisis',
        period: 'Jan 8 - Nov 21, 2008',
        niftyReturn: -59.3,
        duration: 220,
        recovery: 812
    },
    {
        name: 'Demonetization Fall',
        period: 'Nov 8 - Nov 21, 2016',
        niftyReturn: -6.3,
        duration: 10,
        recovery: 45
    },
    {
        name: 'Greece Debt Crisis',
        period: 'Jul 15 - Aug 24, 2015',
        niftyReturn: -11.2,
        duration: 28,
        recovery: 180
    }
];

/**
 * Simulate historical crashes on current portfolio
 * @param {Array<{sector: string, weight: number, currentValue: number}>} holdings
 * @returns {Array<Object>} - Crash impact simulations
 */
export function simulateHistoricalCrashes(holdings) {
    const totalValue = holdings.reduce((sum, h) => sum + (h.currentValue || 0), 0);

    // Calculate weighted beta
    let portfolioBeta = 0;
    holdings.forEach(h => {
        const sectorBeta = SECTOR_BETAS[h.sector] || 1.0;
        portfolioBeta += (h.weight / 100) * sectorBeta;
    });

    return HISTORICAL_CRASHES.map(crash => {
        // Portfolio impact is crash * beta
        const portfolioReturn = crash.niftyReturn * portfolioBeta;
        const portfolioLoss = totalValue * (portfolioReturn / 100);

        return {
            ...crash,
            portfolioBeta,
            estimatedPortfolioReturn: portfolioReturn,
            estimatedLoss: portfolioLoss,
            betterThanNifty: portfolioReturn > crash.niftyReturn,
            interpretation: portfolioReturn > crash.niftyReturn
                ? `Your portfolio would likely fall ${Math.abs(portfolioReturn).toFixed(1)}% (less than NIFTY's ${Math.abs(crash.niftyReturn)}%)`
                : `Your portfolio would likely fall ${Math.abs(portfolioReturn).toFixed(1)}% (more than NIFTY's ${Math.abs(crash.niftyReturn)}%)`
        };
    });
}

// ============================================
// WHAT-IF ANALYSIS
// ============================================

/**
 * Analyze impact of adding a new stock to portfolio
 * @param {Array<Object>} currentHoldings
 * @param {{symbol: string, sector: string, amount: number, volatility: number}} newStock
 * @returns {Object} - Impact analysis
 */
export function analyzeNewStockImpact(currentHoldings, newStock) {
    const currentTotal = currentHoldings.reduce((s, h) => s + (h.currentValue || 0), 0);
    const newTotal = currentTotal + newStock.amount;

    // New sector weights
    const oldSectorConc = calculateSectorConcentration(currentHoldings);

    const newHoldings = [
        ...currentHoldings.map(h => ({
            ...h,
            weight: ((h.currentValue || 0) / newTotal) * 100
        })),
        {
            symbol: newStock.symbol,
            sector: newStock.sector,
            weight: (newStock.amount / newTotal) * 100,
            currentValue: newStock.amount
        }
    ];

    const newSectorConc = calculateSectorConcentration(newHoldings);

    // Check diversification impact
    const diversificationImprovement = oldSectorConc.hhi > newSectorConc.hhi;

    return {
        currentTotal,
        newTotal,
        newStockWeight: (newStock.amount / newTotal) * 100,
        oldConcentration: oldSectorConc,
        newConcentration: newSectorConc,
        diversificationImprovement,
        hhiChange: newSectorConc.hhi - oldSectorConc.hhi,
        recommendation: diversificationImprovement
            ? `Adding ${newStock.symbol} would improve diversification (HHI: ${oldSectorConc.hhi.toFixed(0)} → ${newSectorConc.hhi.toFixed(0)})`
            : `Adding ${newStock.symbol} would increase concentration in ${newStock.sector}`
    };
}

export default {
    calculateSectorConcentration,
    runStressTests,
    calculateVaR,
    simulateHistoricalCrashes,
    analyzeNewStockImpact,
    SECTOR_BETAS,
    HISTORICAL_CRASHES
};
