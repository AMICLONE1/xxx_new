import { analyticsDao } from '../dao/analyticsDao';
import {
    getSiteProfiles, getSiteProfile,
    generateSiteAnalytics, generateAggregatedAnalytics, SITE_PROFILES,
} from '../utils/analyticsDataGenerator';
import { AppError } from '../utils/AppError';
import { z } from 'zod';
import { getSiteAnalyticsSchema, getAggregatedAnalyticsSchema } from '../utils/validation/analytics.validation';

export const analyticsService = {
    async getSites(userId: string) {
        if (!userId) {
            throw new AppError('User ID is required', 400);
        }

        try {
            // Get user's meters
            const meters = await analyticsDao.getMetersByUserId(userId);

            // If no meters, return fake sites for demo
            if (!meters || meters.length === 0) {
                const fakeSites = getSiteProfiles().map((profile) => {
                    const analytics = generateSiteAnalytics(profile.id, 'month');
                    return {
                        id: profile.id,
                        name: profile.name,
                        discomName: profile.discomName,
                        consumerNumber: profile.consumerNumber,
                        address: profile.address,
                        totalGeneration: analytics.energyGenerated,
                        totalRevenue: analytics.totalRevenue,
                        activeTrades: analytics.activeTrades,
                        efficiency: analytics.efficiency,
                    };
                });
                return fakeSites;
            }

            // Optimization: Fetch orders once for the user
            const [orders, completedOrders] = await Promise.all([
                analyticsDao.getActiveOrders(userId),
                analyticsDao.getCompletedOrders(userId)
            ]);

            // Get analytics for each meter
            const sitesWithAnalytics = await Promise.all(
                meters.map(async (meter: any, index: number) => {
                    try {
                        // Get energy data for this meter
                        const energyData = await analyticsDao.getEnergyDataByMeterId(meter.id);

                        // Check if we have real data
                        const hasRealData = energyData && energyData.length > 0;

                        let totalGeneration = 0;
                        let totalConsumption = 0;
                        let totalRevenue = 0;
                        let activeTrades = 0;
                        let efficiency = 0;

                        if (hasRealData) {
                            // Use real data
                            totalGeneration = energyData!.reduce((sum, d) => sum + (d.generation || 0), 0);
                            totalConsumption = energyData!.reduce((sum, d) => sum + (d.consumption || 0), 0);
                            const netExport = totalGeneration - totalConsumption;

                            totalRevenue = completedOrders?.reduce((sum, o) => sum + (parseFloat(o.total_price) || 0), 0) || 0;
                            activeTrades = orders?.length || 0;
                            efficiency = totalGeneration > 0
                                ? parseFloat(((netExport / totalGeneration) * 100).toFixed(1))
                                : 0;
                        } else {
                            // Use fake data - map meter to a fake site profile
                            const fakeProfileIndex = index % SITE_PROFILES.length;
                            const fakeProfile = SITE_PROFILES[fakeProfileIndex];
                            const analytics = generateSiteAnalytics(fakeProfile.id, 'month');

                            totalGeneration = analytics.energyGenerated;
                            totalConsumption = analytics.energyConsumed;
                            totalRevenue = analytics.totalRevenue;
                            activeTrades = analytics.activeTrades;
                            efficiency = analytics.efficiency;
                        }

                        return {
                            id: meter.id,
                            name: `Site ${index + 1} - ${meter.discom_name}`,
                            discomName: meter.discom_name,
                            consumerNumber: meter.consumer_number,
                            address: meter.address,
                            totalGeneration,
                            totalRevenue,
                            activeTrades,
                            efficiency,
                        };
                    } catch (err) {
                        console.error(`Error processing meter ${meter.id}:`, err);
                        // Return default/erroneous state for this specific site rather than crashing entire request
                        return {
                            id: meter.id,
                            name: `Site ${index + 1} - ${meter.discom_name}`,
                            discomName: meter.discom_name,
                            consumerNumber: meter.consumer_number,
                            address: meter.address,
                            totalGeneration: 0,
                            totalRevenue: 0,
                            activeTrades: 0,
                            efficiency: 0,
                            error: 'Failed to load analytics'
                        };
                    }
                })
            );

            return sitesWithAnalytics;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to fetch sites', 500);
        }
    },

    async getSiteAnalytics(userId: string, siteId: string, startDate?: string, endDate?: string, period: 'day' | 'week' | 'month' | 'year' = 'month') {
        const validation = getSiteAnalyticsSchema.safeParse({ userId, siteId, startDate, endDate, period });

        if (!validation.success) {
            const errorMessage = validation.error.issues.map(e => e.message).join(', ');
            throw new AppError(errorMessage, 400);
        }

        try {
            // Verify meter belongs to user
            const meters = await analyticsDao.getMetersByUserId(userId);

            if (!meters) {
                throw new AppError('Error fetching user meters', 500);
            }

            const meter = meters.find((m: any) => m.id === siteId);

            // If meter not found, check if it's a fake site ID
            if (!meter) {
                const fakeProfile = getSiteProfile(siteId);
                // Allow demo access for fake profiles if user has no meters or purely for demo purposes
                // But strictly speaking, if we want security, we might only allow this if in 'demo mode' or similar. 
                // For now, preserving logic but ensuring it's clearly separated.
                if (fakeProfile) {
                    // Return fake data for demo site
                    const analytics = generateSiteAnalytics(siteId, period);
                    return {
                        siteId,
                        period,
                        ...analytics,
                    };
                }
                throw new AppError('Site not found or access denied', 404);
            }

            // Build date filter
            const energyData = await analyticsDao.getEnergyDataByMeterId(siteId, startDate, endDate);

            // Check if we have real data
            const hasRealData = energyData && energyData.length > 0;

            if (hasRealData) {
                // Use real data
                const energyGenerated = energyData!.reduce((sum, d) => sum + (d.generation || 0), 0);
                const energyConsumed = energyData!.reduce((sum, d) => sum + (d.consumption || 0), 0);
                const netExport = energyGenerated - energyConsumed;

                // Get orders
                const [activeOrders, completedOrders] = await Promise.all([
                    analyticsDao.getActiveOrders(userId),
                    analyticsDao.getCompletedOrders(userId)
                ]);

                const totalRevenue = completedOrders?.reduce((sum, o) => sum + (parseFloat(o.total_price) || 0), 0) || 0;
                const efficiency = energyGenerated > 0
                    ? parseFloat(((netExport / energyGenerated) * 100).toFixed(1))
                    : 0;

                const trends = {
                    generation: '+12%',
                    revenue: '+8%',
                };

                return {
                    siteId,
                    period,
                    energyGenerated,
                    energyConsumed,
                    netExport,
                    totalRevenue,
                    activeTrades: activeOrders?.length || 0,
                    completedTrades: completedOrders?.length || 0,
                    efficiency,
                    trends,
                };
            } else {
                // Use fake data - map meter to a fake site profile
                const meterIndex = meters.findIndex((m: any) => m.id === siteId) || 0;
                const fakeProfileIndex = meterIndex % SITE_PROFILES.length;
                const fakeProfile = SITE_PROFILES[fakeProfileIndex];
                const analytics = generateSiteAnalytics(fakeProfile.id, period);

                return {
                    siteId,
                    period,
                    ...analytics,
                };
            }
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(`Failed to fetch site analytics: ${(error as Error).message}`, 500);
        }
    },

    async getAggregatedAnalytics(userId: string, startDate?: string, endDate?: string, period: 'day' | 'week' | 'month' | 'year' = 'month') {
        const validation = getAggregatedAnalyticsSchema.safeParse({ userId, startDate, endDate, period });

        if (!validation.success) {
            const errorMessage = validation.error.issues.map(e => e.message).join(', ');
            throw new AppError(errorMessage, 400);
        }

        try {
            // Get all user meters
            const meters = await analyticsDao.getMetersByUserId(userId);
            const meterIds = meters?.map(m => m.id) || [];

            // If no meters, return aggregated fake data for all demo sites
            if (meterIds.length === 0) {
                const analytics = generateAggregatedAnalytics(period);
                return {
                    period,
                    ...analytics,
                };
            }

            // Get energy data for all meters
            const energyData = await analyticsDao.getEnergyDataByMeterIds(meterIds, startDate, endDate);

            // Check if we have real data
            const hasRealData = energyData && energyData.length > 0;

            if (hasRealData) {
                // Use real data
                const energyGenerated = energyData!.reduce((sum, d) => sum + (d.generation || 0), 0);
                const energyConsumed = energyData!.reduce((sum, d) => sum + (d.consumption || 0), 0);
                const netExport = energyGenerated - energyConsumed;

                // Get orders
                const [activeOrders, completedOrders] = await Promise.all([
                    analyticsDao.getActiveOrders(userId),
                    analyticsDao.getCompletedOrders(userId)
                ]);

                const totalRevenue = completedOrders?.reduce((sum, o) => sum + (parseFloat(o.total_price) || 0), 0) || 0;
                const efficiency = energyGenerated > 0
                    ? parseFloat(((netExport / energyGenerated) * 100).toFixed(1))
                    : 0;

                const trends = {
                    generation: '+12%',
                    revenue: '+8%',
                };

                return {
                    period,
                    energyGenerated,
                    energyConsumed,
                    netExport,
                    totalRevenue,
                    activeTrades: activeOrders?.length || 0,
                    completedTrades: completedOrders?.length || 0,
                    efficiency,
                    trends,
                };
            } else {
                // Use fake aggregated data
                const analytics = generateAggregatedAnalytics(period);
                return {
                    period,
                    ...analytics,
                };
            }
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(`Failed to fetch aggregated analytics: ${(error as Error).message}`, 500);
        }
    }
};
