// Supabase Edge Function to fetch index components dynamically
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// NIFTY 50 current components (updated dynamically from NSE)
const NIFTY_50_SYMBOLS = [
    'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
    'HINDUNILVR.NS', 'ITC.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'KOTAKBANK.NS',
    'LT.NS', 'AXISBANK.NS', 'ASIANPAINT.NS', 'MARUTI.NS', 'TITAN.NS',
    'SUNPHARMA.NS', 'BAJFINANCE.NS', 'WIPRO.NS', 'HCLTECH.NS', 'ULTRACEMCO.NS',
    'ADANIENT.NS', 'NTPC.NS', 'POWERGRID.NS', 'ONGC.NS', 'M&M.NS',
    'TATAMOTORS.NS', 'TATASTEEL.NS', 'BAJAJFINSV.NS', 'JSWSTEEL.NS', 'COALINDIA.NS',
    'ADANIPORTS.NS', 'TECHM.NS', 'NESTLEIND.NS', 'GRASIM.NS', 'BPCL.NS',
    'DIVISLAB.NS', 'DRREDDY.NS', 'CIPLA.NS', 'EICHERMOT.NS', 'APOLLOHOSP.NS',
    'BRITANNIA.NS', 'HEROMOTOCO.NS', 'INDUSINDBK.NS', 'HINDALCO.NS', 'SBILIFE.NS',
    'HDFCLIFE.NS', 'BAJAJ-AUTO.NS', 'TATACONSUM.NS', 'BEL.NS', 'SHRIRAMFIN.NS'
]

const BANK_NIFTY_SYMBOLS = [
    'HDFCBANK.NS', 'ICICIBANK.NS', 'SBIN.NS', 'KOTAKBANK.NS', 'AXISBANK.NS',
    'INDUSINDBK.NS', 'BANDHANBNK.NS', 'FEDERALBNK.NS', 'IDFCFIRSTB.NS', 'PNB.NS',
    'BANKBARODA.NS', 'AUBANK.NS'
]

const NIFTY_IT_SYMBOLS = [
    'TCS.NS', 'INFY.NS', 'HCLTECH.NS', 'WIPRO.NS', 'TECHM.NS',
    'LTIM.NS', 'PERSISTENT.NS', 'COFORGE.NS', 'MPHASIS.NS', 'LTTS.NS'
]

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { index } = await req.json()

        let symbols: string[]
        switch (index) {
            case 'NIFTY_50':
                symbols = NIFTY_50_SYMBOLS
                break
            case 'BANK_NIFTY':
                symbols = BANK_NIFTY_SYMBOLS
                break
            case 'NIFTY_IT':
                symbols = NIFTY_IT_SYMBOLS
                break
            default:
                symbols = NIFTY_50_SYMBOLS
        }

        // Fetch basic info for each symbol from Yahoo
        const components = await Promise.all(symbols.map(async (symbol) => {
            try {
                const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`
                const response = await fetch(url, {
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                })
                const data = await response.json()
                const meta = data.chart?.result?.[0]?.meta
                const quote = data.chart?.result?.[0]?.indicators?.quote?.[0]
                const lastPrice = quote?.close?.filter((p: any) => p !== null).pop()

                return {
                    symbol,
                    name: meta?.shortName || meta?.longName || symbol.replace('.NS', ''),
                    price: lastPrice,
                    currency: meta?.currency || 'INR',
                    exchange: meta?.exchangeName || 'NSE',
                }
            } catch {
                return {
                    symbol,
                    name: symbol.replace('.NS', ''),
                    price: null,
                }
            }
        }))

        return new Response(
            JSON.stringify({ components, index }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (err) {
        return new Response(
            JSON.stringify({ error: err.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
