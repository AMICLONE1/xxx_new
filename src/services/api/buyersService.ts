import { apiClient } from './client';
import { Buyer, ApiResponse } from '@/types';
import { getErrorMessage } from '@/utils/errorUtils';

export interface CreateBuyerListingRequest {
  maxPricePerUnit: number;
  energyNeeded: number;
  preferredDeliveryWindow?: string;
  location: { lat: number; lng: number; address?: string };
}

export interface SearchBuyersFilters {
  location?: { lat: number; lng: number; radius?: number };
  maxPrice?: number;
  minEnergy?: number;
  status?: 'active' | 'inactive' | 'fulfilled';
}

class BuyersService {
  async getBuyers(filters?: SearchBuyersFilters): Promise<ApiResponse<Buyer[]>> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.location) {
        params.append('location', JSON.stringify(filters.location));
      }
      if (filters?.maxPrice) {
        params.append('maxPrice', filters.maxPrice.toString());
      }
      if (filters?.minEnergy) {
        params.append('minEnergy', filters.minEnergy.toString());
      }
      if (filters?.status) {
        params.append('status', filters.status);
      }

      const queryString = params.toString();
      const url = `/marketplace/buyers${queryString ? `?${queryString}` : ''}`;
      
      return apiClient.get(url);
    } catch (error: unknown) {
      if (__DEV__) {
        console.log('[API] Backend unavailable for buyers:', error instanceof Error && 'code' in error ? (error as { code: string }).code : 'NETWORK_ERROR');
      }
      return {
        success: false,
        error: getErrorMessage(error) || 'Failed to fetch buyers. Backend API may be unavailable.',
      };
    }
  }

  async getBuyer(buyerId: string): Promise<ApiResponse<Buyer>> {
    return apiClient.get(`/marketplace/buyers/${buyerId}`);
  }

  async createBuyerListing(data: CreateBuyerListingRequest): Promise<ApiResponse<Buyer>> {
    return apiClient.post('/marketplace/buyers', data);
  }

  async updateBuyerListing(buyerId: string, data: Partial<CreateBuyerListingRequest>): Promise<ApiResponse<Buyer>> {
    // Note: Update endpoint would need to be added to backend
    return apiClient.put(`/marketplace/buyers/${buyerId}`, data);
  }

  async deleteBuyerListing(buyerId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/marketplace/buyers/${buyerId}`);
  }
}

export const buyersService = new BuyersService();

