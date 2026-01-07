import { apiClient } from './client';
import { Site, SiteAnalytics, ApiResponse } from '@/types';
import { getErrorMessage } from '@/utils/errorUtils';

export interface AnalyticsPeriod {
  startDate?: string;
  endDate?: string;
  period?: 'day' | 'week' | 'month' | 'year';
}

class AnalyticsService {
  async getUserSites(): Promise<ApiResponse<Site[]>> {
    try {
      return await apiClient.get('/analytics/sites');
    } catch (error: unknown) {
      if (__DEV__) {
        console.log('[API] Backend unavailable for sites:', error instanceof Error && 'code' in error ? (error as { code: string }).code : 'NETWORK_ERROR');
      }
      return {
        success: false,
        error: getErrorMessage(error) || 'Failed to fetch sites. Backend API may be unavailable.',
        data: [],
      };
    }
  }

  async getSiteAnalytics(siteId: string, period?: AnalyticsPeriod): Promise<ApiResponse<SiteAnalytics>> {
    try {
      const params = new URLSearchParams();
      if (period?.startDate) params.append('startDate', period.startDate);
      if (period?.endDate) params.append('endDate', period.endDate);
      if (period?.period) params.append('period', period.period);

      const queryString = params.toString();
      const url = `/analytics/site/${siteId}${queryString ? `?${queryString}` : ''}`;
      
      return await apiClient.get(url);
    } catch (error: unknown) {
      if (__DEV__) {
        console.log('[API] Backend unavailable for site analytics:', error instanceof Error && 'code' in error ? (error as { code: string }).code : 'NETWORK_ERROR');
      }
      return {
        success: false,
        error: getErrorMessage(error) || 'Failed to fetch site analytics. Backend API may be unavailable.',
      };
    }
  }

  async getAggregatedAnalytics(period?: AnalyticsPeriod): Promise<ApiResponse<SiteAnalytics>> {
    try {
      const params = new URLSearchParams();
      if (period?.startDate) params.append('startDate', period.startDate);
      if (period?.endDate) params.append('endDate', period.endDate);
      if (period?.period) params.append('period', period.period);

      const queryString = params.toString();
      const url = `/analytics/aggregated${queryString ? `?${queryString}` : ''}`;
      
      return await apiClient.get(url);
    } catch (error: unknown) {
      if (__DEV__) {
        console.log('[API] Backend unavailable for aggregated analytics:', error instanceof Error && 'code' in error ? (error as { code: string }).code : 'NETWORK_ERROR');
      }
      return {
        success: false,
        error: getErrorMessage(error) || 'Failed to fetch aggregated analytics. Backend API may be unavailable.',
      };
    }
  }

  async getSiteEnergyData(siteId: string, startDate?: string, endDate?: string): Promise<ApiResponse<SiteAnalytics | undefined>> {
    // This would typically be part of the site analytics endpoint
    // For now, we'll use the site analytics endpoint
    return this.getSiteAnalytics(siteId, { startDate, endDate });
  }
}

export const analyticsService = new AnalyticsService();

