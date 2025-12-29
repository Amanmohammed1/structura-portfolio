// Supabase Edge Function to generate QUANTITATIVE smart portfolios
// Fetches NIFTY 50 from stock_master, calculates metrics from Yahoo Finance
// ZERO HARDCODING - all stocks from database

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface StockMetrics {
    symbol: string
    tradingSymbol: string
    name: string
    price: number
    returns1Y: number
    volatility: number
    sector: string
    sharpe: number
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    try {
        console.log('Generating quantitative smart portfolios...')

        // 1. Fetch NIFTY 50 stocks from database - ZERO HARDCODING
        const { data: nifty50, error: dbError } = await supabase
            .from('stock_master')
            .select('symbol, trading_symbol, name, sector')
            .eq('is_nifty50', true)
            .eq('is_active', true)

        if (dbError) throw dbError
        if (!nifty50 || nifty50.length === 0) {
            throw new Error('No NIFTY 50 stocks found in database')
        }

        console.log(`Fetched ${nifty50.length} NIFTY 50 stocks from database`)

        // 2. Calculate metrics for each stock from Yahoo Finance
        const metrics: StockMetrics[] = []

        for (const stock of nifty50) {
            try {
                const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(stock.symbol)}?range=1y&interval=1d`
                const response = await fetch(url, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                })
                const data = await response.json()
                const result = data.chart?.result?.[0]
                const adjCloses = result?.indicators?.adjclose?.[0]?.adjclose ||
                    result?.indicators?.quote?.[0]?.close
                const closes = (adjCloses || []).filter((p: number) => p !== null && p !== undefined)

                if (closes.length < 50) {
                    console.warn(`${stock.symbol}: Insufficient data (${closes.length} days)`)
                    continue
                }

                // Calculate 1Y return
                const currentPrice = closes[closes.length - 1]
                const yearAgoPrice = closes[0]
                const returns1Y = ((currentPrice - yearAgoPrice) / yearAgoPrice) * 100

                // Calculate annualized volatility
                const dailyReturns: number[] = []
                for (let i = 1; i < closes.length; i++) {
                    dailyReturns.push((closes[i] - closes[i - 1]) / closes[i - 1])
                }
                const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length
                const variance = dailyReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / dailyReturns.length
                const volatility = Math.sqrt(variance * 252) * 100 // Annualized %

                // Calculate Sharpe-like ratio (returns / volatility)
                const sharpe = volatility > 0 ? returns1Y / volatility : 0

                metrics.push({
                    symbol: stock.symbol,
                    tradingSymbol: stock.trading_symbol,
                    name: stock.name,
                    price: currentPrice,
                    returns1Y,
                    volatility,
                    sector: stock.sector || 'Other',
                    sharpe,
                })

                // Rate limiting
                await new Promise(r => setTimeout(r, 100))

            } catch (err: any) {
                console.error(`${stock.symbol}: ${err.message}`)
            }
        }

        console.log(`Calculated metrics for ${metrics.length} stocks`)

        if (metrics.length < 5) {
            throw new Error('Insufficient stock data to generate portfolios')
        }

        // 3. Generate smart portfolios using quantitative criteria
        const portfolios = {
            high_growth: generateHighGrowth(metrics),
            low_volatility: generateLowVolatility(metrics),
            balanced: generateBalanced(metrics),
            sector_diversified: generateSectorDiversified(metrics),
            conservative: generateConservative(metrics),
        }

        console.log('✓ Generated smart portfolios')

        return new Response(
            JSON.stringify({
                success: true,
                portfolios,
                stocksAnalyzed: metrics.length,
                generatedAt: new Date().toISOString(),
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (err: any) {
        console.error('Error:', err)
        return new Response(
            JSON.stringify({ error: err.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})

// HIGH GROWTH: Top 10 by 1-year momentum
function generateHighGrowth(metrics: StockMetrics[]) {
    const sorted = [...metrics].sort((a, b) => b.returns1Y - a.returns1Y)
    const picks = sorted.slice(0, 10)
    return {
        name: 'High Growth',
        description: `Top momentum stocks: ${picks[0]?.returns1Y.toFixed(0)}%+ annual returns`,
        methodology: 'Sorted by 1-year total return (highest first)',
        holdings: picks.map(s => ({
            symbol: s.symbol,
            tradingSymbol: s.tradingSymbol,
            name: s.name,
            sector: s.sector,
            price: Math.round(s.price * 100) / 100,
            returns1Y: Math.round(s.returns1Y * 10) / 10,
            volatility: Math.round(s.volatility * 10) / 10,
            quantity: 10,
        })),
        metrics: {
            avgReturn: Math.round(picks.reduce((a, b) => a + b.returns1Y, 0) / picks.length * 10) / 10,
            avgVolatility: Math.round(picks.reduce((a, b) => a + b.volatility, 0) / picks.length * 10) / 10,
        }
    }
}

// LOW VOLATILITY: Lowest annualized volatility
function generateLowVolatility(metrics: StockMetrics[]) {
    const sorted = [...metrics].sort((a, b) => a.volatility - b.volatility)
    const picks = sorted.slice(0, 10)
    return {
        name: 'Low Volatility',
        description: `Minimum volatility: ~${picks[0]?.volatility.toFixed(0)}% annualized`,
        methodology: 'Sorted by annualized volatility (lowest first)',
        holdings: picks.map(s => ({
            symbol: s.symbol,
            tradingSymbol: s.tradingSymbol,
            name: s.name,
            sector: s.sector,
            price: Math.round(s.price * 100) / 100,
            returns1Y: Math.round(s.returns1Y * 10) / 10,
            volatility: Math.round(s.volatility * 10) / 10,
            quantity: 10,
        })),
        metrics: {
            avgReturn: Math.round(picks.reduce((a, b) => a + b.returns1Y, 0) / picks.length * 10) / 10,
            avgVolatility: Math.round(picks.reduce((a, b) => a + b.volatility, 0) / picks.length * 10) / 10,
        }
    }
}

// BALANCED: Best Sharpe ratio (risk-adjusted returns)
function generateBalanced(metrics: StockMetrics[]) {
    const sorted = [...metrics].sort((a, b) => b.sharpe - a.sharpe)
    const picks = sorted.slice(0, 10)
    return {
        name: 'Balanced',
        description: 'Best risk-adjusted returns (Sharpe ratio)',
        methodology: 'Sorted by return/volatility ratio (highest first)',
        holdings: picks.map(s => ({
            symbol: s.symbol,
            tradingSymbol: s.tradingSymbol,
            name: s.name,
            sector: s.sector,
            price: Math.round(s.price * 100) / 100,
            returns1Y: Math.round(s.returns1Y * 10) / 10,
            volatility: Math.round(s.volatility * 10) / 10,
            sharpe: Math.round(s.sharpe * 100) / 100,
            quantity: 10,
        })),
        metrics: {
            avgReturn: Math.round(picks.reduce((a, b) => a + b.returns1Y, 0) / picks.length * 10) / 10,
            avgVolatility: Math.round(picks.reduce((a, b) => a + b.volatility, 0) / picks.length * 10) / 10,
        }
    }
}

// SECTOR DIVERSIFIED: Best from each sector
function generateSectorDiversified(metrics: StockMetrics[]) {
    const sectors = new Map<string, StockMetrics>()
    const sorted = [...metrics].sort((a, b) => b.sharpe - a.sharpe) // Best Sharpe from each sector

    for (const stock of sorted) {
        if (!sectors.has(stock.sector)) {
            sectors.set(stock.sector, stock)
        }
        if (sectors.size >= 10) break
    }

    const picks = Array.from(sectors.values())
    return {
        name: 'Sector Diversified',
        description: `Best from ${picks.length} different sectors`,
        methodology: 'One stock per sector, selected by best Sharpe ratio',
        holdings: picks.map(s => ({
            symbol: s.symbol,
            tradingSymbol: s.tradingSymbol,
            name: s.name,
            sector: s.sector,
            price: Math.round(s.price * 100) / 100,
            returns1Y: Math.round(s.returns1Y * 10) / 10,
            volatility: Math.round(s.volatility * 10) / 10,
            quantity: 10,
        })),
        metrics: {
            avgReturn: Math.round(picks.reduce((a, b) => a + b.returns1Y, 0) / picks.length * 10) / 10,
            avgVolatility: Math.round(picks.reduce((a, b) => a + b.volatility, 0) / picks.length * 10) / 10,
        }
    }
}

// CONSERVATIVE: Low volatility + positive returns
function generateConservative(metrics: StockMetrics[]) {
    const filtered = metrics.filter(m => m.returns1Y > 0) // Only positive returns
    const sorted = filtered.sort((a, b) => a.volatility - b.volatility)
    const picks = sorted.slice(0, 10)
    return {
        name: 'Conservative',
        description: 'Stable stocks with positive returns',
        methodology: 'Positive return stocks sorted by lowest volatility',
        holdings: picks.map(s => ({
            symbol: s.symbol,
            tradingSymbol: s.tradingSymbol,
            name: s.name,
            sector: s.sector,
            price: Math.round(s.price * 100) / 100,
            returns1Y: Math.round(s.returns1Y * 10) / 10,
            volatility: Math.round(s.volatility * 10) / 10,
            quantity: 10,
        })),
        metrics: {
            avgReturn: Math.round(picks.reduce((a, b) => a + b.returns1Y, 0) / picks.length * 10) / 10,
            avgVolatility: Math.round(picks.reduce((a, b) => a + b.volatility, 0) / picks.length * 10) / 10,
        }
    }
}
