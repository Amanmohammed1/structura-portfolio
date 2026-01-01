export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { accessToken } = req.body;

    if (!accessToken) {
        return res.status(400).json({ error: 'Access token required' });
    }

    try {
        console.log('Fetching holdings with token...');

        // Fetch holdings from Upstox
        const holdingsResponse = await fetch('https://api.upstox.com/v2/portfolio/long-term-holdings', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });

        const holdingsData = await holdingsResponse.json();
        console.log('Holdings response status:', holdingsData.status);

        if (holdingsData.status !== 'success') {
            return res.status(400).json({
                error: 'Failed to fetch holdings',
                details: holdingsData
            });
        }

        // Transform to Structura format
        const holdings = (holdingsData.data || []).map(h => ({
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
        }));

        return res.status(200).json({
            success: true,
            holdings,
            count: holdings.length
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
