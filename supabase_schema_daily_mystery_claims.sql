-- Updated Supabase Schema for 24-Hour Rolling Cooldown
-- Allows tracking exact claim timestamps and fast rolling cooldown checks.

CREATE TABLE IF NOT EXISTS public.daily_mystery_claims (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    room_id TEXT NOT NULL,
    claim_date TEXT,
    claimed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    card_id TEXT
);

-- Indexes for fast 24-hour rolling cooldown queries
CREATE INDEX IF NOT EXISTS idx_daily_claims_wallet_time 
    ON public.daily_mystery_claims (wallet_address, claimed_at DESC);

CREATE INDEX IF NOT EXISTS idx_daily_claims_room_time 
    ON public.daily_mystery_claims (room_id, claimed_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.daily_mystery_claims ENABLE ROW LEVEL SECURITY;

-- Allow public read & insert policies
CREATE POLICY "Allow public select on daily_mystery_claims" 
    ON public.daily_mystery_claims 
    FOR SELECT 
    USING (true);

CREATE POLICY "Allow public insert on daily_mystery_claims" 
    ON public.daily_mystery_claims 
    FOR INSERT 
    WITH CHECK (true);
