-- Migration: Update buyers and sellers tables with energy metrics
-- Date: 2025-01-17
-- Description: Adds energy consumption/generation metrics and status columns to buyers and sellers tables

-- ============================================
-- UPDATE SELLERS TABLE
-- ============================================

-- Add new columns for seller energy metrics
ALTER TABLE public.sellers
ADD COLUMN IF NOT EXISTS avg_generation DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS peak_generation DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_export DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_energy_sold DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended'));

-- Add index for seller status
CREATE INDEX IF NOT EXISTS idx_sellers_status ON public.sellers(status);

-- Row Level Security for sellers (if not already enabled)
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Sellers are viewable by everyone" ON public.sellers;
DROP POLICY IF EXISTS "Users can insert their own seller listings" ON public.sellers;
DROP POLICY IF EXISTS "Users can update their own seller listings" ON public.sellers;
DROP POLICY IF EXISTS "Users can delete their own seller listings" ON public.sellers;

-- Policy: Users can view all active sellers
CREATE POLICY "Sellers are viewable by everyone" ON public.sellers
  FOR SELECT
  USING (status = 'active' OR status IS NULL);

-- Policy: Users can insert their own seller listings
CREATE POLICY "Users can insert their own seller listings" ON public.sellers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own seller listings
CREATE POLICY "Users can update their own seller listings" ON public.sellers
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own seller listings
CREATE POLICY "Users can delete their own seller listings" ON public.sellers
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update sellers updated_at timestamp
CREATE OR REPLACE FUNCTION update_sellers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_sellers_updated_at ON public.sellers;
CREATE TRIGGER update_sellers_updated_at
  BEFORE UPDATE ON public.sellers
  FOR EACH ROW
  EXECUTE FUNCTION update_sellers_updated_at();

-- ============================================
-- UPDATE BUYERS TABLE
-- ============================================

-- Add new columns for buyer energy metrics
ALTER TABLE public.buyers
ADD COLUMN IF NOT EXISTS avg_consumption DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS peak_consumption DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_energy_bought DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS green_energy_preference BOOLEAN DEFAULT false;

-- ============================================
-- VERIFY SCHEMA UPDATES
-- ============================================
SELECT
  table_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('buyers', 'sellers')
ORDER BY table_name, ordinal_position;
