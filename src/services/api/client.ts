import Constants from 'expo-constants';

const API_BASE_URL =
  Constants.expoConfig?.extra?.apiBaseUrl || process.env.API_BASE_URL || 'https://api.powernetpro.com';

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

class ApiClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string = API_BASE_URL, timeout: number = 30000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
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

  private getAuthHeaders(): Record<string, string> {
    // Get token from auth store
    // Note: This is a synchronous method, so we can't use the async store directly
    // The token should be set in the store when user logs in
    // For now, we'll get it from secure storage synchronously if possible
    // In a real implementation, you might want to pass the token as a parameter
    // or use a different approach for getting the token
    const token = ''; // TODO: Retrieve from auth store or secure storage
    return token ? { Authorization: `Bearer ${token}` } : {};
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

