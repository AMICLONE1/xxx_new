import { apiClient } from './client';
import { Order, ApiResponse, Seller } from '@/types';
import { getErrorMessage } from '@/utils/errorUtils';

export interface CreateOrderRequest {
  sellerId: string;
  energyAmount: number; // kWh
  pricePerUnit: number; // INR
}

export interface OrderStatusResponse {
  order: Order;
  progress?: {
    delivered: number; // kWh
    total: number; // kWh
    percentage: number;
  };
}

class TradingService {
  async createOrder(data: CreateOrderRequest): Promise<ApiResponse<Order>> {
    return apiClient.post('/trading/orders', data);
  }

  async getOrderStatus(orderId: string): Promise<ApiResponse<OrderStatusResponse>> {
    return apiClient.get(`/trading/orders/${orderId}/status`);
  }

  async cancelOrder(orderId: string): Promise<ApiResponse<void>> {
    return apiClient.post(`/trading/orders/${orderId}/cancel`, {});
  }

  async getActiveOrders(): Promise<ApiResponse<Order[]>> {
    return apiClient.get('/trading/orders/active');
  }

  async getOrderHistory(
    limit: number = 50,
    offset: number = 0
  ): Promise<ApiResponse<Order[]>> {
    return apiClient.get(`/trading/orders/history?limit=${limit}&offset=${offset}`);
  }

  async searchSellers(filters: {
    location?: { lat: number; lng: number; radius: number };
    minPrice?: number;
    maxPrice?: number;
    greenEnergyOnly?: boolean;
    minRating?: number;
  }): Promise<ApiResponse<Seller[]>> {
    try {
      return await apiClient.post('/trading/search', filters);
    } catch (error: unknown) {
      // Only log in development mode, and use debug level instead of error
      // The app gracefully falls back to mock data, so this isn't a critical error
      if (__DEV__) {
        console.log('[API] Backend unavailable, using mock data:', error instanceof Error && 'code' in error ? (error as { code: string }).code : 'NETWORK_ERROR');
      }
      
      // Return error response instead of throwing
      return {
        success: false,
        error: getErrorMessage(error) || 'Failed to search sellers. Backend API may be unavailable.',
      };
    }
  }
}

export const tradingService = new TradingService();

