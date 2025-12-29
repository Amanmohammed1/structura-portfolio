/**
 * Dynamic Asset Universe
 * ALL DATA FROM DATABASE - ZERO HARDCODING
 */

import { supabase } from '../config/supabase';

// Cache for fetched data
let sectorCache = {};
let componentsCache = {};
let cacheTime = {};
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Sector colors for visualization (these are display preferences, not data)
export const SECTOR_COLORS = {
    Banking: '#ffc107',
    NBFC: '#ff9800',
    IT: '#00bcd4',
    Energy: '#ff5722',
    FMCG: '#9c27b0',
    Pharma: '#4caf50',
    Healthcare: '#8bc34a',
    Auto: '#3f51b5',
    Infrastructure: '#607d8b',
    Infra: '#607d8b',
    Cement: '#795548',
    Metals: '#90a4ae',
    Metal: '#90a4ae',
    Telecom: '#e91e63',
    Power: '#ffeb3b',
    Insurance: '#03a9f4',
    Conglomerate: '#673ab7',
    Mining: '#5d4037',
    Consumer: '#f06292',
    Defence: '#2e7d32',
    Index: '#ffffff',
    Other: '#666666',
};

/**
 * Get sector for a symbol FROM DATABASE
 */
export async function getSectorAsync(symbol) {
    const tradingSymbol = symbol.replace('.NS', '').replace('.BSE', '');

    // Check cache first
    if (sectorCache[tradingSymbol]) {
        return sectorCache[tradingSymbol];
    }

    try {
        const { data, error } = await supabase
            .from('stock_master')
            .select('sector')
            .eq('trading_symbol', tradingSymbol)
            .single();

        if (error || !data) {
            return 'Other';
        }

        sectorCache[tradingSymbol] = data.sector;
        return data.sector;
    } catch (err) {
        console.warn('getSector error:', err.message);
        return 'Other';
    }
}

/**
 * Sync version for backward compatibility - uses cached data
 * Should be called after fetchSectorCache()
 */
export function getSector(symbol) {
    const tradingSymbol = symbol.replace('.NS', '').replace('.BSE', '');
    return sectorCache[tradingSymbol] || 'Other';
}

/**
 * Pre-fetch all sectors for a list of symbols
 */
export async function fetchSectorCache(symbols) {
    const tradingSymbols = symbols.map(s => s.replace('.NS', '').replace('.BSE', ''));

    try {
        const { data, error } = await supabase
            .from('stock_master')
            .select('trading_symbol, sector')
            .in('trading_symbol', tradingSymbols);

        if (!error && data) {
            data.forEach(row => {
                sectorCache[row.trading_symbol] = row.sector;
            });
        }
    } catch (err) {
        console.warn('fetchSectorCache error:', err.message);
    }
}

/**
 * Fetch index components FROM DATABASE
 */
export async function fetchIndexComponents(index = 'NIFTY_50') {
    // Check cache
    if (componentsCache[index] && (Date.now() - cacheTime[index]) < CACHE_DURATION) {
        return componentsCache[index];
    }

    try {
        let query = supabase
            .from('stock_master')
            .select('symbol, trading_symbol, name, sector')
            .eq('is_active', true);

        // Filter by index
        if (index === 'NIFTY_50') {
            query = query.eq('is_nifty50', true);
        } else if (index === 'NIFTY_100') {
            query = query.eq('is_nifty100', true);
        } else if (index === 'NIFTY_500') {
            query = query.eq('is_nifty500', true);
        }

        const { data, error } = await query.order('name');

        if (error) throw error;

        const components = (data || []).map(c => ({
            symbol: c.symbol,
            tradingSymbol: c.trading_symbol,
            name: c.name,
            sector: c.sector || 'Other',
        }));

        componentsCache[index] = components;
        cacheTime[index] = Date.now();

        return components;
    } catch (err) {
        console.error('Failed to fetch index components:', err.message);
        return [];
    }
}

/**
 * Get human-readable name from symbol FROM DATABASE
 */
export async function getAssetNameAsync(symbol) {
    const tradingSymbol = symbol.replace('.NS', '').replace('.BSE', '');

    try {
        const { data, error } = await supabase
            .from('stock_master')
            .select('name')
            .eq('trading_symbol', tradingSymbol)
            .single();

        if (error || !data) {
            return tradingSymbol; // Fallback to symbol
        }

        return data.name;
    } catch (err) {
        return tradingSymbol;
    }
}

/**
 * Sync version - returns trading symbol as name (for backward compatibility)
 */
export function getAssetName(symbol) {
    return symbol.replace('.NS', '').replace('.BSE', '');
}

/**
 * Get asset info by symbol FROM DATABASE
 */
export async function getAssetBySymbol(symbol) {
    const tradingSymbol = symbol.replace('.NS', '').replace('.BSE', '');

    try {
        const { data, error } = await supabase
            .from('stock_master')
            .select('symbol, trading_symbol, name, sector, is_nifty50')
            .eq('trading_symbol', tradingSymbol)
            .single();

        if (error || !data) {
            return {
                symbol,
                name: tradingSymbol,
                sector: 'Other',
            };
        }

        return {
            symbol: data.symbol,
            tradingSymbol: data.trading_symbol,
            name: data.name,
            sector: data.sector || 'Other',
            isNifty50: data.is_nifty50,
        };
    } catch (err) {
        return {
            symbol,
            name: tradingSymbol,
            sector: 'Other',
        };
    }
}

/**
 * Search stocks in database
 */
export async function searchStocks(query, limit = 10) {
    if (!query || query.length < 1) return [];

    try {
        const { data, error } = await supabase
            .from('stock_master')
            .select('symbol, trading_symbol, name, sector, is_nifty50')
            .or(`trading_symbol.ilike.%${query}%,name.ilike.%${query}%`)
            .eq('is_active', true)
            .order('is_nifty50', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('searchStocks error:', err.message);
        return [];
    }
}

export default {
    getSector,
    getSectorAsync,
    fetchSectorCache,
    fetchIndexComponents,
    getAssetName,
    getAssetNameAsync,
    getAssetBySymbol,
    searchStocks,
    SECTOR_COLORS,
};
