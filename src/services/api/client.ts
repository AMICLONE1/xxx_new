import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { getCurrentSession } from '@/services/supabase/client';

const API_BASE_URL =
  Constants.expoConfig?.extra?.apiBaseUrl || process.env.API_BASE_URL || 'https://api.powernetpro.com';

const TOKEN_KEY = 'auth_token';

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private maxRetries: number;
  private retryDelay: number;

  constructor(baseUrl: string = API_BASE_URL, timeout: number = 30000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second initial delay
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      // Get auth headers asynchronously
      const authHeaders = await this.getAuthHeaders();
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          const error = await response.json().catch(() => ({
            message: `HTTP ${response.status}: ${response.statusText}`,
          }));
          throw {
            message: error.message || 'An error occurred',
            code: error.code,
            status: response.status,
          } as ApiError;
        }

        // Retry on server errors (5xx) and rate limits (429)
        if (retryCount < this.maxRetries && (response.status >= 500 || response.status === 429)) {
          const delay = this.retryDelay * Math.pow(2, retryCount); // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, delay));
          return this.request<T>(endpoint, options, retryCount + 1);
        }

        const error = await response.json().catch(() => ({
          message: `HTTP ${response.status}: ${response.statusText}`,
        }));
        throw {
          message: error.message || 'An error occurred',
          code: error.code,
          status: response.status,
        } as ApiError;
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // Enhanced error handling
      if (error.name === 'AbortError') {
        // Retry on timeout
        if (retryCount < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, retryCount);
          await new Promise((resolve) => setTimeout(resolve, delay));
          return this.request<T>(endpoint, options, retryCount + 1);
        }
        throw { 
          message: 'Request timeout - Server took too long to respond', 
          code: 'TIMEOUT',
          originalError: error 
        } as ApiError;
      }
      
      // Network errors (connection failed, DNS error, etc.)
      if (error.message?.includes('Network request failed') || 
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('NetworkError')) {
        // Retry on network errors
        if (retryCount < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, retryCount);
          await new Promise((resolve) => setTimeout(resolve, delay));
          return this.request<T>(endpoint, options, retryCount + 1);
        }
        throw { 
          message: `Network error: Unable to connect to ${this.baseUrl}. Please check your internet connection or backend server status.`, 
          code: 'NETWORK_ERROR',
          originalError: error 
        } as ApiError;
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      // Try to get token from Supabase session first (primary source)
      const session = await getCurrentSession();
      if (session?.access_token) {
        return { Authorization: `Bearer ${session.access_token}` };
      }

      // Fallback to SecureStore
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        return { Authorization: `Bearer ${token}` };
      }

      // No token available
      return {};
    } catch (error) {
      // If getting token fails, continue without auth header
      // This allows public endpoints to work
      console.warn('Failed to get auth token:', error);
      return {};
    }
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();

