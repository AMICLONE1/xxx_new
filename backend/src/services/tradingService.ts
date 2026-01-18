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

        const totalPrice = data.energyAmount * data.pricePerUnit;

        try {
            // 1. Get seller info to verify and update available energy
            console.log(`[TradingService] 1. Fetching seller: ${data.sellerId}`);
            const seller = await tradingDao.getSeller(data.sellerId);
            if (!seller) {
                console.error(`[TradingService] Seller not found: ${data.sellerId}`);
                throw new AppError('Seller not found', 404);
            }
            console.log(`[TradingService] Seller found: ${seller.id}, Available: ${seller.available_energy}`);

            if (seller.available_energy < data.energyAmount) {
                throw new AppError(`Seller only has ${seller.available_energy} kWh available`, 400);
            }

            // 2. Get buyer wallet to verify balance
            console.log(`[TradingService] 2. Fetching buyer wallet: ${data.buyerId}`);
            const buyerWallet = await tradingDao.getWallet(data.buyerId);
            if (!buyerWallet) {
                throw new AppError('Buyer wallet not found', 404);
            }

            if (buyerWallet.cash_balance < totalPrice) {
                throw new AppError('Insufficient wallet balance', 400);
            }

            // 3. Create the order with status 'completed'
            console.log('[TradingService] 3. Creating order...');
            const order = await tradingDao.createOrder({
                buyer_id: data.buyerId,
                seller_id: data.sellerId,
                energy_amount: data.energyAmount,
                price_per_unit: data.pricePerUnit,
                total_price: totalPrice,
                status: 'completed',
                created_at: new Date().toISOString(),
            });

            // 4. Deduct cash from buyer's wallet
            console.log('[TradingService] 4. Updating buyer wallet...');
            await tradingDao.updateWallet(data.buyerId, {
                cash_balance: buyerWallet.cash_balance - totalPrice,
            });

            // 5. Add cash to seller's wallet (create if doesn't exist)
            console.log('[TradingService] 5. Updating seller wallet...');
            let sellerWallet = await tradingDao.getWallet(data.sellerId);
            if (!sellerWallet) {
                sellerWallet = await tradingDao.createWallet(data.sellerId);
            }
            await tradingDao.updateWallet(data.sellerId, {
                cash_balance: sellerWallet.cash_balance + totalPrice,
            });

            // 6. Create transaction record for buyer (energy_purchase)
            console.log('[TradingService] 6. Creating buyer transaction...');
            await tradingDao.createTransaction({
                user_id: data.buyerId,
                type: 'energy_purchase',
                amount: totalPrice,
                currency: 'INR',
                status: 'completed',
                description: `Purchased ${data.energyAmount} kWh from ${seller.name} at Rs ${data.pricePerUnit}/kWh`,
            });

            // 7. Create transaction record for seller (energy_sale)
            console.log('[TradingService] 7. Creating seller transaction...');
            await tradingDao.createTransaction({
                user_id: data.sellerId,
                type: 'energy_sale',
                amount: totalPrice,
                currency: 'INR',
                status: 'completed',
                description: `Sold ${data.energyAmount} kWh at Rs ${data.pricePerUnit}/kWh`,
            });

            // 8. Update seller's available energy
            const newAvailableEnergy = seller.available_energy - data.energyAmount;
            console.log(`[TradingService] 8. Updating seller energy: ${seller.available_energy} -> ${newAvailableEnergy}`);
            const updatedSeller = await tradingDao.updateSeller(data.sellerId, {
                available_energy: newAvailableEnergy,
                total_energy_sold: (seller.total_energy_sold || 0) + data.energyAmount,
            });
            console.log(`[TradingService] Seller updated. New available: ${updatedSeller?.available_energy}`);

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
