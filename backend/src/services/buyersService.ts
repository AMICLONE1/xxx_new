import { buyersDao } from '../dao/buyersDao';
import { AppError } from '../utils/AppError';
import { calculateDistance } from '../utils/geo';
import { searchBuyersSchema, createBuyerSchema } from '../utils/validation/buyers.validation';

export const buyersService = {
    async searchBuyers(filters: {
        location?: string;
        maxPrice?: string;
        minEnergy?: string;
        status?: string;
    }) {
        const validation = searchBuyersSchema.safeParse(filters);
        if (!validation.success) {
            const errorMessage = validation.error.issues.map(e => e.message).join(', ');
            throw new AppError(errorMessage, 400);
        }

        try {
            const buyers = await buyersDao.searchBuyers(filters);

            // Calculate distances if location provided
            return buyers?.map((buyer: any) => {
                if (filters.location && typeof filters.location === 'string') {
                    try {
                        const loc = JSON.parse(filters.location);
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
                        // Invalid location format in query - ignore distance calc
                    }
                }
                return buyer;
            }) || [];
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(`Failed to search buyers: ${(error as Error).message}`, 500);
        }
    },

    async createBuyer(userId: string, data: {
        maxPricePerUnit: number;
        energyNeeded: number;
        preferredDeliveryWindow?: string;
        location: any;
    }) {
        if (!userId) throw new AppError('User ID is required', 400);

        const validation = createBuyerSchema.safeParse(data);
        if (!validation.success) {
            const errorMessage = validation.error.issues.map(e => e.message).join(', ');
            throw new AppError(errorMessage, 400);
        }

        try {
            // Get user name from users table
            const userData = await buyersDao.getUserDetails(userId);

            // Note: If userData is null, it might mean user doesn't exist, but we proceed with fallback for now
            // or stricter: if (!userData) throw new AppError('User not found', 404);

            const buyer = await buyersDao.createBuyer({
                user_id: userId,
                name: userData?.name || userData?.email || 'Buyer',
                location: data.location,
                max_price_per_unit: data.maxPricePerUnit,
                energy_needed: data.energyNeeded,
                preferred_delivery_window: data.preferredDeliveryWindow,
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });

            return buyer;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(`Failed to create buyer listing: ${(error as Error).message}`, 500);
        }
    },

    async getBuyerById(id: string) {
        try {
            const buyer = await buyersDao.getBuyerById(id);
            if (!buyer) {
                throw new AppError('Buyer listing not found', 404);
            }
            return buyer;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(`Failed to fetch buyer: ${(error as Error).message}`, 500);
        }
    },

    async deleteBuyer(id: string, userId: string) {
        try {
            // Check if buyer exists and belongs to user
            const { data: buyer, error: fetchError } = await buyersDao.getBuyerByUserIdAndId(userId, id);

            if (fetchError || !buyer) {
                throw new AppError('Buyer listing not found or access denied', 404);
            }

            // Delete buyer listing
            await buyersDao.deleteBuyer(id);
            return true;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(`Failed to delete buyer: ${(error as Error).message}`, 500);
        }
    }
};
