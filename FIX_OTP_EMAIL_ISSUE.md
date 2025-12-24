# Fix: OTP Not Coming, Only Email Confirmation

## Problem
You're receiving email confirmation instead of OTP code when trying to sign in.

## Root Cause
Supabase is configured to send email confirmation first. For OTP authentication, this setting needs to be disabled.

## Solution: Configure Supabase Settings

### Step 1: Disable Email Confirmation (CRITICAL)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `ncejoqiddhaxuetjhjrs`
3. Navigate to **Authentication** → **Providers**
4. Click on **Email** provider
5. **IMPORTANT:** Turn **OFF** the "Confirm email" toggle
   - This is the key setting that's causing the issue
   - When ON, Supabase sends confirmation emails instead of OTP
6. Click **Save**

### Step 2: Verify Email Templates

1. Go to **Authentication** → **Email Templates**
2. Check that **"OTP"** template is active
3. The OTP template should include the token variable
4. Subject should be something like: `Your PowerNetPro verification code`

### Step 3: Check Auth Settings

1. Go to **Settings** → **Auth**
2. Verify:
   - **Enable email signups:** ✅ ON
   - **Enable email confirmations:** ❌ OFF (for OTP flow)
   - **Enable email change confirmations:** ✅ ON (optional)

### Step 4: Test Again

After making these changes:
1. Try signing in again
2. You should now receive an OTP code (6 digits) instead of a confirmation email
3. The OTP will be in the email body, not a link

## Alternative: If You Want Email Confirmation

If you prefer to keep email confirmation enabled, users will need to:
1. Click the confirmation link in the email first
2. Then request OTP again
3. This is a two-step process

**For OTP-only flow (recommended):** Keep "Confirm email" **OFF**

## Code Changes Made

The code has been updated to:
- ✅ Better handle OTP sending
- ✅ Improved error messages
- ✅ Support both email and signup OTP types
- ✅ Better logging for debugging

## Verification

After fixing Supabase settings, the OTP email should:
- ✅ Contain a 6-digit code
- ✅ Be sent immediately (not a confirmation link)
- ✅ Work with the OTP screen in the app

## Still Not Working?

1. **Check Supabase Logs:**
   - Go to **Logs** → **Auth Logs**
   - Look for `signInWithOtp` requests
   - Check for any errors

2. **Check Email Template:**
   - Ensure OTP template includes: `{{ .Token }}` or similar
   - The code should be visible in the email

3. **Test with Supabase CLI:**
   ```bash
   # Test OTP sending
   supabase auth test-otp your-email@example.com
   ```

4. **Check Rate Limits:**
   - Free tier: 4 emails/hour
   - If exceeded, wait or upgrade plan

## Quick Fix Summary

**The main fix:** In Supabase Dashboard → Authentication → Providers → Email → Turn **OFF** "Confirm email"

This will make Supabase send OTP codes directly instead of confirmation emails.

