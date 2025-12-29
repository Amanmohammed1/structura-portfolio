import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../config/supabase';
import './StockSearch.css';

/**
 * Smart Multi-Select Stock Dropdown
 * Fetches stocks from stock_master database - ZERO hardcoding
 */
export function StockChecklistDropdown({
    selectedStocks = [],
    onChange,
    maxSelections = 20,
    nifty50Only = false
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [stocks, setStocks] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedSectors, setExpandedSectors] = useState({});
    const dropdownRef = useRef(null);

    // Fetch stocks from database on mount
    useEffect(() => {
        async function fetchStocks() {
            setLoading(true);
            try {
                let query = supabase
                    .from('stock_master')
                    .select('symbol, trading_symbol, name, sector, is_nifty50')
                    .eq('is_active', true)
                    .order('name');

                if (nifty50Only) {
                    query = query.eq('is_nifty50', true);
                }

                const { data, error } = await query;

                if (error) throw error;

                // Group by sector
                const grouped = {};
                data.forEach(stock => {
                    const sector = stock.sector || 'Other';
                    if (!grouped[sector]) grouped[sector] = [];
                    grouped[sector].push(stock);
                });

                setStocks(grouped);
            } catch (err) {
                console.error('Failed to fetch stocks:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchStocks();
    }, [nifty50Only]);

    // Filter stocks by search query
    const filteredStocks = useCallback(() => {
        if (!searchQuery) return stocks;

        const q = searchQuery.toLowerCase();
        const filtered = {};

        Object.entries(stocks).forEach(([sector, sectorStocks]) => {
            const matching = sectorStocks.filter(s =>
                s.trading_symbol.toLowerCase().includes(q) ||
                s.name.toLowerCase().includes(q)
            );
            if (matching.length > 0) {
                filtered[sector] = matching;
            }
        });

        return filtered;
    }, [stocks, searchQuery]);

    // Toggle stock selection
    const toggleStock = (stock) => {
        const isSelected = selectedStocks.some(s => s.symbol === stock.symbol);

        if (isSelected) {
            onChange(selectedStocks.filter(s => s.symbol !== stock.symbol));
        } else if (selectedStocks.length < maxSelections) {
            onChange([...selectedStocks, stock]);
        }
    };

    // Toggle sector expansion
    const toggleSector = (sector) => {
        setExpandedSectors(prev => ({
            ...prev,
            [sector]: !prev[sector]
        }));
    };

    // Select all stocks in a sector
    const selectAllInSector = (sector, sectorStocks) => {
        const sectorSymbols = sectorStocks.map(s => s.symbol);
        const currentlySelected = selectedStocks.filter(s => sectorSymbols.includes(s.symbol));

        if (currentlySelected.length === sectorStocks.length) {
            onChange(selectedStocks.filter(s => !sectorSymbols.includes(s.symbol)));
        } else {
            const notSelected = sectorStocks.filter(s => !selectedStocks.some(sel => sel.symbol === s.symbol));
            const canAdd = maxSelections - selectedStocks.length;
            const toAdd = notSelected.slice(0, canAdd);
            onChange([...selectedStocks, ...toAdd]);
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const displayStocks = filteredStocks();
    const totalStocks = Object.values(stocks).flat().length;

    return (
        <div className="stock-checklist-dropdown" ref={dropdownRef}>
            {/* Dropdown Trigger */}
            <button
                className="dropdown-trigger"
                onClick={() => setIsOpen(!isOpen)}
                type="button"
            >
                <span className="trigger-text">
                    {loading ? 'Loading stocks...' :
                        selectedStocks.length === 0
                            ? `Select stocks (${totalStocks} available)`
                            : `${selectedStocks.length} stocks selected`
                    }
                </span>
                <span className={`trigger-arrow ${isOpen ? 'open' : ''}`}>▼</span>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="dropdown-menu">
                    <div className="dropdown-header">
                        <input
                            type="text"
                            placeholder="Search stocks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input-inline"
                            autoFocus
                        />
                        <span className="count-badge">{selectedStocks.length}/{maxSelections}</span>
                        {selectedStocks.length > 0 && (
                            <button
                                className="clear-all-btn"
                                onClick={() => onChange([])}
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div className="loading-state">Loading stocks from database...</div>
                    ) : (
                        <div className="sectors-list">
                            {Object.entries(displayStocks).map(([sector, sectorStocks]) => {
                                const selectedInSector = sectorStocks.filter(s =>
                                    selectedStocks.some(sel => sel.symbol === s.symbol)
                                ).length;
                                const isExpanded = expandedSectors[sector];

                                return (
                                    <div key={sector} className="sector-group">
                                        <div
                                            className="sector-header"
                                            onClick={() => toggleSector(sector)}
                                        >
                                            <span className={`expand-icon ${isExpanded ? 'open' : ''}`}>▶</span>
                                            <span className="sector-name">{sector}</span>
                                            <span className="sector-count">
                                                {selectedInSector > 0 && `${selectedInSector}/`}{sectorStocks.length}
                                            </span>
                                            <button
                                                className="select-all-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    selectAllInSector(sector, sectorStocks);
                                                }}
                                            >
                                                {selectedInSector === sectorStocks.length ? '✓ All' : 'Select All'}
                                            </button>
                                        </div>

                                        {isExpanded && (
                                            <div className="stocks-list">
                                                {sectorStocks.map(stock => {
                                                    const isSelected = selectedStocks.some(s => s.symbol === stock.symbol);
                                                    return (
                                                        <label
                                                            key={stock.symbol}
                                                            className={`stock-item ${isSelected ? 'selected' : ''}`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleStock(stock)}
                                                                disabled={!isSelected && selectedStocks.length >= maxSelections}
                                                            />
                                                            <span className="stock-symbol">{stock.trading_symbol}</span>
                                                            <span className="stock-name">{stock.name}</span>
                                                            {stock.is_nifty50 && <span className="nifty-badge">N50</span>}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Selected Stocks Preview */}
            {selectedStocks.length > 0 && (
                <div className="selected-preview">
                    {selectedStocks.slice(0, 5).map(stock => (
                        <span key={stock.symbol} className="preview-chip">
                            {stock.trading_symbol || stock.symbol.replace('.NS', '')}
                        </span>
                    ))}
                    {selectedStocks.length > 5 && (
                        <span className="preview-more">+{selectedStocks.length - 5} more</span>
                    )}
                </div>
            )}
        </div>
    );
}

// Export alias for compatibility
export { StockChecklistDropdown as StockSearch };

export function SelectedStocksList({ stocks, onRemove }) {
    if (!stocks || stocks.length === 0) return null;
    return (
        <div className="selected-stocks">
            {stocks.map(stock => (
                <div key={stock.symbol} className="stock-chip">
                    <span className="chip-symbol">{stock.trading_symbol || stock.symbol.replace('.NS', '')}</span>
                    <button className="chip-remove" onClick={() => onRemove(stock.symbol)}>✕</button>
                </div>
            ))}
        </div>
    );
}

export default StockChecklistDropdown;
