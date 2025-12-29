/**
 * Rebalancing Suggestions Engine
 * Compares current portfolio to optimal HRP allocation
 */

import { getAssetName } from '../../data/assetUniverse';

/**
 * Generate rebalancing suggestions
 * @param {Object[]} currentHoldings - Current portfolio with weights
 * @param {Object[]} optimalWeights - HRP optimal weights
 * @param {number} threshold - Minimum difference to trigger suggestion (default 3%)
 */
export function generateRebalancingSuggestions(currentHoldings, optimalWeights, threshold = 3) {
    // Create maps for easy lookup
    const currentMap = new Map(currentHoldings.map(h => [h.symbol, h.weight || 0]));
    const optimalMap = new Map(optimalWeights.map(w => [w.symbol, w.weight * 100]));

    const suggestions = [];
    const allSymbols = new Set([...currentMap.keys(), ...optimalMap.keys()]);

    allSymbols.forEach(symbol => {
        const current = currentMap.get(symbol) || 0;
        const optimal = optimalMap.get(symbol) || 0;
        const diff = optimal - current;

        if (Math.abs(diff) >= threshold) {
            suggestions.push({
                symbol,
                name: getAssetName(symbol),
                currentWeight: current,
                optimalWeight: optimal,
                difference: diff,
                action: diff > 0 ? 'BUY' : 'SELL',
                priority: Math.abs(diff) >= 10 ? 'high' : Math.abs(diff) >= 5 ? 'medium' : 'low',
            });
        }
    });

    // Sort by absolute difference (biggest changes first)
    return suggestions.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
}

/**
 * Calculate the number of trades needed
 */
export function countRequiredTrades(suggestions) {
    return {
        buys: suggestions.filter(s => s.action === 'BUY').length,
        sells: suggestions.filter(s => s.action === 'SELL').length,
        total: suggestions.length,
    };
}

/**
 * Estimate rebalancing impact
 */
export function estimateRebalancingImpact(currentHealth, suggestions) {
    // Estimate improvement based on suggestion severity
    let potentialImprovement = 0;

    suggestions.forEach(s => {
        if (s.priority === 'high') potentialImprovement += 5;
        else if (s.priority === 'medium') potentialImprovement += 2;
        else potentialImprovement += 1;
    });

    const newScore = Math.min(100, currentHealth.score + potentialImprovement);

    return {
        currentScore: currentHealth.score,
        projectedScore: newScore,
        improvement: newScore - currentHealth.score,
        riskReduction: `~${Math.round(potentialImprovement * 0.8)}%`,
    };
}

/**
 * Format suggestion for display
 */
export function formatSuggestion(suggestion) {
    const { symbol, name, action, currentWeight, optimalWeight, difference, priority } = suggestion;

    const arrow = action === 'BUY' ? '📈' : '📉';
    const actionText = action === 'BUY' ? 'Add' : 'Reduce';

    return {
        ...suggestion,
        displayText: `${arrow} ${actionText} ${name}`,
        detailText: `${currentWeight.toFixed(1)}% → ${optimalWeight.toFixed(1)}%`,
        changeText: `${difference > 0 ? '+' : ''}${difference.toFixed(1)}%`,
    };
}

/**
 * Group suggestions by action
 */
export function groupSuggestions(suggestions) {
    const buys = suggestions.filter(s => s.action === 'BUY').map(formatSuggestion);
    const sells = suggestions.filter(s => s.action === 'SELL').map(formatSuggestion);

    return { buys, sells };
}

/**
 * Generate rebalancing summary text
 */
export function generateSummaryText(suggestions, impact) {
    if (suggestions.length === 0) {
        return 'Your portfolio is well-balanced. No immediate rebalancing needed.';
    }

    const trades = countRequiredTrades(suggestions);
    const highPriority = suggestions.filter(s => s.priority === 'high').length;

    let summary = `Rebalancing requires ${trades.total} changes (${trades.buys} buys, ${trades.sells} sells). `;

    if (highPriority > 0) {
        summary += `${highPriority} high-priority adjustments recommended. `;
    }

    if (impact.improvement > 0) {
        summary += `Expected health score improvement: +${impact.improvement} points.`;
    }

    return summary;
}

/**
 * Calculate turnover (total weight being traded)
 */
export function calculateTurnover(suggestions) {
    return suggestions.reduce((sum, s) => sum + Math.abs(s.difference), 0) / 2;
}

/**
 * Get color for action
 */
export function getActionColor(action) {
    return action === 'BUY' ? 'var(--accent-green)' : 'var(--accent-red)';
}

/**
 * Get priority badge
 */
export function getPriorityBadge(priority) {
    switch (priority) {
        case 'high':
            return { text: 'HIGH', color: 'var(--accent-red)' };
        case 'medium':
            return { text: 'MED', color: 'var(--accent-yellow)' };
        default:
            return { text: 'LOW', color: 'var(--text-tertiary)' };
    }
}
