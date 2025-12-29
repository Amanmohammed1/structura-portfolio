-- Structura 2.0: Transaction & Portfolio Schema
-- Supports: Actual P&L (XIRR), Tax-aware rebalancing, Dividend tracking

-- ============================================
-- PORTFOLIOS TABLE
-- User's named portfolio collections
-- ============================================
CREATE TABLE IF NOT EXISTS portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL DEFAULT 'My Portfolio',
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for portfolios
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);

-- ============================================
-- TRANSACTIONS TABLE
-- Buy/Sell transactions for XIRR calculation
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE NOT NULL,
    symbol VARCHAR(30) NOT NULL,  -- e.g., RELIANCE.NS
    trading_symbol VARCHAR(30),   -- e.g., RELIANCE
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('BUY', 'SELL', 'DIVIDEND', 'BONUS', 'SPLIT')),
    quantity DECIMAL(15, 4) NOT NULL,
    price DECIMAL(15, 4) NOT NULL,  -- Price per share
    total_value DECIMAL(15, 4) GENERATED ALWAYS AS (quantity * price) STORED,
    transaction_date DATE NOT NULL,
    broker VARCHAR(50),  -- Zerodha, Upstox, Groww, etc.
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Constraints
    CONSTRAINT positive_quantity CHECK (quantity > 0),
    CONSTRAINT positive_price CHECK (price > 0)
);

-- Indexes for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_portfolio_id ON transactions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_transactions_symbol ON transactions(symbol);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);

-- ============================================
-- HOLDINGS VIEW (Computed from Transactions)
-- Current holdings = sum of BUY - SELL
-- ============================================
CREATE OR REPLACE VIEW holdings_view AS
SELECT 
    portfolio_id,
    symbol,
    trading_symbol,
    SUM(CASE 
        WHEN transaction_type = 'BUY' THEN quantity
        WHEN transaction_type = 'SELL' THEN -quantity
        WHEN transaction_type = 'BONUS' THEN quantity
        ELSE 0
    END) AS total_quantity,
    -- Average buy price (FIFO simplified)
    SUM(CASE WHEN transaction_type = 'BUY' THEN total_value ELSE 0 END) / 
        NULLIF(SUM(CASE WHEN transaction_type = 'BUY' THEN quantity ELSE 0 END), 0) AS avg_buy_price,
    -- Total invested (sum of all buys)
    SUM(CASE WHEN transaction_type = 'BUY' THEN total_value ELSE 0 END) AS total_invested,
    -- Total sold
    SUM(CASE WHEN transaction_type = 'SELL' THEN total_value ELSE 0 END) AS total_sold,
    -- First buy date
    MIN(CASE WHEN transaction_type = 'BUY' THEN transaction_date END) AS first_buy_date,
    -- Last transaction date
    MAX(transaction_date) AS last_transaction_date,
    -- Count of transactions
    COUNT(*) AS transaction_count
FROM transactions
GROUP BY portfolio_id, symbol, trading_symbol
HAVING SUM(CASE 
    WHEN transaction_type = 'BUY' THEN quantity
    WHEN transaction_type = 'SELL' THEN -quantity
    WHEN transaction_type = 'BONUS' THEN quantity
    ELSE 0
END) > 0;  -- Only show holdings with positive quantity

-- ============================================
-- DIVIDENDS TRACKING (Optional, extracted from transactions)
-- ============================================
CREATE OR REPLACE VIEW dividends_view AS
SELECT 
    portfolio_id,
    symbol,
    trading_symbol,
    transaction_date AS dividend_date,
    quantity AS shares_held,
    price AS dividend_per_share,
    total_value AS total_dividend
FROM transactions
WHERE transaction_type = 'DIVIDEND'
ORDER BY transaction_date DESC;

-- ============================================
-- PORTFOLIO SUMMARY VIEW
-- High-level stats per portfolio
-- ============================================
CREATE OR REPLACE VIEW portfolio_summary_view AS
SELECT 
    p.id AS portfolio_id,
    p.user_id,
    p.name,
    COUNT(DISTINCT h.symbol) AS stock_count,
    SUM(h.total_invested) AS total_invested,
    MIN(h.first_buy_date) AS portfolio_start_date
FROM portfolios p
LEFT JOIN holdings_view h ON p.id = h.portfolio_id
GROUP BY p.id, p.user_id, p.name;

-- ============================================
-- RLS Policies (Row Level Security)
-- ============================================
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own portfolios
CREATE POLICY "Users can view own portfolios" ON portfolios
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own portfolios" ON portfolios
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolios" ON portfolios
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolios" ON portfolios
    FOR DELETE USING (auth.uid() = user_id);

-- Users can only see transactions in their portfolios
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (
        portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can insert own transactions" ON transactions
    FOR INSERT WITH CHECK (
        portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update own transactions" ON transactions
    FOR UPDATE USING (
        portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can delete own transactions" ON transactions
    FOR DELETE USING (
        portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid())
    );

-- ============================================
-- Trigger to update portfolio's updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_portfolio_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE portfolios SET updated_at = NOW() WHERE id = NEW.portfolio_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_portfolio_on_transaction
AFTER INSERT OR UPDATE ON transactions
FOR EACH ROW EXECUTE FUNCTION update_portfolio_timestamp();
