import { z } from 'zod';

// Helper for location object validation
const locationSchema = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().optional()
}).or(z.string()); // Allow stringified JSON or object

export const searchBuyersSchema = z.object({
    location: z.string().optional(), // Can be JSON string needs parsing or simple string
    maxPrice: z.string().regex(/^\d+(\.\d+)?$/, "Invalid price format").optional(), // Query params are strings
    minEnergy: z.string().regex(/^\d+(\.\d+)?$/, "Invalid energy format").optional(),
    status: z.enum(['active', 'inactive', 'completed', 'cancelled']).optional()
});

export const createBuyerSchema = z.object({
    maxPricePerUnit: z.number().positive("Price must be positive"),
    energyNeeded: z.number().positive("Energy needed must be positive"),
    preferredDeliveryWindow: z.string().optional(),
    location: locationSchema
});
