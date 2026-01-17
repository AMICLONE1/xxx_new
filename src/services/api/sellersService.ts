import { Seller, ApiResponse } from '@/types';
import { supabaseDatabaseService } from '@/services/supabase/databaseService';
import { logError } from '@/utils/errorUtils';
import { calculateDistance } from '@/utils/helpers';

export interface CreateSellerListingRequest {
    name: string;
    pricePerUnit: number;
    availableEnergy: number;
    greenEnergy?: boolean;
    location?: { lat: number; lng: number; address?: string };
}

export interface SearchSellersFilters {
    location?: { lat: number; lng: number; radius?: number };
    minPrice?: number;
    maxPrice?: number;
    greenEnergyOnly?: boolean;
    minRating?: number;
    status?: 'active' | 'inactive' | 'suspended';
}

class SellersService {
    /**
     * Get all sellers from Supabase with optional filters
     */
    async getSellers(filters?: SearchSellersFilters): Promise<ApiResponse<Seller[]>> {
        try {
            // Fetch all active sellers from Supabase
            let sellers = await supabaseDatabaseService.getActiveSellers();

            // Apply filters
            if (filters?.minPrice !== undefined) {
                sellers = sellers.filter(s => s.pricePerUnit >= filters.minPrice!);
            }

            if (filters?.maxPrice !== undefined) {
                sellers = sellers.filter(s => s.pricePerUnit <= filters.maxPrice!);
            }

            if (filters?.greenEnergyOnly) {
                sellers = sellers.filter(s => s.greenEnergy === true);
            }

            if (filters?.minRating !== undefined) {
                sellers = sellers.filter(s => (s.rating || 0) >= filters.minRating!);
            }

            // Calculate distance if location is provided
            if (filters?.location) {
                sellers = sellers.map(seller => {
                    if (seller.location && seller.location.lat && seller.location.lng) {
                        const distance = calculateDistance(
                            filters.location!.lat,
                            filters.location!.lng,
                            seller.location.lat,
                            seller.location.lng
                        );
                        return { ...seller, distance };
                    }
                    return { ...seller, distance: undefined };
                });

                // Filter by radius if specified
                if (filters.location.radius) {
                    sellers = sellers.filter(s => s.distance === undefined || s.distance <= filters.location!.radius!);
                }

                // Sort by distance
                sellers.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
            }

            if (__DEV__) {
                console.log(`[SellersService] Fetched ${sellers.length} sellers from Supabase`);
            }

            return {
                success: true,
                data: sellers,
            };
        } catch (error: unknown) {
            logError('SellersService.getSellers', error);
            return {
                success: false,
                error: 'Failed to fetch sellers from database.',
                data: [],
            };
        }
    }

    /**
     * Get a single seller by ID
     */
    async getSeller(sellerId: string): Promise<ApiResponse<Seller>> {
        try {
            const seller = await supabaseDatabaseService.getSellerByUserId(sellerId);
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
            logError('SellersService.getSeller', error);
            return {
                success: false,
                error: 'Failed to fetch seller.',
            };
        }
    }

    /**
     * Create a new seller listing
     */
    async createSellerListing(userId: string, data: CreateSellerListingRequest): Promise<ApiResponse<Seller>> {
        try {
            const seller = await supabaseDatabaseService.createSeller({
                userId,
                name: data.name,
                pricePerUnit: data.pricePerUnit,
                availableEnergy: data.availableEnergy,
                greenEnergy: data.greenEnergy,
                location: data.location,
            });
            return {
                success: true,
                data: seller,
            };
        } catch (error: unknown) {
            logError('SellersService.createSellerListing', error);
            return {
                success: false,
                error: 'Failed to create seller listing.',
            };
        }
    }

    /**
     * Update an existing seller listing
     */
    async updateSellerListing(userId: string, data: Partial<CreateSellerListingRequest>): Promise<ApiResponse<Seller>> {
        try {
            const seller = await supabaseDatabaseService.updateSeller(userId, {
                name: data.name,
                pricePerUnit: data.pricePerUnit,
                availableEnergy: data.availableEnergy,
                greenEnergy: data.greenEnergy,
                location: data.location,
            });
            return {
                success: true,
                data: seller,
            };
        } catch (error: unknown) {
            logError('SellersService.updateSellerListing', error);
            return {
                success: false,
                error: 'Failed to update seller listing.',
            };
        }
    }

    /**
     * Delete a seller listing (set status to inactive)
     */
    async deleteSellerListing(userId: string): Promise<ApiResponse<void>> {
        try {
            await supabaseDatabaseService.updateSeller(userId, { status: 'inactive' });
            return {
                success: true,
            };
        } catch (error: unknown) {
            logError('SellersService.deleteSellerListing', error);
            return {
                success: false,
                error: 'Failed to delete seller listing.',
            };
        }
    }
}

export const sellersService = new SellersService();
