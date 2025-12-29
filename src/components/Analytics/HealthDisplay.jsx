import { getHealthColor, getHealthEmoji } from '../../lib/analytics/portfolioHealth';
import { getActionColor, getPriorityBadge } from '../../lib/analytics/rebalancing';
import { ScoreDial, HoloBadge, SparkLine } from '../PremiumUI';
import '../Visualizations/Visualizations.css';

/**
 * Premium Portfolio Health Score Display
 * Uses cutting-edge ScoreDial with animated glow effects
 */
export function HealthScore({ health }) {
    if (!health) return null;

    const { score, grade, issues, sectorAllocation } = health;

    // Severity icon mapper
    const getSeverityBadge = (severity) => {
        switch (severity) {
            case 'high': return { variant: 'danger', icon: '●' };
            case 'medium': return { variant: 'warning', icon: '●' };
            default: return { variant: 'success', icon: '●' };
        }
    };

    return (
        <div className="health-score-container premium">
            <div className="health-score-main">
                <ScoreDial
                    score={score}
                    max={100}
                    label={`Grade ${grade}`}
                />
                <div className="score-info">
                    <div className="score-description">
                        {score >= 80 && '✨ Well-diversified portfolio'}
                        {score >= 60 && score < 80 && '📊 Some improvements needed'}
                        {score >= 40 && score < 60 && '⚡ Moderate risk detected'}
                        {score < 40 && '🔥 High risk - needs attention'}
                    </div>
                </div>
            </div>

            {issues.length > 0 && (
                <div className="health-issues premium">
                    <h4>Issues Found</h4>
                    {issues.map((issue, i) => {
                        const badge = getSeverityBadge(issue.severity);
                        return (
                            <div key={i} className={`issue-item issue-${issue.severity} glass-effect`}>
                                <HoloBadge variant={badge.variant}>
                                    {badge.icon} {issue.severity.toUpperCase()}
                                </HoloBadge>
                                <div className="issue-content">
                                    <div className="issue-message">{issue.message}</div>
                                    <div className="issue-suggestion">{issue.suggestion}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {sectorAllocation && sectorAllocation.length > 0 && (
                <div className="sector-breakdown premium">
                    <h4>Sector Allocation</h4>
                    <div className="sector-bars">
                        {sectorAllocation.slice(0, 6).map(s => (
                            <div key={s.sector} className="sector-bar-item">
                                <div className="sector-bar-label">
                                    <span>{s.sector}</span>
                                    <span className="sector-weight">{s.weight.toFixed(1)}%</span>
                                </div>
                                <div className="sector-bar-track">
                                    <div
                                        className="sector-bar-fill animated"
                                        style={{
                                            width: `${Math.min(s.weight, 100)}%`,
                                            background: `linear-gradient(90deg, ${s.color}, ${s.color}88)`,
                                            boxShadow: `0 0 10px ${s.color}40`,
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Rebalancing Suggestions Display
 */
export function RebalancingSuggestions({ suggestions, summary, impact }) {
    if (!suggestions || suggestions.length === 0) {
        return (
            <div className="rebalancing-empty">
                <span className="check-icon">✓</span>
                <p>Your portfolio is well-balanced. No rebalancing needed.</p>
            </div>
        );
    }

    const buys = suggestions.filter(s => s.action === 'BUY');
    const sells = suggestions.filter(s => s.action === 'SELL');

    return (
        <div className="rebalancing-container">
            {impact && (
                <div className="rebalancing-impact">
                    <div className="impact-item">
                        <span className="impact-label">Current Score</span>
                        <span className="impact-value">{impact.currentScore}</span>
                    </div>
                    <span className="impact-arrow">→</span>
                    <div className="impact-item">
                        <span className="impact-label">After Rebalance</span>
                        <span className="impact-value positive">{impact.projectedScore}</span>
                    </div>
                    <div className="impact-item">
                        <span className="impact-label">Improvement</span>
                        <span className="impact-value positive">+{impact.improvement}</span>
                    </div>
                </div>
            )}

            <div className="rebalancing-actions">
                {sells.length > 0 && (
                    <div className="action-section">
                        <h4>📉 Reduce Positions</h4>
                        <div className="action-list">
                            {sells.map(s => (
                                <SuggestionCard key={s.symbol} suggestion={s} />
                            ))}
                        </div>
                    </div>
                )}

                {buys.length > 0 && (
                    <div className="action-section">
                        <h4>📈 Add Positions</h4>
                        <div className="action-list">
                            {buys.map(s => (
                                <SuggestionCard key={s.symbol} suggestion={s} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {summary && <p className="rebalancing-summary">{summary}</p>}
        </div>
    );
}

function SuggestionCard({ suggestion }) {
    const { name, currentWeight, optimalWeight, difference, priority } = suggestion;
    const color = getActionColor(suggestion.action);
    const badge = getPriorityBadge(priority);

    return (
        <div className="suggestion-card">
            <div className="suggestion-name">{name}</div>
            <div className="suggestion-weights">
                <span className="current-weight">{currentWeight.toFixed(1)}%</span>
                <span className="weight-arrow">→</span>
                <span className="optimal-weight" style={{ color }}>{optimalWeight.toFixed(1)}%</span>
            </div>
            <div className="suggestion-change" style={{ color }}>
                {difference > 0 ? '+' : ''}{difference.toFixed(1)}%
            </div>
            <span className="priority-badge" style={{ background: badge.color }}>
                {badge.text}
            </span>
        </div>
    );
}

export default { HealthScore, RebalancingSuggestions };
