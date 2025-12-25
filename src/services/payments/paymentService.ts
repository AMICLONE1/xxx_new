import { ApiResponse } from '@/types';
import { apiClient } from '@/services/api/client';

export interface TopUpRequest {
  amount: number;
  paymentMethod: 'upi' | 'card' | 'netbanking';
}

export interface TopUpResponse {
  paymentId: string;
  orderId: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  razorpayKeyId?: string; // Razorpay public key ID
  checkoutUrl?: string; // Razorpay checkout URL
  upiIntent?: string; // For UPI payments (deprecated)
}

export interface WithdrawalRequest {
  amount: number;
  bankAccountId: string;
}

class PaymentService {
  /**
   * Initiate wallet top-up
   * Note: Payment SDK (Razorpay/PhonePe) integration pending
   * This will call the backend API which handles payment initiation
   */
  async initiateTopUp(data: TopUpRequest): Promise<ApiResponse<TopUpResponse>> {
    try {
      console.log('🚀 Initiating top-up:', data);
      const response = await apiClient.post<ApiResponse<TopUpResponse>>(
        '/wallet/top-up',
        {
          amount: data.amount,
          paymentMethod: data.paymentMethod,
        }
      );
      console.log('✅ Top-up response received:', JSON.stringify(response, null, 2));
      return response;
    } catch (error: any) {
      console.error('❌ Top-up error:', error);
      return {
        success: false,
        error: error.message || 'Failed to initiate top-up',
      };
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(paymentId: string): Promise<ApiResponse<{ status: string }>> {
    try {
      const response = await apiClient.post<ApiResponse<{ status: string }>>(
        '/payments/verify',
        { paymentId }
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to verify payment',
      };
    }
  }

  /**
   * Request withdrawal
   */
  async requestWithdrawal(
    data: WithdrawalRequest
  ): Promise<ApiResponse<{ requestId: string; status: string }>> {
    try {
      const response = await apiClient.post<ApiResponse<{ requestId: string; status: string }>>(
        '/wallet/withdraw',
        {
          amount: data.amount,
          bankAccountId: data.bankAccountId,
        }
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to request withdrawal',
      };
    }
  }

  /**
   * Get withdrawal status
   */
  async getWithdrawalStatus(
    requestId: string
  ): Promise<ApiResponse<{ status: string; amount: number }>> {
    try {
      const response = await apiClient.get<ApiResponse<{ status: string; amount: number }>>(
        `/wallet/withdraw/${requestId}/status`
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get withdrawal status',
      };
    }
  }

  /**
   * Open UPI payment app
   */
  async openUPIApp(upiIntent: string): Promise<boolean> {
    // TODO: Implement UPI intent opening
    // This would use Linking.openURL() with UPI deep link
    // Example: upi://pay?pa=merchant@upi&pn=Merchant&am=100&cu=INR
    return false;
  }
}

export const paymentService = new PaymentService();

