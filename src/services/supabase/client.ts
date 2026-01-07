import { createClient, Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { logError, getErrorMessage } from '@/utils/errorUtils';

// Get Supabase config from environment variables or app.json
const supabaseUrl =
  Constants.expoConfig?.extra?.supabaseUrl ||
  process.env.SUPABASE_URL ||
  '';

const supabaseAnonKey =
  Constants.expoConfig?.extra?.supabaseAnonKey ||
  process.env.SUPABASE_ANON_KEY ||
  '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '❌ Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env or app.json'
  );
} else if (__DEV__) {
  console.log('✅ Supabase configured:', {
    url: supabaseUrl,
    hasKey: !!supabaseAnonKey,
    keyLength: supabaseAnonKey?.length || 0,
  });
}

// Create Supabase client with AsyncStorage for auth persistence
// Added better error handling for Android emulator network issues
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

// Helper function to get current user
export const getCurrentUser = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

// Helper function to get current session with timeout
export const getCurrentSession = async (): Promise<Session | null> => {
  try {
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Session fetch timeout')), 10000)
    );

    const result = await Promise.race([sessionPromise, timeoutPromise]);
    const { data: { session }, error } = result;
    
    if (error) {
      if (__DEV__) {
        console.warn('⚠️ Session fetch error:', error.message);
      }
      throw error;
    }
    return session;
  } catch (error: unknown) {
    logError('getCurrentSession', error);
    // Return null instead of throwing to allow app to continue
    return null;
  }
};

