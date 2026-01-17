-- Migration: Fix RLS policies for public read access to sellers and buyers
-- Run this in your Supabase SQL Editor
-- Date: 2026-01-17

-- ============================================
-- FIX SELLERS TABLE RLS
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Sellers are viewable by everyone" ON public.sellers;
DROP POLICY IF EXISTS "Public can view active sellers" ON public.sellers;

-- Create policy for public read access to active sellers
-- This allows anyone (authenticated or not) to view active sellers
CREATE POLICY "Public can view active sellers" ON public.sellers
  FOR SELECT
  USING (status = 'active' OR status IS NULL);

-- ============================================
-- FIX BUYERS TABLE RLS
-- ============================================

-- Enable RLS on buyers if not already enabled
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Buyers are viewable by everyone" ON public.buyers;
DROP POLICY IF EXISTS "Public can view active buyers" ON public.buyers;
DROP POLICY IF EXISTS "Users can insert their own buyer listings" ON public.buyers;
DROP POLICY IF EXISTS "Users can update their own buyer listings" ON public.buyers;

-- Create policy for public read access to active buyers
CREATE POLICY "Public can view active buyers" ON public.buyers
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

-- ============================================
-- VERIFY RLS IS WORKING
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('sellers', 'buyers')
ORDER BY tablename, policyname;

-- ============================================
-- INSERT TEST DATA (OPTIONAL - for testing)
-- ============================================
-- Uncomment and modify if you need test data:
/*
INSERT INTO public.sellers (user_id, name, location, price_per_unit, available_energy, green_energy, status)
VALUES 
  ('YOUR_USER_ID_HERE', 'Test Solar Farm', '{"lat": 18.5204, "lng": 73.8567}', 7.50, 100, true, 'active');
*/
