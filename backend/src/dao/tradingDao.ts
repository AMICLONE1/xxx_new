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
    },

    // Wallet methods
    async getWallet(userId: string) {
        const { data, error } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    },

    async createWallet(userId: string) {
        const { data, error } = await supabase
            .from('wallets')
            .insert({
                user_id: userId,
                energy_balance: 0,
                cash_balance: 0
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateWallet(userId: string, updates: any) {
        const { data, error } = await supabase
            .from('wallets')
            .update(updates)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Transaction methods
    async createTransaction(transaction: any) {
        const { data, error } = await supabase
            .from('transactions')
            .insert(transaction)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Seller methods
    async getSeller(userId: string) {
        console.log(`[TradingDao] getSeller called for userId: ${userId}`);

        const { data, error } = await supabase
            .from('sellers')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error(`[TradingDao] getSeller error for userId ${userId}:`, error);
            throw error;
        }

        if (!data) {
            console.log(`[TradingDao] getSeller: No seller found for userId ${userId}`);
        } else {
            console.log(`[TradingDao] getSeller found:`, {
                id: data.id,
                user_id: data.user_id,
                name: data.name,
                available_energy: data.available_energy
            });
        }

        return data;
    },

    async updateSeller(userId: string, updates: any) {
        console.log(`[TradingDao] updateSeller called for userId: ${userId}, updates:`, JSON.stringify(updates));

        const { data, error } = await supabase
            .from('sellers')
            .update(updates)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) {
            console.error(`[TradingDao] updateSeller error for userId ${userId}:`, error);
            throw error;
        }

        if (!data) {
            console.error(`[TradingDao] updateSeller returned no data for userId ${userId}. Seller may not exist.`);
            throw new Error(`Seller not found for user_id: ${userId}`);
        }

        console.log(`[TradingDao] updateSeller success. New available_energy: ${data.available_energy}`);
        return data;
    }
};
