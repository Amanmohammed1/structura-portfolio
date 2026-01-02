// Zerodha Kite Connect Authentication & Holdings
// Handles OAuth flow and fetches holdings from Kite API

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Zerodha Kite API Configuration
const KITE_API_KEY = 'ahe6bwdo0s2kv1zb'
const KITE_API_SECRET = '6xm4968yxjl5otfld6cq5l8p02hdq8r2'
const REDIRECT_URL = 'https://structura-portfolio.vercel.app/zerodha-callback'

// Kite API URLs
const KITE_LOGIN_URL = 'https://kite.zerodha.com/connect/login'
const KITE_TOKEN_URL = 'https://api.kite.trade/session/token'
const KITE_HOLDINGS_URL = 'https://api.kite.trade/portfolio/holdings'

// Generate SHA256 checksum for authentication
async function generateChecksum(apiKey: string, requestToken: string, apiSecret: string): Promise<string> {
    const data = apiKey + requestToken + apiSecret
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { action, request_token } = await req.json()

        // Step 1: Get login URL for OAuth
        if (action === 'get_auth_url') {
            const authUrl = `${KITE_LOGIN_URL}?api_key=${KITE_API_KEY}&v=3`
            return new Response(
                JSON.stringify({ authUrl }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Step 2: Exchange request_token for access_token and fetch holdings
        if (action === 'exchange_token') {
            if (!request_token) {
                throw new Error('request_token is required')
            }

            console.log('Exchanging request token for access token...')

            // Generate checksum
            const checksum = await generateChecksum(KITE_API_KEY, request_token, KITE_API_SECRET)

            // Exchange for access token
            const tokenResponse = await fetch(KITE_TOKEN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Kite-Version': '3',
                },
                body: new URLSearchParams({
                    api_key: KITE_API_KEY,
                    request_token: request_token,
                    checksum: checksum,
                }),
            })

            if (!tokenResponse.ok) {
                const errorText = await tokenResponse.text()
                console.error('Token exchange failed:', errorText)
                throw new Error(`Token exchange failed: ${tokenResponse.status}`)
            }

            const tokenData = await tokenResponse.json()
            const accessToken = tokenData.data?.access_token

            if (!accessToken) {
                throw new Error('No access token received')
            }

            console.log('Access token received, fetching holdings...')

            // Fetch holdings
            const holdingsResponse = await fetch(KITE_HOLDINGS_URL, {
                headers: {
                    'Authorization': `token ${KITE_API_KEY}:${accessToken}`,
                    'X-Kite-Version': '3',
                },
            })

            if (!holdingsResponse.ok) {
                const errorText = await holdingsResponse.text()
                console.error('Holdings fetch failed:', errorText)
                throw new Error(`Holdings fetch failed: ${holdingsResponse.status}`)
            }

            const holdingsData = await holdingsResponse.json()
            const kiteHoldings = holdingsData.data || []

            console.log(`Fetched ${kiteHoldings.length} holdings from Zerodha`)

            // Transform to Structura format
            const holdings = kiteHoldings.map((h: any) => ({
                symbol: `${h.tradingsymbol}.NS`,
                tradingSymbol: h.tradingsymbol,
                name: h.tradingsymbol, // Kite doesn't provide company name
                quantity: h.quantity,
                avgPrice: h.average_price,
                currentPrice: h.last_price,
                investedValue: h.quantity * h.average_price,
                currentValue: h.quantity * h.last_price,
                pnl: h.pnl,
                pnlPercent: h.average_price > 0 ? ((h.last_price - h.average_price) / h.average_price) * 100 : 0,
                dayChange: h.day_change,
                dayChangePercent: h.day_change_percentage,
                exchange: h.exchange || 'NSE',
                isin: h.isin,
            }))

            return new Response(
                JSON.stringify({
                    success: true,
                    holdings,
                    count: holdings.length,
                    user: tokenData.data?.user_name || 'Zerodha User',
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        throw new Error(`Unknown action: ${action}`)

    } catch (err: any) {
        console.error('Zerodha auth error:', err)
        return new Response(
            JSON.stringify({ error: err.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
