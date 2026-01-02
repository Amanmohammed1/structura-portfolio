// Sync Stock Master - TRUE ZERO HARDCODING
// Fetches ALL NSE stocks from official NSE APIs
// No hardcoded lists - everything comes from NSE data

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// NSE Data URLs - Official sources
const NSE_URLS = {
    // All listed equities (~2000+ stocks)
    equityList: 'https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv',
    // NIFTY 50 components
    nifty50: 'https://archives.nseindia.com/content/indices/ind_nifty50list.csv',
    // NIFTY 100 components
    nifty100: 'https://archives.nseindia.com/content/indices/ind_nifty100list.csv',
    // NIFTY 500 components
    nifty500: 'https://archives.nseindia.com/content/indices/ind_nifty500list.csv',
};

// Browser-like headers for NSE requests
const browserHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Connection': 'keep-alive',
};

// Parse CSV to array of objects
function parseCSV(csvText: string): Record<string, string>[] {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

    return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => {
            obj[h] = values[i] || '';
        });
        return obj;
    });
}

// Fetch data from NSE with error handling
async function fetchNSEData(url: string): Promise<string | null> {
    try {
        const response = await fetch(url, { headers: browserHeaders });
        if (!response.ok) {
            console.error(`Failed to fetch ${url}: ${response.status}`);
            return null;
        }
        return await response.text();
    } catch (err) {
        console.error(`Error fetching ${url}:`, err);
        return null;
    }
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    try {
        console.log('Fetching stock data from NSE...');

        // 1. Fetch ALL listed equities from NSE
        const equityCSV = await fetchNSEData(NSE_URLS.equityList);
        if (!equityCSV) {
            throw new Error('Failed to fetch equity list from NSE');
        }
        const allStocks = parseCSV(equityCSV);
        console.log(`Fetched ${allStocks.length} stocks from NSE equity list`);

        // 2. Fetch NIFTY 50 components
        const nifty50CSV = await fetchNSEData(NSE_URLS.nifty50);
        const nifty50Symbols = new Set(
            nifty50CSV ? parseCSV(nifty50CSV).map(r => r.Symbol || r.SYMBOL) : []
        );
        console.log(`NIFTY 50: ${nifty50Symbols.size} stocks`);

        // 3. Fetch NIFTY 100 components
        const nifty100CSV = await fetchNSEData(NSE_URLS.nifty100);
        const nifty100Symbols = new Set(
            nifty100CSV ? parseCSV(nifty100CSV).map(r => r.Symbol || r.SYMBOL) : []
        );
        console.log(`NIFTY 100: ${nifty100Symbols.size} stocks`);

        // 4. Fetch NIFTY 500 components (includes Industry column!)
        const nifty500CSV = await fetchNSEData(NSE_URLS.nifty500);
        const nifty500Data = nifty500CSV ? parseCSV(nifty500CSV) : [];
        const nifty500Symbols = new Set(nifty500Data.map(r => r.Symbol || r.SYMBOL));

        // Build sector map from NIFTY 500 data (has Industry column)
        const sectorMap: Record<string, string> = {};
        for (const row of nifty500Data) {
            const symbol = row.Symbol || row.SYMBOL;
            const industry = row.Industry || row['Industry'] || row.INDUSTRY || '';
            if (symbol && industry) {
                sectorMap[symbol] = industry;
            }
        }
        console.log(`NIFTY 500: ${nifty500Symbols.size} stocks with ${Object.keys(sectorMap).length} sectors`);

        // 5. Transform to our schema - ZERO HARDCODING
        // Sector comes from NIFTY 500 Industry column (official NSE data)
        const stocks = allStocks
            .filter(s => s.SYMBOL && s['NAME OF COMPANY'])
            .map(stock => {
                const symbol = stock.SYMBOL;
                return {
                    symbol: `${symbol}.NS`,
                    trading_symbol: symbol,
                    name: stock['NAME OF COMPANY'] || symbol,
                    isin: stock[' ISIN NUMBER'] || stock['ISIN NUMBER'] || null,
                    series: stock[' SERIES'] || stock['SERIES'] || 'EQ',
                    exchange: 'NSE',
                    sector: sectorMap[symbol] || null, // Industry from NIFTY 500 CSV
                    is_nifty50: nifty50Symbols.has(symbol),
                    is_nifty100: nifty100Symbols.has(symbol),
                    is_nifty500: nifty500Symbols.has(symbol),
                    is_active: true,
                    updated_at: new Date().toISOString(),
                };
            });

        console.log(`Prepared ${stocks.length} stocks for database`);

        // 6. Add NIFTY 50 index
        stocks.push({
            symbol: '^NSEI',
            trading_symbol: 'NIFTY50',
            name: 'NIFTY 50 Index',
            isin: null,
            series: 'INDEX',
            exchange: 'NSE',
            sector: 'Index',
            is_nifty50: false,
            is_nifty100: false,
            is_nifty500: false,
            is_active: true,
            updated_at: new Date().toISOString(),
        });

        // 7. Upsert in batches (Supabase has limits)
        const BATCH_SIZE = 500;
        let inserted = 0;
        let errors = 0;

        for (let i = 0; i < stocks.length; i += BATCH_SIZE) {
            const batch = stocks.slice(i, i + BATCH_SIZE);
            const { error } = await supabase
                .from('stock_master')
                .upsert(batch, { onConflict: 'symbol' });

            if (error) {
                console.error(`Batch ${i / BATCH_SIZE + 1} error:`, error);
                errors++;
            } else {
                inserted += batch.length;
            }
        }

        console.log(`✓ Synced ${inserted} stocks to stock_master (${errors} batch errors)`);

        return new Response(
            JSON.stringify({
                success: true,
                total_from_nse: allStocks.length,
                synced_to_db: inserted,
                nifty50_count: nifty50Symbols.size,
                nifty100_count: nifty100Symbols.size,
                nifty500_count: nifty500Symbols.size,
                batch_errors: errors,
                timestamp: new Date().toISOString(),
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (err: any) {
        console.error('Sync error:', err)
        return new Response(
            JSON.stringify({ error: err.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
