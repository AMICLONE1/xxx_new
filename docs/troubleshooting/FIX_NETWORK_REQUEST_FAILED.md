# Fix: Network Request Failed Error

## 🔍 Problem

The app shows "Network request failed" error when trying to sign up or sign in. This is typically caused by:

1. **Android Emulator Network Issues**: Emulator can't reach Supabase servers
2. **Network Configuration**: Emulator network settings not properly configured
3. **Firewall/Proxy**: Network restrictions blocking Supabase
4. **DNS Issues**: Emulator can't resolve Supabase domain

## ✅ Solutions

### Solution 1: Fix Android Emulator Network (Recommended)

#### Option A: Use NAT Network (Default)
1. Open Android Studio
2. Go to **Tools → Device Manager**
3. Click **Edit** (pencil icon) on your emulator
4. Click **Show Advanced Settings**
5. Under **Network**, ensure it's set to **NAT**
6. Click **Finish**
7. **Restart the emulator**

#### Option B: Use Bridged Network
1. Open Android Studio
2. Go to **Tools → Device Manager**
3. Click **Edit** on your emulator
4. Click **Show Advanced Settings**
5. Under **Network**, change to **Bridged**
6. Select your network adapter
7. Click **Finish**
8. **Restart the emulator**

#### Option C: Reset Network Settings
1. In Android emulator, go to **Settings → Network & Internet**
2. Tap **Reset Wi-Fi, mobile & Bluetooth**
3. Confirm reset
4. Restart emulator

### Solution 2: Test Network Connectivity

#### In Android Emulator:
1. Open **Browser** app in emulator
2. Try to access: `https://ncejoqiddhaxuetjhjrs.supabase.co`
3. If it loads → Network is working
4. If it doesn't load → Network issue (use Solution 1)

### Solution 3: Use Physical Device Instead

If emulator network issues persist:
1. Connect your Android phone via USB
2. Enable **USB Debugging** on phone
3. Run: `npx expo start`
4. Press `a` to open on Android device
5. Physical devices usually have better network connectivity

### Solution 4: Check Firewall/Antivirus

1. **Windows Firewall**: 
   - Allow Node.js and Expo through firewall
   - Allow Android emulator network access

2. **Antivirus**:
   - Temporarily disable to test
   - Add exceptions for Node.js and Android emulator

3. **Corporate Network**:
   - May block Supabase
   - Try on different network (mobile hotspot)

### Solution 5: Use Mobile Hotspot

If on corporate/restricted network:
1. Create mobile hotspot on your phone
2. Connect your PC to hotspot
3. Restart Android emulator
4. Try again

## 🔧 Code Fixes Applied

### Enhanced Error Handling
- ✅ Better error messages for network failures
- ✅ Specific guidance for Android emulator issues
- ✅ Timeout protection (15 seconds)
- ✅ Graceful error handling

### Files Modified:
- `src/services/supabase/authService.ts` - Added network error handling

## 📋 Quick Fix Steps

1. **Restart Android Emulator**:
   ```bash
   # Close emulator completely
   # Restart from Android Studio
   ```

2. **Reset Emulator Network**:
   - Settings → Network → Reset
   - Restart emulator

3. **Test Connectivity**:
   - Open browser in emulator
   - Visit: `https://ncejoqiddhaxuetjhjrs.supabase.co`
   - Should load Supabase API page

4. **Restart Expo**:
   ```bash
   npx expo start --clear
   ```

5. **Try Sign Up/Sign In Again**

## 🐛 If Still Not Working

### Check Console Logs:
Look for specific error messages:
- `Network request failed` → Network connectivity issue
- `timeout` → Supabase unreachable
- `DNS` → DNS resolution issue

### Alternative: Use Physical Device
Physical Android devices usually work better:
```bash
npx expo start
# Then press 'a' for Android device
```

### Check Supabase Status:
Visit: https://status.supabase.com
- Verify Supabase services are operational

### Verify Supabase URL:
Check `app.json`:
```json
{
  "expo": {
    "extra": {
      "supabaseUrl": "https://ncejoqiddhaxuetjhjrs.supabase.co"
    }
  }
}
```

## ✅ Expected Behavior After Fix

1. **Network errors show helpful messages** instead of generic "Network request failed"
2. **Specific guidance** for Android emulator issues
3. **Timeout protection** prevents infinite hanging
4. **Better error recovery** with clear next steps

## 📝 Common Error Messages

### "Network request failed"
**Cause**: Android emulator can't reach Supabase  
**Fix**: Use Solution 1 (Fix Emulator Network)

### "Sign up request timeout"
**Cause**: Supabase unreachable or slow  
**Fix**: Check network, try physical device

### "Invalid email or password"
**Cause**: Wrong credentials (not network issue)  
**Fix**: Check email/password, try sign up first

---

**Status**: ✅ Enhanced error handling applied - Follow solutions above to fix network connectivity

