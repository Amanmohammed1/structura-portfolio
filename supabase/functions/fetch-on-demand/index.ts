// On-Demand Stock Data Fetcher
// Fetches stocks not in cache and stores them (Cold Tier)
// TTL: 7 days for cold tier stocks

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    try {
        const { symbols, range = '1y' } = await req.json()

        if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
            return new Response(
                JSON.stringify({ error: 'symbols array required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log(`On-demand fetch: ${symbols.length} stocks, range: ${range}`)

        const data: Record<string, any[]> = {}
        const errors: string[] = []
        const now = new Date()

        // Yahoo Finance range mapping
        const yahooRange = { '1y': '1y', '2y': '2y', '3y': '5y', '5y': '5y' }[range] || '1y'

        // Fetch each symbol from Yahoo Finance
        for (const symbol of symbols) {
            try {
                const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${yahooRange}&interval=1d`

                const response = await fetch(url, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                })

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`)
                }

                const yahooData = await response.json()
                const result = yahooData?.chart?.result?.[0]

                if (!result?.timestamp) {
                    throw new Error('No data from Yahoo')
                }

                const { timestamp, indicators } = result
                const quotes = indicators.quote[0]
                const adjClose = indicators.adjclose?.[0]?.adjclose || quotes.close

                // Convert to rows
                const rows = timestamp.map((ts: number, i: number) => {
                    const date = new Date(ts * 1000).toISOString().split('T')[0]
                    return {
                        symbol,
                        date,
                        open: quotes.open[i],
                        high: quotes.high[i],
                        low: quotes.low[i],
                        close: adjClose[i] || quotes.close[i],
                        volume: quotes.volume[i],
                        fetched_at: now.toISOString(),
                    }
                }).filter((r: any) => r.close !== null && r.close !== undefined)

                if (rows.length === 0) {
                    throw new Error('No valid price data')
                }

                // Cache in Supabase (upsert to handle duplicates)
                const { error: dbError } = await supabase
                    .from('structura_price_cache')
                    .upsert(rows, { onConflict: 'symbol,date' })

                if (dbError) {
                    console.error(`DB error for ${symbol}:`, dbError)
                }

                // Return data to caller
                data[symbol] = rows.map(r => ({
                    date: r.date,
                    open: r.open,
                    high: r.high,
                    low: r.low,
                    close: r.close,
                    volume: r.volume,
                }))

                console.log(`✓ ${symbol}: ${rows.length} days fetched and cached`)

                // Rate limiting - 200ms between requests
                await new Promise(r => setTimeout(r, 200))

            } catch (err: any) {
                errors.push(`${symbol}: ${err.message}`)
                console.error(`✗ ${symbol}: ${err.message}`)
            }
        }

        const response = {
            success: Object.keys(data).length,
            failed: errors.length,
            data,
            errors,
            timestamp: now.toISOString(),
        }

        return new Response(
            JSON.stringify(response),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (err: any) {
        console.error('Request error:', err)
        return new Response(
            JSON.stringify({ error: err.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
