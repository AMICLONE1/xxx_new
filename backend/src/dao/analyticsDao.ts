import { supabase } from '../config/supabase';

export const analyticsDao = {
    async getMetersByUserId(userId: string) {
        const { data, error } = await supabase
            .from('meters')
            .select('*')
            .eq('user_id', userId);

        if (error) throw error;
        return data;
    },

    async getEnergyDataByMeterId(meterId: string, startDate?: string, endDate?: string) {
        let query = supabase
            .from('energy_data')
            .select('*')
            .eq('meter_id', meterId);

        if (startDate) {
            query = query.gte('timestamp', startDate);
        }
        if (endDate) {
            query = query.lte('timestamp', endDate);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async getEnergyDataByMeterIds(meterIds: string[], startDate?: string, endDate?: string) {
        // Return empty array if no meters, to avoid Supabase error on empty IN clause if that's a thing,
        // though usually we shouldn't call this with empty array.
        if (meterIds.length === 0) return [];

        let query = supabase
            .from('energy_data')
            .select('*')
            .in('meter_id', meterIds);

        if (startDate) {
            query = query.gte('timestamp', startDate);
        }
        if (endDate) {
            query = query.lte('timestamp', endDate);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async getActiveOrders(userId: string) {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
            .in('status', ['pending', 'confirmed', 'in_progress']);

        if (error) throw error;
        return data;
    },

    async getCompletedOrders(userId: string) {
        const { data, error } = await supabase
            .from('orders')
            .select('*') // Standardizing selection
            .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
            .eq('status', 'completed');

        if (error) throw error;
        return data;
    }
};
