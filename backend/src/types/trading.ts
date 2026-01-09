export interface TradingSearchFilters {
    location?: { lat: number; lng: number };
    minPrice?: number;
    maxPrice?: number;
    greenEnergyOnly?: boolean;
    minRating?: number;
}

export interface CreateOrderData {
    buyerId: string;
    sellerId: string;
    energyAmount: number;
    pricePerUnit: number;
}

export interface Order {
    id: string;
    buyer_id: string;
    seller_id: string;
    energy_amount: number;
    price_per_unit: number;
    total_price: number;
    status: 'pending' | 'processing' | 'delivering' | 'completed' | 'cancelled';
    created_at: string;
    updated_at?: string;
    delivered_energy?: number;
    cancelled_at?: string;
}
