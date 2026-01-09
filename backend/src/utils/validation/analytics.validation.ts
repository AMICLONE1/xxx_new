import { z } from 'zod';

export const periodSchema = z.enum(['day', 'week', 'month', 'year']).optional();

export const dateSchema = z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format",
}).optional();

export const getSiteAnalyticsSchema = z.object({
    userId: z.string().uuid({ message: "Invalid user ID" }),
    siteId: z.string().min(1, { message: "Site ID is required" }),
    startDate: dateSchema,
    endDate: dateSchema,
    period: periodSchema,
});

export const getAggregatedAnalyticsSchema = z.object({
    userId: z.string().uuid({ message: "Invalid user ID" }),
    startDate: dateSchema,
    endDate: dateSchema,
    period: periodSchema,
});
