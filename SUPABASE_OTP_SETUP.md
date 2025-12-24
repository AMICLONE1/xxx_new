# Supabase OTP Email Configuration Guide

## Issue: Only Email Confirmation, No OTP

If you're receiving email confirmation instead of OTP, follow these steps:

### Step 1: Check Supabase Authentication Settings

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Click on **Email** provider

### Step 2: Configure Email Provider Settings

**Important Settings:**

1. **Enable Email provider:** ✅ ON
2. **Confirm email:** ⚠️ Set to **OFF** (for OTP flow)
   - If this is ON, Supabase will send confirmation emails instead of OTP
   - For OTP authentication, email confirmation should be disabled
3. **Secure email change:** ✅ ON (recommended)

### Step 3: Configure Email Templates

1. Go to **Authentication** → **Email Templates**
2. Find **"Magic Link"** template
3. **Disable Magic Link** or ensure OTP template is active
4. Check **"OTP"** template:
   - Subject: `Your PowerNetPro verification code`
   - Body should include: `{{ .Token }}` or `{{ .TokenHash }}`
   - The OTP code should be clearly visible

### Step 4: Verify Email Settings

1. Go to **Settings** → **Auth**
2. Check **"Enable email confirmations"**: Should be **OFF** for OTP flow
3. Check **"Enable email signups"**: Should be **ON**

### Step 5: Test OTP Sending

The code has been updated to explicitly request OTP. If you still get confirmation emails:

1. **Check Supabase Logs:**
   - Go to **Logs** → **Auth Logs**
   - Look for the signInWithOtp request
   - Check for any errors

2. **Verify Email Template:**
   - The OTP template should be active
   - Magic link template should be disabled or not used

### Step 6: Alternative - Use Magic Link with OTP

If OTP still doesn't work, you can temporarily use magic link:

```typescript
// In src/services/supabase/authService.ts
// Alternative method using magic link
const { data, error } = await supabase.auth.signInWithOtp({
  email: data.email.toLowerCase().trim(),
  options: {
    emailRedirectTo: 'yourapp://auth/callback',
  },
});
```

### Common Issues:

1. **Email confirmation enabled:** Disable it in Auth settings
2. **Wrong email template:** Ensure OTP template is active
3. **Magic link instead of OTP:** Disable magic link or use OTP template
4. **Email not configured:** Check Supabase email settings

### Quick Fix:

1. In Supabase Dashboard → **Authentication** → **Providers** → **Email**
2. Turn **OFF** "Confirm email"
3. Save changes
4. Try signing in again

The OTP should now be sent directly to your email inbox.

