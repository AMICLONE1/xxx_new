# Database Migration Guide

## Quick Fix for Missing Columns

If you're getting the error: `Could not find the 'address' column of 'kyc_documents'`

### Option 1: Quick Migration (Recommended)
Run this in Supabase SQL Editor:

```sql
-- Add missing columns to kyc_documents table
ALTER TABLE public.kyc_documents 
ADD COLUMN IF NOT EXISTS date_of_birth TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS file_url TEXT;
```

### Option 2: Complete Schema
Run `database/COMPLETE_SCHEMA.sql` to create/update all tables with proper schema.

## Files

- `migrations/add_kyc_columns.sql` - Adds missing columns to kyc_documents
- `COMPLETE_SCHEMA.sql` - Complete database schema for all tables

## Steps

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the migration SQL
4. Click "Run"
5. Verify columns were added

## Verify

Run this to check if columns exist:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'kyc_documents'
ORDER BY ordinal_position;
```

You should see:
- `date_of_birth` (TEXT)
- `address` (TEXT)
- `file_url` (TEXT)

