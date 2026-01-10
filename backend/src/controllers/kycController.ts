import { Request, Response } from 'express';
import { kycService } from '../services/kycService';

// Helper function to safely extract error messages
function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'Unknown error occurred';
}

export const kycController = {
    async submitKyc(req: Request, res: Response) {
        try {
            const { documentType, documentImageUri, extractedData } = req.body;
            const user = (req as any).user;

            const result = await kycService.submitKycDocument(user.id, {
                documentType,
                documentImageUri,
                extractedData
            });

            res.json({ success: true, data: result });
        } catch (error: unknown) {
            console.error('KYC document submission error:', error);
            res.status(500).json({ success: false, error: getErrorMessage(error) });
        }
    },

    async getKycStatus(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const result = await kycService.getKycStatus(user.id);

            res.json({
                success: true,
                data: result,
            });
        } catch (error: unknown) {
            console.error('Get KYC status error:', error);
            res.status(500).json({ success: false, error: getErrorMessage(error) });
        }
    }
};
