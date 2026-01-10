import { Request, Response } from 'express';
import { tradingService } from '../services/tradingService';

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'Unknown error occurred';
}

export const tradingController = {
    async searchSellers(req: Request, res: Response) {
        try {
            const { location, minPrice, maxPrice, greenEnergyOnly, minRating } = req.body;
            const sellers = await tradingService.searchSellers({
                location,
                minPrice,
                maxPrice,
                greenEnergyOnly,
                minRating
            });
            res.json({ success: true, data: sellers });
        } catch (error) {
            console.error('Trading search error:', error);
            res.status(500).json({ success: false, error: getErrorMessage(error) });
        }
    },

    async createOrder(req: Request, res: Response) {
        try {
            const { sellerId, energyAmount, pricePerUnit } = req.body;
            const user = (req as any).user;

            if (!sellerId || !energyAmount || !pricePerUnit) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: sellerId, energyAmount, pricePerUnit'
                });
            }

            const order = await tradingService.createOrder({
                buyerId: user.id,
                sellerId,
                energyAmount,
                pricePerUnit
            });

            res.json({ success: true, data: order });
        } catch (error) {
            console.error('Create order error:', error);
            res.status(500).json({ success: false, error: getErrorMessage(error) });
        }
    },

    async getOrderStatus(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const user = (req as any).user;

            const order = await tradingService.getOrderById(id, user.id);

            if (!order) {
                return res.status(404).json({ success: false, error: 'Order not found' });
            }

            res.json({
                success: true,
                data: {
                    order,
                    progress: {
                        delivered: order.delivered_energy || 0,
                        total: order.energy_amount,
                        percentage: order.energy_amount > 0
                            ? ((order.delivered_energy || 0) / order.energy_amount) * 100
                            : 0,
                    },
                },
            });
        } catch (error) {
            console.error('Get order status error:', error);
            res.status(500).json({ success: false, error: getErrorMessage(error) });
        }
    },

    async getActiveOrders(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const orders = await tradingService.getActiveOrders(user.id);
            res.json({ success: true, data: orders });
        } catch (error) {
            console.error('Get active orders error:', error);
            res.status(500).json({ success: false, error: getErrorMessage(error) });
        }
    },

    async cancelOrder(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const user = (req as any).user;
            const order = await tradingService.cancelOrder(id, user.id);
            res.json({ success: true, data: order });
        } catch (error) {
            console.error('Cancel order error:', error);
            const message = getErrorMessage(error);
            if (message === 'Order not found') {
                return res.status(404).json({ success: false, error: message });
            }
            if (message.includes('Cannot cancel order')) {
                return res.status(400).json({ success: false, error: message });
            }
            res.status(500).json({ success: false, error: message });
        }
    }
};
