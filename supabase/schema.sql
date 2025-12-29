-- Structura Database Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- User profiles extension (links to Supabase auth.users)
CREATE TABLE IF NOT EXISTS structura_profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved portfolio configurations
CREATE TABLE IF NOT EXISTS structura_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  assets JSONB NOT NULL, -- Array of ticker symbols
  date_range JSONB, -- {value: '1y' | '3y' | '5y' | 'full'}
  weights JSONB, -- Calculated HRP weights
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price data cache (reduces API calls)
CREATE TABLE IF NOT EXISTS structura_price_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  date DATE NOT NULL,
  open DECIMAL,
  high DECIMAL,
  low DECIMAL,
  close DECIMAL,
  volume BIGINT,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(symbol, date)
);

-- Enable Row Level Security
ALTER TABLE structura_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE structura_portfolios ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON structura_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON structura_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON structura_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for portfolios
CREATE POLICY "Users can view own portfolios" ON structura_portfolios
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own portfolios" ON structura_portfolios
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolios" ON structura_portfolios
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolios" ON structura_portfolios
  FOR DELETE USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_portfolios_user_id ON structura_portfolios(user_id);
CREATE INDEX idx_price_cache_symbol_date ON structura_price_cache(symbol, date);
