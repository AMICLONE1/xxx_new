import { supabase } from '../config/supabase';

export const kycDao = {
    async upsertKycData(kcyData: {
        user_id: string;
        document_type: string;
        document_url: string;
        extracted_data: any;
        status: string;
        updated_at: string;
    }) {
        const { data, error } = await supabase
            .from('kyc_data')
            .upsert(kcyData)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getKycStatusByUserId(userId: string) {
        const { data, error } = await supabase
            .from('kyc_data')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();

        return { data, error };
    }
};
