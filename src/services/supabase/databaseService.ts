import { supabase } from './client';
import { Meter, EnergyData, Order, Wallet, Transaction, KYCData, TradingBotConfig } from '@/types';

class SupabaseDatabaseService {
  /**
   * Get user's meters
   */
  async getMeters(userId: string): Promise<Meter[]> {
    const { data, error } = await supabase
      .from('meters')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (
      data?.map((m) => ({
        id: m.id,
        userId: m.user_id,
        discomName: m.discom_name,
        consumerNumber: m.consumer_number,
        meterSerialId: m.meter_serial_id,
        verificationStatus: m.verification_status,
        address: m.address,
        createdAt: new Date(m.created_at),
        updatedAt: new Date(m.updated_at),
      })) || []
    );
  }

  /**
   * Create a new meter
   */
  async createMeter(meter: Omit<Meter, 'id' | 'createdAt' | 'updatedAt'>): Promise<Meter> {
    const { data, error } = await supabase
      .from('meters')
      .insert({
        user_id: meter.userId,
        discom_name: meter.discomName,
        consumer_number: meter.consumerNumber,
        meter_serial_id: meter.meterSerialId,
        verification_status: meter.verificationStatus,
        address: meter.address,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      userId: data.user_id,
      discomName: data.discom_name,
      consumerNumber: data.consumer_number,
      meterSerialId: data.meter_serial_id,
      verificationStatus: data.verification_status,
      address: data.address,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  /**
   * Get energy data for a meter
   */
  async getEnergyData(
    meterId: string,
    startDate: Date,
    endDate: Date
  ): Promise<EnergyData[]> {
    const { data, error } = await supabase
      .from('energy_data')
      .select('*')
      .eq('meter_id', meterId)
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp', { ascending: true });

    if (error) throw error;

    return (
      data?.map((e) => ({
        id: e.id,
        meterId: e.meter_id,
        timestamp: new Date(e.timestamp),
        generation: parseFloat(e.generation),
        consumption: parseFloat(e.consumption),
        netExport: parseFloat(e.net_export),
        interval: e.interval_minutes,
      })) || []
    );
  }

  /**
   * Insert energy data
   */
  async insertEnergyData(data: Omit<EnergyData, 'id'>): Promise<EnergyData> {
    const { data: inserted, error } = await supabase
      .from('energy_data')
      .insert({
        meter_id: data.meterId,
        timestamp: data.timestamp.toISOString(),
        generation: data.generation,
        consumption: data.consumption,
        net_export: data.netExport,
        interval_minutes: data.interval,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: inserted.id,
      meterId: inserted.meter_id,
      timestamp: new Date(inserted.timestamp),
      generation: parseFloat(inserted.generation),
      consumption: parseFloat(inserted.consumption),
      netExport: parseFloat(inserted.net_export),
      interval: inserted.interval_minutes,
    };
  }

  /**
   * Get user's wallet
   */
  async getWallet(userId: string): Promise<Wallet | null> {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Wallet doesn't exist, create it
        return this.createWallet(userId);
      }
      throw error;
    }

    return {
      userId: data.user_id,
      energyBalance: parseFloat(data.energy_balance),
      cashBalance: parseFloat(data.cash_balance),
      updatedAt: new Date(data.updated_at),
    };
  }

  /**
   * Create wallet for user
   */
  async createWallet(userId: string): Promise<Wallet> {
    const { data, error } = await supabase
      .from('wallets')
      .insert({
        user_id: userId,
        energy_balance: 0,
        cash_balance: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      userId: data.user_id,
      energyBalance: parseFloat(data.energy_balance),
      cashBalance: parseFloat(data.cash_balance),
      updatedAt: new Date(data.updated_at),
    };
  }

  /**
   * Update wallet balance
   */
  async updateWallet(
    userId: string,
    updates: Partial<Pick<Wallet, 'energyBalance' | 'cashBalance'>>
  ): Promise<Wallet> {
    const updateData: any = {};
    if (updates.energyBalance !== undefined) updateData.energy_balance = updates.energyBalance;
    if (updates.cashBalance !== undefined) updateData.cash_balance = updates.cashBalance;

    const { data, error } = await supabase
      .from('wallets')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return {
      userId: data.user_id,
      energyBalance: parseFloat(data.energy_balance),
      cashBalance: parseFloat(data.cash_balance),
      updatedAt: new Date(data.updated_at),
    };
  }

  /**
   * Get user's transactions
   */
  async getTransactions(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return (
      data?.map((t) => ({
        id: t.id,
        userId: t.user_id,
        type: t.type,
        amount: parseFloat(t.amount),
        currency: t.currency,
        status: t.status,
        description: t.description,
        createdAt: new Date(t.created_at),
      })) || []
    );
  }

  /**
   * Create transaction
   */
  async createTransaction(
    transaction: Omit<Transaction, 'id' | 'createdAt'>
  ): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: transaction.userId,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        description: transaction.description,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      userId: data.user_id,
      type: data.type,
      amount: parseFloat(data.amount),
      currency: data.currency,
      status: data.status,
      description: data.description,
      createdAt: new Date(data.created_at),
    };
  }

  /**
   * Get user's orders
   */
  async getOrders(userId: string, status?: string): Promise<Order[]> {
    let query = supabase
      .from('orders')
      .select('*')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (
      data?.map((o) => ({
        id: o.id,
        buyerId: o.buyer_id,
        sellerId: o.seller_id,
        energyAmount: parseFloat(o.energy_amount),
        pricePerUnit: parseFloat(o.price_per_unit),
        totalPrice: parseFloat(o.total_price),
        status: o.status,
        createdAt: new Date(o.created_at),
        completedAt: o.completed_at ? new Date(o.completed_at) : undefined,
      })) || []
    );
  }

  /**
   * Create order
   */
  async createOrder(order: Omit<Order, 'id' | 'createdAt' | 'completedAt'>): Promise<Order> {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        buyer_id: order.buyerId,
        seller_id: order.sellerId,
        energy_amount: order.energyAmount,
        price_per_unit: order.pricePerUnit,
        total_price: order.totalPrice,
        status: order.status,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      buyerId: data.buyer_id,
      sellerId: data.seller_id,
      energyAmount: parseFloat(data.energy_amount),
      pricePerUnit: parseFloat(data.price_per_unit),
      totalPrice: parseFloat(data.total_price),
      status: data.status,
      createdAt: new Date(data.created_at),
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
    };
  }

  /**
   * Get KYC documents for user
   */
  async getKYCDocuments(userId: string): Promise<KYCData[]> {
    const { data, error } = await supabase
      .from('kyc_documents')
      .select('*')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;

    return (
      data?.map((k) => ({
        userId: k.user_id,
        documentType: k.document_type,
        documentNumber: k.document_number,
        name: k.name,
        status: k.status,
        rejectionReason: k.rejection_reason,
        submittedAt: new Date(k.submitted_at),
        verifiedAt: k.verified_at ? new Date(k.verified_at) : undefined,
      })) || []
    );
  }

  /**
   * Get trading bot config
   */
  async getTradingBotConfig(userId: string): Promise<TradingBotConfig | null> {
    const { data, error } = await supabase
      .from('trading_bot_configs')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Config doesn't exist, return default
        return null;
      }
      throw error;
    }

    return {
      userId: data.user_id,
      enabled: data.enabled,
      reservePower: data.reserve_power,
      minSellPrice: parseFloat(data.min_sell_price),
      priority: data.priority,
      updatedAt: new Date(data.updated_at),
    };
  }

  /**
   * Update trading bot config
   */
  async updateTradingBotConfig(
    userId: string,
    config: Partial<Omit<TradingBotConfig, 'userId' | 'updatedAt'>>
  ): Promise<TradingBotConfig> {
    const updateData: any = {};
    if (config.enabled !== undefined) updateData.enabled = config.enabled;
    if (config.reservePower !== undefined) updateData.reserve_power = config.reservePower;
    if (config.minSellPrice !== undefined) updateData.min_sell_price = config.minSellPrice;
    if (config.priority !== undefined) updateData.priority = config.priority;

    const { data, error } = await supabase
      .from('trading_bot_configs')
      .upsert({
        user_id: userId,
        ...updateData,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      userId: data.user_id,
      enabled: data.enabled,
      reservePower: data.reserve_power,
      minSellPrice: parseFloat(data.min_sell_price),
      priority: data.priority,
      updatedAt: new Date(data.updated_at),
    };
  }
}

export const supabaseDatabaseService = new SupabaseDatabaseService();

