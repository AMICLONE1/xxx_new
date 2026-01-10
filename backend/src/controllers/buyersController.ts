import { Request, Response } from 'express';
import { buyersService } from '../services/buyersService';

// Helper function to safely extract error messages
function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'Unknown error occurred';
}

export const buyersController = {
    async getBuyers(req: Request, res: Response) {
        try {
            const { location, maxPrice, minEnergy, status } = req.query;
            const result = await buyersService.searchBuyers({
                location: location as string,
                maxPrice: maxPrice as string,
                minEnergy: minEnergy as string,
                status: status as string,
            });

            res.json({ success: true, data: result });
        } catch (error: unknown) {
            console.error('Get buyers error:', error);
            res.status(500).json({ success: false, error: getErrorMessage(error) });
        }
    },

    async createBuyer(req: Request, res: Response) {
        try {
            const { maxPricePerUnit, energyNeeded, preferredDeliveryWindow, location } = req.body;
            const user = (req as any).user;

            if (!maxPricePerUnit || !energyNeeded || !location) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: maxPricePerUnit, energyNeeded, location',
                });
            }

            const result = await buyersService.createBuyer(user.id, {
                maxPricePerUnit,
                energyNeeded,
                preferredDeliveryWindow,
                location,
            });

            res.json({ success: true, data: result });
        } catch (error: unknown) {
            console.error('Create buyer error:', error);
            res.status(500).json({ success: false, error: getErrorMessage(error) });
        }
    },

    async getBuyer(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const result = await buyersService.getBuyerById(id);

            if (!result) {
                return res.status(404).json({ success: false, error: 'Buyer not found' });
            }

            res.json({ success: true, data: result });
        } catch (error: unknown) {
            console.error('Get buyer error:', error);
            res.status(500).json({ success: false, error: getErrorMessage(error) });
        }
    },

    async deleteBuyer(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const user = (req as any).user;

            await buyersService.deleteBuyer(id, user.id);

            res.json({ success: true, message: 'Buyer listing deleted' });
        } catch (error: unknown) {
            console.error('Delete buyer error:', error);
            if (error instanceof Error && error.message === 'Buyer listing not found') {
                res.status(404).json({ success: false, error: 'Buyer listing not found' });
            } else {
                res.status(500).json({ success: false, error: getErrorMessage(error) });
            }
        }
    }
};
