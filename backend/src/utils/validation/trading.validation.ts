import { z } from 'zod';

// Helper Schema for filters
export const searchSellersSchema = z.object({
    location: z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180)
    }).optional(),
    minPrice: z.number().nonnegative().optional(),
    maxPrice: z.number().nonnegative().optional(),
    greenEnergyOnly: z.boolean().optional(),
    minRating: z.number().min(0).max(5).optional()
});

export const createOrderSchema = z.object({
    buyerId: z.string().uuid('Invalid Buyer ID'),
    sellerId: z.string().uuid('Invalid Seller ID'),
    energyAmount: z.number().positive('Energy amount must be positive'),
    pricePerUnit: z.number().positive('Price must be positive')
});
