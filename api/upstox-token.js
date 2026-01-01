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

    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ error: 'Authorization code required' });
    }

    const API_KEY = process.env.UPSTOX_API_KEY || 'd18cbda2-a079-4439-9ff7-9c26c0df3b4c';
    const API_SECRET = process.env.UPSTOX_API_SECRET || '8slcqwe96k';
    const REDIRECT_URI = 'https://structura-portfolio.vercel.app/callback/upstox';

    try {
        console.log('Exchanging token with code:', code.substring(0, 4) + '...');

        // Make request to Upstox
        const tokenResponse = await fetch('https://api.upstox.com/v2/login/authorization/token', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                code,
                client_id: API_KEY,
                client_secret: API_SECRET,
                redirect_uri: REDIRECT_URI,
                grant_type: 'authorization_code'
            })
        });

        const tokenData = await tokenResponse.json();
        console.log('Token response:', JSON.stringify(tokenData));

        if (!tokenData.access_token) {
            return res.status(400).json({
                error: 'Token exchange failed',
                details: tokenData
            });
        }

        return res.status(200).json({
            success: true,
            access_token: tokenData.access_token,
            user_id: tokenData.user_id,
            email: tokenData.email
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
