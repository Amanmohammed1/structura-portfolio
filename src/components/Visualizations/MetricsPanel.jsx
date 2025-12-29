import './Visualizations.css';

// Metric tooltips
const METRIC_TOOLTIPS = {
    'Total Return': 'Total cumulative return over the period',
    'CAGR': 'Compound Annual Growth Rate',
    'Volatility': 'Annualized standard deviation of returns',
    'Sharpe Ratio': 'Risk-adjusted return (excess return / volatility)',
    'Sortino Ratio': 'Downside risk-adjusted return',
    'Max Drawdown': 'Largest peak-to-trough decline',
    'Calmar Ratio': 'CAGR divided by Max Drawdown',
};

/**
 * Metrics Panel component
 * Displays key portfolio performance metrics
 */
export function MetricsPanel({ metrics, strategyName = 'HRP' }) {
    if (!metrics || metrics.length === 0) {
        return (
            <div className="viz-placeholder">
                <span className="terminal-loader">Waiting for data</span>
            </div>
        );
    }

    return (
        <div className="metrics-panel">
            {metrics.map(metric => (
                <div
                    key={metric.name}
                    className="metric-item"
                    data-tooltip={METRIC_TOOLTIPS[metric.name]}
                >
                    <div className="label">{metric.name}</div>
                    <div className={`value ${metric.isNeutral ? 'neutral' :
                            metric.isPositive ? 'positive' :
                                metric.isNegative ? 'negative' : ''
                        }`}>
                        {metric.value}
                    </div>
                </div>
            ))}
        </div>
    );
}

/**
 * Strategy Comparison component
 * Compares metrics across multiple strategies
 */
export function StrategyComparison({ strategies }) {
    if (!strategies || strategies.length === 0) {
        return (
            <div className="viz-placeholder">
                <span className="terminal-loader">Waiting for data</span>
            </div>
        );
    }

    const metricNames = [
        { key: 'totalReturn', label: 'Total Return', suffix: '%', highlight: 'max' },
        { key: 'cagr', label: 'CAGR', suffix: '%', highlight: 'max' },
        { key: 'volatility', label: 'Volatility', suffix: '%', highlight: 'min' },
        { key: 'sharpeRatio', label: 'Sharpe', suffix: '', highlight: 'max' },
        { key: 'maxDrawdown', label: 'Max DD', suffix: '%', highlight: 'min' },
    ];

    const getBestValue = (key, highlight) => {
        const values = strategies.map(s => s[key]);
        return highlight === 'max' ? Math.max(...values) : Math.min(...values);
    };

    return (
        <div className="weights-table-container">
            <table className="weights-table">
                <thead>
                    <tr>
                        <th>Metric</th>
                        {strategies.map(s => (
                            <th key={s.name} style={{
                                color: s.name === 'HRP' ? 'var(--accent-green)' : 'var(--text-tertiary)'
                            }}>
                                {s.name}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {metricNames.map(({ key, label, suffix, highlight }) => {
                        const best = getBestValue(key, highlight);
                        return (
                            <tr key={key}>
                                <td style={{ color: 'var(--text-tertiary)' }}>{label}</td>
                                {strategies.map(s => {
                                    const value = s[key];
                                    const isBest = value === best;
                                    return (
                                        <td
                                            key={s.name}
                                            style={{
                                                color: isBest ? 'var(--accent-green)' : 'var(--text-secondary)',
                                                fontWeight: isBest ? 600 : 400,
                                            }}
                                        >
                                            {value.toFixed(2)}{suffix}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default MetricsPanel;
