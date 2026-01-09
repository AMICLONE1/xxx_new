import { supabase } from '../config/supabase';

export const tradingDao = {
    async searchSellers(filters: {
        minPrice?: number;
        maxPrice?: number;
        greenEnergyOnly?: boolean;
        minRating?: number;
        hasLocation?: boolean;
    }) {
        let query = supabase.from('sellers').select('*');

        if (filters.minPrice !== undefined) {
            query = query.gte('price_per_unit', filters.minPrice);
        }
        if (filters.maxPrice !== undefined) {
            query = query.lte('price_per_unit', filters.maxPrice);
        }
        if (filters.greenEnergyOnly) {
            query = query.eq('green_energy', true);
        }
        if (filters.minRating !== undefined) {
            query = query.gte('rating', filters.minRating);
        }
        if (filters.hasLocation) {
            query = query.not('location', 'is', null);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async createOrder(orderData: any) {
        const { data, error } = await supabase
            .from('orders')
            .insert(orderData)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getOrderByIdAndBuyerId(orderId: string, userId: string) {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .eq('buyer_id', userId)
            .single();

        return { data, error };
    },

    async getActiveOrders(userId: string) {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('buyer_id', userId)
            .in('status', ['pending', 'processing', 'delivering'])
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async cancelOrder(orderId: string) {
        const { data, error } = await supabase
            .from('orders')
            .update({
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
            })
            .eq('id', orderId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
