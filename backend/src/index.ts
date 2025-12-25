import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import Razorpay from 'razorpay';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json());

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Razorpay (if keys are provided)
let razorpay: Razorpay | null = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// Middleware to verify authentication
async function verifyAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, error: 'No authentication token provided' });
    }

    // Verify token with Supabase
    const { data: { user }, error } = await createClient(supabaseUrl, supabaseAnonKey)
      .auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    // Attach user to request
    (req as any).user = user;
    next();
  } catch (error: any) {
    return res.status(401).json({ success: false, error: error.message });
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'PowerNetPro Backend API is running',
    timestamp: new Date().toISOString(),
  });
});

// ==================== TRADING ENDPOINTS ====================

/**
 * POST /trading/search
 * Search for energy sellers
 */
app.post('/trading/search', verifyAuth, async (req, res) => {
  try {
    const { location, minPrice, maxPrice, greenEnergyOnly, minRating } = req.body;

    // Build query
    let query = supabase
      .from('sellers')
      .select('*');

    // Apply filters
    if (minPrice !== undefined) {
      query = query.gte('price_per_unit', minPrice);
    }
    if (maxPrice !== undefined) {
      query = query.lte('price_per_unit', maxPrice);
    }
    if (greenEnergyOnly) {
      query = query.eq('green_energy', true);
    }
    if (minRating !== undefined) {
      query = query.gte('rating', minRating);
    }

    // Location filter (if provided)
    if (location?.lat && location?.lng) {
      // Note: For proper location search, you'd use PostGIS functions
      // This is a simplified version
      query = query.not('location', 'is', null);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Calculate distances if location provided
    const sellers = data?.map((seller: any) => {
      if (location?.lat && location?.lng && seller.location) {
        const distance = calculateDistance(
          location.lat,
          location.lng,
          seller.location.lat,
          seller.location.lng
        );
        return { ...seller, distance };
      }
      return seller;
    }) || [];

    res.json({ success: true, data: sellers });
  } catch (error: any) {
    console.error('Trading search error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /trading/orders
 * Create a new trading order
 */
app.post('/trading/orders', verifyAuth, async (req, res) => {
  try {
    const { sellerId, energyAmount, pricePerUnit } = req.body;
    const user = (req as any).user;

    if (!sellerId || !energyAmount || !pricePerUnit) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: sellerId, energyAmount, pricePerUnit' 
      });
    }

    const totalPrice = energyAmount * pricePerUnit;

    // Create order in database
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        buyer_id: user.id,
        seller_id: sellerId,
        energy_amount: energyAmount,
        price_per_unit: pricePerUnit,
        total_price: totalPrice,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data: order });
  } catch (error: any) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /trading/orders/:id/status
 * Get order status
 */
app.get('/trading/orders/:id/status', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .eq('buyer_id', user.id)
      .single();

    if (error) throw error;
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    res.json({ 
      success: true, 
      data: {
        order,
        progress: {
          delivered: order.delivered_energy || 0,
          total: order.energy_amount,
          percentage: order.energy_amount > 0 
            ? ((order.delivered_energy || 0) / order.energy_amount) * 100 
            : 0,
        },
      },
    });
  } catch (error: any) {
    console.error('Get order status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /trading/orders/active
 * Get active orders for current user
 */
app.get('/trading/orders/active', verifyAuth, async (req, res) => {
  try {
    const user = (req as any).user;

    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('buyer_id', user.id)
      .in('status', ['pending', 'processing', 'delivering'])
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data: orders || [] });
  } catch (error: any) {
    console.error('Get active orders error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /trading/orders/:id/cancel
 * Cancel an order
 */
app.post('/trading/orders/:id/cancel', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    // Check if order exists and belongs to user
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .eq('buyer_id', user.id)
      .single();

    if (fetchError || !order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.status === 'completed' || order.status === 'cancelled') {
      return res.status(400).json({ 
        success: false, 
        error: `Cannot cancel order with status: ${order.status}` 
      });
    }

    // Update order status
    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update({ 
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data: updatedOrder });
  } catch (error: any) {
    console.error('Cancel order error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== WALLET ENDPOINTS ====================

/**
 * POST /wallet/top-up
 * Initiate wallet top-up
 */
app.post('/wallet/top-up', verifyAuth, async (req, res) => {
  try {
    const { amount, paymentMethod } = req.body;
    const user = (req as any).user;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    if (!razorpay) {
      return res.status(500).json({ 
        success: false, 
        error: 'Payment gateway not configured. Please add Razorpay keys.' 
      });
    }

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `topup_${user.id}_${Date.now()}`,
      notes: {
        userId: user.id,
        type: 'wallet_topup',
      },
    });

    res.json({
      success: true,
      data: {
        paymentId: razorpayOrder.id,
        orderId: razorpayOrder.id,
        amount: amount,
        status: 'pending',
        upiIntent: `upi://pay?pa=merchant@upi&pn=PowerNetPro&am=${amount}&cu=INR`,
      },
    });
  } catch (error: any) {
    console.error('Top-up error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /wallet/withdraw
 * Request withdrawal
 */
app.post('/wallet/withdraw', verifyAuth, async (req, res) => {
  try {
    const { amount, bankAccountId } = req.body;
    const user = (req as any).user;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    if (!bankAccountId) {
      return res.status(400).json({ success: false, error: 'Bank account ID required' });
    }

    // Check wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('cash_balance')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      return res.status(404).json({ success: false, error: 'Wallet not found' });
    }

    if (wallet.cash_balance < amount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Insufficient balance' 
      });
    }

    // Create withdrawal request
    const requestId = `withdraw_${user.id}_${Date.now()}`;

    const { data: withdrawal, error } = await supabase
      .from('withdrawals')
      .insert({
        user_id: user.id,
        request_id: requestId,
        amount: amount,
        bank_account_id: bankAccountId,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: {
        requestId: requestId,
        status: 'pending',
      },
    });
  } catch (error: any) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /wallet/withdraw/:id/status
 * Get withdrawal status
 */
app.get('/wallet/withdraw/:id/status', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const { data: withdrawal, error } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('request_id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !withdrawal) {
      return res.status(404).json({ success: false, error: 'Withdrawal request not found' });
    }

    res.json({
      success: true,
      data: {
        status: withdrawal.status,
        amount: withdrawal.amount,
      },
    });
  } catch (error: any) {
    console.error('Get withdrawal status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== PAYMENT ENDPOINTS ====================

/**
 * POST /payments/initiate
 * Initiate payment (wrapper for top-up)
 */
app.post('/payments/initiate', verifyAuth, async (req, res) => {
  // Redirect to wallet top-up endpoint
  req.url = '/wallet/top-up';
  return app._router.handle(req, res);
});

/**
 * POST /payments/verify
 * Verify payment status
 */
app.post('/payments/verify', verifyAuth, async (req, res) => {
  try {
    const { paymentId } = req.body;

    if (!razorpay) {
      return res.status(500).json({ 
        success: false, 
        error: 'Payment gateway not configured' 
      });
    }

    // Verify payment with Razorpay
    const payment = await razorpay.payments.fetch(paymentId);

    if (payment.status === 'captured') {
      // Update wallet balance
      // This would typically be done via webhook, but for simplicity:
      res.json({
        success: true,
        data: {
          status: 'completed',
          paymentId: payment.id,
          amount: payment.amount / 100, // Convert from paise
        },
      });
    } else {
      res.json({
        success: true,
        data: {
          status: payment.status,
          paymentId: payment.id,
        },
      });
    }
  } catch (error: any) {
    console.error('Payment verification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== KYC ENDPOINTS ====================

/**
 * POST /kyc/documents
 * Submit KYC document
 */
app.post('/kyc/documents', verifyAuth, async (req, res) => {
  try {
    const { documentType, documentImageUri, extractedData } = req.body;
    const user = (req as any).user;

    // Store document in Supabase storage
    // Then update KYC status in database
    const { data: kycData, error } = await supabase
      .from('kyc_data')
      .upsert({
        user_id: user.id,
        document_type: documentType,
        document_url: documentImageUri,
        extracted_data: extractedData,
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data: kycData });
  } catch (error: any) {
    console.error('KYC document submission error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /kyc/status
 * Get KYC status
 */
app.get('/kyc/status', verifyAuth, async (req, res) => {
  try {
    const user = (req as any).user;

    const { data: kycData, error } = await supabase
      .from('kyc_data')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    res.json({
      success: true,
      data: kycData || {
        user_id: user.id,
        status: 'not_started',
        documents: [],
      },
    });
  } catch (error: any) {
    console.error('Get KYC status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 PowerNetPro Backend API running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Environment: ${process.env.NODE_ENV || 'development'}`);
});

