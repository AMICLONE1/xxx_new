# PowerNetPro - Quick Start Guide

**⚡ Get up and running in 15 minutes!**

---

## 🚀 Super Quick Setup (For Experienced Developers)

```bash
# 1. Clone repo
git clone https://github.com/YOUR_USERNAME/xxx_MA_PNP.git
cd xxx_MA_PNP

# 2. Install dependencies
npm install
cd backend && npm install && cd ..

# 3. Setup environment files
cp .env.example .env
cp backend/env.example.txt backend/.env

# 4. Start backend (Terminal 1)
cd backend && npm run dev

# 5. Start mobile app (Terminal 2)
npm start
# Press 'a' for Android
```

---

## 📋 Essential Environment Variables

### Root `.env` file:
```env
EXPO_PUBLIC_SUPABASE_URL=https://ncejoqiddhaxuetjhjrs.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key_here
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000  # For Android emulator
```

### `backend/.env` file:
```env
PORT=3000
SUPABASE_URL=https://ncejoqiddhaxuetjhjrs.supabase.co
SUPABASE_ANON_KEY=your_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_key_here
RAZORPAY_KEY_ID=rzp_test_xxxxx  # Optional
RAZORPAY_KEY_SECRET=your_secret  # Optional
```

---

## 🗄️ Database Setup (5 minutes)

1. **Create Supabase Account**: https://supabase.com
2. **Create New Project**: Name it "PowerNetPro"
3. **Get Credentials**: Settings > API > Copy URL and anon key
4. **Run Schema**: 
   - Open SQL Editor
   - Copy `database/COMPLETE_SCHEMA.sql`
   - Paste and Run
5. **Enable RLS**: Already included in schema

**Done!** ✅

---

## 🔍 OCR Setup (IMPORTANT!)

**⚠️ OCR ONLY works in Development Builds, NOT Expo Go!**

```bash
# For Android
npx expo run:android

# For iOS (macOS only)
npx expo run:ios
```

**Alternative**: Use Google Cloud Vision API (fallback):
1. Enable Cloud Vision API in Google Cloud Console
2. Create API key
3. Add to `.env`: `EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY=your_key`

---

## 📱 Testing on Devices

### Android Emulator
```env
# Use this in .env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
```

### iOS Simulator
```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

### Physical Device
```bash
# Find your computer's local IP
ipconfig  # Windows
ifconfig  # macOS/Linux

# Use your IP in .env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:3000
```

---

## 🐛 Common Issues & Quick Fixes

### "Cannot connect to backend"
```bash
# Check backend is running
curl http://localhost:3000/health

# Check firewall (Windows)
netsh advfirewall firewall add rule name="Node.js" dir=in action=allow protocol=TCP localport=3000
```

### "Module not found"
```bash
npm install
npx expo start --clear
```

### "Android build failed"
```bash
cd android && ./gradlew clean && cd ..
npx expo run:android
```

### "OCR not working"
**Cause**: Running in Expo Go  
**Solution**: Build development build with `npx expo run:android`

---

## 📂 Project Structure

```
xxx_MA_PNP/
├── src/
│   ├── components/       # Reusable UI components
│   ├── screens/         # App screens (auth, kyc, trading, etc.)
│   ├── services/        # API clients, OCR, location
│   ├── store/           # Zustand state management
│   ├── navigation/      # React Navigation setup
│   └── types/           # TypeScript definitions
├── backend/
│   └── src/
│       └── index.ts     # Express API server
├── database/
│   └── COMPLETE_SCHEMA.sql  # Database schema
├── docs/                # Full documentation
└── COMPLETE_SETUP_GUIDE.md  # Detailed guide
```

---

## 🧪 Test User Flows

### 1. Authentication
```
1. Open app
2. Enter phone: +91 9876543210
3. Get OTP from backend console logs
4. Enter OTP
5. → Home screen
```

### 2. KYC Verification
```
1. Profile > KYC Verification
2. Upload/scan Aadhaar, PAN, Electricity Bill
3. Verify extracted data
4. Submit
```

### 3. Energy Trading
```
1. Navigate to Marketplace
2. View sellers on map
3. Tap marker > View Details
4. Buy/Sell energy
5. Check History in Profile
```

---

## ⚠️ Known Limitations

1. **OCR**: Development build required (not Expo Go)
2. **Payments**: Razorpay integration incomplete
3. **Real Data**: Using mock energy meter data
4. **Beckn Protocol**: Stub implementation only
5. **Trading Bot**: Not functional yet

**See `COMPLETE_SETUP_GUIDE.md` for full details.**

---

## 🔒 Security Checklist

- [ ] Change default JWT_SECRET in `backend/.env`
- [ ] Never commit `.env` files
- [ ] Use different keys for dev/production
- [ ] Enable RLS policies on all tables
- [ ] Restrict API keys to specific domains

---

## 📞 Need Help?

1. **Full Documentation**: See `COMPLETE_SETUP_GUIDE.md`
2. **Known Issues**: See `COMPLETE_SETUP_GUIDE.md` section 10
3. **Troubleshooting**: See `COMPLETE_SETUP_GUIDE.md` section 14
4. **GitHub Issues**: Create an issue if stuck

---

## 📚 Key Documentation Files

| File | Purpose |
|------|---------|
| `COMPLETE_SETUP_GUIDE.md` | Comprehensive setup (15,000+ words) |
| `README.md` | Project overview |
| `docs/README.md` | Documentation index |
| `database/COMPLETE_SCHEMA.sql` | Database schema |
| `backend/README.md` | Backend API docs |

---

## ✅ Verification Checklist

- [ ] Backend running (`http://localhost:3000/health` returns JSON)
- [ ] App opens in emulator/simulator
- [ ] Can create account with phone/email
- [ ] Can navigate between tabs
- [ ] Map shows sellers (Marketplace tab)

**If all checked ✅, you're ready to develop!**

---

**Pro Tip**: Read `COMPLETE_SETUP_GUIDE.md` sections 10-12 for:
- Known issues (15+ documented issues)
- Security concerns (13+ vulnerabilities)
- Missing features (13+ TODO items)

**Happy Coding! 🚀**
