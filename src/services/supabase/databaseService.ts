import { supabase } from './client';
import { Meter, EnergyData, Order, Wallet, Transaction, KYCData, TradingBotConfig, MeterUpdateData, UserProfileUpdateData, Buyer, Seller } from '@/types';

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
   * Delete a meter
   */
  async deleteMeter(meterId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('meters')
      .delete()
      .eq('id', meterId)
      .eq('user_id', userId); // Ensure user owns the meter

    if (error) throw error;
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
    const updateData: Record<string, number> = {};
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
        dateOfBirth: k.date_of_birth,
        address: k.address,
        fileUrl: k.file_url,
      })) || []
    );
  }

  /**
   * Submit KYC document with all details
   */
  async submitKYCDocument(
    userId: string,
    documentType: 'aadhaar' | 'pan' | 'electricity_bill' | 'gst' | 'society_registration',
    data: {
      documentNumber?: string;
      name?: string;
      dateOfBirth?: string;
      address?: string;
      fileUrl?: string;
    }
  ): Promise<KYCData> {
    const { data: inserted, error } = await supabase
      .from('kyc_documents')
      .insert({
        user_id: userId,
        document_type: documentType,
        document_number: data.documentNumber || null,
        name: data.name || null,
        date_of_birth: data.dateOfBirth || null,
        address: data.address || null,
        file_url: data.fileUrl || null,
        status: 'pending',
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return {
      userId: inserted.user_id,
      documentType: inserted.document_type,
      documentNumber: inserted.document_number,
      name: inserted.name,
      status: inserted.status,
      rejectionReason: inserted.rejection_reason,
      submittedAt: new Date(inserted.submitted_at),
      verifiedAt: inserted.verified_at ? new Date(inserted.verified_at) : undefined,
      dateOfBirth: inserted.date_of_birth,
      address: inserted.address,
      fileUrl: inserted.file_url,
    };
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
    const updateData: Record<string, boolean | number | string> = {};
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

  // ============================================
  // BUYER OPERATIONS
  // ============================================

  /**
   * Create a buyer listing for a user
   */
  async createBuyer(buyer: {
    userId: string;
    name: string;
    location?: { lat: number; lng: number; address?: string };
    maxPricePerUnit: number;
    energyNeeded: number;
    preferredDeliveryWindow?: string;
    avgConsumption?: number;
    peakConsumption?: number;
    greenEnergyPreference?: boolean;
  }): Promise<Buyer> {
    const { data, error } = await supabase
      .from('buyers')
      .insert({
        user_id: buyer.userId,
        name: buyer.name,
        location: buyer.location || null,
        max_price_per_unit: buyer.maxPricePerUnit,
        energy_needed: buyer.energyNeeded,
        preferred_delivery_window: buyer.preferredDeliveryWindow || null,
        avg_consumption: buyer.avgConsumption || 0,
        peak_consumption: buyer.peakConsumption || 0,
        green_energy_preference: buyer.greenEnergyPreference || false,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;

    return this.mapBuyerFromDb(data);
  }

  /**
   * Get buyer by user ID
   */
  async getBuyerByUserId(userId: string): Promise<Buyer | null> {
    const { data, error } = await supabase
      .from('buyers')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No buyer found
      }
      throw error;
    }

    return this.mapBuyerFromDb(data);
  }

  /**
   * Get all active buyers
   */
  async getActiveBuyers(): Promise<Buyer[]> {
    try {
      if (__DEV__) {
        console.log('[DatabaseService] Fetching active buyers from Supabase...');
      }

      const { data, error } = await supabase
        .from('buyers')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[DatabaseService] Error fetching buyers:', error);
        throw error;
      }

      if (__DEV__) {
        console.log(`[DatabaseService] Found ${data?.length || 0} buyers in database`);
      }

      return (data || []).map(this.mapBuyerFromDb);
    } catch (error) {
      console.error('[DatabaseService] getActiveBuyers failed:', error);
      throw error;
    }
  }

  /**
   * Update buyer listing
   */
  async updateBuyer(
    userId: string,
    updates: Partial<{
      name: string;
      location: { lat: number; lng: number; address?: string };
      maxPricePerUnit: number;
      energyNeeded: number;
      preferredDeliveryWindow: string;
      avgConsumption: number;
      peakConsumption: number;
      totalEnergyBought: number;
      greenEnergyPreference: boolean;
      status: 'active' | 'inactive' | 'fulfilled';
    }>
  ): Promise<Buyer> {
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.location !== undefined) updateData.location = updates.location;
    if (updates.maxPricePerUnit !== undefined) updateData.max_price_per_unit = updates.maxPricePerUnit;
    if (updates.energyNeeded !== undefined) updateData.energy_needed = updates.energyNeeded;
    if (updates.preferredDeliveryWindow !== undefined) updateData.preferred_delivery_window = updates.preferredDeliveryWindow;
    if (updates.avgConsumption !== undefined) updateData.avg_consumption = updates.avgConsumption;
    if (updates.peakConsumption !== undefined) updateData.peak_consumption = updates.peakConsumption;
    if (updates.totalEnergyBought !== undefined) updateData.total_energy_bought = updates.totalEnergyBought;
    if (updates.greenEnergyPreference !== undefined) updateData.green_energy_preference = updates.greenEnergyPreference;
    if (updates.status !== undefined) updateData.status = updates.status;

    const { data, error } = await supabase
      .from('buyers')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return this.mapBuyerFromDb(data);
  }

  /**
   * Map database buyer record to Buyer type
   */
  private mapBuyerFromDb(data: Record<string, unknown>): Buyer {
    const location = data.location as { lat: number; lng: number; address?: string } | null;
    return {
      id: data.id as string,
      userId: data.user_id as string,
      name: data.name as string,
      location: location || { lat: 0, lng: 0 },
      maxPricePerUnit: parseFloat(data.max_price_per_unit as string) || 0,
      energyNeeded: parseFloat(data.energy_needed as string) || 0,
      preferredDeliveryWindow: data.preferred_delivery_window as string | undefined,
      rating: parseFloat(data.rating as string) || 0,
      status: (data.status as 'active' | 'inactive' | 'fulfilled') || 'active',
      avgConsumption: parseFloat(data.avg_consumption as string) || 0,
      peakConsumption: parseFloat(data.peak_consumption as string) || 0,
      totalEnergyBought: parseFloat(data.total_energy_bought as string) || 0,
      greenEnergyPreference: data.green_energy_preference as boolean || false,
      createdAt: data.created_at ? new Date(data.created_at as string) : undefined,
      updatedAt: data.updated_at ? new Date(data.updated_at as string) : undefined,
    };
  }

  // ============================================
  // SELLER OPERATIONS
  // ============================================

  /**
   * Create a seller listing for a user
   */
  async createSeller(seller: {
    userId: string;
    name: string;
    location?: { lat: number; lng: number; address?: string };
    pricePerUnit: number;
    availableEnergy?: number;
    greenEnergy?: boolean;
    avgGeneration?: number;
    peakGeneration?: number;
    netExport?: number;
  }): Promise<Seller> {
    const { data, error } = await supabase
      .from('sellers')
      .insert({
        user_id: seller.userId,
        name: seller.name,
        location: seller.location || null,
        price_per_unit: seller.pricePerUnit,
        available_energy: seller.availableEnergy || 0,
        green_energy: seller.greenEnergy || false,
        avg_generation: seller.avgGeneration || 0,
        peak_generation: seller.peakGeneration || 0,
        net_export: seller.netExport || 0,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;

    return this.mapSellerFromDb(data);
  }

  /**
   * Get seller by user ID
   */
  async getSellerByUserId(userId: string): Promise<Seller | null> {
    const { data, error } = await supabase
      .from('sellers')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No seller found
      }
      throw error;
    }

    return this.mapSellerFromDb(data);
  }

  /**
   * Get all active sellers
   */
  async getActiveSellers(): Promise<Seller[]> {
    try {
      if (__DEV__) {
        console.log('[DatabaseService] Fetching active sellers from Supabase...');
      }

      const { data, error } = await supabase
        .from('sellers')
        .select('*')
        .or('status.eq.active,status.is.null')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[DatabaseService] Error fetching sellers:', error);
        throw error;
      }

      if (__DEV__) {
        console.log(`[DatabaseService] Found ${data?.length || 0} sellers in database`);
      }

      return (data || []).map(this.mapSellerFromDb);
    } catch (error) {
      console.error('[DatabaseService] getActiveSellers failed:', error);
      throw error;
    }
  }

  /**
   * Update seller listing
   */
  async updateSeller(
    userId: string,
    updates: Partial<{
      name: string;
      location: { lat: number; lng: number; address?: string };
      pricePerUnit: number;
      availableEnergy: number;
      greenEnergy: boolean;
      avgGeneration: number;
      peakGeneration: number;
      netExport: number;
      totalEnergySold: number;
      status: 'active' | 'inactive' | 'suspended';
    }>
  ): Promise<Seller> {
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.location !== undefined) updateData.location = updates.location;
    if (updates.pricePerUnit !== undefined) updateData.price_per_unit = updates.pricePerUnit;
    if (updates.availableEnergy !== undefined) updateData.available_energy = updates.availableEnergy;
    if (updates.greenEnergy !== undefined) updateData.green_energy = updates.greenEnergy;
    if (updates.avgGeneration !== undefined) updateData.avg_generation = updates.avgGeneration;
    if (updates.peakGeneration !== undefined) updateData.peak_generation = updates.peakGeneration;
    if (updates.netExport !== undefined) updateData.net_export = updates.netExport;
    if (updates.totalEnergySold !== undefined) updateData.total_energy_sold = updates.totalEnergySold;
    if (updates.status !== undefined) updateData.status = updates.status;

    const { data, error } = await supabase
      .from('sellers')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return this.mapSellerFromDb(data);
  }

  /**
   * Update wallet without returning data
   * Useful when RLS prevents selecting the updated row
   */
  async updateWalletNoReturn(
    userId: string,
    updates: Partial<Pick<Wallet, 'energyBalance' | 'cashBalance'>>
  ): Promise<void> {
    const updateData: Record<string, number> = {};
    if (updates.energyBalance !== undefined) updateData.energy_balance = updates.energyBalance;
    if (updates.cashBalance !== undefined) updateData.cash_balance = updates.cashBalance;

    const { error, count } = await supabase
      .from('wallets')
      .update(updateData, { count: 'exact' })
      .eq('user_id', userId);

    if (error) throw error;
    if (count === 0) {
      console.warn(`[Supabase] updateWalletNoReturn led to 0 updates for user ${userId}. Possible RLS restriction.`);
    }
  }

  /**
   * Update seller listing without returning data
   * Useful when RLS prevents selecting the updated row
   */
  async updateSellerNoReturn(
    userId: string,
    updates: Partial<{
      name: string;
      location: { lat: number; lng: number; address?: string };
      pricePerUnit: number;
      availableEnergy: number;
      greenEnergy: boolean;
      avgGeneration: number;
      peakGeneration: number;
      netExport: number;
      totalEnergySold: number;
      status: 'active' | 'inactive' | 'suspended';
    }>
  ): Promise<void> {
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.location !== undefined) updateData.location = updates.location;
    if (updates.pricePerUnit !== undefined) updateData.price_per_unit = updates.pricePerUnit;
    if (updates.availableEnergy !== undefined) updateData.available_energy = updates.availableEnergy;
    if (updates.greenEnergy !== undefined) updateData.green_energy = updates.greenEnergy;
    if (updates.avgGeneration !== undefined) updateData.avg_generation = updates.avgGeneration;
    if (updates.peakGeneration !== undefined) updateData.peak_generation = updates.peakGeneration;
    if (updates.netExport !== undefined) updateData.net_export = updates.netExport;
    if (updates.totalEnergySold !== undefined) updateData.total_energy_sold = updates.totalEnergySold;
    if (updates.status !== undefined) updateData.status = updates.status;

    const { error, count } = await supabase
      .from('sellers')
      .update(updateData, { count: 'exact' })
      .eq('user_id', userId);

    if (error) throw error;
    if (count === 0) {
      console.warn(`[Supabase] updateSellerNoReturn led to 0 updates for user ${userId}. Possible RLS restriction.`);
    }
  }

  /**
   * Map database seller record to Seller type
   */
  private mapSellerFromDb(data: Record<string, unknown>): Seller {
    const location = data.location as { lat: number; lng: number; address?: string } | null;
    return {
      id: data.id as string,
      userId: data.user_id as string,
      name: data.name as string,
      location: location || { lat: 0, lng: 0 },
      pricePerUnit: parseFloat(data.price_per_unit as string) || 0,
      availableEnergy: parseFloat(data.available_energy as string) || 0,
      rating: parseFloat(data.rating as string) || 0,
      totalSales: parseFloat(data.total_sales as string) || 0,
      greenEnergy: data.green_energy as boolean || false,
      avgGeneration: parseFloat(data.avg_generation as string) || 0,
      peakGeneration: parseFloat(data.peak_generation as string) || 0,
      netExport: parseFloat(data.net_export as string) || 0,
      totalEnergySold: parseFloat(data.total_energy_sold as string) || 0,
      status: (data.status as 'active' | 'inactive' | 'suspended') || 'active',
      createdAt: data.created_at ? new Date(data.created_at as string) : undefined,
      updatedAt: data.updated_at ? new Date(data.updated_at as string) : undefined,
    };
  }
}

export const supabaseDatabaseService = new SupabaseDatabaseService();

