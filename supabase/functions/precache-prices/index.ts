// Scheduled Edge Function to maintain 5Y price cache
// Runs daily - only fetches from last available date to today (incremental)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// All stocks to maintain in cache
const ALL_STOCKS = [
    // NIFTY 50
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
    // NIFTY 50 Index
    '^NSEI',
]

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const results: Record<string, { added: number, existing: number }> = {}
    const errors: string[] = []
    const now = new Date()
    const today = now.toISOString().split('T')[0]

    // Parse request body for options
    let fullRefresh = false
    try {
        const body = await req.json()
        fullRefresh = body?.fullRefresh === true
    } catch { }

    console.log(`Starting ${fullRefresh ? 'FULL' : 'INCREMENTAL'} cache update for ${ALL_STOCKS.length} stocks...`)

    // Process in batches of 5
    for (let i = 0; i < ALL_STOCKS.length; i += 5) {
        const batch = ALL_STOCKS.slice(i, i + 5)

        await Promise.all(batch.map(async (symbol) => {
            try {
                // 1. Get last cached date for this symbol
                let range = '5y' // Default for new symbols
                let lastDate = null

                if (!fullRefresh) {
                    const { data: lastRow } = await supabase
                        .from('structura_price_cache')
                        .select('date')
                        .eq('symbol', symbol)
                        .order('date', { ascending: false })
                        .limit(1)

                    if (lastRow && lastRow.length > 0) {
                        lastDate = lastRow[0].date
                        // Calculate days since last date
                        const daysSince = Math.ceil((now.getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24))

                        if (daysSince <= 1) {
                            // Already up to date
                            results[symbol] = { added: 0, existing: 1 }
                            return
                        }

                        // Fetch only what we need
                        if (daysSince <= 5) range = '5d'
                        else if (daysSince <= 30) range = '1mo'
                        else if (daysSince <= 90) range = '3mo'
                        else if (daysSince <= 365) range = '1y'
                        else range = '5y'
                    }
                }

                // 2. Fetch from Yahoo Finance
                const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d`
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

                // 3. Prepare rows (only new dates if incremental)
                const rows = timestamp.map((ts: number, idx: number) => {
                    const date = new Date(ts * 1000).toISOString().split('T')[0]
                    return {
                        symbol,
                        date,
                        open: quotes.open[idx],
                        high: quotes.high[idx],
                        low: quotes.low[idx],
                        close: adjClose[idx] || quotes.close[idx],
                        volume: quotes.volume[idx],
                        fetched_at: now.toISOString(),
                    }
                }).filter((r: any) => {
                    if (r.close === null || r.close === undefined) return false
                    // Only include rows after last cached date (if incremental)
                    if (lastDate && r.date <= lastDate) return false
                    return true
                })

                if (rows.length === 0) {
                    results[symbol] = { added: 0, existing: 1 }
                    return
                }

                // 4. Upsert to database
                const { error: dbError } = await supabase
                    .from('structura_price_cache')
                    .upsert(rows, { onConflict: 'symbol,date' })

                if (dbError) throw dbError

                results[symbol] = { added: rows.length, existing: lastDate ? 1 : 0 }
                console.log(`✓ ${symbol}: ${rows.length} days ${lastDate ? 'added' : 'cached'}`)

            } catch (err: any) {
                errors.push(`${symbol}: ${err.message}`)
                console.error(`✗ ${symbol}: ${err.message}`)
            }
        }))

        // Rate limiting delay
        if (i + 5 < ALL_STOCKS.length) {
            await new Promise(r => setTimeout(r, 500))
        }
    }

    const totalAdded = Object.values(results).reduce((sum, r) => sum + r.added, 0)
    const summary = {
        success: Object.keys(results).length,
        failed: errors.length,
        totalDaysAdded: totalAdded,
        timestamp: now.toISOString(),
        mode: fullRefresh ? 'full' : 'incremental',
    }

    console.log('Cache update complete:', summary)

    return new Response(
        JSON.stringify({ summary, results, errors }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
})
