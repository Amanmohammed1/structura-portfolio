// Fetch Sectors from Yahoo Finance
// Uses quoteSummary API to get sector/industry data for symbols
// Bypasses CORS by running on Deno edge

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { symbols } = await req.json()

        if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
            return new Response(
                JSON.stringify({ error: 'symbols array required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log(`Fetching sectors for ${symbols.length} stocks`)

        const sectors: Record<string, string> = {}
        const errors: string[] = []

        // Fetch each symbol from Yahoo Finance quoteSummary
        for (const symbol of symbols) {
            try {
                // Ensure .NS suffix for Yahoo
                const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`
                const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSymbol)}?modules=assetProfile`

                const response = await fetch(url, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                })

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`)
                }

                const data = await response.json()
                const profile = data?.quoteSummary?.result?.[0]?.assetProfile

                if (profile?.sector) {
                    const tradingSymbol = symbol.replace('.NS', '').replace('.BSE', '')
                    sectors[tradingSymbol] = profile.sector
                    console.log(`✓ ${tradingSymbol}: ${profile.sector}`)
                } else {
                    throw new Error('No sector data')
                }

                // Rate limiting - 100ms between requests
                await new Promise(r => setTimeout(r, 100))

            } catch (err: any) {
                const tradingSymbol = symbol.replace('.NS', '').replace('.BSE', '')
                sectors[tradingSymbol] = 'Other'
                errors.push(`${symbol}: ${err.message}`)
                console.error(`✗ ${symbol}: ${err.message}`)
            }
        }

        const response = {
            success: Object.keys(sectors).length - errors.length,
            failed: errors.length,
            sectors,
            errors,
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
