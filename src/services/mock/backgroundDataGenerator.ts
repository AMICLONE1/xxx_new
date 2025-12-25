import { AppState, AppStateStatus } from 'react-native';
import { MeterSimulator } from './meterSimulator';
import { MeterConfig, DEFAULT_METER_CONFIG } from '@/utils/meterConfig';
import { EnergyData } from '@/types';
import { useMeterStore } from '@/store/meterStore';
import { supabaseDatabaseService } from '@/services/supabase/databaseService';
import { offlineStorage } from '@/utils/offlineStorage';

/**
 * Background Data Generator
 * Generates fake energy meter data every 15 minutes
 */
export class BackgroundDataGenerator {
  private intervalId: NodeJS.Timeout | null = null;
  private appStateSubscription: any = null;
  private isRunning = false;
  private simulator: MeterSimulator;
  private meterId: string;
  private config: MeterConfig;

  constructor(meterId: string, config?: Partial<MeterConfig>) {
    this.meterId = meterId;
    this.config = { ...DEFAULT_METER_CONFIG, ...config };
    this.simulator = new MeterSimulator(this.config);
  }

  /**
   * Start generating data
   */
  start(): void {
    if (this.isRunning) {
      console.warn('BackgroundDataGenerator is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting background data generator for meter:', this.meterId);

    // Generate initial data point
    this.generateAndStoreData();

    // Generate data every 15 minutes
    this.intervalId = setInterval(() => {
      this.generateAndStoreData();
    }, 15 * 60 * 1000); // 15 minutes in milliseconds

    // Handle app state changes
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange
    );
  }

  /**
   * Stop generating data
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    console.log('Stopping background data generator');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }

  /**
   * Generate and store a single data point
   */
  private async generateAndStoreData(): Promise<void> {
    try {
      const data = this.simulator.generateRealTimeData(this.meterId);

      // Add to store (for immediate UI update)
      const { addEnergyData } = useMeterStore.getState();
      addEnergyData([data]);

      // Store in Supabase (async, don't wait)
      supabaseDatabaseService.insertEnergyData(data).catch((error: any) => {
        console.error('Failed to store energy data in Supabase:', error);
        // Cache for later sync
        offlineStorage.cacheEnergyData([data]).catch(() => {});
      });

      // Cache locally
      offlineStorage.cacheEnergyData([data]).catch(() => {});

      console.log('Generated energy data:', {
        meterId: this.meterId,
        generation: data.generation.toFixed(2),
        consumption: data.consumption.toFixed(2),
        timestamp: data.timestamp.toISOString(),
      });
    } catch (error) {
      console.error('Error generating energy data:', error);
    }
  }

  /**
   * Handle app state changes (foreground/background)
   */
  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    if (nextAppState === 'active' && this.isRunning) {
      // App came to foreground, generate data immediately
      this.generateAndStoreData();
    }
  };

  /**
   * Generate historical data for a time range
   */
  async generateHistoricalData(
    startDate: Date,
    endDate: Date
  ): Promise<EnergyData[]> {
    const data = this.simulator.generateEnergyData(
      this.meterId,
      startDate,
      endDate
    );

    // Store in Supabase
    try {
      for (const item of data) {
        await supabaseDatabaseService.insertEnergyData(item);
      }
    } catch (error) {
      console.error('Failed to store historical data:', error);
      // Cache for later sync
      offlineStorage.cacheEnergyData(data).catch(() => {});
    }

    // Add to store
    const { addEnergyData } = useMeterStore.getState();
    addEnergyData(data);

    return data;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MeterConfig>): void {
    this.config = { ...this.config, ...config };
    this.simulator.updateConfig(config);
  }

  /**
   * Check if generator is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

// Global instance (singleton pattern)
let globalGenerator: BackgroundDataGenerator | null = null;

/**
 * Get or create global background data generator
 */
export const getBackgroundDataGenerator = (
  meterId: string,
  config?: Partial<MeterConfig>
): BackgroundDataGenerator => {
  const currentMeterId = (globalGenerator as any)?.['meterId'];
  if (!globalGenerator || currentMeterId !== meterId) {
    if (globalGenerator) {
      globalGenerator.stop();
    }
    globalGenerator = new BackgroundDataGenerator(meterId, config);
  }
  return globalGenerator;
};

/**
 * Stop global background data generator
 */
export const stopBackgroundDataGenerator = (): void => {
  if (globalGenerator) {
    globalGenerator.stop();
    globalGenerator = null;
  }
};

