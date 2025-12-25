import { create } from 'zustand';
import { Meter, EnergyData } from '@/types';
import { supabaseDatabaseService } from '@/services/supabase/databaseService';
import { getBackgroundDataGenerator } from '@/services/mock/backgroundDataGenerator';
import { getMeterConfig } from '@/utils/meterConfig';

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
    } catch (error) {
      console.error('Error loading energy data:', error);
    }
  },
}));

