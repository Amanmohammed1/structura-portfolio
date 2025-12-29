/**
 * Portfolio Health Scoring Engine
 * Calculates a 0-100 health score based on diversification, concentration, and risk
 */

import { SECTOR_COLORS } from '../../data/assetUniverse';

/**
 * Calculate sector allocation from holdings
 */
export function calculateSectorAllocation(holdings) {
    const sectorWeights = {};
    const totalWeight = holdings.reduce((sum, h) => sum + (h.weight || 0), 0);

    holdings.forEach(h => {
        const sector = h.sector || 'Other';
        if (!sectorWeights[sector]) {
            sectorWeights[sector] = 0;
        }
        sectorWeights[sector] += (h.weight || 0) / totalWeight * 100;
    });

    return Object.entries(sectorWeights)
        .map(([sector, weight]) => ({ sector, weight, color: SECTOR_COLORS[sector] || '#666' }))
        .sort((a, b) => b.weight - a.weight);
}

/**
 * Calculate concentration risk (Herfindahl-Hirschman Index)
 * Lower is better diversified
 */
export function calculateConcentrationHHI(holdings) {
    const weights = holdings.map(h => h.weight || 0);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    if (totalWeight === 0) return 10000; // Max concentration

    const normalizedWeights = weights.map(w => w / totalWeight * 100);
    const hhi = normalizedWeights.reduce((sum, w) => sum + w * w, 0);

    return hhi; // 0-10000, where 10000 = single stock
}

/**
 * Find highly correlated pairs
 */
export function findCorrelatedPairs(correlationMatrix, symbols, threshold = 0.7) {
    const pairs = [];

    for (let i = 0; i < symbols.length; i++) {
        for (let j = i + 1; j < symbols.length; j++) {
            const corr = correlationMatrix[i]?.[j] || 0;
            if (Math.abs(corr) >= threshold) {
                pairs.push({
                    asset1: symbols[i],
                    asset2: symbols[j],
                    correlation: corr,
                    severity: Math.abs(corr) >= 0.9 ? 'high' : 'medium',
                });
            }
        }
    }

    return pairs.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
}

/**
 * Check for missing sectors (diversification gaps)
 */
export function findMissingSectors(holdings) {
    const importantSectors = ['Banking', 'IT', 'FMCG', 'Pharma', 'Energy', 'Auto'];
    const presentSectors = new Set(holdings.map(h => h.sector));

    return importantSectors.filter(s => !presentSectors.has(s));
}

/**
 * Calculate Portfolio Health Score (0-100)
 */
export function calculateHealthScore(holdings, correlationMatrix = null, symbols = []) {
    if (!holdings || holdings.length === 0) {
        return { score: 0, grade: 'N/A', issues: [], details: {} };
    }

    let score = 100;
    const issues = [];
    const details = {};

    // 1. Number of holdings (target: 10-25)
    const numHoldings = holdings.length;
    details.numHoldings = numHoldings;

    if (numHoldings < 5) {
        score -= 25;
        issues.push({
            type: 'concentration',
            severity: 'high',
            message: `Only ${numHoldings} stocks - extremely concentrated`,
            suggestion: 'Add more stocks for better diversification',
        });
    } else if (numHoldings < 10) {
        score -= 10;
        issues.push({
            type: 'concentration',
            severity: 'medium',
            message: `Only ${numHoldings} stocks - consider adding more`,
            suggestion: 'Target 10-15 stocks for better diversification',
        });
    } else if (numHoldings > 30) {
        score -= 5;
        issues.push({
            type: 'over-diversified',
            severity: 'low',
            message: `${numHoldings} stocks may be over-diversified`,
            suggestion: 'Consider consolidating to 15-25 high-conviction picks',
        });
    }

    // 2. Concentration risk (top 3 holdings)
    const sortedByWeight = [...holdings].sort((a, b) => (b.weight || 0) - (a.weight || 0));
    const top3Weight = sortedByWeight.slice(0, 3).reduce((sum, h) => sum + (h.weight || 0), 0);
    details.top3Concentration = top3Weight;

    if (top3Weight > 60) {
        score -= 20;
        issues.push({
            type: 'concentration',
            severity: 'high',
            message: `Top 3 holdings = ${top3Weight.toFixed(1)}% (too concentrated)`,
            suggestion: 'Reduce positions in largest holdings',
        });
    } else if (top3Weight > 45) {
        score -= 10;
        issues.push({
            type: 'concentration',
            severity: 'medium',
            message: `Top 3 holdings = ${top3Weight.toFixed(1)}%`,
            suggestion: 'Consider reducing concentration slightly',
        });
    }

    // 2b. Single stock concentration check (any stock > 20% is a red flag)
    const topHolding = sortedByWeight[0];
    if (topHolding && (topHolding.weight || 0) > 25) {
        score -= 15;
        issues.push({
            type: 'concentration',
            severity: 'high',
            message: `${topHolding.name || topHolding.symbol} = ${topHolding.weight?.toFixed(1)}% (over-concentrated)`,
            suggestion: 'No single stock should exceed 20-25% of portfolio',
        });
    } else if (topHolding && (topHolding.weight || 0) > 18) {
        score -= 8;
        issues.push({
            type: 'concentration',
            severity: 'medium',
            message: `${topHolding.name || topHolding.symbol} = ${topHolding.weight?.toFixed(1)}%`,
            suggestion: 'Consider reducing largest position',
        });
    }

    // 3. Sector concentration
    const sectorAllocation = calculateSectorAllocation(holdings);
    const topSector = sectorAllocation[0];
    details.topSector = topSector;

    if (topSector && topSector.weight > 40) {
        score -= 15;
        issues.push({
            type: 'sector',
            severity: 'high',
            message: `${topSector.sector} sector = ${topSector.weight.toFixed(1)}% (over-weighted)`,
            suggestion: `Reduce ${topSector.sector} exposure and diversify`,
        });
    } else if (topSector && topSector.weight > 30) {
        score -= 8;
        issues.push({
            type: 'sector',
            severity: 'medium',
            message: `${topSector.sector} sector = ${topSector.weight.toFixed(1)}%`,
            suggestion: `Consider reducing ${topSector.sector} concentration`,
        });
    }

    // 4. Missing important sectors
    const missingSectors = findMissingSectors(holdings);
    details.missingSectors = missingSectors;

    if (missingSectors.length >= 4) {
        score -= 10;
        issues.push({
            type: 'diversification',
            severity: 'medium',
            message: `Missing sectors: ${missingSectors.join(', ')}`,
            suggestion: 'Add exposure to missing sectors for better diversification',
        });
    }

    // 5. Correlation risk (if matrix available)
    if (correlationMatrix && symbols.length > 0) {
        const correlatedPairs = findCorrelatedPairs(correlationMatrix, symbols, 0.8);
        details.correlatedPairs = correlatedPairs;

        if (correlatedPairs.length > 5) {
            score -= 15;
            issues.push({
                type: 'correlation',
                severity: 'high',
                message: `${correlatedPairs.length} highly correlated pairs detected`,
                suggestion: 'Reduce overlapping positions - they move together',
            });
        } else if (correlatedPairs.length > 2) {
            score -= 8;
            issues.push({
                type: 'correlation',
                severity: 'medium',
                message: `${correlatedPairs.length} correlated pairs: ${correlatedPairs.slice(0, 2).map(p => `${p.asset1}↔${p.asset2}`).join(', ')}`,
                suggestion: 'Consider reducing one stock from each correlated pair',
            });
        }
    }

    // Ensure score is within bounds
    score = Math.max(0, Math.min(100, score));

    // Determine grade
    let grade;
    if (score >= 80) grade = 'A';
    else if (score >= 70) grade = 'B';
    else if (score >= 60) grade = 'C';
    else if (score >= 50) grade = 'D';
    else grade = 'F';

    return {
        score: Math.round(score),
        grade,
        issues: issues.sort((a, b) => {
            const severityOrder = { high: 0, medium: 1, low: 2 };
            return severityOrder[a.severity] - severityOrder[b.severity];
        }),
        details,
        sectorAllocation,
    };
}

/**
 * Get health score color
 */
export function getHealthColor(score) {
    if (score >= 80) return 'var(--accent-green)';
    if (score >= 60) return 'var(--accent-yellow)';
    if (score >= 40) return 'var(--accent-orange)';
    return 'var(--accent-red)';
}

/**
 * Get health emoji
 */
export function getHealthEmoji(score) {
    if (score >= 80) return '🟢';
    if (score >= 60) return '🟡';
    if (score >= 40) return '🟠';
    return '🔴';
}
