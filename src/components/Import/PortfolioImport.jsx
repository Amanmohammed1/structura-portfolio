import { useState, useEffect, useCallback } from 'react';
import { getDemoPortfolioOptions, getDemoPortfolio, fetchDemoPortfolios } from '../../data/demoPortfolios';
import { getSector } from '../../data/assetUniverse';
import { supabase } from '../../config/supabase';
import './Import.css';

export function PortfolioImport({ onImport, onClose }) {
    const [activeTab, setActiveTab] = useState('demo');
    const [manualHoldings, setManualHoldings] = useState([{ symbol: '', quantity: '', avgPrice: '' }]);
    const [focusedRow, setFocusedRow] = useState(-1);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

    // State for async portfolio loading
    const [demoOptions, setDemoOptions] = useState(getDemoPortfolioOptions());
    const [loadingPortfolios, setLoadingPortfolios] = useState(true);

    // Fetch portfolios on mount
    useEffect(() => {
        const loadPortfolios = async () => {
            setLoadingPortfolios(true);
            try {
                await fetchDemoPortfolios();
                setDemoOptions(getDemoPortfolioOptions());
            } catch (err) {
                console.error('Failed to load portfolios:', err);
            } finally {
                setLoadingPortfolios(false);
            }
        };
        loadPortfolios();
    }, []);

    // Fetch stock suggestions from database
    const fetchSuggestions = useCallback(async (query) => {
        if (!query || query.length < 1) {
            setSuggestions([]);
            return;
        }

        setLoadingSuggestions(true);
        try {
            const { data, error } = await supabase
                .from('stock_master')
                .select('symbol, trading_symbol, name, sector, is_nifty50')
                .or(`trading_symbol.ilike.%${query}%,name.ilike.%${query}%`)
                .eq('is_active', true)
                .order('is_nifty50', { ascending: false })
                .limit(10);

            if (error) throw error;
            setSuggestions(data || []);
        } catch (err) {
            console.error('Search error:', err);
            setSuggestions([]);
        } finally {
            setLoadingSuggestions(false);
        }
    }, []);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (focusedRow >= 0) {
                fetchSuggestions(manualHoldings[focusedRow]?.symbol || '');
            }
        }, 200);
        return () => clearTimeout(timer);
    }, [manualHoldings, focusedRow, fetchSuggestions]);

    const handleDemoSelect = (key) => {
        const demo = getDemoPortfolio(key);
        if (demo) {
            // Calculate equal-value quantities (₹100,000 base investment per stock at current price)
            // This replaces the hardcoded qty=10 from the Edge Function
            const baseInvestmentPerStock = 100000 / demo.holdings.length; // Equal allocation

            const enrichedHoldings = demo.holdings.map(h => {
                // Estimate current price from returns (if we know 1Y return and have a reference)
                // For now, use a reasonable estimate based on price level if available
                const estimatedPrice = h.price || 2000; // Most large-caps trade around ₹1000-5000
                const quantity = Math.round(baseInvestmentPerStock / estimatedPrice);

                return {
                    ...h,
                    quantity: Math.max(1, quantity), // At least 1 share
                };
            });

            onImport({ name: demo.name, holdings: enrichedHoldings, source: 'demo' });
            onClose?.();
        }
    };

    const handleCSVUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target.result;
                const holdings = parseCSV(text);
                if (holdings.length > 0) {
                    onImport({ name: 'Imported Portfolio', holdings, source: 'csv' });
                    onClose?.();
                }
            } catch (err) {
                setError('Failed to parse CSV: ' + err.message);
            }
        };
        reader.readAsText(file);
    };

    const parseCSV = (text) => {
        const lines = text.trim().split('\n');
        if (lines.length < 2) throw new Error('No data rows found');
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        const symbolIdx = headers.findIndex(h => h.includes('symbol') || h.includes('stock'));
        const qtyIdx = headers.findIndex(h => h.includes('qty') || h.includes('quantity'));
        const priceIdx = headers.findIndex(h => h.includes('price') || h.includes('avg'));
        if (symbolIdx === -1) throw new Error('Could not find symbol column');
        return lines.slice(1).filter(l => l.trim()).map(line => {
            const cols = line.split(',').map(c => c.trim().replace(/"/g, ''));
            let symbol = cols[symbolIdx]?.toUpperCase() || '';
            if (!symbol.includes('.NS')) symbol += '.NS';
            return {
                symbol,
                name: symbol.replace('.NS', ''),
                sector: getSector(symbol),
                quantity: parseFloat(cols[qtyIdx]) || 1,
                avgPrice: parseFloat(cols[priceIdx]) || 1000,
            };
        });
    };

    const addRow = () => setManualHoldings([...manualHoldings, { symbol: '', quantity: '', avgPrice: '' }]);

    const removeRow = (i) => {
        if (manualHoldings.length > 1) {
            setManualHoldings(manualHoldings.filter((_, idx) => idx !== i));
        }
    };

    const updateRow = (i, field, value) => {
        const updated = [...manualHoldings];
        updated[i][field] = value;
        setManualHoldings(updated);
    };

    const selectStock = (i, stock) => {
        const updated = [...manualHoldings];
        updated[i].symbol = stock.trading_symbol;
        updated[i].name = stock.name;
        setManualHoldings(updated);
        setFocusedRow(-1);
        setSuggestions([]);
    };

    const handleSubmit = () => {
        const valid = manualHoldings.filter(h => h.symbol.trim());
        if (valid.length === 0) { setError('Add at least one stock'); return; }
        const holdings = valid.map(h => {
            let symbol = h.symbol.toUpperCase().trim();
            if (!symbol.includes('.NS')) symbol += '.NS';
            return {
                symbol,
                name: h.name || symbol.replace('.NS', ''),
                sector: getSector(symbol),
                quantity: parseFloat(h.quantity) || 1,
                avgPrice: parseFloat(h.avgPrice) || 1000,
            };
        });
        onImport({ name: 'My Portfolio', holdings, source: 'manual' });
        onClose?.();
    };

    return (
        <div className="import-modal-overlay" onClick={onClose}>
            <div className="import-modal" onClick={e => e.stopPropagation()}>
                <div className="import-header">
                    <h2>Import Portfolio</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="import-tabs">
                    <button className={`tab ${activeTab === 'demo' ? 'active' : ''}`} onClick={() => setActiveTab('demo')}>
                        Smart Portfolios
                    </button>
                    <button className={`tab ${activeTab === 'csv' ? 'active' : ''}`} onClick={() => setActiveTab('csv')}>
                        Upload CSV
                    </button>
                    <button className={`tab ${activeTab === 'manual' ? 'active' : ''}`} onClick={() => setActiveTab('manual')}>
                        Manual Entry
                    </button>
                </div>

                {error && <div className="import-error"><span>⚠</span> {error}</div>}

                <div className="import-content">
                    {activeTab === 'demo' && (
                        <div className="demo-grid">
                            {demoOptions.map(demo => (
                                <button key={demo.key} className="demo-card" onClick={() => handleDemoSelect(demo.key)}>
                                    <h3>{demo.name}</h3>
                                    <p>{demo.description}</p>
                                    <div className="demo-metrics">
                                        <span className={demo.avgReturn >= 0 ? 'positive' : 'negative'}>
                                            {demo.avgReturn >= 0 ? '+' : ''}{demo.avgReturn?.toFixed(0) || 0}% return
                                        </span>
                                        <span className="muted">{demo.avgVolatility || 0}% vol</span>
                                    </div>
                                    <span className="holdings-count">{demo.holdingsCount} stocks</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {activeTab === 'csv' && (
                        <div className="csv-upload">
                            <div className="upload-zone">
                                <input type="file" accept=".csv" onChange={handleCSVUpload} id="csv-upload" />
                                <label htmlFor="csv-upload">
                                    <span className="upload-icon">📁</span>
                                    <span>Drop CSV or click to browse</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {activeTab === 'manual' && (
                        <div className="manual-entry">
                            <p className="manual-hint">
                                💡 <strong>Search 2000+ stocks</strong> from NSE. Start typing to see suggestions.
                            </p>
                            <div className="manual-list">
                                {manualHoldings.map((h, i) => (
                                    <div key={i} className="manual-row">
                                        <div className="stock-selector">
                                            <input
                                                type="text"
                                                id={`stock-${i}`}
                                                name={`stock-${i}`}
                                                autoComplete="off"
                                                placeholder="Search RELIANCE, TCS, HDFC..."
                                                value={h.symbol}
                                                onChange={e => updateRow(i, 'symbol', e.target.value.toUpperCase())}
                                                onFocus={() => setFocusedRow(i)}
                                                onBlur={() => setTimeout(() => setFocusedRow(-1), 300)}
                                            />
                                            {focusedRow === i && suggestions.length > 0 && (
                                                <div className="suggestions-dropdown">
                                                    {suggestions.map(s => (
                                                        <button
                                                            key={s.symbol}
                                                            type="button"
                                                            className="suggestion-item"
                                                            onMouseDown={() => selectStock(i, s)}
                                                        >
                                                            <span className="suggestion-symbol">
                                                                {s.trading_symbol}
                                                                {s.is_nifty50 && <span className="nifty-badge-sm">N50</span>}
                                                            </span>
                                                            <span className="suggestion-name">{s.name}</span>
                                                            <span className="suggestion-sector">{s.sector}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {focusedRow === i && loadingSuggestions && (
                                                <div className="suggestions-dropdown loading">
                                                    <span>Searching...</span>
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            type="number"
                                            id={`qty-${i}`}
                                            name={`qty-${i}`}
                                            autoComplete="off"
                                            className="qty-input"
                                            placeholder="Qty"
                                            value={h.quantity}
                                            onChange={e => updateRow(i, 'quantity', e.target.value)}
                                        />
                                        <input
                                            type="number"
                                            id={`price-${i}`}
                                            name={`price-${i}`}
                                            autoComplete="off"
                                            className="price-input"
                                            placeholder="Avg Price"
                                            value={h.avgPrice}
                                            onChange={e => updateRow(i, 'avgPrice', e.target.value)}
                                        />
                                        <button className="remove-btn" onClick={() => removeRow(i)}>×</button>
                                    </div>
                                ))}
                            </div>
                            <div className="manual-actions">
                                <button className="btn btn-ghost" onClick={addRow}>+ Add Stock</button>
                                <button className="btn btn-primary" onClick={handleSubmit}>
                                    Import {manualHoldings.filter(h => h.symbol).length} Stocks
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PortfolioImport;
