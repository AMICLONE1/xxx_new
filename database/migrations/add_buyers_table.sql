-- Migration: Add buyers table for marketplace
-- Date: 2025-01-05
-- Description: Creates buyers table to support marketplace buy/sell functionality

CREATE TABLE IF NOT EXISTS public.buyers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  location JSONB, -- { lat: number, lng: number, address?: string }
  max_price_per_unit DECIMAL(10, 2) NOT NULL,
  energy_needed DECIMAL(10, 2) NOT NULL,
  preferred_delivery_window TEXT, -- e.g., "6:00 AM - 8:00 PM"
  rating DECIMAL(3, 2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'fulfilled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_buyers_user_id ON public.buyers(user_id);
CREATE INDEX IF NOT EXISTS idx_buyers_status ON public.buyers(status);
CREATE INDEX IF NOT EXISTS idx_buyers_location ON public.buyers USING GIN(location);

-- Row Level Security (RLS)
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all active buyers
CREATE POLICY "Buyers are viewable by everyone" ON public.buyers
  FOR SELECT
  USING (status = 'active');

-- Policy: Users can insert their own buyer listings
CREATE POLICY "Users can insert their own buyer listings" ON public.buyers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own buyer listings
CREATE POLICY "Users can update their own buyer listings" ON public.buyers
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own buyer listings
CREATE POLICY "Users can delete their own buyer listings" ON public.buyers
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_buyers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_buyers_updated_at
  BEFORE UPDATE ON public.buyers
  FOR EACH ROW
  EXECUTE FUNCTION update_buyers_updated_at();

