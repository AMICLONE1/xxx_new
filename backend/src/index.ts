import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import Razorpay from 'razorpay';

import tradingRoutes from './routes/tradingRoutes';
import kycRoutes from './routes/kycRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import buyersRoutes from './routes/buyersRoutes';
import { verifyAuth } from './middlewares/authMiddleware';
import { apiLimiter } from './middlewares/rateLimit';
import helmet from 'helmet';
import { globalErrorHandler } from './middlewares/errorHandler';
import { AppError } from './utils/AppError';

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
app.use(helmet());

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

// Middleware to verify authentication - Imported from authMiddleware

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'PowerNetPro Backend API is running',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', apiLimiter);

app.use('/trading', tradingRoutes);
app.use('/kyc', kycRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/marketplace/buyers', buyersRoutes);

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

// ==================== ERROR HANDLING ====================

// Handle undefined routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler Middleware
app.use(globalErrorHandler);

// ==================== HELPER FUNCTIONS ====================

// Start server
app.listen(PORT, () => {
  console.log(`🚀 PowerNetPro Backend API running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Environment: ${process.env.NODE_ENV || 'development'}`);
});

