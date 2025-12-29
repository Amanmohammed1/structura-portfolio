import { useState, useMemo } from 'react';
import { ASSET_PRESETS, getAllAssets, SECTOR_COLORS } from '../../data/assetUniverse';
import './Dashboard.css';

/**
 * Sidebar component with asset selection and presets
 */
export function Sidebar({
    selectedAssets,
    onSelectAssets,
    dateRange,
    onDateRangeChange,
    onAnalyze,
    analyzing,
    savedPortfolios,
    onLoadPortfolio,
    onSavePortfolio,
    onDeletePortfolio,
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [showSaved, setShowSaved] = useState(false);
    const [saveName, setSaveName] = useState('');
    const [showSaveModal, setShowSaveModal] = useState(false);

    const allAssets = useMemo(() => getAllAssets(), []);

    const filteredAssets = useMemo(() => {
        if (!searchQuery.trim()) return allAssets;
        const query = searchQuery.toLowerCase();
        return allAssets.filter(
            a => a.symbol.toLowerCase().includes(query) ||
                a.name.toLowerCase().includes(query) ||
                a.sector.toLowerCase().includes(query)
        );
    }, [allAssets, searchQuery]);

    const handlePresetClick = (presetKey) => {
        const preset = ASSET_PRESETS[presetKey];
        if (preset) {
            onSelectAssets(preset.assets.map(a => a.symbol));
        }
    };

    const handleAssetToggle = (symbol) => {
        if (selectedAssets.includes(symbol)) {
            onSelectAssets(selectedAssets.filter(s => s !== symbol));
        } else {
            onSelectAssets([...selectedAssets, symbol]);
        }
    };

    const handleSave = () => {
        if (saveName.trim()) {
            onSavePortfolio(saveName.trim());
            setSaveName('');
            setShowSaveModal(false);
        }
    };

    const dateRanges = [
        { label: '1Y', value: '1y' },
        { label: '3Y', value: '3y' },
        { label: '5Y', value: '5y' },
        { label: 'Max', value: 'full' },
    ];

    return (
        <aside className="sidebar">
            {/* Logo */}
            <div className="sidebar-header">
                <h1 className="logo">
                    <span className="logo-icon">◈</span>
                    STRUCTURA
                </h1>
                <p className="logo-subtitle">HRP Portfolio Engine</p>
            </div>

            {/* Presets */}
            <div className="sidebar-section">
                <h3 className="section-title">Quick Presets</h3>
                <div className="preset-buttons">
                    {Object.entries(ASSET_PRESETS).map(([key, preset]) => (
                        <button
                            key={key}
                            className="preset-btn"
                            onClick={() => handlePresetClick(key)}
                            title={preset.description}
                        >
                            {preset.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Asset Search */}
            <div className="sidebar-section">
                <h3 className="section-title">
                    Assets
                    <span className="count-badge">{selectedAssets.length}</span>
                </h3>
                <input
                    type="search"
                    placeholder="Search symbols, names..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="asset-search"
                />
                <div className="asset-list">
                    {filteredAssets.map(asset => (
                        <label key={asset.symbol} className="asset-item">
                            <input
                                type="checkbox"
                                checked={selectedAssets.includes(asset.symbol)}
                                onChange={() => handleAssetToggle(asset.symbol)}
                            />
                            <span className="asset-symbol">{asset.symbol.replace('.BSE', '')}</span>
                            <span
                                className="asset-sector"
                                style={{ color: SECTOR_COLORS[asset.sector] }}
                            >
                                {asset.sector}
                            </span>
                        </label>
                    ))}
                </div>
                {selectedAssets.length > 0 && (
                    <button
                        className="btn btn-ghost w-full text-xs"
                        onClick={() => onSelectAssets([])}
                    >
                        Clear All
                    </button>
                )}
            </div>

            {/* Date Range */}
            <div className="sidebar-section">
                <h3 className="section-title">Date Range</h3>
                <div className="date-range-buttons">
                    {dateRanges.map(({ label, value }) => (
                        <button
                            key={value}
                            className={`date-btn ${dateRange === value ? 'active' : ''}`}
                            onClick={() => onDateRangeChange(value)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Analyze Button */}
            <div className="sidebar-section">
                <button
                    className="btn btn-primary w-full analyze-btn"
                    disabled={selectedAssets.length < 2 || analyzing}
                    onClick={onAnalyze}
                >
                    {analyzing ? (
                        <span className="terminal-loader">Analyzing</span>
                    ) : (
                        <>Run Analysis</>
                    )}
                </button>
                {selectedAssets.length < 2 && (
                    <p className="hint text-xs text-muted">Select at least 2 assets</p>
                )}
            </div>

            {/* Portfolio Management */}
            <div className="sidebar-section">
                <div className="flex justify-between items-center">
                    <h3 className="section-title">Portfolios</h3>
                    <button
                        className="btn btn-ghost text-xs"
                        onClick={() => setShowSaved(!showSaved)}
                    >
                        {showSaved ? 'Hide' : 'Show'}
                    </button>
                </div>

                {showSaved && (
                    <>
                        <button
                            className="btn w-full"
                            onClick={() => setShowSaveModal(true)}
                            disabled={selectedAssets.length < 2}
                        >
                            Save Current
                        </button>

                        {savedPortfolios && savedPortfolios.length > 0 ? (
                            <div className="saved-list">
                                {savedPortfolios.map(p => (
                                    <div key={p.id} className="saved-item">
                                        <button
                                            className="saved-name"
                                            onClick={() => onLoadPortfolio(p)}
                                        >
                                            {p.name}
                                        </button>
                                        <button
                                            className="delete-btn"
                                            onClick={() => onDeletePortfolio(p.id)}
                                            title="Delete"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-muted p-sm">No saved portfolios</p>
                        )}
                    </>
                )}
            </div>

            {/* Save Modal */}
            {showSaveModal && (
                <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h3>Save Portfolio</h3>
                        <input
                            type="text"
                            placeholder="Portfolio name"
                            value={saveName}
                            onChange={(e) => setSaveName(e.target.value)}
                            autoFocus
                        />
                        <div className="modal-actions">
                            <button className="btn" onClick={() => setShowSaveModal(false)}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSave}
                                disabled={!saveName.trim()}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}

export default Sidebar;
