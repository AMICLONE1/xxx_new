-- Migration: Add missing columns to kyc_documents table
-- Run this in your Supabase SQL Editor

-- Check if columns exist, if not add them
DO $$ 
BEGIN
  -- Add date_of_birth column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'kyc_documents' 
    AND column_name = 'date_of_birth'
  ) THEN
    ALTER TABLE public.kyc_documents ADD COLUMN date_of_birth TEXT;
  END IF;

  -- Add address column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'kyc_documents' 
    AND column_name = 'address'
  ) THEN
    ALTER TABLE public.kyc_documents ADD COLUMN address TEXT;
  END IF;

  -- Add file_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'kyc_documents' 
    AND column_name = 'file_url'
  ) THEN
    ALTER TABLE public.kyc_documents ADD COLUMN file_url TEXT;
  END IF;
END $$;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'kyc_documents'
ORDER BY ordinal_position;

