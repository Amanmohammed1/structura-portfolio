/**
 * Data Prefetch Service
 * Pre-fetches popular stock data on app load for instant analysis
 * DYNAMIC - fetches stock list from database
 */

import { supabase } from '../../config/supabase';

let prefetchPromise = null;
let prefetchComplete = false;

/**
 * Get top stocks to prefetch FROM DATABASE
 */
async function getPrefetchSymbols() {
    try {
        const { data, error } = await supabase
            .from('stock_master')
            .select('symbol')
            .eq('is_nifty50', true)
            .eq('is_active', true)
            .limit(20);

        if (error || !data) {
            console.warn('Could not fetch prefetch symbols from DB');
            return [];
        }

        return data.map(d => d.symbol);
    } catch (err) {
        console.warn('getPrefetchSymbols error:', err.message);
        return [];
    }
}

/**
 * Start background prefetch on app load
 */
export async function startBackgroundPrefetch() {
    if (prefetchPromise || prefetchComplete) return prefetchPromise;

    console.log('🔄 Starting background data prefetch...');

    // Get symbols from database first
    const symbols = await getPrefetchSymbols();

    if (symbols.length === 0) {
        console.warn('⚠ No symbols to prefetch');
        return null;
    }

    prefetchPromise = supabase.functions.invoke('fetch-prices', {
        body: { symbols, range: '1y' }
    }).then(({ data, error }) => {
        if (error) {
            console.warn('⚠ Prefetch failed:', error.message);
        } else {
            console.log('✓ Prefetched', Object.keys(data?.data || {}).length, 'stocks');
            prefetchComplete = true;
        }
        return data;
    }).catch(err => {
        console.warn('⚠ Prefetch error:', err.message);
    });

    return prefetchPromise;
}

/**
 * Check if prefetch is complete
 */
export function isPrefetchComplete() {
    return prefetchComplete;
}

/**
 * Wait for prefetch to complete (with timeout)
 */
export async function waitForPrefetch(timeoutMs = 5000) {
    if (prefetchComplete) return true;
    if (!prefetchPromise) return false;

    const timeout = new Promise(resolve => setTimeout(() => resolve(false), timeoutMs));
    return Promise.race([prefetchPromise.then(() => true), timeout]);
}

export default { startBackgroundPrefetch, isPrefetchComplete, waitForPrefetch };
