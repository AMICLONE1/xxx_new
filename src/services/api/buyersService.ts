import { Buyer, ApiResponse } from '@/types';
import { supabaseDatabaseService } from '@/services/supabase/databaseService';
import { logError } from '@/utils/errorUtils';
import { calculateDistance } from '@/utils/helpers';

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
  /**
   * Get buyers from Supabase with optional filters
   */
  async getBuyers(filters?: SearchBuyersFilters): Promise<ApiResponse<Buyer[]>> {
    try {
      // Fetch all active buyers from Supabase
      let buyers = await supabaseDatabaseService.getActiveBuyers();

      // Apply filters
      if (filters?.maxPrice) {
        buyers = buyers.filter(b => b.maxPricePerUnit <= filters.maxPrice!);
      }

      if (filters?.minEnergy) {
        buyers = buyers.filter(b => b.energyNeeded >= filters.minEnergy!);
      }

      // Calculate distance if location is provided
      if (filters?.location) {
        buyers = buyers.map(buyer => {
          // Only calculate distance if buyer has valid location
          if (buyer.location && buyer.location.lat && buyer.location.lng) {
            const distance = calculateDistance(
              filters.location!.lat,
              filters.location!.lng,
              buyer.location.lat,
              buyer.location.lng
            );
            return { ...buyer, distance };
          }
          // Buyer without location - don't exclude them
          return { ...buyer, distance: undefined };
        });

        // Filter by radius if specified - don't filter out buyers without location
        if (filters.location.radius) {
          const beforeFilter = buyers.length;
          buyers = buyers.filter(b => b.distance === undefined || b.distance <= filters.location!.radius!);
          if (__DEV__) {
            console.log(`[BuyersService] Radius filter: ${beforeFilter} -> ${buyers.length} (radius: ${filters.location.radius}km)`);
          }
        }

        // Sort by distance (buyers without distance go to the end)
        buyers.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
      }

      if (__DEV__) {
        console.log(`[BuyersService] Fetched ${buyers.length} buyers from Supabase`);
      }

      return {
        success: true,
        data: buyers,
      };
    } catch (error: unknown) {
      logError('BuyersService.getBuyers', error);
      return {
        success: false,
        error: 'Failed to fetch buyers from database.',
        data: [],
      };
    }
  }

  /**
   * Get a single buyer by ID
   */
  async getBuyer(buyerId: string): Promise<ApiResponse<Buyer>> {
    try {
      const buyer = await supabaseDatabaseService.getBuyerByUserId(buyerId);
      if (!buyer) {
        return {
          success: false,
          error: 'Buyer not found',
        };
      }
      return {
        success: true,
        data: buyer,
      };
    } catch (error: unknown) {
      logError('BuyersService.getBuyer', error);
      return {
        success: false,
        error: 'Failed to fetch buyer.',
      };
    }
  }

  /**
   * Create a new buyer listing
   */
  async createBuyerListing(userId: string, data: CreateBuyerListingRequest & { name: string }): Promise<ApiResponse<Buyer>> {
    try {
      const buyer = await supabaseDatabaseService.createBuyer({
        userId,
        name: data.name,
        location: data.location,
        maxPricePerUnit: data.maxPricePerUnit,
        energyNeeded: data.energyNeeded,
        preferredDeliveryWindow: data.preferredDeliveryWindow,
      });
      return {
        success: true,
        data: buyer,
      };
    } catch (error: unknown) {
      logError('BuyersService.createBuyerListing', error);
      return {
        success: false,
        error: 'Failed to create buyer listing.',
      };
    }
  }

  /**
   * Update an existing buyer listing
   */
  async updateBuyerListing(userId: string, data: Partial<CreateBuyerListingRequest>): Promise<ApiResponse<Buyer>> {
    try {
      const buyer = await supabaseDatabaseService.updateBuyer(userId, {
        location: data.location,
        maxPricePerUnit: data.maxPricePerUnit,
        energyNeeded: data.energyNeeded,
        preferredDeliveryWindow: data.preferredDeliveryWindow,
      });
      return {
        success: true,
        data: buyer,
      };
    } catch (error: unknown) {
      logError('BuyersService.updateBuyerListing', error);
      return {
        success: false,
        error: 'Failed to update buyer listing.',
      };
    }
  }

  /**
   * Delete a buyer listing (set status to inactive)
   */
  async deleteBuyerListing(userId: string): Promise<ApiResponse<void>> {
    try {
      await supabaseDatabaseService.updateBuyer(userId, { status: 'inactive' });
      return {
        success: true,
      };
    } catch (error: unknown) {
      logError('BuyersService.deleteBuyerListing', error);
      return {
        success: false,
        error: 'Failed to delete buyer listing.',
      };
    }
  }
}

export const buyersService = new BuyersService();

