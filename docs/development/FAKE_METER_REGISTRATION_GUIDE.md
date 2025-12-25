# Fake Energy Meter Registration Guide

## 🎯 Quick Start

When registering a meter with **Fake Energy Meter** enabled, you can use **any values** in the registration form. The system will automatically start generating fake energy data.

---

## 📝 Registration Form Values

### ✅ What to Enter (Any Values Work!)

Since we're using fake data generation, you can use **any values** you want. Here are some example values:

#### **DISCOM Name**
- Select any DISCOM from the dropdown:
  - `MSEDCL` (recommended for testing)
  - `Tata Power`
  - `Adani Electricity`
  - `BSES Rajdhani`
  - `BSES Yamuna`
  - `TPDDL`
  - `NDMC`
  - `Other`

#### **Consumer Number**
Enter any number (it's just for display):
- `123456789`
- `987654321`
- `555555555`
- Or any 9-10 digit number

#### **Meter Serial ID**
Enter any alphanumeric string:
- `METER123456`
- `SM-2024-001`
- `FAKE-METER-001`
- Or any string you prefer

#### **Electricity Bill**
- You can upload **any image** (even a screenshot or placeholder)
- The OCR will try to extract data, but it's optional
- If OCR fails, you can manually enter the values above

---

## 🎯 Recommended Test Values

For quick testing, use these values:

```
DISCOM Name:        MSEDCL
Consumer Number:    123456789
Meter Serial ID:   FAKE-METER-001
Electricity Bill:   [Upload any image]
```

---

## ⚡ What Happens After Registration

1. **Meter is Auto-Verified** ✅
   - In fake mode, meters are automatically verified
   - No waiting for manual verification

2. **Fake Data Generation Starts** ✅
   - Historical data (last 24 hours) is generated immediately
   - Real-time data generation starts (every 15 minutes)
   - Data is stored in Supabase and local storage

3. **Energy Dashboard Updates** ✅
   - HomeScreen shows current generation
   - Daily yield is calculated
   - Energy charts display data
   - Energy flow visualization works

---

## 📊 Generated Data Characteristics

### Solar Generation
- **Peak Hours:** 10 AM - 3 PM (80-100% of capacity)
- **Ramp Up:** 6 AM - 10 AM (0-80% of capacity)
- **Ramp Down:** 3 PM - 6 PM (80-0% of capacity)
- **Night:** 6 PM - 6 AM (0 kW)
- **Weather Variation:** ±20% random variation

### Consumption
- **Base Load:** 0.5 kW (24/7)
- **Peak Hours:** 
  - Morning: 6 AM - 9 AM
  - Evening: 6 PM - 10 PM
- **Peak Consumption:** 2.0 kW during peak hours
- **Variation:** ±30% random variation

### Default Configuration
- **Solar Capacity:** 5.0 kW
- **Daily Target:** 25.0 kWh
- **Base Consumption:** 0.5 kW
- **Peak Consumption:** 2.0 kW

---

## 🔧 Configuration Options

You can customize the fake meter behavior by modifying the config in:
- `src/utils/meterConfig.ts`

Available presets:
- `small` - 3 kW system
- `medium` - 5 kW system (default)
- `large` - 10 kW system
- `commercial` - 50 kW system

---

## 🧪 Testing Scenarios

### Scenario 1: Normal Day
- Good solar generation during day
- Excess energy available for selling
- Normal consumption patterns

### Scenario 2: Cloudy Day
- Reduced generation (50-70% of normal)
- May need to buy energy
- Higher consumption

### Scenario 3: Peak Consumption
- High consumption during evening
- May exceed generation
- Need to buy from grid

---

## 📱 How to Verify It's Working

1. **Register a meter** using any values
2. **Go to Home Screen** - You should see:
   - Current generation (kW)
   - Daily yield (kWh)
   - Carbon saved
3. **Check Energy Charts** - Should show generation curve
4. **Wait 15 minutes** - New data point should appear
5. **Check Supabase** - Data should be stored in `energy_data` table

---

## 🐛 Troubleshooting

### No Data Appearing
- Check if meter is registered and verified
- Check console logs for errors
- Verify background generator is running

### Data Not Updating
- Background generator runs every 15 minutes
- Check app state (foreground/background)
- Restart app if needed

### Wrong Data Format
- Check `EnergyData` type definition
- Verify timestamp format
- Check Supabase schema

---

## ✅ Summary

**For Fake Meter Registration:**
- ✅ Use **any values** you want
- ✅ Meter is **auto-verified**
- ✅ Data generation **starts immediately**
- ✅ No real hardware needed
- ✅ Perfect for development and testing

**Example Values:**
```
DISCOM: MSEDCL
Consumer Number: 123456789
Meter Serial ID: FAKE-METER-001
Bill: [Any image]
```

---

**Status:** Ready to Use ✅  
**Last Updated:** December 2024

