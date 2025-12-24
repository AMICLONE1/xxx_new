// Re-export Supabase auth service as the main auth service
// This allows existing code to continue working while using Supabase under the hood
export {
  supabaseAuthService as authService,
  type SendOTPRequest,
  type VerifyOTPRequest,
  type AuthResponse,
} from '../supabase/authService';

// Legacy API client methods (can be removed if not needed)
import { apiClient } from './client';
import { ApiResponse } from '@/types';

class LegacyAuthService {
  // These methods now use Supabase but maintain API compatibility
  async sendOTP(data: { email: string }): Promise<ApiResponse<{ message: string }>> {
    // Fallback to API if Supabase is not configured
    try {
      const { supabaseAuthService } = await import('../supabase/authService');
      return supabaseAuthService.sendOTP(data);
    } catch {
      return apiClient.post('/auth/send-otp', data);
    }
  }

  async verifyOTP(data: { email: string; otp: string }): Promise<ApiResponse<any>> {
    try {
      const { supabaseAuthService } = await import('../supabase/authService');
      return supabaseAuthService.verifyOTP(data);
    } catch {
      return apiClient.post('/auth/verify-otp', data);
    }
  }
}

// Export both for backward compatibility
export const legacyAuthService = new LegacyAuthService();

