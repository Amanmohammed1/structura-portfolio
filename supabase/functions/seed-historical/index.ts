// Batch Historical Data Seeder
// Fetches 5Y data in batches to populate full history
// Run this once for initial setup, or when you need a "hard reset"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// All NIFTY 50 stocks + Index
const ALL_STOCKS = [
    'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
    'HINDUNILVR.NS', 'ITC.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'KOTAKBANK.NS',
    'LT.NS', 'AXISBANK.NS', 'BAJFINANCE.NS', 'TITAN.NS', 'SUNPHARMA.NS',
    'HCLTECH.NS', 'MARUTI.NS', 'TATAMOTORS.NS', 'WIPRO.NS', 'NTPC.NS',
    'POWERGRID.NS', 'TECHM.NS', 'COALINDIA.NS', 'ONGC.NS', 'DRREDDY.NS',
    'CIPLA.NS', 'NESTLEIND.NS', 'BRITANNIA.NS', 'INDUSINDBK.NS',
    'ADANIENT.NS', 'ADANIPORTS.NS', 'ASIANPAINT.NS', 'ULTRACEMCO.NS',
    'JSWSTEEL.NS', 'TATASTEEL.NS', 'M&M.NS', 'HINDALCO.NS', 'GRASIM.NS',
    'BPCL.NS', 'EICHERMOT.NS', 'DIVISLAB.NS', 'APOLLOHOSP.NS',
    'HEROMOTOCO.NS', 'SHREECEM.NS', 'TATACONSUM.NS', 'SBILIFE.NS',
    'HDFCLIFE.NS', 'LTIM.NS', 'BAJAJ-AUTO.NS',
    '^NSEI', // NIFTY 50 Index
]

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Parse options
    let batchStart = 0
    let batchSize = 10  // Process 10 stocks at a time
    let clearFirst = false

    try {
        const body = await req.json()
        batchStart = body?.batchStart || 0
        batchSize = body?.batchSize || 10
        clearFirst = body?.clearFirst === true
    } catch { }

    const batchEnd = Math.min(batchStart + batchSize, ALL_STOCKS.length)
    const batchStocks = ALL_STOCKS.slice(batchStart, batchEnd)

    console.log(`Processing batch ${batchStart}-${batchEnd} of ${ALL_STOCKS.length} stocks`)

    const results: Record<string, number> = {}
    const errors: string[] = []
    const now = new Date()

    // Clear existing data for these stocks if requested
    if (clearFirst) {
        console.log('Clearing existing data for batch stocks...')
        const { error: deleteError } = await supabase
            .from('structura_price_cache')
            .delete()
            .in('symbol', batchStocks)

        if (deleteError) {
            console.error('Delete error:', deleteError)
        }
    }

    // Fetch 5Y data for each stock in batch
    for (const symbol of batchStocks) {
        try {
            console.log(`Fetching 5Y data for ${symbol}...`)

            // Yahoo Finance 5Y range
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5y&interval=1d`
            const response = await fetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            })

            if (!response.ok) throw new Error(`HTTP ${response.status}`)

            const data = await response.json()
            if (data.chart?.error) throw new Error(data.chart.error.description)

            const result = data.chart?.result?.[0]
            if (!result?.timestamp) throw new Error('No data')

            const { timestamp, indicators } = result
            const quotes = indicators.quote[0]
            const adjClose = indicators.adjclose?.[0]?.adjclose || quotes.close

            // Prepare rows
            const rows = timestamp.map((ts: number, idx: number) => {
                const date = new Date(ts * 1000).toISOString().split('T')[0]
                return {
                    symbol,
                    date,
                    open: quotes.open[idx],
                    high: quotes.high[idx],
                    low: quotes.low[idx],
                    close: adjClose[idx] || quotes.close[idx],  // Use adjusted close!
                    volume: quotes.volume[idx],
                    fetched_at: now.toISOString(),
                }
            }).filter((r: any) => r.close !== null && r.close !== undefined)

            if (rows.length === 0) {
                errors.push(`${symbol}: No valid data`)
                continue
            }

            // Upsert to database
            const { error: dbError } = await supabase
                .from('structura_price_cache')
                .upsert(rows, { onConflict: 'symbol,date' })

            if (dbError) throw dbError

            results[symbol] = rows.length
            console.log(`✓ ${symbol}: ${rows.length} days cached`)

            // Rate limiting - wait 200ms between requests
            await new Promise(r => setTimeout(r, 200))

        } catch (err: any) {
            errors.push(`${symbol}: ${err.message}`)
            console.error(`✗ ${symbol}: ${err.message}`)
        }
    }

    const totalDays = Object.values(results).reduce((sum, n) => sum + n, 0)
    const nextBatch = batchEnd < ALL_STOCKS.length ? batchEnd : null

    const summary = {
        batchStart,
        batchEnd,
        totalStocks: ALL_STOCKS.length,
        processed: Object.keys(results).length,
        failed: errors.length,
        totalDays,
        nextBatch,  // Pass this to next call to continue
        timestamp: now.toISOString(),
    }

    console.log('Batch complete:', summary)

    return new Response(
        JSON.stringify({ summary, results, errors }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
})
