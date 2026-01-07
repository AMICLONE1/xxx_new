import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { getErrorMessage, logError } from '@/utils/errorUtils';

export interface UserLocation {
  type: 'gps' | 'manual';
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
}

export interface ProfileDraft {
  name?: string;
  email?: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
  location?: UserLocation;
}

interface ProfileState {
  draft: ProfileDraft | null;
  hasChanges: boolean;
  isSaving: boolean;
  setDraft: (draft: ProfileDraft) => void;
  updateDraft: (updates: Partial<ProfileDraft>) => void;
  clearDraft: () => void;
  setHasChanges: (hasChanges: boolean) => void;
  setSaving: (isSaving: boolean) => void;
  saveProfile: () => Promise<{ success: boolean; error?: string }>;
  restoreLocation: () => Promise<UserLocation | null>;
  saveLocation: (location: UserLocation) => Promise<void>;
}

const LOCATION_KEY = 'user_location';

export const useProfileStore = create<ProfileState>((set, get) => ({
  draft: null,
  hasChanges: false,
  isSaving: false,

  setDraft: (draft: ProfileDraft) => {
    set({ draft, hasChanges: false });
  },

  updateDraft: (updates: Partial<ProfileDraft>) => {
    set((state) => ({
      draft: state.draft ? { ...state.draft, ...updates } : updates,
      hasChanges: true,
    }));
  },

  clearDraft: () => {
    set({ draft: null, hasChanges: false });
  },

  setHasChanges: (hasChanges: boolean) => {
    set({ hasChanges });
  },

  setSaving: (isSaving: boolean) => {
    set({ isSaving });
  },

  saveProfile: async () => {
    const { draft } = get();
    if (!draft) {
      return { success: false, error: 'No changes to save' };
    }

    set({ isSaving: true });
    
    try {
      // Phase-1: Simulate save success
      // Phase-2: Will integrate with Supabase
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      set({ hasChanges: false, isSaving: false });
      return { success: true };
    } catch (error: unknown) {
      set({ isSaving: false });
      return { success: false, error: getErrorMessage(error) };
    }
  },

  restoreLocation: async () => {
    try {
      const stored = await SecureStore.getItemAsync(LOCATION_KEY);
      if (stored) {
        return JSON.parse(stored) as UserLocation;
      }
      return null;
    } catch (error: unknown) {
      logError('restoreLocation', error);
      return null;
    }
  },

  saveLocation: async (location: UserLocation) => {
    try {
      await SecureStore.setItemAsync(LOCATION_KEY, JSON.stringify(location));
      set((state) => ({
        draft: state.draft ? { ...state.draft, location } : { location },
        hasChanges: true,
      }));
    } catch (error) {
      console.error('Error saving location:', error);
    }
  },
}));
