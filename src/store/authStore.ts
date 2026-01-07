import { create } from 'zustand';
import { User } from '@/types';
import * as SecureStore from 'expo-secure-store';
import { supabaseAuthService } from '@/services/supabase/authService';
import { supabase } from '@/services/supabase/client';
import { useKYCStore } from './kycStore';
import { logError } from '@/utils/errorUtils';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => Promise<void>;
  logout: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  restoreSession: () => Promise<void>;
}

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start with loading true to check session
  token: null,

  setUser: async (user) => {
    set({
      user,
      isAuthenticated: !!user,
    });
    // Also store user in SecureStore for persistence
    if (user) {
      try {
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
        
        // CRITICAL: Sync KYC state from backend when user is set
        console.log('[AuthStore] User set, syncing KYC from backend...');
        try {
          await useKYCStore.getState().syncFromBackend(user.id);
          console.log('[AuthStore] KYC sync completed');
        } catch (kycError) {
          console.error('[AuthStore] KYC sync failed (non-blocking):', kycError);
        }
      } catch (error) {
        console.error('Error storing user:', error);
      }
    } else {
      try {
        await SecureStore.deleteItemAsync(USER_KEY);
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  },

  setToken: async (token) => {
    if (token) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
    set({ token });
  },

  logout: async () => {
    console.log('[AuthStore] Logging out...');
    
    // CRITICAL: Reset KYC state BEFORE clearing auth
    console.log('[AuthStore] Resetting KYC state...');
    useKYCStore.getState().resetKYC();
    
    // Sign out from Supabase
    await supabaseAuthService.logout();
    
    // Clear SecureStore
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    
    console.log('[AuthStore] Logout complete');
    
    set({
      user: null,
      isAuthenticated: false,
      token: null,
    });
  },

  setLoading: (isLoading) => set({ isLoading }),

  restoreSession: async () => {
    try {
      set({ isLoading: true });

      if (__DEV__) {
        console.log('🔄 Starting session restoration...');
      }

      // Add timeout to prevent infinite loading (5 seconds)
      const timeoutId = setTimeout(() => {
        if (__DEV__) {
          console.warn('⏱️ Session restore timeout - proceeding without session');
        }
        set({
          user: null,
          isAuthenticated: false,
          token: null,
          isLoading: false,
        });
      }, 5000);

      try {
        // Check Supabase session first (primary source of truth) with timeout
        const sessionPromise = supabase.auth.getSession();
        const sessionTimeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session check timeout')), 8000)
        );

        let session, sessionError;
        try {
          const result = await Promise.race([sessionPromise, sessionTimeoutPromise]) as any;
          session = result.data?.session;
          sessionError = result.error;
        } catch (timeoutError) {
          if (__DEV__) {
            console.warn('⏱️ Session check timed out, proceeding without session');
          }
          session = null;
          sessionError = timeoutError;
        }
        
        if (__DEV__) {
          console.log('🔐 Session check:', { hasSession: !!session, error: sessionError?.message });
        }
        
        if (session && !sessionError) {
          // Session exists, get user profile with timeout
          try {
            const userResponsePromise = supabaseAuthService.getCurrentUser();
            const userResponseTimeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('User profile fetch timeout')), 8000)
            );

            let userResponse;
            try {
              userResponse = await Promise.race([userResponsePromise, userResponseTimeoutPromise]) as any;
            } catch (timeoutError) {
              if (__DEV__) {
                console.warn('⏱️ User profile fetch timed out, using session data only');
              }
              // Use session data even if profile fetch fails
              clearTimeout(timeoutId);
              const sessionUser = {
                id: session.user.id,
                email: session.user.email || '',
                kycStatus: 'pending' as const,
                createdAt: new Date(session.user.created_at),
                updatedAt: new Date(session.user.updated_at || session.user.created_at),
              };
              set({
                user: sessionUser,
                isAuthenticated: true,
                token: session.access_token,
                isLoading: false,
              });
              // Sync KYC from backend
              try {
                await useKYCStore.getState().syncFromBackend(sessionUser.id);
                console.log('[AuthStore] KYC synced after session restore');
              } catch (kycErr) {
                console.error('[AuthStore] KYC sync failed:', kycErr);
              }
              return;
            }
            
            if (__DEV__) {
              console.log('👤 User profile fetch:', { success: userResponse.success, error: userResponse.error });
            }
            
            if (userResponse.success && userResponse.data) {
              clearTimeout(timeoutId);
              set({
                user: userResponse.data,
                isAuthenticated: true,
                token: session.access_token,
                isLoading: false,
              });
              // Sync KYC from backend
              try {
                await useKYCStore.getState().syncFromBackend(userResponse.data.id);
                console.log('[AuthStore] KYC synced after session restore');
              } catch (kycErr) {
                console.error('[AuthStore] KYC sync failed:', kycErr);
              }
              return;
            }
          } catch (profileError) {
            if (__DEV__) {
              console.warn('⚠️ Profile fetch error, using session data:', profileError);
            }
            // Fallback to session data if profile fetch fails
            clearTimeout(timeoutId);
            const fallbackUser = {
              id: session.user.id,
              email: session.user.email || '',
              kycStatus: 'pending' as const,
              createdAt: new Date(session.user.created_at),
              updatedAt: new Date(session.user.updated_at || session.user.created_at),
            };
            set({
              user: fallbackUser,
              isAuthenticated: true,
              token: session.access_token,
              isLoading: false,
            });
            // Sync KYC from backend
            try {
              await useKYCStore.getState().syncFromBackend(fallbackUser.id);
              console.log('[AuthStore] KYC synced after session restore');
            } catch (kycErr) {
              console.error('[AuthStore] KYC sync failed:', kycErr);
            }
            return;
          }
        }

        // Fallback: Try to restore from SecureStore
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        const storedUser = await SecureStore.getItemAsync(USER_KEY);

        if (storedToken && storedUser) {
          try {
            const user = JSON.parse(storedUser);
            // Verify token is still valid by checking Supabase session (with timeout)
            const verifyPromise = supabase.auth.getSession();
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Verification timeout')), 3000)
            );
            
            try {
              const { data: { session: verifySession } } = await Promise.race([
                verifyPromise,
                timeoutPromise
              ]) as any;
              
              if (verifySession && verifySession.access_token === storedToken) {
                clearTimeout(timeoutId);
                set({
                  user,
                  isAuthenticated: true,
                  token: storedToken,
                  isLoading: false,
                });
                // Sync KYC from backend
                try {
                  await useKYCStore.getState().syncFromBackend(user.id);
                  console.log('[AuthStore] KYC synced after SecureStore restore');
                } catch (kycErr) {
                  console.error('[AuthStore] KYC sync failed:', kycErr);
                }
                return;
              }
            } catch (verifyError) {
              // Verification failed or timed out, continue to no session
              if (__DEV__) {
                console.warn('⚠️ Token verification failed:', verifyError);
              }
            }
          } catch (error) {
            console.error('Error parsing stored user:', error);
          }
        }

        // No valid session found
        clearTimeout(timeoutId);
        if (__DEV__) {
          console.log('ℹ️ No valid session found, user needs to login');
        }
        set({
          user: null,
          isAuthenticated: false,
          token: null,
          isLoading: false,
        });
      } catch (error: unknown) {
        clearTimeout(timeoutId);
        logError('restoreSession inner', error);
        set({
          user: null,
          isAuthenticated: false,
          token: null,
          isLoading: false,
        });
      }
    } catch (error: unknown) {
      logError('restoreSession outer', error);
      
      // Always set loading to false, even on error
      set({
        user: null,
        isAuthenticated: false,
        token: null,
        isLoading: false,
      });
    }
  },
}));
