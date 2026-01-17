import { apiClient } from './client';
import { Order, ApiResponse, Seller } from '@/types';
import { supabaseDatabaseService } from '@/services/supabase/databaseService';
import { logError } from '@/utils/errorUtils';
import { calculateDistance } from '@/utils/helpers';

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

  /**
   * Search for sellers - fetches from Supabase directly
   */
  async searchSellers(filters: {
    location?: { lat: number; lng: number; radius: number };
    minPrice?: number;
    maxPrice?: number;
    greenEnergyOnly?: boolean;
    minRating?: number;
  }): Promise<ApiResponse<Seller[]>> {
    try {
      // Fetch all active sellers from Supabase
      let sellers = await supabaseDatabaseService.getActiveSellers();

      // Apply filters
      if (filters.minPrice !== undefined) {
        sellers = sellers.filter(s => s.pricePerUnit >= filters.minPrice!);
      }

      if (filters.maxPrice !== undefined) {
        sellers = sellers.filter(s => s.pricePerUnit <= filters.maxPrice!);
      }

      if (filters.greenEnergyOnly) {
        sellers = sellers.filter(s => s.greenEnergy === true);
      }

      if (filters.minRating !== undefined) {
        sellers = sellers.filter(s => (s.rating || 0) >= filters.minRating!);
      }

      // Calculate distance if location is provided
      if (filters.location) {
        sellers = sellers.map(seller => {
          // Only calculate distance if seller has valid location
          if (seller.location && seller.location.lat && seller.location.lng) {
            const distance = calculateDistance(
              filters.location!.lat,
              filters.location!.lng,
              seller.location.lat,
              seller.location.lng
            );
            return { ...seller, distance };
          }
          // Seller without location - don't exclude them
          return { ...seller, distance: undefined };
        });

        // Filter by radius - only filter sellers that HAVE a distance calculated
        // Sellers without location are NOT filtered out
        if (filters.location.radius) {
          const beforeFilter = sellers.length;
          sellers = sellers.filter(s => s.distance === undefined || s.distance <= filters.location!.radius);
          if (__DEV__) {
            console.log(`[TradingService] Radius filter: ${beforeFilter} -> ${sellers.length} (radius: ${filters.location.radius}km)`);
          }
        }

        // Sort by distance (sellers without distance go to the end)
        sellers.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
      }

      if (__DEV__) {
        console.log(`[TradingService] Fetched ${sellers.length} sellers from Supabase`);
      }

      return {
        success: true,
        data: sellers,
      };
    } catch (error: unknown) {
      logError('TradingService.searchSellers', error);
      // Return empty array with error, allowing fallback to mock data
      return {
        success: false,
        error: 'Failed to search sellers from database.',
        data: [],
      };
    }
  }

  /**
   * Get a single seller by user ID
   */
  async getSellerByUserId(userId: string): Promise<ApiResponse<Seller>> {
    try {
      const seller = await supabaseDatabaseService.getSellerByUserId(userId);
      if (!seller) {
        return {
          success: false,
          error: 'Seller not found',
        };
      }
      return {
        success: true,
        data: seller,
      };
    } catch (error: unknown) {
      logError('TradingService.getSellerByUserId', error);
      return {
        success: false,
        error: 'Failed to fetch seller.',
      };
    }
  }
}

export const tradingService = new TradingService();

