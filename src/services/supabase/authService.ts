import { supabase } from './client';
import { User, ApiResponse, SupabaseUserProfile } from '@/types';
import { AuthError, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { getErrorMessage, logError, createErrorResponse } from '@/utils/errorUtils';

// Type for Supabase OTP verification response
interface OtpVerificationData {
  user: SupabaseUser | null;
  session: Session | null;
}

export interface SendOTPRequest {
  email: string;
}

export interface VerifyOTPRequest {
  email: string;
  otp: string;
}

export interface SignUpRequest {
  email: string;
  password: string;
  name?: string;
  phoneNumber?: string; // Phase 2: Store phone number with user account
}

export interface SignInRequest {
  email: string;
  password: string;
  phoneNumber?: string; // Phase 2: Support mobile number login
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
      // CRITICAL: Supabase email template must use {{ .Token }} not {{ .ConfirmationURL }}
      // If template uses ConfirmationURL, Supabase will send magic link instead of OTP
      // Also, emailRedirectTo must be explicitly set to null/undefined to force OTP mode
      const { data: authData, error } = await supabase.auth.signInWithOtp({
        email: data.email.toLowerCase().trim(),
        options: {
          shouldCreateUser: true, // Allow new users to be created
          emailRedirectTo: undefined, // Explicitly set to undefined to force OTP (not magic link)
        },
      });

      if (error) {
        console.error('Supabase OTP error:', error);
        
        // Provide helpful error message based on error type
        let errorMessage = error.message || 'Failed to send OTP.';
        
        if (error.message?.includes('magic link')) {
          errorMessage = 'Email template is configured for magic link. Please update Supabase email template to use {{ .Token }} instead of {{ .ConfirmationURL }}. See FIX_OTP_EMAIL_ISSUE.md for details.';
        } else if (error.message?.includes('email')) {
          errorMessage = 'Email sending failed. Please check Supabase email configuration and SMTP settings.';
        }
        
        return {
          success: false,
          error: errorMessage,
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
    } catch (error: unknown) {
      console.error('OTP send exception:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send OTP. Please try again.';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Verify OTP and sign in user
   */
  async verifyOTP(data: VerifyOTPRequest): Promise<ApiResponse<AuthResponse>> {
    try {
      // Verify OTP - try email type first, then fallback to other types
      let authData: OtpVerificationData | null = null;
      let error: AuthError | null = null;

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
    } catch (error: unknown) {
      logError('verifyOTP', error);
      return createErrorResponse(error, 'Failed to verify OTP');
    }
  }

  /**
   * Get or create user profile in public.users table
   */
  private async getOrCreateUserProfile(userId: string, email: string, name?: string, phoneNumber?: string): Promise<User> {
    try {
      if (__DEV__) {
        console.log('👤 Fetching user profile for:', userId);
      }

      // Check if user profile exists with timeout
      const fetchPromise = supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      const fetchTimeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), 8000)
      );

      let existingUser, fetchError;
      try {
        const result = await Promise.race([fetchPromise, fetchTimeoutPromise]) as any;
        existingUser = result.data;
        fetchError = result.error;
      } catch (timeoutError) {
        if (__DEV__) {
          console.warn('⚠️ Profile fetch timed out, will create new profile');
        }
        fetchError = timeoutError;
      }

      if (existingUser && !fetchError) {
        if (__DEV__) {
          console.log('✅ Found existing user profile');
        }
        // If name is provided and user doesn't have a name, update it
        if (name && !existingUser.name) {
          if (__DEV__) {
            console.log('📝 Updating user name...');
          }
          const updateResult = await supabase
            .from('users')
            .update({ name: name })
            .eq('id', userId)
            .select()
            .single();
          
          if (updateResult.data) {
            return this.mapSupabaseUserToUser(updateResult.data);
          }
        }
        return this.mapSupabaseUserToUser(existingUser);
      }

      if (__DEV__) {
        console.log('📝 Creating new user profile...');
      }

      // Create new user profile with timeout
      const createPromise = supabase
        .from('users')
        .insert({
          id: userId,
          email: email,
          name: name || null,
          phone_number: phoneNumber || null, // Store phone number if provided
          kyc_status: 'pending',
        })
        .select()
        .single();

      const createTimeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile creation timeout')), 8000)
      );

      const createResult = await Promise.race([createPromise, createTimeoutPromise]) as any;
      const newUser = createResult.data;
      const createError = createResult.error;

      if (createError || !newUser) {
        if (__DEV__) {
          console.error('❌ Failed to create user profile:', createError);
        }
        throw new Error(createError?.message || 'Failed to create user profile');
      }

      if (__DEV__) {
        console.log('✅ User profile created successfully');
      }

      return this.mapSupabaseUserToUser(newUser);
    } catch (error: unknown) {
      logError('getOrCreateUserProfile', error);
      throw error;
    }
  }

  /**
   * Map Supabase user to app User type
   */
  private mapSupabaseUserToUser(supabaseUser: SupabaseUserProfile): User {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      phoneNumber: supabaseUser.phone_number || undefined,
      name: supabaseUser.name || undefined,
      profilePictureUrl: supabaseUser.profile_picture_url || undefined,
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
    } catch (error: unknown) {
      logError('getCurrentUser', error);
      return createErrorResponse(error, 'Failed to get current user');
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
    } catch (error: unknown) {
      logError('refreshToken', error);
      return createErrorResponse(error, 'Failed to refresh token');
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
    } catch (error: unknown) {
      logError('logout', error);
      return createErrorResponse(error, 'Failed to logout');
    }
  }

  /**
   * Sign up with email and password
   */
  async signUp(data: SignUpRequest): Promise<ApiResponse<AuthResponse>> {
    try {
      if (__DEV__) {
        console.log('📝 Attempting sign up for:', data.email);
      }

      // Add timeout to prevent hanging
      const signUpPromise = supabase.auth.signUp({
        email: data.email.toLowerCase().trim(),
        password: data.password,
        options: {
          data: {
            name: data.name || '',
          },
        },
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Sign up request timeout. Please check your internet connection.')), 15000)
      );

      let result;
      try {
        result = await Promise.race([signUpPromise, timeoutPromise]) as { data: { user: any; session: any }; error: any };
      } catch (raceError: unknown) {
        // Handle network errors from Promise.race
        const errorMessage = raceError instanceof Error ? raceError.message : '';
        if (errorMessage.includes('timeout') || errorMessage.includes('Network request failed')) {
          if (__DEV__) {
            console.error('❌ Sign up network error:', raceError);
          }
          return {
            success: false,
            error: 'Network request failed. Please check your internet connection and try again. If using Android emulator, ensure network is configured correctly.',
          };
        }
        throw raceError;
      }

      const { data: authData, error } = result;

      if (error) {
        if (__DEV__) {
          console.error('❌ Sign up error:', error);
        }
        
        // Better error messages for common issues
        let errorMessage = error.message || 'Failed to create account. Please try again.';
        if (error.message?.includes('Network request failed') || error.message?.includes('fetch')) {
          errorMessage = 'Network request failed. Please check your internet connection. If using Android emulator, try: Settings → Network → Reset network settings.';
        } else if (error.message?.includes('email')) {
          errorMessage = 'Email address is already registered or invalid.';
        }
        
        return {
          success: false,
          error: errorMessage,
        };
      }

      if (!authData.user || !authData.session) {
        if (__DEV__) {
          console.error('❌ No user or session returned from sign up');
        }
        return {
          success: false,
          error: 'Sign up failed. Please try again.',
        };
      }

      if (__DEV__) {
        console.log('✅ Supabase sign up successful, creating user profile...');
      }

      // Get or create user profile in public.users table with timeout
      let userProfile;
      try {
        const profilePromise = this.getOrCreateUserProfile(
          authData.user.id,
          data.email.toLowerCase().trim(),
          data.name || undefined,
          data.phoneNumber || undefined
        );

        const profileTimeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Profile creation timeout')), 10000)
        );

        userProfile = await Promise.race([profilePromise, profileTimeoutPromise]) as User;
      } catch (profileError: unknown) {
        if (__DEV__) {
          console.warn('⚠️ Profile creation failed, using basic user data:', profileError);
        }
        // Even if profile creation fails, we can still sign up with basic user data
        userProfile = {
          id: authData.user.id,
          email: authData.user.email || data.email.toLowerCase().trim(),
          name: data.name || undefined,
          profilePictureUrl: undefined,
          kycStatus: 'pending' as const,
          createdAt: new Date(authData.user.created_at),
          updatedAt: new Date(authData.user.updated_at || authData.user.created_at),
        };
      }

      if (__DEV__) {
        console.log('✅ Sign up successful');
      }

      return {
        success: true,
        data: {
          user: userProfile,
          token: authData.session.access_token,
        },
      };
    } catch (error: unknown) {
      logError('signUp', error);
      return createErrorResponse(error, 'Failed to sign up. Please check your internet connection.');
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(data: SignInRequest): Promise<ApiResponse<AuthResponse>> {
    try {
      if (__DEV__) {
        console.log('🔐 Attempting sign in for:', data.email);
      }

      // Add timeout to prevent hanging
      const signInPromise = supabase.auth.signInWithPassword({
        email: data.email.toLowerCase().trim(),
        password: data.password,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Sign in request timeout. Please check your internet connection.')), 15000)
      );

      let result;
      try {
        result = await Promise.race([signInPromise, timeoutPromise]) as { data: { user: any; session: any }; error: any };
      } catch (raceError: unknown) {
        // Handle network errors from Promise.race
        const errorMessage = raceError instanceof Error ? raceError.message : '';
        if (errorMessage.includes('timeout') || errorMessage.includes('Network request failed')) {
          if (__DEV__) {
            console.error('❌ Sign in network error:', raceError);
          }
          return {
            success: false,
            error: 'Network request failed. Please check your internet connection and try again. If using Android emulator, ensure network is configured correctly.',
          };
        }
        throw raceError;
      }

      const { data: authData, error } = result;

      if (error) {
        if (__DEV__) {
          console.error('❌ Sign in error:', error);
        }
        
        // Better error messages for common issues
        let errorMessage = error.message || 'Invalid email or password';
        if (error.message?.includes('Network request failed') || error.message?.includes('fetch')) {
          errorMessage = 'Network request failed. Please check your internet connection. If using Android emulator, try: Settings → Network → Reset network settings.';
        } else if (error.message?.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials.';
        }
        
        return {
          success: false,
          error: errorMessage,
        };
      }

      if (!authData.user || !authData.session) {
        if (__DEV__) {
          console.error('❌ No user or session returned');
        }
        return {
          success: false,
          error: 'Sign in failed. Please check your credentials.',
        };
      }

      if (__DEV__) {
        console.log('✅ Supabase auth successful, fetching user profile...');
      }

      // Get or create user profile in public.users table
      // Add timeout to profile creation as well
      const profilePromise = this.getOrCreateUserProfile(
        authData.user.id,
        data.email.toLowerCase().trim()
      );

      const profileTimeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
      );

      let userProfile;
      try {
        userProfile = await Promise.race([profilePromise, profileTimeoutPromise]) as User;
      } catch (profileError: unknown) {
        if (__DEV__) {
          console.error('❌ Profile fetch error:', profileError);
        }
        // Even if profile fetch fails, we can still sign in with basic user data
        userProfile = {
          id: authData.user.id,
          email: authData.user.email || data.email.toLowerCase().trim(),
          profilePictureUrl: undefined,
          kycStatus: 'pending' as const,
          createdAt: new Date(authData.user.created_at),
          updatedAt: new Date(authData.user.updated_at || authData.user.created_at),
        };
      }

      if (__DEV__) {
        console.log('✅ Sign in successful');
      }

      return {
        success: true,
        data: {
          user: userProfile,
          token: authData.session.access_token,
        },
      };
    } catch (error: unknown) {
      logError('signIn', error);
      return createErrorResponse(error, 'Failed to sign in. Please check your internet connection.');
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
      if (updates.profilePictureUrl !== undefined) updateData.profile_picture_url = updates.profilePictureUrl;

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
    } catch (error: unknown) {
      logError('updateProfile', error);
      return createErrorResponse(error, 'Failed to update profile');
    }
  }

  /**
   * Send password reset email
   * Sends an OTP code to the user's email for password reset
   */
  async resetPasswordForEmail(email: string): Promise<ApiResponse<{ message: string }>> {
    try {
      if (__DEV__) {
        console.log('📧 Sending password reset email to:', email);
      }

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.toLowerCase().trim(),
        {
          // No redirect needed for mobile app - we use OTP verification
          redirectTo: undefined,
        }
      );

      if (error) {
        if (__DEV__) {
          console.error('❌ Password reset email error:', error);
        }
        return {
          success: false,
          error: error.message || 'Failed to send password reset email.',
        };
      }

      return {
        success: true,
        data: { message: 'Password reset code sent to your email.' },
      };
    } catch (error: unknown) {
      logError('resetPasswordForEmail', error);
      return createErrorResponse(error, 'Failed to send password reset email.');
    }
  }

  /**
   * Verify OTP for password recovery
   * @param email - User's email
   * @param token - The 6-digit OTP code
   * @param type - The type of OTP ('email' | 'recovery' | 'signup')
   */
  async verifyRecoveryOTP(
    email: string,
    token: string,
    type: 'email' | 'recovery' | 'signup' = 'recovery'
  ): Promise<ApiResponse<AuthResponse>> {
    try {
      if (__DEV__) {
        console.log('🔐 Verifying OTP for password recovery:', email);
      }

      const { data: authData, error } = await supabase.auth.verifyOtp({
        email: email.toLowerCase().trim(),
        token: token,
        type: type,
      });

      if (error) {
        if (__DEV__) {
          console.error('❌ OTP verification error:', error);
        }
        return {
          success: false,
          error: error.message || 'Invalid or expired verification code.',
        };
      }

      if (!authData.user || !authData.session) {
        return {
          success: false,
          error: 'Verification failed. Please try again.',
        };
      }

      // Get user profile
      const userProfile = await this.getOrCreateUserProfile(
        authData.user.id,
        email.toLowerCase().trim()
      );

      return {
        success: true,
        data: {
          user: userProfile,
          token: authData.session.access_token,
        },
      };
    } catch (error: unknown) {
      logError('verifyOtpForRecovery', error);
      return createErrorResponse(error, 'Failed to verify code.');
    }
  }

  /**
   * Update user's password (requires authenticated session)
   * Should be called after verifyOTP for password recovery
   */
  async updatePassword(newPassword: string): Promise<ApiResponse<{ message: string }>> {
    try {
      if (__DEV__) {
        console.log('🔐 Updating password...');
        // SECURITY: Never log password
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        if (__DEV__) {
          console.error('❌ Password update error:', error);
        }
        return {
          success: false,
          error: error.message || 'Failed to update password.',
        };
      }

      // Sign out after password change for security
      await supabase.auth.signOut();

      return {
        success: true,
        data: { message: 'Password updated successfully. Please sign in with your new password.' },
      };
    } catch (error: unknown) {
      logError('updatePassword', error);
      return createErrorResponse(error, 'Failed to update password.');
    }
  }
}

export const supabaseAuthService = new SupabaseAuthService();

