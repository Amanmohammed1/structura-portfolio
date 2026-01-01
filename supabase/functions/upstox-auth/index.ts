// Supabase Edge Function for Upstox OAuth and Holdings
// Handles: token exchange, holdings fetch, fundamentals data

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const UPSTOX_API_KEY = Deno.env.get('UPSTOX_API_KEY') || 'd18cbda2-a079-4439-9ff7-9c26c0df3b4c'
const UPSTOX_API_SECRET = Deno.env.get('UPSTOX_API_SECRET') || '8slcqwe96k'
const REDIRECT_URI = 'https://structura-portfolio.vercel.app/callback/upstox'

interface TokenResponse {
    access_token: string
    token_type: string
    expires_in: number
    refresh_token?: string
}

interface Holding {
    instrument_token: string
    quantity: number
    average_price: number
    isin: string
    trading_symbol: string
    exchange: string
    company_name: string
    close_price: number
    pnl: number
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { action, code, accessToken } = await req.json()

        // ==========================================
        // ACTION: GET_AUTH_URL - Return OAuth URL
        // ==========================================
        if (action === 'get_auth_url') {
            const authUrl = `https://api.upstox.com/v2/login/authorization/dialog?` +
                `response_type=code&` +
                `client_id=${UPSTOX_API_KEY}&` +
                `redirect_uri=${encodeURIComponent(REDIRECT_URI)}`

            return new Response(
                JSON.stringify({ success: true, authUrl }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // ==========================================
        // ACTION: EXCHANGE_TOKEN - Exchange code for access token
        // ==========================================
        if (action === 'exchange_token') {
            if (!code) {
                return new Response(
                    JSON.stringify({ error: 'Authorization code required' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }

            console.log('Exchanging token with code:', code.substring(0, 4) + '...')
            console.log('Using API key:', UPSTOX_API_KEY.substring(0, 8) + '...')
            console.log('Using API secret:', UPSTOX_API_SECRET.substring(0, 4) + '...')
            console.log('Redirect URI:', REDIRECT_URI)

            // Build body string directly (avoid URLSearchParams encoding of redirect_uri)
            const bodyString = `code=${encodeURIComponent(code)}&client_id=${encodeURIComponent(UPSTOX_API_KEY)}&client_secret=${encodeURIComponent(UPSTOX_API_SECRET)}&redirect_uri=${REDIRECT_URI}&grant_type=authorization_code`
            console.log('Request body:', bodyString.replace(UPSTOX_API_SECRET, '***'))

            const tokenResponse = await fetch('https://api.upstox.com/v2/login/authorization/token', {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'curl/7.88.1'
                },
                body: bodyString
            })

            const tokenText = await tokenResponse.text()
            console.log('Token response status:', tokenResponse.status)
            console.log('Token response body:', tokenText)

            let tokenData: TokenResponse
            try {
                tokenData = JSON.parse(tokenText)
            } catch (e) {
                return new Response(
                    JSON.stringify({ error: 'Invalid response from Upstox', details: tokenText }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }

            if (!tokenData.access_token) {
                console.error('Token exchange failed:', tokenData)
                return new Response(
                    JSON.stringify({ error: 'Token exchange failed', details: tokenData }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    access_token: tokenData.access_token,
                    expires_in: tokenData.expires_in
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // ==========================================
        // ACTION: GET_HOLDINGS - Fetch user's holdings
        // ==========================================
        if (action === 'get_holdings') {
            if (!accessToken) {
                return new Response(
                    JSON.stringify({ error: 'Access token required' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }

            const holdingsResponse = await fetch('https://api.upstox.com/v2/portfolio/long-term-holdings', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                }
            })

            const holdingsData = await holdingsResponse.json()

            if (holdingsData.status !== 'success') {
                console.error('Holdings fetch failed:', holdingsData)
                return new Response(
                    JSON.stringify({ error: 'Failed to fetch holdings', details: holdingsData }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }

            // Transform to Structura format
            const holdings = (holdingsData.data || []).map((h: Holding) => ({
                symbol: h.trading_symbol.includes('.') ? h.trading_symbol : `${h.trading_symbol}.NS`,
                tradingSymbol: h.trading_symbol,
                name: h.company_name,
                quantity: h.quantity,
                avgBuyPrice: h.average_price,
                currentPrice: h.close_price,
                currentValue: h.quantity * h.close_price,
                pnl: h.pnl,
                isin: h.isin,
                exchange: h.exchange
            }))

            return new Response(
                JSON.stringify({
                    success: true,
                    holdings,
                    count: holdings.length
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        return new Response(
            JSON.stringify({ error: 'Unknown action' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )

    } catch (err: any) {
        console.error('Error:', err)
        return new Response(
            JSON.stringify({ error: err.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
