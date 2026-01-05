# Fix Manifest Cache - Complete Solution

## ⚠️ Problem

Expo manifest still shows old URL:
```json
"apiBaseUrl": "https://ncejoqiddhaxuetjhjrs.supabase.co/rest/v1"
```

But `app.json` has:
```json
"apiBaseUrl": "https://xxxmapnp-production.up.railway.app"
```

---

## ✅ Complete Fix

### Step 1: Stop ALL Expo/Node Processes

**In PowerShell:**
```powershell
# Stop all Node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Stop Expo if running
Get-Process expo -ErrorAction SilentlyContinue | Stop-Process -Force
```

**Or manually:**
- Close all terminal windows
- Close VS Code if running Expo
- Check Task Manager for Node processes

### Step 2: Delete ALL Cache Folders

```powershell
# Delete Expo cache
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue

# Delete node_modules cache
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue

# Delete Metro cache
Remove-Item -Recurse -Force $env:TEMP\metro-* -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $env:TEMP\react-* -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $env:TEMP\haste-* -ErrorAction SilentlyContinue
```

### Step 3: Verify app.json

Make sure `app.json` line 56 has:
```json
"apiBaseUrl": "https://xxxmapnp-production.up.railway.app"
```

### Step 4: Start Fresh

```powershell
# Open NEW terminal
cd D:\PowerNetPro\xxx_MA_PNP

# Start with clear cache
npm start -- --clear
```

### Step 5: Reload App

- Shake device → Reload
- Or press `r` in terminal
- Or close and reopen Expo Go app

---

## 🔍 Verify Fix

After restart, check manifest. Should show:
```json
"apiBaseUrl": "https://xxxmapnp-production.up.railway.app"
```

---

## 💡 About Port 3000

**Local Backend (port 3000):**
- Running on your computer
- Only accessible from your computer
- Good for testing backend code
- NOT accessible from mobile app

**Railway Backend:**
- Running on Railway servers
- Accessible from anywhere
- Mobile app uses this
- URL: `https://xxxmapnp-production.up.railway.app`

**Your mobile app needs Railway backend, not localhost!**

---

## 🚀 Quick Script

Save this as `clear-cache.ps1`:

```powershell
# Stop processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Clear caches
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue

Write-Host "Cache cleared! Now run: npm start -- --clear"
```

Run it:
```powershell
.\clear-cache.ps1
```

---

## ✅ After Fix

1. Manifest should show Railway URL
2. App will use Railway backend
3. API calls will go to Railway
4. Local backend (port 3000) is just for testing

---

**Try this complete fix and let me know if manifest updates!**

