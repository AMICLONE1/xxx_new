import { supabase } from '../config/supabase';

export const buyersDao = {
    async searchBuyers(filters: {
        location?: string;
        maxPrice?: string;
        minEnergy?: string;
        status?: string;
    }) {
        let query = supabase
            .from('buyers')
            .select('*')
            .eq('status', filters.status || 'active');

        // Apply filters
        if (filters.maxPrice) {
            query = query.lte('max_price_per_unit', parseFloat(filters.maxPrice));
        }
        if (filters.minEnergy) {
            query = query.gte('energy_needed', parseFloat(filters.minEnergy));
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async getUserDetails(userId: string) {
        const { data, error } = await supabase
            .from('users')
            .select('name, email')
            .eq('id', userId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is 0 rows caught by .single(), though usually we want to know if it failed.
            // But original code didn't throw explicitly on user fetch, just used userData?.name
        }
        return data;
    },

    async createBuyer(buyerData: any) {
        const { data, error } = await supabase
            .from('buyers')
            .insert(buyerData)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getBuyerById(id: string) {
        const { data, error } = await supabase
            .from('buyers')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async getBuyerByUserIdAndId(userId: string, id: string) {
        const { data, error } = await supabase
            .from('buyers')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        return { data, error };
    },

    async deleteBuyer(id: string) {
        const { error } = await supabase
            .from('buyers')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }
};
