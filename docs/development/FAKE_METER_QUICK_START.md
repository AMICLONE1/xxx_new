# 🚀 Fake Energy Meter - Quick Start

## ✅ Phase 1 Implementation Complete!

The fake energy meter system is now fully integrated and ready to use.

---

## 📝 Registration Form - What to Enter

### **Simple Answer: Use ANY Values!**

Since we're using fake data generation, you can enter **any values** in the registration form. Here's what works:

### Example Values (Copy & Paste Ready):

```
┌─────────────────────────────────────┐
│ DISCOM Name:        MSEDCL          │
│ Consumer Number:    123456789       │
│ Meter Serial ID:    FAKE-METER-001  │
│ Electricity Bill:   [Any image]     │
└─────────────────────────────────────┘
```

### Or Use These:

```
DISCOM Name:        Tata Power
Consumer Number:    987654321
Meter Serial ID:    TEST-METER-123
Electricity Bill:   [Upload any image]
```

**It doesn't matter what you enter - the system will generate fake data automatically!**

---

## 🎯 What Happens

1. **Fill the form** with any values
2. **Submit** - Meter is auto-verified ✅
3. **Fake data generation starts** immediately:
   - Historical data (last 24 hours) generated
   - Real-time data every 15 minutes
   - Data stored in Supabase
4. **HomeScreen updates** with energy data
5. **Charts display** generation curves

---

## 📊 Generated Data

### Solar Generation Pattern:
- **6 AM - 10 AM:** Ramp up (0% → 80%)
- **10 AM - 3 PM:** Peak generation (80-100%)
- **3 PM - 6 PM:** Ramp down (80% → 0%)
- **6 PM - 6 AM:** Zero generation (night)

### Consumption Pattern:
- **Base Load:** 0.5 kW (24/7)
- **Peak Hours:** 6-9 AM, 6-10 PM (up to 2.0 kW)
- **Random Variation:** ±30%

### Default Settings:
- **Solar Capacity:** 5.0 kW
- **Daily Target:** 25.0 kWh
- **Weather Variation:** ±20%

---

## ✅ Verification Checklist

After registering, check:

- [ ] Meter shows as "verified" in Meter Status screen
- [ ] HomeScreen shows current generation (kW)
- [ ] Daily yield is displayed (kWh)
- [ ] Energy charts show data
- [ ] New data appears every 15 minutes
- [ ] Data is stored in Supabase

---

## 🔧 Files Created

1. ✅ `src/utils/meterConfig.ts` - Configuration
2. ✅ `src/services/mock/meterSimulator.ts` - Data generator
3. ✅ `src/services/mock/backgroundDataGenerator.ts` - Background service
4. ✅ Updated `src/services/api/meterService.ts` - Integration
5. ✅ Updated `src/screens/meter/MeterRegistrationScreen.tsx` - Auto-start

---

## 🎉 Ready to Test!

1. **Open the app**
2. **Go to Profile → Meter Settings** (or Register Meter)
3. **Fill form with any values** (use examples above)
4. **Submit**
5. **Go to Home Screen** - See your fake energy data! 🎉

---

**Status:** ✅ **COMPLETE & READY TO USE**

