# PowerNetPro - Development Roadmap & Improvement Plan

**Last Updated:** January 5, 2026  
**Status:** Active Development

---

## 📊 Executive Summary

This document outlines the development roadmap for PowerNetPro, prioritizing:
1. **Critical Fixes**: Security vulnerabilities and breaking issues
2. **Core Features**: Completing partially implemented functionality
3. **Performance**: Optimization and scalability improvements
4. **User Experience**: UI/UX enhancements
5. **Future Enhancements**: Advanced features and integrations

**Estimated Timeline**: 6-12 months for MVP completion

---

## 🎯 Development Phases

### Phase 1: Critical Fixes & Stabilization (4-6 weeks)
**Goal**: Make the app production-ready and secure

### Phase 2: Core Feature Completion (8-10 weeks)
**Goal**: Finish all partially implemented features

### Phase 3: Performance & Optimization (6-8 weeks)
**Goal**: Improve speed, reduce battery drain, implement offline mode

### Phase 4: Advanced Features (12-16 weeks)
**Goal**: Add AI, blockchain, and advanced analytics

### Phase 5: Scale & Polish (Ongoing)
**Goal**: Scale infrastructure, refine UX, expand features

---

## 🚨 Phase 1: Critical Fixes & Stabilization

### 1.1 Security Hardening (Priority: CRITICAL)

#### Task 1: Implement Proper API Key Management
**Current Issue**: API keys exposed in source code  
**Impact**: High security risk  
**Effort**: 2 weeks

**Implementation:**
```typescript
// 1. Move all sensitive keys to backend
// backend/src/config/keys.ts
export const SECRETS = {
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID!,
    keySecret: process.env.RAZORPAY_KEY_SECRET!
  },
  googleCloud: {
    apiKey: process.env.GOOGLE_CLOUD_API_KEY!
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: '7d'
  }
};

// 2. Remove from frontend .env
// Only keep public keys (Supabase anon key is safe)

// 3. Use app-specific tokens
// backend/src/middleware/appAuth.ts
export const generateAppToken = async (userId: string) => {
  return jwt.sign({ userId, app: 'powernetpro' }, SECRETS.jwt.secret);
};
```

**Verification:**
- [ ] No sensitive keys in frontend code
- [ ] Backend validates all tokens
- [ ] Certificate pinning implemented (mobile)

---

#### Task 2: Add Rate Limiting
**Current Issue**: No protection against API abuse  
**Impact**: DDoS vulnerability  
**Effort**: 1 week

**Implementation:**
```bash
cd backend
npm install express-rate-limit redis
```

```typescript
// backend/src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL
});

export const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later.'
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  skipSuccessfulRequests: true
});

// Apply to routes
app.use('/api/', apiLimiter);
app.use('/auth/', authLimiter);
```

**Verification:**
- [ ] Rate limiting active on all API routes
- [ ] Different limits for different endpoints
- [ ] Returns 429 status when exceeded

---

#### Task 3: Strengthen RLS Policies
**Current Issue**: RLS policies not fully tested  
**Impact**: Data leakage risk  
**Effort**: 2 weeks

**Implementation:**
```sql
-- Test RLS with different user contexts
-- 1. Create test users
INSERT INTO auth.users (id, email) VALUES 
  ('user1-uuid', 'user1@test.com'),
  ('user2-uuid', 'user2@test.com');

-- 2. Test isolation
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub = 'user1-uuid';

-- User1 should only see their own data
SELECT * FROM meters; -- Should only return user1's meters

-- 3. Add comprehensive policies
CREATE POLICY "Users cannot see others' wallets" ON wallets
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Buyers and sellers see order details" ON orders
  FOR SELECT USING (
    auth.uid() = buyer_id OR 
    auth.uid() = seller_id OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- 4. Add audit logging
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for sensitive tables
CREATE FUNCTION log_audit() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (user_id, action, table_name, record_id, old_data, new_data)
  VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_wallets
AFTER INSERT OR UPDATE OR DELETE ON wallets
FOR EACH ROW EXECUTE FUNCTION log_audit();
```

**Verification:**
- [ ] All tables have RLS enabled
- [ ] Users cannot access others' data
- [ ] Admin role can access all data
- [ ] Audit log tracks sensitive operations

---

#### Task 4: Input Validation
**Current Issue**: No validation on backend endpoints  
**Impact**: Invalid data in database  
**Effort**: 2 weeks

**Implementation:**
```bash
cd backend
npm install zod
```

```typescript
// backend/src/validators/tradingValidators.ts
import { z } from 'zod';

export const searchSellersSchema = z.object({
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }).optional(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  greenEnergyOnly: z.boolean().optional(),
  minRating: z.number().min(0).max(5).optional(),
  radius: z.number().positive().max(100).optional() // Max 100km
});

export const executeTradeSchema = z.object({
  sellerId: z.string().uuid(),
  energyAmount: z.number().positive().max(1000), // Max 1000 kWh per trade
  pricePerUnit: z.number().positive(),
  tradeType: z.enum(['buy', 'sell'])
});

// Use in routes
app.post('/trading/search', verifyAuth, async (req, res) => {
  try {
    const validated = searchSellersSchema.parse(req.body);
    // Process validated data
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid request data',
        details: error.errors 
      });
    }
  }
});
```

**Verification:**
- [ ] All endpoints have validation schemas
- [ ] Returns 400 with clear error messages
- [ ] Prevents SQL injection attempts
- [ ] Sanitizes user input

---

#### Task 5: HTTPS Enforcement
**Current Issue**: HTTP allowed in production  
**Impact**: Man-in-the-middle attacks  
**Effort**: 1 week

**Implementation:**
```typescript
// backend/src/middleware/httpsRedirect.ts
export const enforceHttps = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
};

// Add security headers
import helmet from 'helmet';
app.use(helmet());

// Set HSTS header
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
```

**Mobile app - enforce HTTPS:**
```typescript
// src/services/api/client.ts
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.powernetpro.com';

if (API_BASE_URL.startsWith('http://') && process.env.NODE_ENV === 'production') {
  throw new Error('HTTPS required in production');
}
```

**Verification:**
- [ ] Production backend only accepts HTTPS
- [ ] Mobile app rejects HTTP connections
- [ ] HSTS header set
- [ ] Certificate valid and not expired

---

### 1.2 Critical Bug Fixes (Priority: HIGH)

#### Task 6: Fix Localhost Hardcoding
**Current Issue**: API URL defaults to production but dev needs localhost  
**Impact**: Confusing setup, API failures  
**Effort**: 1 day

**Implementation:**
```typescript
// src/services/api/client.ts
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getApiUrl = (): string => {
  // 1. Check explicit environment variable
  const envUrl = Constants.expoConfig?.extra?.apiBaseUrl || process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl) return envUrl;

  // 2. Development mode detection
  if (__DEV__) {
    // Android emulator
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3000';
    }
    // iOS simulator or other
    return 'http://localhost:3000';
  }

  // 3. Production default
  return 'https://api.powernetpro.com';
};

const API_BASE_URL = getApiUrl();

console.log(`🔗 API URL: ${API_BASE_URL} (Environment: ${__DEV__ ? 'DEV' : 'PROD'})`);
```

**Verification:**
- [ ] Android emulator uses 10.0.2.2
- [ ] iOS simulator uses localhost
- [ ] Production uses HTTPS URL
- [ ] Clear logs for debugging

---

#### Task 7: Fix Location Fallback Behavior
**Current Issue**: Silent fallback to Pune coordinates  
**Impact**: Users see wrong location  
**Effort**: 2 days

**Implementation:**
```typescript
// src/services/locationService.ts
export const getCurrentLocation = async (): Promise<LocationResult> => {
  try {
    // Check permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      return {
        success: false,
        error: 'PERMISSION_DENIED',
        message: 'Please enable location access in Settings to find nearby sellers.'
      };
    }

    // Try to get location
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      timeout: 15000
    });

    return {
      success: true,
      coords: {
        lat: location.coords.latitude,
        lng: location.coords.longitude
      }
    };

  } catch (error) {
    // Don't silently fallback - return error
    return {
      success: false,
      error: 'GPS_UNAVAILABLE',
      message: 'Unable to get your location. Please check GPS is enabled.'
    };
  }
};

// In MarketplaceScreen
const location = await getCurrentLocation();
if (!location.success) {
  Alert.alert(
    'Location Required',
    location.message,
    [
      { text: 'Enter Manually', onPress: () => openManualLocationEntry() },
      { text: 'Settings', onPress: () => Linking.openSettings() },
      { text: 'Cancel' }
    ]
  );
  return;
}
```

**Verification:**
- [ ] Shows error if permission denied
- [ ] Shows error if GPS unavailable
- [ ] Offers manual location entry
- [ ] No silent fallback to wrong coordinates

---

#### Task 8: Remove Mock Transaction Data
**Current Issue**: New users see fake transactions  
**Impact**: Confusing UX  
**Effort**: 1 day

**Implementation:**
```typescript
// src/store/transactionStore.ts
interface TransactionState {
  transactions: Transaction[];
  // Remove mockInitialTransactions
  addTransaction: (transaction: Omit<Transaction, 'id' | 'timestamp'>) => void;
  getTransactions: (filter?: 'buy' | 'sell' | 'all') => Transaction[];
  getTotalStats: () => { totalBuy: number; totalSell: number; netAmount: number };
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [], // Start empty, load from Supabase

  addTransaction: (transaction) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      createdAt: new Date()
    };

    set((state) => ({
      transactions: [newTransaction, ...state.transactions]
    }));

    // Sync to Supabase
    syncTransactionToSupabase(newTransaction);
  },

  // ... rest of the implementation
}));

// Add Supabase sync
const syncTransactionToSupabase = async (transaction: Transaction) => {
  const { error } = await supabase
    .from('transactions')
    .insert({
      user_id: transaction.userId,
      type: transaction.tradeType === 'buy' ? 'energy_purchase' : 'energy_sale',
      amount: transaction.amount,
      currency: 'INR',
      description: `${transaction.tradeType.toUpperCase()} - ${transaction.energyAmount} kWh @ ₹${transaction.pricePerUnit}/kWh`,
      status: 'completed'
    });

  if (error) console.error('Failed to sync transaction:', error);
};

// On app start, load from Supabase
export const loadTransactionsFromSupabase = async (userId: string) => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (data) {
    useTransactionStore.setState({ transactions: mapSupabaseToTransactions(data) });
  }
};
```

**Verification:**
- [ ] New users see empty transaction list
- [ ] Transactions synced to Supabase after trades
- [ ] Transactions persist across app restarts
- [ ] Loading state shown while fetching

---

### 1.3 Database Optimizations (Priority: HIGH)

#### Task 9: Add Database Indexes
**Current Issue**: Slow queries on large datasets  
**Impact**: Poor performance as users grow  
**Effort**: 1 day

**Implementation:**
```sql
-- Add indexes for frequently queried columns
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_users_phone ON users(phone_number);
CREATE INDEX CONCURRENTLY idx_users_kyc_status ON users(kyc_status);

CREATE INDEX CONCURRENTLY idx_meters_user_id ON meters(user_id);
CREATE INDEX CONCURRENTLY idx_meters_consumer_number ON meters(consumer_number);
CREATE INDEX CONCURRENTLY idx_meters_verification_status ON meters(verification_status);

CREATE INDEX CONCURRENTLY idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX CONCURRENTLY idx_orders_seller_id ON orders(seller_id);
CREATE INDEX CONCURRENTLY idx_orders_status ON orders(status);
CREATE INDEX CONCURRENTLY idx_orders_created_at ON orders(created_at DESC);

CREATE INDEX CONCURRENTLY idx_transactions_user_id ON transactions(user_id);
CREATE INDEX CONCURRENTLY idx_transactions_type ON transactions(type);
CREATE INDEX CONCURRENTLY idx_transactions_created_at ON transactions(created_at DESC);

CREATE INDEX CONCURRENTLY idx_energy_data_meter_id ON energy_data(meter_id);
CREATE INDEX CONCURRENTLY idx_energy_data_timestamp ON energy_data(timestamp DESC);

CREATE INDEX CONCURRENTLY idx_sellers_location ON sellers USING GIST (
  ll_to_earth(latitude, longitude)
);

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY idx_orders_buyer_status ON orders(buyer_id, status);
CREATE INDEX CONCURRENTLY idx_orders_seller_status ON orders(seller_id, status);
CREATE INDEX CONCURRENTLY idx_transactions_user_type_date ON transactions(
  user_id, type, created_at DESC
);

-- Analyze tables to update statistics
ANALYZE users;
ANALYZE meters;
ANALYZE orders;
ANALYZE transactions;
ANALYZE energy_data;
ANALYZE sellers;
```

**Verification:**
```sql
-- Check query performance before/after
EXPLAIN ANALYZE SELECT * FROM orders WHERE buyer_id = 'user-id' AND status = 'pending';
-- Should show "Index Scan" not "Seq Scan"

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

---

## 🔧 Phase 2: Core Feature Completion

### 2.1 Complete Razorpay Integration (Priority: HIGH)

#### Task 10: Implement Full Payment Flow
**Effort**: 3 weeks

**Implementation:**
```bash
# Install Razorpay React Native SDK
npm install react-native-razorpay
```

```typescript
// src/services/payments/razorpayService.ts
import RazorpayCheckout from 'react-native-razorpay';
import { apiClient } from '../api/client';

export const razorpayService = {
  async createOrder(amount: number, currency: string = 'INR') {
    // Call backend to create Razorpay order
    const response = await apiClient.post<{ orderId: string; amount: number }>('/wallet/create-order', {
      amount,
      currency
    });

    return response.data;
  },

  async openCheckout(orderId: string, amount: number, userEmail: string, userName: string) {
    const options = {
      description: 'PowerNetPro Wallet Top-up',
      image: 'https://powernetpro.com/logo.png',
      currency: 'INR',
      key: 'rzp_test_xxxxx', // From config, not hardcoded
      amount: amount * 100, // Amount in paise
      name: 'PowerNetPro',
      order_id: orderId,
      prefill: {
        email: userEmail,
        contact: '',
        name: userName
      },
      theme: { color: '#10b981' }
    };

    try {
      const data = await RazorpayCheckout.open(options);
      // Payment successful
      return {
        success: true,
        paymentId: data.razorpay_payment_id,
        orderId: data.razorpay_order_id,
        signature: data.razorpay_signature
      };
    } catch (error) {
      // Payment failed or cancelled
      return {
        success: false,
        error: error.description || 'Payment failed'
      };
    }
  },

  async verifyPayment(paymentId: string, orderId: string, signature: string) {
    // Verify on backend
    const response = await apiClient.post<{ verified: boolean }>('/wallet/verify-payment', {
      paymentId,
      orderId,
      signature
    });

    return response.data.verified;
  }
};
```

**Backend implementation:**
```typescript
// backend/src/routes/walletRoutes.ts
import Razorpay from 'razorpay';
import crypto from 'crypto';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
});

app.post('/wallet/create-order', verifyAuth, async (req, res) => {
  try {
    const { amount, currency = 'INR' } = req.body;
    const userId = (req as any).user.id;

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency,
      receipt: `order_${userId}_${Date.now()}`
    });

    res.json({ success: true, orderId: order.id, amount: order.amount / 100 });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/wallet/verify-payment', verifyAuth, async (req, res) => {
  try {
    const { paymentId, orderId, signature } = req.body;
    const userId = (req as any).user.id;

    // Verify signature
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (generated_signature !== signature) {
      return res.json({ success: false, verified: false });
    }

    // Update wallet balance
    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('cash_balance')
      .eq('user_id', userId)
      .single();

    if (!wallet) {
      // Create wallet if doesn't exist
      await supabase.from('wallets').insert({
        user_id: userId,
        cash_balance: req.body.amount,
        energy_balance: 0
      });
    } else {
      // Update balance
      await supabase
        .from('wallets')
        .update({ cash_balance: wallet.cash_balance + req.body.amount })
        .eq('user_id', userId);
    }

    // Record transaction
    await supabase.from('transactions').insert({
      user_id: userId,
      type: 'topup',
      amount: req.body.amount,
      currency: 'INR',
      status: 'completed',
      description: `Wallet top-up via Razorpay (${paymentId})`
    });

    res.json({ success: true, verified: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Webhook for payment status updates
app.post('/wallet/webhook', async (req, res) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'] as string;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;

    // Verify webhook signature
    const generated_signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (generated_signature !== webhookSignature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload.payment.entity;

    if (event === 'payment.captured') {
      // Handle successful payment
      console.log('Payment captured:', payload.id);
      // Update database if needed
    } else if (event === 'payment.failed') {
      // Handle failed payment
      console.log('Payment failed:', payload.id);
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

**Verification:**
- [ ] Order creation works
- [ ] Razorpay checkout opens
- [ ] Payment success updates wallet
- [ ] Payment failure handled gracefully
- [ ] Webhook processes events
- [ ] Transaction recorded in database

---

### 2.2 Real Meter Data Integration (Priority: HIGH)

#### Task 11: Integrate with DISCOM APIs
**Effort**: 4 weeks (depends on DISCOM cooperation)

**Research Phase:**
1. Identify major DISCOMs (MSEDCL, BSES, TATA Power, etc.)
2. Check if they have public APIs
3. Register for API access
4. Study authentication and rate limits

**Implementation (Example - MSEDCL):**
```typescript
// src/services/meter/discomIntegration.ts
interface DiscomConfig {
  name: string;
  apiBaseUrl: string;
  authMethod: 'apiKey' | 'oauth' | 'basic';
  endpoints: {
    validateConsumer: string;
    getMeterReadings: string;
    getBillDetails: string;
  };
}

const discomConfigs: Record<string, DiscomConfig> = {
  MSEDCL: {
    name: 'Maharashtra State Electricity Distribution Co. Ltd.',
    apiBaseUrl: 'https://api.mahadiscom.in/v1', // Example
    authMethod: 'apiKey',
    endpoints: {
      validateConsumer: '/consumer/validate',
      getMeterReadings: '/meter/readings',
      getBillDetails: '/bill/details'
    }
  },
  BSES: {
    name: 'BSES Rajdhani Power Limited',
    apiBaseUrl: 'https://api.bsesdelhi.com/v1', // Example
    authMethod: 'oauth',
    endpoints: {
      validateConsumer: '/consumer/verify',
      getMeterReadings: '/meter/data',
      getBillDetails: '/billing/info'
    }
  }
  // Add more DISCOMs
};

export const discomService = {
  async validateMeter(
    discomName: string, 
    consumerNumber: string, 
    meterSerialId: string
  ): Promise<ValidationResult> {
    const config = discomConfigs[discomName];
    if (!config) {
      throw new Error(`DISCOM ${discomName} not supported`);
    }

    try {
      const response = await fetch(
        `${config.apiBaseUrl}${config.endpoints.validateConsumer}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.DISCOM_API_KEY}`
          },
          body: JSON.stringify({
            consumer_number: consumerNumber,
            meter_serial_id: meterSerialId
          })
        }
      );

      const data = await response.json();

      return {
        valid: data.status === 'active',
        meterDetails: {
          consumerName: data.consumer_name,
          address: data.address,
          meterType: data.meter_type,
          sanctionedLoad: data.sanctioned_load
        }
      };
    } catch (error) {
      console.error(`Failed to validate with ${discomName}:`, error);
      return { valid: false, error: 'Validation failed' };
    }
  },

  async getMeterReadings(
    discomName: string,
    consumerNumber: string,
    startDate: Date,
    endDate: Date
  ): Promise<MeterReading[]> {
    const config = discomConfigs[discomName];
    
    const response = await fetch(
      `${config.apiBaseUrl}${config.endpoints.getMeterReadings}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DISCOM_API_KEY}`
        },
        body: JSON.stringify({
          consumer_number: consumerNumber,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        })
      }
    );

    const data = await response.json();

    return data.readings.map((reading: any) => ({
      timestamp: new Date(reading.timestamp),
      consumption: reading.consumption_kwh,
      generation: reading.generation_kwh || 0,
      netExport: (reading.generation_kwh || 0) - reading.consumption_kwh
    }));
  }
};
```

**Backend polling service:**
```typescript
// backend/src/services/meterPolling.ts
import cron from 'node-cron';

// Poll meters every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  console.log('⚡ Polling meter readings...');

  // Get all verified meters
  const { data: meters } = await supabase
    .from('meters')
    .select('*, users(*)')
    .eq('verification_status', 'verified');

  for (const meter of meters || []) {
    try {
      const readings = await discomService.getMeterReadings(
        meter.discom_name,
        meter.consumer_number,
        new Date(Date.now() - 15 * 60 * 1000), // Last 15 minutes
        new Date()
      );

      // Store readings
      await supabase.from('energy_data').insert(
        readings.map(reading => ({
          meter_id: meter.id,
          timestamp: reading.timestamp,
          generation: reading.generation,
          consumption: reading.consumption,
          net_export: reading.netExport,
          interval_minutes: 15
        }))
      );

      console.log(`✅ Updated readings for meter ${meter.meter_serial_id}`);
    } catch (error) {
      console.error(`❌ Failed to poll meter ${meter.meter_serial_id}:`, error);
    }
  }
});
```

**Verification:**
- [ ] Meter validation works with real DISCOM APIs
- [ ] Readings fetched every 15 minutes
- [ ] Data stored in energy_data table
- [ ] Charts show real data
- [ ] Handles API failures gracefully

---

### 2.3 Implement WebSocket for Real-time Updates (Priority: MEDIUM)

#### Task 12: Replace Polling with WebSocket
**Effort**: 2 weeks

**Benefits:**
- Reduce battery drain (no 30s polling)
- Instant updates when new sellers join
- Lower server load

**Implementation:**
```bash
cd backend
npm install socket.io
```

```typescript
// backend/src/websocket/server.ts
import { Server } from 'socket.io';
import { createServer } from 'http';

export const initializeWebSocket = (app: Express) => {
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    }
  });

  // Authenticate WebSocket connections
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) return next(new Error('Invalid token'));

      socket.data.userId = user.id;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.data.userId}`);

    // Subscribe to seller updates
    socket.on('subscribe:sellers', (location) => {
      const room = `sellers:${location.lat}:${location.lng}`;
      socket.join(room);
      console.log(`User ${socket.data.userId} subscribed to ${room}`);
    });

    // Subscribe to trade notifications
    socket.on('subscribe:trades', () => {
      socket.join(`trades:${socket.data.userId}`);
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.data.userId}`);
    });
  });

  // Emit seller updates
  setInterval(() => {
    io.emit('sellers:update', {
      timestamp: new Date(),
      // Broadcast updated seller list
    });
  }, 60000); // Every 60 seconds instead of 30

  return httpServer;
};
```

**Mobile app integration:**
```bash
npm install socket.io-client
```

```typescript
// src/services/websocket/socketService.ts
import io, { Socket } from 'socket.io-client';
import { supabase } from '../supabase/client';

class SocketService {
  private socket: Socket | null = null;

  async connect() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');

    this.socket = io(process.env.EXPO_PUBLIC_API_BASE_URL!, {
      auth: {
        token: session.access_token
      }
    });

    this.socket.on('connect', () => {
      console.log('🔌 WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected');
    });

    this.socket.on('sellers:update', (data) => {
      console.log('📍 Sellers updated:', data);
      // Emit event for components to update
      EventEmitter.emit('sellers:updated', data);
    });
  }

  subscribeSellers(location: { lat: number; lng: number }) {
    this.socket?.emit('subscribe:sellers', location);
  }

  subscribeTrades() {
    this.socket?.emit('subscribe:trades');
  }

  disconnect() {
    this.socket?.disconnect();
  }
}

export const socketService = new SocketService();
```

**Update MarketplaceScreen:**
```typescript
// Remove auto-refresh intervals, use WebSocket instead
useEffect(() => {
  socketService.connect();
  socketService.subscribeSellers(userLocation);

  const subscription = EventEmitter.addListener('sellers:updated', (data) => {
    setSellers(data.sellers);
  });

  return () => {
    subscription.remove();
    socketService.disconnect();
  };
}, [userLocation]);
```

**Verification:**
- [ ] WebSocket connects on app start
- [ ] Real-time seller updates received
- [ ] Battery consumption reduced
- [ ] Handles reconnection on network change
- [ ] Falls back to polling if WebSocket fails

---

**(Document continues with Phases 3, 4, 5...)**

## 📊 Summary Table

| Phase | Focus | Duration | Key Deliverables |
|-------|-------|----------|------------------|
| **Phase 1** | Security & Stabilization | 6 weeks | RLS, Rate limiting, Input validation, HTTPS |
| **Phase 2** | Core Features | 10 weeks | Razorpay, Real meters, WebSocket, Push notifications |
| **Phase 3** | Performance | 8 weeks | Offline mode, Optimization, Caching |
| **Phase 4** | Advanced Features | 16 weeks | AI trading, Blockchain, Analytics |
| **Phase 5** | Scale & Polish | Ongoing | Scalability, UX refinement, Expansion |

**Total Estimated Time to MVP**: 6-8 months  
**Total Estimated Time to Full Platform**: 12-18 months

---

## 🎯 Success Metrics

**Phase 1 (Security)**
- [ ] Zero critical security vulnerabilities
- [ ] All endpoints rate-limited
- [ ] RLS policies tested and verified

**Phase 2 (Features)**
- [ ] Payment success rate > 95%
- [ ] Real meter data for 80%+ users
- [ ] WebSocket uptime > 99%

**Phase 3 (Performance)**
- [ ] App loads in < 2 seconds
- [ ] Offline mode works for core features
- [ ] Battery drain < 5% per hour

**Phase 4 (Advanced)**
- [ ] Trading bot profitable in backtests
- [ ] Beckn protocol integrated with 5+ networks
- [ ] AI recommendations > 70% accuracy

---

**This roadmap is a living document. Update as priorities change.**

**Last Updated:** January 5, 2026  
**Next Review:** February 5, 2026
