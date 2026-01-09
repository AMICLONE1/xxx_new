import { Request, Response } from 'express';
import { analyticsService } from '../services/analyticsService';

// Helper function to safely extract error messages
function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'Unknown error occurred';
}

export const analyticsController = {
    async getSites(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const result = await analyticsService.getSites(user.id);
            res.json({ success: true, data: result });
        } catch (error: unknown) {
            console.error('Get sites error:', error);
            res.status(500).json({ success: false, error: getErrorMessage(error) });
        }
    },

    async getSiteAnalytics(req: Request, res: Response) {
        try {
            const { siteId } = req.params;
            const { startDate, endDate, period = 'month' } = req.query;
            const user = (req as any).user;

            const result = await analyticsService.getSiteAnalytics(
                user.id,
                siteId,
                startDate as string,
                endDate as string,
                period as 'day' | 'week' | 'month' | 'year'
            );

            res.json({ success: true, data: result });
        } catch (error: unknown) {
            console.error('Get site analytics error:', error);
            if (error instanceof Error && error.message === 'Site not found') {
                res.status(404).json({ success: false, error: 'Site not found' });
            } else {
                res.status(500).json({ success: false, error: getErrorMessage(error) });
            }
        }
    },

    async getAggregatedAnalytics(req: Request, res: Response) {
        try {
            const { startDate, endDate, period = 'month' } = req.query;
            const user = (req as any).user;

            const result = await analyticsService.getAggregatedAnalytics(
                user.id,
                startDate as string,
                endDate as string,
                period as 'day' | 'week' | 'month' | 'year'
            );

            res.json({ success: true, data: result });
        } catch (error: unknown) {
            console.error('Get aggregated analytics error:', error);
            res.status(500).json({ success: false, error: getErrorMessage(error) });
        }
    }
};
