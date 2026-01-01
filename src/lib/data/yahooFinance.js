/**
 * Price Data - Tiered Cache Architecture
 * 
 * Architecture:
 * ┌─────────────┬────────────────┬─────────────────┐
 * │  HOT TIER   │   WARM TIER    │    COLD TIER    │
 * ├─────────────┼────────────────┼─────────────────┤
 * │  NIFTY 50   │   NSE 500      │   Any Stock     │
 * │  5Y history │   2Y history   │   1Y history    │
 * │  Daily cron │   Weekly cron  │   On-demand     │
 * │  Pre-cached │   Pre-cached   │   TTL: 7 days   │
 * └─────────────┴────────────────┴─────────────────┘
 * 
 * Flow:
 * 1. Check Supabase cache first (fast)
 * 2. If cache miss → Fetch from Yahoo Finance via Edge Function
 * 3. Cache the fetched data for future requests
 */

import { supabase } from '../../config/supabase';

// Cache configuration
const CACHE_TTL_DAYS = 7;  // Cold tier stocks cached for 7 days
const PAGE_SIZE = 1000;    // Supabase row limit per request

/**
 * Calculate start date based on range
 */
function getStartDate(range) {
    const today = new Date();
    const years = { '1y': 1, '2y': 2, '3y': 3, '5y': 5 }[range] || 1;
    today.setFullYear(today.getFullYear() - years);
    return today.toISOString().split('T')[0];
}

/**
 * Fetch from Supabase cache with pagination
 */
async function fetchFromCache(symbols, startDate) {
    const allRows = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
        const { data: chunk, error } = await supabase
            .from('structura_price_cache')
            .select('symbol, date, open, high, low, close, volume')
            .in('symbol', symbols)
            .gte('date', startDate)
            .order('date', { ascending: true })
            .range(offset, offset + PAGE_SIZE - 1);

        if (error) {
            console.error('Cache query error:', error);
            break;
        }

        if (!chunk || chunk.length === 0) {
            hasMore = false;
        } else {
            allRows.push(...chunk);
            if (chunk.length < PAGE_SIZE) {
                hasMore = false;
            } else {
                offset += PAGE_SIZE;
            }
        }
    }

    return allRows;
}

/**
 * Fetch from Yahoo Finance via Edge Function (for cache misses)
 */
async function fetchOnDemand(symbols, range) {
    try {
        const { data, error } = await supabase.functions.invoke('fetch-on-demand', {
            body: { symbols, range }
        });

        if (error) {
            console.error('On-demand fetch error:', error);
            return null;
        }

        return data;
    } catch (err) {
        console.error('Edge function call failed:', err);
        return null;
    }
}

/**
 * Direct Yahoo Finance fetch (fallback if Edge Function fails)
 */
async function fetchYahooDirectly(symbol, range = '1y') {
    const yahooRange = { '1y': '1y', '2y': '2y', '3y': '5y', '5y': '5y' }[range] || '1y';
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${yahooRange}&interval=1d`;

    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (!response.ok) return null;

        const data = await response.json();
        const result = data?.chart?.result?.[0];
        if (!result?.timestamp) return null;

        const { timestamp, indicators } = result;
        const quotes = indicators.quote[0];
        const adjClose = indicators.adjclose?.[0]?.adjclose || quotes.close;

        return timestamp.map((ts, i) => ({
            symbol,
            date: new Date(ts * 1000).toISOString().split('T')[0],
            open: quotes.open[i],
            high: quotes.high[i],
            low: quotes.low[i],
            close: adjClose[i] || quotes.close[i],
            volume: quotes.volume[i],
        })).filter(r => r.close !== null && r.close !== undefined);
    } catch (err) {
        console.error(`Yahoo fetch failed for ${symbol}:`, err);
        return null;
    }
}

/**
 * Main function: Fetch multiple stocks with hybrid cache strategy
 */
export async function fetchMultipleStocks(symbols, range = '1y') {
    console.log(`Fetching: ${symbols.length} stocks, range: ${range}`);

    const startDate = getStartDate(range);
    console.log(`Date filter: >= ${startDate}`);

    const data = {};
    const errors = [];

    try {
        // Step 1: Try to get all from cache
        const cached = await fetchFromCache(symbols, startDate);
        console.log(`Cache returned ${cached.length} rows`);

        // Group cached data by symbol
        const cachedBySymbol = {};
        cached.forEach(row => {
            if (!cachedBySymbol[row.symbol]) cachedBySymbol[row.symbol] = [];
            cachedBySymbol[row.symbol].push({
                date: row.date,
                open: parseFloat(row.open),
                high: parseFloat(row.high),
                low: parseFloat(row.low),
                close: parseFloat(row.close),
                volume: row.volume,
            });
        });

        // Step 2: Identify cache misses
        const cacheMisses = [];
        symbols.forEach(symbol => {
            if (cachedBySymbol[symbol] && cachedBySymbol[symbol].length >= 50) {
                // Have enough cached data (at least 50 days)
                data[symbol] = cachedBySymbol[symbol];
            } else {
                cacheMisses.push(symbol);
            }
        });

        console.log(`Cache hits: ${Object.keys(data).length}, Cache misses: ${cacheMisses.length}`);

        // Step 3: Fetch cache misses on-demand
        if (cacheMisses.length > 0) {
            console.log(`Fetching on-demand: ${cacheMisses.join(', ')}`);

            // Try Edge Function first
            const onDemandResult = await fetchOnDemand(cacheMisses, range);

            if (onDemandResult?.data) {
                Object.entries(onDemandResult.data).forEach(([symbol, prices]) => {
                    data[symbol] = prices;
                });
                console.log(`✓ On-demand fetched: ${Object.keys(onDemandResult.data).length} stocks`);
            } else {
                // Fallback: Direct Yahoo fetch (one by one)
                console.log('Edge function failed, trying direct fetch...');
                for (const symbol of cacheMisses) {
                    const yahooData = await fetchYahooDirectly(symbol, range);
                    if (yahooData && yahooData.length > 0) {
                        data[symbol] = yahooData;
                        console.log(`✓ Direct fetched: ${symbol} (${yahooData.length} days)`);
                    } else {
                        errors.push({ symbol, error: 'Failed to fetch' });
                        console.log(`✗ Failed: ${symbol}`);
                    }
                }
            }
        }

        // Summary
        const successCount = Object.keys(data).length;
        const totalPoints = Object.values(data).reduce((sum, arr) => sum + arr.length, 0);
        console.log(`✓ Loaded ${successCount}/${symbols.length} stocks, ${totalPoints} data points`);

        if (errors.length > 0) {
            console.warn(`✗ Failed: ${errors.map(e => e.symbol).join(', ')}`);
        }

        return { data, errors };

    } catch (err) {
        console.error('Fetch error:', err);
        return { data: {}, errors: symbols.map(s => ({ symbol: s, error: err.message })) };
    }
}

/**
 * Get current price for a symbol (latest price in DB or on-demand)
 */
export async function getCurrentPrice(symbol) {
    try {
        // Try cache first
        const { data, error } = await supabase
            .from('structura_price_cache')
            .select('date, close')
            .eq('symbol', symbol)
            .order('date', { ascending: false })
            .limit(1);

        if (!error && data && data.length > 0) {
            return { date: data[0].date, close: parseFloat(data[0].close) };
        }

        // On-demand fetch if not in cache
        const yahooData = await fetchYahooDirectly(symbol, '1y');
        if (yahooData && yahooData.length > 0) {
            const latest = yahooData[yahooData.length - 1];
            return { date: latest.date, close: latest.close };
        }

        return null;
    } catch (err) {
        console.error(`getCurrentPrice error for ${symbol}:`, err);
        return null;
    }
}

export function getYahooRange(r) {
    return { '1m': '1mo', '3m': '3mo', '6m': '6mo', '1y': '1y', '2y': '2y', '3y': '3y', '5y': '5y' }[r] || '1y';
}

/**
 * Fetch sector from Yahoo Finance quoteSummary API
 * Used as fallback when stock is not in our database
 */
export async function fetchSectorFromYahoo(symbol) {
    // Ensure symbol has .NS suffix for Yahoo
    const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`;

    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${yahooSymbol}?modules=assetProfile`;

    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (!response.ok) return null;

        const data = await response.json();
        const profile = data?.quoteSummary?.result?.[0]?.assetProfile;

        if (profile?.sector) {
            return profile.sector;
        }

        return null;
    } catch (err) {
        console.error(`Yahoo sector fetch failed for ${symbol}:`, err);
        return null;
    }
}

/**
 * Fetch sectors for multiple symbols from Yahoo Finance
 * NOTE: May fail due to CORS when called from browser
 */
export async function fetchSectorsFromYahoo(symbols) {
    const results = {};

    try {
        // Fetch in parallel with rate limiting (max 5 concurrent)
        const chunks = [];
        for (let i = 0; i < symbols.length; i += 5) {
            chunks.push(symbols.slice(i, i + 5));
        }

        for (const chunk of chunks) {
            const promises = chunk.map(async (symbol) => {
                try {
                    const sector = await fetchSectorFromYahoo(symbol);
                    results[symbol.replace('.NS', '').replace('.BSE', '')] = sector || 'Other';
                } catch (e) {
                    results[symbol.replace('.NS', '').replace('.BSE', '')] = 'Other';
                }
            });
            await Promise.all(promises);

            // Small delay between chunks
            if (chunks.indexOf(chunk) < chunks.length - 1) {
                await new Promise(r => setTimeout(r, 200));
            }
        }
    } catch (err) {
        console.warn('Yahoo sector fetch failed (likely CORS):', err.message);
    }

    return results;
}

export default { fetchMultipleStocks, getCurrentPrice, getYahooRange, fetchSectorFromYahoo, fetchSectorsFromYahoo };
