import { tradingDao } from '../dao/tradingDao';
import { AppError } from '../utils/AppError';
import { calculateDistance } from '../utils/geo';
import { searchSellersSchema, createOrderSchema } from '../utils/validation/trading.validation';

export const tradingService = {
    async searchSellers(filters: {
        location?: { lat: number; lng: number };
        minPrice?: number;
        maxPrice?: number;
        greenEnergyOnly?: boolean;
        minRating?: number;
    }) {
        const validation = searchSellersSchema.safeParse(filters);
        if (!validation.success) {
            const errorMessage = validation.error.issues.map(e => e.message).join(', ');
            throw new AppError(errorMessage, 400);
        }

        try {
            const hasLocation = !!(filters.location?.lat && filters.location?.lng);

            const sellers = await tradingDao.searchSellers({
                minPrice: filters.minPrice,
                maxPrice: filters.maxPrice,
                greenEnergyOnly: filters.greenEnergyOnly,
                minRating: filters.minRating,
                hasLocation
            });

            return sellers?.map((seller: any) => {
                if (hasLocation && seller.location) {
                    // Safe access if seller.location is object or needs parsing. 
                    // Dao returns '*' so seller.location is as stored in DB (likely JSONB or stringified JSON)
                    // Assuming structure match for now or handled by DAO types later.
                    const distance = calculateDistance(
                        filters.location!.lat,
                        filters.location!.lng,
                        seller.location.lat,
                        seller.location.lng
                    );
                    return { ...seller, distance };
                }
                return seller;
            }) || [];
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(`Failed to search sellers: ${(error as Error).message}`, 500);
        }
    },

    async createOrder(data: {
        buyerId: string;
        sellerId: string;
        energyAmount: number;
        pricePerUnit: number;
    }) {
        const validation = createOrderSchema.safeParse(data);
        if (!validation.success) {
            const errorMessage = validation.error.issues.map(e => e.message).join(', ');
            throw new AppError(errorMessage, 400);
        }

        try {
            const totalPrice = data.energyAmount * data.pricePerUnit;

            const order = await tradingDao.createOrder({
                buyer_id: data.buyerId,
                seller_id: data.sellerId,
                energy_amount: data.energyAmount,
                price_per_unit: data.pricePerUnit,
                total_price: totalPrice,
                status: 'pending',
                created_at: new Date().toISOString(),
            });

            return order;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(`Failed to create order: ${(error as Error).message}`, 500);
        }
    },

    async getOrderById(orderId: string, userId: string) {
        if (!orderId || !userId) throw new AppError('Order ID and User ID are required', 400);

        try {
            const { data: order, error } = await tradingDao.getOrderByIdAndBuyerId(orderId, userId);

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (!order) {
                throw new AppError('Order not found', 404);
            }

            return order;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(`Failed to fetch order: ${(error as Error).message}`, 500);
        }
    },

    async getActiveOrders(userId: string) {
        if (!userId) throw new AppError('User ID is required', 400);

        try {
            const orders = await tradingDao.getActiveOrders(userId);
            return orders || [];
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(`Failed to fetch active orders: ${(error as Error).message}`, 500);
        }
    },

    async cancelOrder(orderId: string, userId: string) {
        if (!orderId || !userId) throw new AppError('Order ID and User ID are required', 400);

        try {
            // Check if order exists and belongs to user
            const { data: order, error: fetchError } = await tradingDao.getOrderByIdAndBuyerId(orderId, userId);

            if (fetchError && fetchError.code !== 'PGRST116') {
                throw new AppError('Error fetching order details', 500);
            }

            if (!order) {
                throw new AppError('Order not found or access denied', 404);
            }

            if (order.status === 'completed' || order.status === 'cancelled') {
                throw new AppError(`Cannot cancel order with status: ${order.status}`, 400);
            }

            const updatedOrder = await tradingDao.cancelOrder(orderId);
            return updatedOrder;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(`Failed to cancel order: ${(error as Error).message}`, 500);
        }
    }
};
