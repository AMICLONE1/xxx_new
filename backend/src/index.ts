import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import Razorpay from 'razorpay';
import {
  getSiteProfiles,
  getSiteProfile,
  generateSiteAnalytics,
  generateAggregatedAnalytics,
  SITE_PROFILES,
} from './utils/analyticsDataGenerator';

// Helper function to safely extract error messages
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error occurred';
}

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
  } catch (error: unknown) {
    return res.status(401).json({ success: false, error: getErrorMessage(error) });
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
  } catch (error: unknown) {
    console.error('Trading search error:', error);
    res.status(500).json({ success: false, error: getErrorMessage(error) });
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
  } catch (error: unknown) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, error: getErrorMessage(error) });
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
  } catch (error: unknown) {
    console.error('Get order status error:', error);
    res.status(500).json({ success: false, error: getErrorMessage(error) });
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
  } catch (error: unknown) {
    console.error('Get active orders error:', error);
    res.status(500).json({ success: false, error: getErrorMessage(error) });
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
  } catch (error: unknown) {
    console.error('Cancel order error:', error);
    res.status(500).json({ success: false, error: getErrorMessage(error) });
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
      console.error('❌ Razorpay not initialized. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.');
      return res.status(500).json({ 
        success: false, 
        error: 'Payment gateway not configured. Please add Razorpay keys to Railway environment variables.' 
      });
    }

    // Create Razorpay order
    console.log('📦 Creating Razorpay order for amount:', amount);
    const razorpayOrder = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `topup_${user.id}_${Date.now()}`,
      notes: {
        userId: user.id,
        type: 'wallet_topup',
      },
    });

    console.log('✅ Razorpay order created:', razorpayOrder.id);

    // Generate Razorpay checkout URL
    // Note: Razorpay doesn't provide direct checkout URL, so we'll use their hosted checkout
    // For mobile, we'll use the order ID and key ID to open Razorpay checkout
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const checkoutUrl = `https://checkout.razorpay.com/v1/checkout.js?key=${razorpayKeyId}`;

    const response = {
      success: true,
      data: {
        paymentId: razorpayOrder.id,
        orderId: razorpayOrder.id,
        amount: amount,
        status: 'pending',
        razorpayKeyId: razorpayKeyId,
        checkoutUrl: checkoutUrl,
      },
    };

    console.log('📤 Sending response:', JSON.stringify(response, null, 2));
    res.json(response);
  } catch (error: unknown) {
    console.error('Top-up error:', error);
    res.status(500).json({ success: false, error: getErrorMessage(error) });
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
  } catch (error: unknown) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ success: false, error: getErrorMessage(error) });
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
  } catch (error: unknown) {
    console.error('Get withdrawal status error:', error);
    res.status(500).json({ success: false, error: getErrorMessage(error) });
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
      const amount = typeof payment.amount === 'number' 
        ? payment.amount / 100 
        : parseInt(String(payment.amount || 0), 10) / 100;
      
      res.json({
        success: true,
        data: {
          status: 'completed',
          paymentId: payment.id,
          amount: amount, // Convert from paise
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
  } catch (error: unknown) {
    console.error('Payment verification error:', error);
    res.status(500).json({ success: false, error: getErrorMessage(error) });
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
  } catch (error: unknown) {
    console.error('KYC document submission error:', error);
    res.status(500).json({ success: false, error: getErrorMessage(error) });
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
  } catch (error: unknown) {
    console.error('Get KYC status error:', error);
    res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});

// ==================== BUYERS ENDPOINTS ====================

/**
 * GET /marketplace/buyers
 * Get list of buyers
 */
app.get('/marketplace/buyers', verifyAuth, async (req, res) => {
  try {
    const { location, maxPrice, minEnergy, status } = req.query;
    const user = (req as any).user;

    let query = supabase
      .from('buyers')
      .select('*')
      .eq('status', status || 'active');

    // Apply filters
    if (maxPrice) {
      query = query.lte('max_price_per_unit', parseFloat(maxPrice as string));
    }
    if (minEnergy) {
      query = query.gte('energy_needed', parseFloat(minEnergy as string));
    }

    const { data: buyers, error } = await query;

    if (error) throw error;

    // Calculate distances if location provided
    const buyersWithDistance = buyers?.map((buyer: any) => {
      if (location && typeof location === 'string') {
        try {
          const loc = JSON.parse(location);
          if (loc.lat && loc.lng && buyer.location) {
            const buyerLoc = typeof buyer.location === 'string' 
              ? JSON.parse(buyer.location) 
              : buyer.location;
            const distance = calculateDistance(
              loc.lat,
              loc.lng,
              buyerLoc.lat,
              buyerLoc.lng
            );
            return { ...buyer, distance };
          }
        } catch (e) {
          // Invalid location format
        }
      }
      return buyer;
    }) || [];

    res.json({ success: true, data: buyersWithDistance });
  } catch (error: unknown) {
    console.error('Get buyers error:', error);
    res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});

/**
 * POST /marketplace/buyers
 * Create buyer listing
 */
app.post('/marketplace/buyers', verifyAuth, async (req, res) => {
  try {
    const { maxPricePerUnit, energyNeeded, preferredDeliveryWindow, location } = req.body;
    const user = (req as any).user;

    if (!maxPricePerUnit || !energyNeeded || !location) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: maxPricePerUnit, energyNeeded, location',
      });
    }

    // Get user name from users table
    const { data: userData } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', user.id)
      .single();

    const { data: buyer, error } = await supabase
      .from('buyers')
      .insert({
        user_id: user.id,
        name: userData?.name || userData?.email || 'Buyer',
        location: location,
        max_price_per_unit: maxPricePerUnit,
        energy_needed: energyNeeded,
        preferred_delivery_window: preferredDeliveryWindow,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data: buyer });
  } catch (error: unknown) {
    console.error('Create buyer error:', error);
    res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});

/**
 * GET /marketplace/buyers/:id
 * Get specific buyer details
 */
app.get('/marketplace/buyers/:id', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: buyer, error } = await supabase
      .from('buyers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!buyer) {
      return res.status(404).json({ success: false, error: 'Buyer not found' });
    }

    res.json({ success: true, data: buyer });
  } catch (error: unknown) {
    console.error('Get buyer error:', error);
    res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});

/**
 * DELETE /marketplace/buyers/:id
 * Remove buyer listing
 */
app.delete('/marketplace/buyers/:id', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    // Check if buyer exists and belongs to user
    const { data: buyer, error: fetchError } = await supabase
      .from('buyers')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !buyer) {
      return res.status(404).json({ success: false, error: 'Buyer listing not found' });
    }

    // Delete buyer listing
    const { error } = await supabase
      .from('buyers')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Buyer listing deleted' });
  } catch (error: unknown) {
    console.error('Delete buyer error:', error);
    res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});

// ==================== ANALYTICS ENDPOINTS ====================

/**
 * GET /analytics/sites
 * Get user's sites with basic info
 */
app.get('/analytics/sites', verifyAuth, async (req, res) => {
  try {
    const user = (req as any).user;

    // Get user's meters
    const { data: meters, error: metersError } = await supabase
      .from('meters')
      .select('*')
      .eq('user_id', user.id);

    if (metersError) throw metersError;

    // If no meters, return fake sites for demo
    if (!meters || meters.length === 0) {
      const fakeSites = getSiteProfiles().map((profile, index) => {
        const analytics = generateSiteAnalytics(profile.id, 'month');
        return {
          id: profile.id,
          name: profile.name,
          discomName: profile.discomName,
          consumerNumber: profile.consumerNumber,
          address: profile.address,
          totalGeneration: analytics.energyGenerated,
          totalRevenue: analytics.totalRevenue,
          activeTrades: analytics.activeTrades,
          efficiency: analytics.efficiency,
        };
      });
      return res.json({ success: true, data: fakeSites });
    }

    // Get analytics for each meter
    const sitesWithAnalytics = await Promise.all(
      (meters || []).map(async (meter: any, index: number) => {
        // Get energy data for this meter
        const { data: energyData } = await supabase
          .from('energy_data')
          .select('generation, consumption, net_export')
          .eq('meter_id', meter.id);

        // Check if we have real data
        const hasRealData = energyData && energyData.length > 0;

        let totalGeneration = 0;
        let totalConsumption = 0;
        let totalRevenue = 0;
        let activeTrades = 0;
        let efficiency = 0;

        if (hasRealData) {
          // Use real data
          totalGeneration = energyData.reduce((sum, d) => sum + (d.generation || 0), 0);
          totalConsumption = energyData.reduce((sum, d) => sum + (d.consumption || 0), 0);
          const netExport = totalGeneration - totalConsumption;

          // Get orders
          const { data: orders } = await supabase
            .from('orders')
            .select('*')
            .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
            .in('status', ['pending', 'confirmed', 'in_progress']);

          const { data: completedOrders } = await supabase
            .from('orders')
            .select('total_price')
            .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
            .eq('status', 'completed');

          totalRevenue = completedOrders?.reduce((sum, o) => sum + (parseFloat(o.total_price) || 0), 0) || 0;
          activeTrades = orders?.length || 0;
          efficiency = totalGeneration > 0 
            ? parseFloat(((netExport / totalGeneration) * 100).toFixed(1))
            : 0;
        } else {
          // Use fake data - map meter to a fake site profile
          const fakeProfileIndex = index % SITE_PROFILES.length;
          const fakeProfile = SITE_PROFILES[fakeProfileIndex];
          const analytics = generateSiteAnalytics(fakeProfile.id, 'month');
          
          totalGeneration = analytics.energyGenerated;
          totalConsumption = analytics.energyConsumed;
          totalRevenue = analytics.totalRevenue;
          activeTrades = analytics.activeTrades;
          efficiency = analytics.efficiency;
        }

        return {
          id: meter.id,
          name: `Site ${index + 1} - ${meter.discom_name}`,
          discomName: meter.discom_name,
          consumerNumber: meter.consumer_number,
          address: meter.address,
          totalGeneration,
          totalRevenue,
          activeTrades,
          efficiency,
        };
      })
    );

    res.json({ success: true, data: sitesWithAnalytics });
  } catch (error: unknown) {
    console.error('Get sites error:', error);
    res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});

/**
 * GET /analytics/site/:siteId
 * Get detailed analytics for specific site
 */
app.get('/analytics/site/:siteId', verifyAuth, async (req, res) => {
  try {
    const { siteId } = req.params;
    const { startDate, endDate, period = 'month' } = req.query;
    const user = (req as any).user;

    // Verify meter belongs to user
    const { data: meters } = await supabase
      .from('meters')
      .select('*')
      .eq('user_id', user.id);

    const meter = meters?.find((m: any) => m.id === siteId);
    
    // If meter not found, check if it's a fake site ID
    if (!meter) {
      const fakeProfile = getSiteProfile(siteId);
      if (fakeProfile) {
        // Return fake data for demo site
        const analytics = generateSiteAnalytics(siteId, period as 'day' | 'week' | 'month' | 'year');
        return res.json({
          success: true,
          data: {
            siteId,
            period: period || 'month',
            ...analytics,
          },
        });
      }
      return res.status(404).json({ success: false, error: 'Site not found' });
    }

    // Build date filter
    let energyQuery = supabase
      .from('energy_data')
      .select('*')
      .eq('meter_id', siteId);

    if (startDate) {
      energyQuery = energyQuery.gte('timestamp', startDate);
    }
    if (endDate) {
      energyQuery = energyQuery.lte('timestamp', endDate);
    }

    const { data: energyData } = await energyQuery;

    // Check if we have real data
    const hasRealData = energyData && energyData.length > 0;

    if (hasRealData) {
      // Use real data
      const energyGenerated = energyData.reduce((sum, d) => sum + (d.generation || 0), 0);
      const energyConsumed = energyData.reduce((sum, d) => sum + (d.consumption || 0), 0);
      const netExport = energyGenerated - energyConsumed;

      // Get orders
      const { data: activeOrders } = await supabase
        .from('orders')
        .select('*')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .in('status', ['pending', 'confirmed', 'in_progress']);

      const { data: completedOrders } = await supabase
        .from('orders')
        .select('*')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .eq('status', 'completed');

      const totalRevenue = completedOrders?.reduce((sum, o) => sum + (parseFloat(o.total_price) || 0), 0) || 0;
      const efficiency = energyGenerated > 0 
        ? parseFloat(((netExport / energyGenerated) * 100).toFixed(1))
        : 0;

      const trends = {
        generation: '+12%',
        revenue: '+8%',
      };

      return res.json({
        success: true,
        data: {
          siteId,
          period: period || 'month',
          energyGenerated,
          energyConsumed,
          netExport,
          totalRevenue,
          activeTrades: activeOrders?.length || 0,
          completedTrades: completedOrders?.length || 0,
          efficiency,
          trends,
        },
      });
    } else {
      // Use fake data - map meter to a fake site profile
      const meterIndex = meters?.findIndex((m: any) => m.id === siteId) || 0;
      const fakeProfileIndex = meterIndex % SITE_PROFILES.length;
      const fakeProfile = SITE_PROFILES[fakeProfileIndex];
      const analytics = generateSiteAnalytics(fakeProfile.id, period as 'day' | 'week' | 'month' | 'year');
      
      return res.json({
        success: true,
        data: {
          siteId,
          period: period || 'month',
          ...analytics,
        },
      });
    }
  } catch (error: unknown) {
    console.error('Get site analytics error:', error);
    res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});

/**
 * GET /analytics/aggregated
 * Get aggregated analytics across all user sites
 */
app.get('/analytics/aggregated', verifyAuth, async (req, res) => {
  try {
    const { startDate, endDate, period = 'month' } = req.query;
    const user = (req as any).user;

    // Get all user meters
    const { data: meters } = await supabase
      .from('meters')
      .select('id')
      .eq('user_id', user.id);

    const meterIds = meters?.map(m => m.id) || [];

    // If no meters, return aggregated fake data for all demo sites
    if (meterIds.length === 0) {
      const analytics = generateAggregatedAnalytics(period as 'day' | 'week' | 'month' | 'year');
      return res.json({
        success: true,
        data: {
          period: period || 'month',
          ...analytics,
        },
      });
    }

    // Get energy data for all meters
    let energyQuery = supabase
      .from('energy_data')
      .select('*')
      .in('meter_id', meterIds);

    if (startDate) {
      energyQuery = energyQuery.gte('timestamp', startDate);
    }
    if (endDate) {
      energyQuery = energyQuery.lte('timestamp', endDate);
    }

    const { data: energyData } = await energyQuery;

    // Check if we have real data
    const hasRealData = energyData && energyData.length > 0;

    if (hasRealData) {
      // Use real data
      const energyGenerated = energyData.reduce((sum, d) => sum + (d.generation || 0), 0);
      const energyConsumed = energyData.reduce((sum, d) => sum + (d.consumption || 0), 0);
      const netExport = energyGenerated - energyConsumed;

      // Get orders
      const { data: activeOrders } = await supabase
        .from('orders')
        .select('*')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .in('status', ['pending', 'confirmed', 'in_progress']);

      const { data: completedOrders } = await supabase
        .from('orders')
        .select('*')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .eq('status', 'completed');

      const totalRevenue = completedOrders?.reduce((sum, o) => sum + (parseFloat(o.total_price) || 0), 0) || 0;
      const efficiency = energyGenerated > 0 
        ? parseFloat(((netExport / energyGenerated) * 100).toFixed(1))
        : 0;

      const trends = {
        generation: '+12%',
        revenue: '+8%',
      };

      return res.json({
        success: true,
        data: {
          period: period || 'month',
          energyGenerated,
          energyConsumed,
          netExport,
          totalRevenue,
          activeTrades: activeOrders?.length || 0,
          completedTrades: completedOrders?.length || 0,
          efficiency,
          trends,
        },
      });
    } else {
      // Use fake aggregated data
      const analytics = generateAggregatedAnalytics(period as 'day' | 'week' | 'month' | 'year');
      return res.json({
        success: true,
        data: {
          period: period || 'month',
          ...analytics,
        },
      });
    }
  } catch (error: unknown) {
    console.error('Get aggregated analytics error:', error);
    res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});

// ==================== TRANSACTIONS ENDPOINTS ====================

/**
 * GET /transactions
 * Get user's transactions with optional filtering
 */
app.get('/transactions', verifyAuth, async (req, res) => {
  try {
    const { limit, offset, type, status, startDate, endDate } = req.query;
    const user = (req as any).user;

    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const limitNum = limit ? parseInt(limit as string, 10) : 50;
    const offsetNum = offset ? parseInt(offset as string, 10) : 0;

    query = query.range(offsetNum, offsetNum + limitNum - 1);

    const { data: transactions, error } = await query;

    if (error) throw error;

    res.json({ success: true, data: transactions || [] });
  } catch (error: unknown) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, error: getErrorMessage(error) });
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

