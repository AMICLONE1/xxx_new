import { create } from 'zustand';
import { Meter, EnergyData } from '@/types';
import { supabaseDatabaseService } from '@/services/supabase/databaseService';
import { getBackgroundDataGenerator, stopBackgroundDataGenerator } from '@/services/mock/backgroundDataGenerator';
import { getMeterConfig } from '@/utils/meterConfig';
import { isErrorWithCode, logError } from '@/utils/errorUtils';

interface MeterState {
  meters: Meter[];
  currentMeter: Meter | null;
  energyData: EnergyData[];
  isLoading: boolean;
  setMeters: (meters: Meter[]) => void;
  setCurrentMeter: (meter: Meter | null) => void;
  addEnergyData: (data: EnergyData[]) => void;
  clearEnergyData: () => void;
  restoreMeters: (userId: string) => Promise<void>;
  loadEnergyData: (meterId: string, days?: number) => Promise<void>;
  removeMeter: (meterId: string, userId: string) => Promise<void>;
}

export const useMeterStore = create<MeterState>((set, get) => ({
  meters: [],
  currentMeter: null,
  energyData: [],
  isLoading: false,

  setMeters: (meters) => set({ meters }),

  setCurrentMeter: (currentMeter) => set({ currentMeter }),

  addEnergyData: (data) =>
    set((state) => ({
      energyData: [...state.energyData, ...data].sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      ),
    })),

  clearEnergyData: () => set({ energyData: [] }),

  /**
   * Restore meters from Supabase on app startup
   */
  restoreMeters: async (userId: string) => {
    try {
      set({ isLoading: true });
      
      // Load meters from Supabase
      const meters = await supabaseDatabaseService.getMeters(userId);
      
      set({ 
        meters,
        // Set the most recent meter as current meter
        currentMeter: meters.length > 0 ? meters[0] : null,
        isLoading: false,
      });

      // If we have a current meter, load its energy data and restart data generation
      if (meters.length > 0) {
        const currentMeter = meters[0];
        await get().loadEnergyData(currentMeter.id, 7); // Load last 7 days
        
        // Restart background data generation for the current meter
        const config = getMeterConfig();
        const generator = getBackgroundDataGenerator(currentMeter.id, config);
        generator.start();
        console.log('Restarted background data generation for meter:', currentMeter.id);
      }
    } catch (error) {
      console.error('Error restoring meters:', error);
      set({ isLoading: false });
    }
  },

  /**
   * Load energy data for a meter
   */
  loadEnergyData: async (meterId: string, days: number = 7) => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const energyData = await supabaseDatabaseService.getEnergyData(
        meterId,
        startDate,
        endDate
      );

      set({ energyData });
    } catch (error: unknown) {
      // Handle known Supabase RLS policy error for admin_users
      // This is a database configuration issue, not a code bug
      if (isErrorWithCode(error) && (error.code === '42P17' || error.message?.includes('admin_users'))) {
        // Silently ignore - this is expected if admin_users RLS is misconfigured
        // App continues to work with locally generated data
        if (__DEV__) {
          console.log('Note: Energy data using local data (admin_users RLS needs fixing in Supabase)');
        }
        return;
      }
      // Log other errors normally
      logError('loadEnergyData', error);
    }
  },

  /**
   * Remove/delete a meter
   */
  removeMeter: async (meterId: string, userId: string) => {
    try {
      // Stop background data generation for this meter
      const currentMeter = get().currentMeter;
      if (currentMeter && currentMeter.id === meterId) {
        stopBackgroundDataGenerator();
      }

      // Delete from database
      await supabaseDatabaseService.deleteMeter(meterId, userId);

      // Update store
      const updatedMeters = get().meters.filter((m) => m.id !== meterId);
      
      // If deleted meter was current, set new current or null
      const newCurrentMeter = 
        currentMeter?.id === meterId 
          ? (updatedMeters.length > 0 ? updatedMeters[0] : null)
          : currentMeter;

      set({
        meters: updatedMeters,
        currentMeter: newCurrentMeter,
        energyData: currentMeter?.id === meterId ? [] : get().energyData,
      });

      // If there's a new current meter, restart data generation
      if (newCurrentMeter) {
        const config = getMeterConfig();
        const generator = getBackgroundDataGenerator(newCurrentMeter.id, config);
        generator.start();
      }
    } catch (error) {
      console.error('Error removing meter:', error);
      throw error;
    }
  },
}));

