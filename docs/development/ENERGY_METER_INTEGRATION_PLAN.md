# Energy Meter Integration Plan

## 📋 Overview

This document outlines the complete plan for integrating both **Fake Energy Meter Simulation** (for development/testing) and **Real Energy Meter Integration** (for production).

---

## 🎯 Phase 1: Fake Energy Meter Simulation

### Goal
Create a realistic energy meter simulator that generates fake data for development, testing, and demos without requiring physical hardware.

### ✅ What Already Exists

1. **Data Structure** ✅
   - `EnergyData` interface defined in `src/types/index.ts`
   - Database schema in Supabase (`energy_data` table)
   - Local storage schema in WatermelonDB

2. **Storage & State** ✅
   - `meterStore.ts` - Zustand store for energy data
   - `databaseService.ts` - Supabase integration
   - `offlineStorage.ts` - MMKV caching

3. **UI Components** ✅
   - `HomeScreen.tsx` - Displays energy data
   - `EnergyChartScreen.tsx` - Charts for energy data
   - Energy flow visualization

### ❌ What Needs to Be Built

#### 1. Meter Simulator Service
**File:** `src/services/mock/meterSimulator.ts`

**Features:**
- Generate realistic solar generation data (time-based curve)
- Generate realistic consumption data (peak hours, base load)
- Simulate weather variations
- Generate data for any time range
- Support multiple meters
- Configurable parameters (solar capacity, consumption patterns)

**Key Functions:**
```typescript
class MeterSimulator {
  generateEnergyData(
    meterId: string,
    startDate: Date,
    endDate: Date,
    config?: MeterConfig
  ): EnergyData[]
  
  generateRealTimeData(meterId: string): EnergyData
  
  simulateWeatherVariation(baseGeneration: number): number
}
```

#### 2. Background Data Generator
**File:** `src/services/mock/backgroundDataGenerator.ts`

**Features:**
- Run in background (using `expo-task-manager` or `setInterval`)
- Generate data every 15 minutes (standard interval)
- Store data in both Supabase and local store
- Handle app background/foreground states

#### 3. Configuration
**File:** `src/utils/meterConfig.ts`

**Features:**
- Default meter configurations
- Solar capacity settings
- Consumption patterns
- Weather simulation parameters
- Enable/disable mock mode

#### 4. Integration Points
- Update `meterService.ts` to use simulator when in mock mode
- Update `HomeScreen.tsx` to fetch from simulator
- Add toggle in settings to enable/disable mock mode

---

## 🔧 Phase 2: Real Energy Meter Integration

### Goal
Integrate with real smart meters via APIs, IoT devices, or direct connections.

### ❌ What Needs to Be Built

#### 1. Meter API Service
**File:** `src/services/api/realMeterService.ts`

**Features:**
- Connect to meter manufacturer APIs
- Support multiple meter types (LoRaWAN, WiFi, Zigbee, etc.)
- Handle authentication and API keys
- Poll for real-time data
- WebSocket support for live updates

**Supported Meter Types:**
- **LoRaWAN Meters** (e.g., Actility, The Things Network)
- **WiFi Smart Meters** (e.g., generic IoT devices)
- **Zigbee Meters** (e.g., Zigbee Home Automation)
- **Modbus Meters** (e.g., industrial meters)
- **REST API Meters** (e.g., custom backend)

#### 2. Meter Connection Manager
**File:** `src/services/meter/connectionManager.ts`

**Features:**
- Manage multiple meter connections
- Handle connection failures and retries
- Queue data when offline
- Sync data when connection restored
- Health monitoring

#### 3. Data Validation Service
**File:** `src/services/meter/dataValidator.ts`

**Features:**
- Validate incoming meter data
- Detect anomalies (spikes, zeros, negative values)
- Flag suspicious readings
- Alert on data quality issues

#### 4. Meter Protocol Adapters
**Files:**
- `src/services/meter/protocols/loraWanAdapter.ts`
- `src/services/meter/protocols/wifiAdapter.ts`
- `src/services/meter/protocols/zigbeeAdapter.ts`
- `src/services/meter/protocols/modbusAdapter.ts`
- `src/services/meter/protocols/restApiAdapter.ts`

**Features:**
- Protocol-specific implementations
- Unified interface for all protocols
- Easy to add new protocols

#### 5. Real-Time Data Sync
**File:** `src/services/meter/realtimeSync.ts`

**Features:**
- WebSocket connections for live data
- Polling fallback for meters without WebSocket
- Efficient data batching
- Conflict resolution

---

## 📊 Implementation Roadmap

### Step 1: Fake Meter Simulation (Week 1-2)

#### Day 1-2: Core Simulator
- [ ] Create `meterSimulator.ts` with basic generation logic
- [ ] Implement solar generation curve (time-based)
- [ ] Implement consumption patterns
- [ ] Add weather variation simulation

#### Day 3-4: Data Generation
- [ ] Create background data generator
- [ ] Integrate with `meterStore`
- [ ] Store data in Supabase
- [ ] Add local caching

#### Day 5-7: Integration & Testing
- [ ] Update `meterService.ts` to use simulator
- [ ] Update `HomeScreen.tsx` to fetch simulated data
- [ ] Test data flow end-to-end
- [ ] Add configuration UI

#### Day 8-10: Advanced Features
- [ ] Add multiple meter support
- [ ] Add different scenarios (cloudy day, peak consumption)
- [ ] Add battery simulation (optional)
- [ ] Performance optimization

#### Day 11-14: Polish & Documentation
- [ ] Add error handling
- [ ] Write unit tests
- [ ] Update documentation
- [ ] Create demo scenarios

### Step 2: Real Meter Integration (Week 3-6)

#### Week 3: Foundation
- [ ] Design meter API architecture
- [ ] Create protocol adapter interface
- [ ] Implement REST API adapter (simplest)
- [ ] Add connection manager

#### Week 4: Protocol Support
- [ ] Implement LoRaWAN adapter
- [ ] Implement WiFi adapter
- [ ] Add WebSocket support
- [ ] Test with sample meters

#### Week 5: Data Handling
- [ ] Implement data validator
- [ ] Add real-time sync
- [ ] Handle offline scenarios
- [ ] Add error recovery

#### Week 6: Integration & Testing
- [ ] Integrate with existing UI
- [ ] Test with real meters
- [ ] Performance optimization
- [ ] Documentation

---

## 🏗️ Technical Architecture

### Fake Meter Flow
```
MeterSimulator
    ↓
BackgroundGenerator (every 15 min)
    ↓
meterStore.addEnergyData()
    ↓
SupabaseDatabaseService.insertEnergyData()
    ↓
HomeScreen displays data
```

### Real Meter Flow
```
Real Meter (LoRaWAN/WiFi/etc.)
    ↓
Protocol Adapter
    ↓
ConnectionManager
    ↓
DataValidator
    ↓
meterStore.addEnergyData()
    ↓
SupabaseDatabaseService.insertEnergyData()
    ↓
HomeScreen displays data
```

---

## 📝 Detailed Implementation

### 1. Meter Simulator Service

**File:** `src/services/mock/meterSimulator.ts`

```typescript
interface MeterConfig {
  solarCapacity: number;      // kW (e.g., 5 kW)
  dailyTarget: number;        // kWh (e.g., 25 kWh)
  baseConsumption: number;    // kW (e.g., 0.5 kW)
  peakConsumption: number;    // kW (e.g., 2.0 kW)
  location?: {
    lat: number;
    lng: number;
  };
  weatherVariation?: boolean; // Enable weather simulation
}

class MeterSimulator {
  generateEnergyData(
    meterId: string,
    startDate: Date,
    endDate: Date,
    config: MeterConfig
  ): EnergyData[] {
    // Generate data points every 15 minutes
    // Solar generation: Bell curve during day (6 AM - 6 PM)
    // Consumption: Base load + peaks (6-9 AM, 6-10 PM)
    // Weather: Random variation ±20%
  }
}
```

### 2. Background Generator

**File:** `src/services/mock/backgroundDataGenerator.ts`

```typescript
class BackgroundDataGenerator {
  start(meterId: string, config: MeterConfig): void {
    // Generate data every 15 minutes
    // Store in Supabase and local store
  }
  
  stop(): void {
    // Stop generation
  }
}
```

### 3. Real Meter Service

**File:** `src/services/api/realMeterService.ts`

```typescript
interface MeterConnection {
  meterId: string;
  protocol: 'lora' | 'wifi' | 'zigbee' | 'modbus' | 'rest';
  config: ProtocolConfig;
  status: 'connected' | 'disconnected' | 'error';
}

class RealMeterService {
  connect(meter: MeterConnection): Promise<void>
  disconnect(meterId: string): Promise<void>
  getData(meterId: string): Promise<EnergyData>
  subscribe(meterId: string, callback: (data: EnergyData) => void): void
}
```

---

## 🔌 Meter Protocol Specifications

### 1. REST API Protocol
- **Endpoint:** `GET /api/meters/{meterId}/data`
- **Response:** `{ generation: number, consumption: number, timestamp: string }`
- **Polling:** Every 15 minutes

### 2. LoRaWAN Protocol
- **Platform:** The Things Network / Actility
- **Data Format:** JSON payload
- **Frequency:** As received (real-time)

### 3. WiFi Protocol
- **Connection:** Direct WiFi connection
- **Protocol:** MQTT or HTTP
- **Frequency:** Configurable (default 15 min)

### 4. WebSocket Protocol
- **Connection:** Persistent WebSocket
- **Data Format:** JSON
- **Frequency:** Real-time (as received)

---

## 🧪 Testing Strategy

### Fake Meter Testing
1. **Unit Tests:**
   - Test generation curves
   - Test consumption patterns
   - Test weather variations

2. **Integration Tests:**
   - Test data flow end-to-end
   - Test storage in Supabase
   - Test UI updates

3. **Scenario Tests:**
   - Normal day
   - Cloudy day
   - Peak consumption
   - Zero generation

### Real Meter Testing
1. **Connection Tests:**
   - Test protocol adapters
   - Test connection failures
   - Test reconnection

2. **Data Tests:**
   - Test data validation
   - Test anomaly detection
   - Test offline handling

3. **Integration Tests:**
   - Test with real meters
   - Test performance
   - Test error handling

---

## 📦 Dependencies Needed

### For Fake Meter
- ✅ Already have: Zustand, Supabase, MMKV
- ❌ May need: `expo-task-manager` for background tasks

### For Real Meter
- ❌ `@react-native-async-storage/async-storage` (already have)
- ❌ `react-native-mqtt` (for MQTT meters)
- ❌ `@react-native-community/netinfo` (already have)
- ❌ WebSocket library (native or polyfill)

---

## 🎯 Success Criteria

### Fake Meter
- ✅ Generates realistic data
- ✅ Updates every 15 minutes
- ✅ Stores in Supabase
- ✅ Displays correctly in UI
- ✅ Can be enabled/disabled

### Real Meter
- ✅ Connects to real meters
- ✅ Receives real-time data
- ✅ Validates data quality
- ✅ Handles errors gracefully
- ✅ Works offline

---

## 📚 Next Steps

1. **Start with Fake Meter** (easier, faster)
   - Build simulator service
   - Integrate with existing code
   - Test thoroughly

2. **Then Real Meter** (more complex)
   - Start with REST API (simplest)
   - Add other protocols gradually
   - Test with real hardware

3. **Documentation**
   - API documentation
   - Protocol specifications
   - Setup guides

---

**Status:** Planning Complete ✅  
**Next Action:** Start implementing Fake Meter Simulator

