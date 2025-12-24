import { supabase } from './client';
import { User, ApiResponse } from '@/types';

export interface SendOTPRequest {
  email: string;
}

export interface VerifyOTPRequest {
  email: string;
  otp: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

class SupabaseAuthService {
  /**
   * Send OTP to email address
   * 
   * IMPORTANT: For OTP to work, ensure in Supabase Dashboard:
   * - Authentication → Providers → Email → "Confirm email" is set to OFF
   * - Otherwise, Supabase will send confirmation emails instead of OTP codes
   */
  async sendOTP(data: SendOTPRequest): Promise<ApiResponse<{ message: string }>> {
    try {
      // Use signInWithOtp to send OTP code
      // Note: Supabase settings must have "Confirm email" disabled for OTP to work
      const { data: authData, error } = await supabase.auth.signInWithOtp({
        email: data.email.toLowerCase().trim(),
        options: {
          shouldCreateUser: true, // Allow new users to be created
          // Don't set emailRedirectTo to ensure OTP is sent, not magic link
        },
      });

      if (error) {
        console.error('Supabase OTP error:', error);
        return {
          success: false,
          error: error.message || 'Failed to send OTP. Please check your email configuration in Supabase.',
        };
      }

      // Check if OTP was actually sent
      if (authData) {
        return {
          success: true,
          data: { message: 'OTP sent successfully to your email. Please check your inbox.' },
        };
      }

      return {
        success: true,
        data: { message: 'OTP sent successfully to your email. Please check your inbox.' },
      };
    } catch (error: any) {
      console.error('OTP send exception:', error);
      return {
        success: false,
        error: error.message || 'Failed to send OTP. Please try again.',
      };
    }
  }

  /**
   * Verify OTP and sign in user
   */
  async verifyOTP(data: VerifyOTPRequest): Promise<ApiResponse<AuthResponse>> {
    try {
      // Verify OTP - try email type first, then fallback to other types
      let authData: any = null;
      let error: any = null;

      // Try email OTP verification
      const result = await supabase.auth.verifyOtp({
        email: data.email.toLowerCase().trim(),
        token: data.otp,
        type: 'email',
      });

      authData = result.data;
      error = result.error;

      // If email type fails, try with 'signup' type (for new users)
      if (error && error.message?.includes('token')) {
        const fallbackResult = await supabase.auth.verifyOtp({
          email: data.email.toLowerCase().trim(),
          token: data.otp,
          type: 'signup', // Try signup type for new users
        });
        authData = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      if (!authData.user || !authData.session) {
        return {
          success: false,
          error: 'Authentication failed',
        };
      }

      // Get or create user profile in public.users table
      const userProfile = await this.getOrCreateUserProfile(
        authData.user.id,
        data.email.toLowerCase().trim()
      );

      return {
        success: true,
        data: {
          user: userProfile,
          token: authData.session.access_token,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to verify OTP',
      };
    }
  }

  /**
   * Get or create user profile in public.users table
   */
  private async getOrCreateUserProfile(userId: string, email: string): Promise<User> {
    // Check if user profile exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (existingUser && !fetchError) {
      return this.mapSupabaseUserToUser(existingUser);
    }

    // Create new user profile
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: email,
        kyc_status: 'pending',
      })
      .select()
      .single();

    if (createError || !newUser) {
      throw new Error(createError?.message || 'Failed to create user profile');
    }

    return this.mapSupabaseUserToUser(newUser);
  }

  /**
   * Map Supabase user to app User type
   */
  private mapSupabaseUserToUser(supabaseUser: any): User {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      phoneNumber: supabaseUser.phone_number || undefined,
      name: supabaseUser.name || undefined,
      kycStatus: supabaseUser.kyc_status || 'pending',
      createdAt: new Date(supabaseUser.created_at),
      updatedAt: new Date(supabaseUser.updated_at),
    };
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser) {
        return {
          success: false,
          error: authError?.message || 'Not authenticated',
        };
      }

      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileError || !userProfile) {
        return {
          success: false,
          error: profileError?.message || 'User profile not found',
        };
      }

      return {
        success: true,
        data: this.mapSupabaseUserToUser(userProfile),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get current user',
      };
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.refreshSession();

      if (error || !session) {
        return {
          success: false,
          error: error?.message || 'Failed to refresh token',
        };
      }

      return {
        success: true,
        data: { token: session.access_token },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to refresh token',
      };
    }
  }

  /**
   * Sign out current user
   */
  async logout(): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to logout',
      };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser) {
        return {
          success: false,
          error: 'Not authenticated',
        };
      }

      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.email !== undefined) updateData.email = updates.email;
      if (updates.kycStatus !== undefined) updateData.kyc_status = updates.kycStatus;

      const { data: updatedUser, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', authUser.id)
        .select()
        .single();

      if (error || !updatedUser) {
        return {
          success: false,
          error: error?.message || 'Failed to update profile',
        };
      }

      return {
        success: true,
        data: this.mapSupabaseUserToUser(updatedUser),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update profile',
      };
    }
  }
}

export const supabaseAuthService = new SupabaseAuthService();

