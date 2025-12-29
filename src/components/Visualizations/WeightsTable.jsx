import './Visualizations.css';

/**
 * Weights Table component
 * Displays portfolio weights with visual bars
 */
export function WeightsTable({ weights, onExport }) {
    if (!weights || weights.length === 0) {
        return (
            <div className="viz-placeholder">
                <span className="terminal-loader">Waiting for data</span>
            </div>
        );
    }

    const maxWeight = Math.max(...weights.map(w => w.weight));

    const handleExportCSV = () => {
        const csv = [
            ['Symbol', 'Weight %'],
            ...weights.map(w => [w.symbol, w.percentage])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hrp_weights_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        onExport?.();
    };

    return (
        <div className="weights-table-container">
            <div className="flex justify-between items-center p-md">
                <span className="text-xs text-muted uppercase tracking-wide">
                    {weights.length} Assets
                </span>
                <button
                    className="btn btn-ghost text-xs"
                    onClick={handleExportCSV}
                >
                    Export CSV
                </button>
            </div>
            <table className="weights-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Symbol</th>
                        <th>Weight</th>
                    </tr>
                </thead>
                <tbody>
                    {weights.map((w, i) => (
                        <tr key={w.symbol}>
                            <td style={{ color: 'var(--text-tertiary)' }}>{i + 1}</td>
                            <td>
                                <span style={{ color: 'var(--accent-cyan)' }}>
                                    {w.symbol.replace('.BSE', '')}
                                </span>
                            </td>
                            <td>
                                <div className="weight-bar">
                                    <div
                                        className="weight-bar-fill"
                                        style={{ width: `${(w.weight / maxWeight) * 100}px` }}
                                    />
                                    <span className="weight-value">{w.percentage}</span>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default WeightsTable;
