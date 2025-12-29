-- Stock Master Table
-- Dynamic stock universe - NO hardcoding in code
-- This table is the single source of truth for all available stocks

CREATE TABLE IF NOT EXISTS stock_master (
  symbol TEXT PRIMARY KEY,          -- Yahoo format: RELIANCE.NS
  trading_symbol TEXT,              -- NSE format: RELIANCE
  isin TEXT UNIQUE,                 -- INE002A01018
  name TEXT NOT NULL,               -- Reliance Industries Ltd
  sector TEXT,
  industry TEXT,
  market_cap_cr DECIMAL,
  
  -- Exchange info
  exchange TEXT DEFAULT 'NSE',      -- NSE/BSE
  series TEXT,                      -- EQ, BE, etc.
  
  -- Index memberships (updated by cron job)
  is_nifty50 BOOLEAN DEFAULT FALSE,
  is_nifty100 BOOLEAN DEFAULT FALSE,
  is_nifty200 BOOLEAN DEFAULT FALSE,
  is_nifty500 BOOLEAN DEFAULT FALSE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_stock_master_trading_symbol ON stock_master(trading_symbol);
CREATE INDEX IF NOT EXISTS idx_stock_master_name ON stock_master(name);
CREATE INDEX IF NOT EXISTS idx_stock_master_sector ON stock_master(sector);
CREATE INDEX IF NOT EXISTS idx_stock_master_nifty50 ON stock_master(is_nifty50) WHERE is_nifty50 = TRUE;
CREATE INDEX IF NOT EXISTS idx_stock_master_nifty500 ON stock_master(is_nifty500) WHERE is_nifty500 = TRUE;

-- Full text search for autocomplete
CREATE INDEX IF NOT EXISTS idx_stock_master_search 
ON stock_master USING gin(to_tsvector('english', trading_symbol || ' ' || name));

-- Enable Row Level Security
ALTER TABLE stock_master ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access on stock_master"
ON stock_master FOR SELECT
USING (true);

-- Update the price cache to add TTL
ALTER TABLE structura_price_cache 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days');

-- Index for cache eviction
CREATE INDEX IF NOT EXISTS idx_price_cache_expiry 
ON structura_price_cache(expires_at);
