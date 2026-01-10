import { kycDao } from '../dao/kycDao';
import { AppError } from '../utils/AppError';
import { submitKycSchema } from '../utils/validation/kyc.validation';

export const kycService = {
    async submitKycDocument(userId: string, data: {
        documentType: string;
        documentImageUri: string;
        extractedData: any;
    }) {
        if (!userId) throw new AppError('User ID is required', 400);

        const validation = submitKycSchema.safeParse(data);
        if (!validation.success) {
            const errorMessage = validation.error.issues.map(e => e.message).join(', ');
            throw new AppError(errorMessage, 400);
        }

        try {
            const kycData = await kycDao.upsertKycData({
                user_id: userId,
                document_type: data.documentType,
                document_url: data.documentImageUri,
                extracted_data: data.extractedData,
                status: 'pending',
                updated_at: new Date().toISOString(),
            });

            return kycData;
        } catch (error) {
            // If known Supabase error, can be specific. For now, general.
            if (error instanceof AppError) throw error;
            throw new AppError(`Failed to submit KYC document: ${(error as Error).message}`, 500);
        }
    },

    async getKycStatus(userId: string) {
        if (!userId) throw new AppError('User ID is required', 400);

        try {
            const { data: kycData, error } = await kycDao.getKycStatusByUserId(userId);

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                console.error("KYC fetch error:", error);
                throw new AppError('Error fetching KYC status', 500);
            }

            return kycData || {
                user_id: userId,
                status: 'not_started',
                documents: [],
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(`Failed to get KYC status: ${(error as Error).message}`, 500);
        }
    }
};
