import { apiClient } from './client';
import { Transaction, ApiResponse } from '@/types';
import { getErrorMessage } from '@/utils/errorUtils';

export interface GetTransactionsFilters {
  limit?: number;
  offset?: number;
  type?: 'topup' | 'withdrawal' | 'energy_purchase' | 'energy_sale' | 'refund';
  status?: 'pending' | 'completed' | 'failed';
  startDate?: string;
  endDate?: string;
}

class TransactionsService {
  async getTransactions(filters?: GetTransactionsFilters): Promise<ApiResponse<Transaction[]>> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());
      if (filters?.type) params.append('type', filters.type);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);

      const queryString = params.toString();
      const url = `/transactions${queryString ? `?${queryString}` : ''}`;
      
      return await apiClient.get(url);
    } catch (error: unknown) {
      if (__DEV__) {
        console.log('[API] Backend unavailable for transactions:', error instanceof Error && 'code' in error ? (error as { code: string }).code : 'NETWORK_ERROR');
      }
      return {
        success: false,
        error: getErrorMessage(error) || 'Failed to fetch transactions. Backend API may be unavailable.',
        data: [],
      };
    }
  }
}

export const transactionsService = new TransactionsService();

