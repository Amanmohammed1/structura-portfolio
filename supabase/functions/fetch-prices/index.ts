// Edge Function to fetch prices from DB cache
// DB-FIRST: No external API calls - just reads from Supabase with date filtering

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Calculate start date based on range
 */
function getStartDate(range: string): string {
    const today = new Date()
    const years: Record<string, number> = { '1y': 1, '2y': 2, '3y': 3, '5y': 5 }
    today.setFullYear(today.getFullYear() - (years[range] || 1))
    return today.toISOString().split('T')[0]
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { symbols, range = '1y' } = await req.json()

        if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
            return new Response(
                JSON.stringify({ error: 'symbols array is required' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey)

        const startDate = getStartDate(range)
        console.log(`Fetching ${symbols.length} stocks, range: ${range}, from: ${startDate}`)

        // Query DB with date filter
        // CRITICAL: Supabase defaults to 1000 rows - must set explicit limit!
        const { data: cached, error: dbError } = await supabase
            .from('structura_price_cache')
            .select('symbol, date, open, high, low, close, volume')
            .in('symbol', symbols)
            .gte('date', startDate)
            .order('date', { ascending: true })
            .limit(100000)

        if (dbError) {
            console.error('DB error:', dbError)
            throw dbError
        }

        // Group by symbol
        const results: Record<string, any[]> = {}
        const errors: Array<{ symbol: string, error: string }> = []

        if (cached && cached.length > 0) {
            cached.forEach(row => {
                if (!results[row.symbol]) results[row.symbol] = []
                results[row.symbol].push({
                    date: row.date,
                    open: parseFloat(row.open),
                    high: parseFloat(row.high),
                    low: parseFloat(row.low),
                    close: parseFloat(row.close),
                    volume: row.volume,
                })
            })
        }

        // Check which symbols have no data
        symbols.forEach((symbol: string) => {
            if (!results[symbol] || results[symbol].length === 0) {
                errors.push({ symbol, error: 'No data in cache' })
            }
        })

        console.log(`✓ Loaded ${Object.keys(results).length}/${symbols.length} stocks, ${cached?.length || 0} data points`)

        return new Response(
            JSON.stringify({
                data: results,
                errors,
                range,
                startDate,
                source: 'db_cache'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (err: any) {
        console.error('Error:', err.message)
        return new Response(
            JSON.stringify({ error: err.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
