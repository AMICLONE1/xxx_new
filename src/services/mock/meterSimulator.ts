import { EnergyData } from '@/types';
import { MeterConfig, DEFAULT_METER_CONFIG } from '@/utils/meterConfig';

/**
 * Fake Energy Meter Simulator
 * Generates realistic energy generation and consumption data
 */
export class MeterSimulator {
  private config: MeterConfig;

  constructor(config?: Partial<MeterConfig>) {
    this.config = { ...DEFAULT_METER_CONFIG, ...config };
  }

  /**
   * Generate energy data for a time range
   */
  generateEnergyData(
    meterId: string,
    startDate: Date,
    endDate: Date,
    intervalMinutes: number = 15
  ): EnergyData[] {
    const data: EnergyData[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const generation = this.simulateSolarGeneration(current);
      const consumption = this.simulateConsumption(current);
      const netExport = generation - consumption;

      data.push({
        id: `${meterId}_${current.getTime()}`,
        meterId,
        timestamp: new Date(current),
        generation: Math.max(0, generation),
        consumption: Math.max(0, consumption),
        netExport: netExport,
        interval: intervalMinutes,
      });

      // Move to next interval
      current.setMinutes(current.getMinutes() + intervalMinutes);
    }

    return data;
  }

  /**
   * Generate real-time energy data (current moment)
   */
  generateRealTimeData(meterId: string): EnergyData {
    const now = new Date();
    const generation = this.simulateSolarGeneration(now);
    const consumption = this.simulateConsumption(now);
    const netExport = generation - consumption;

    return {
      id: `${meterId}_${now.getTime()}`,
      meterId,
      timestamp: now,
      generation: Math.max(0, generation),
      consumption: Math.max(0, consumption),
      netExport: netExport,
      interval: 15,
    };
  }

  /**
   * Simulate solar generation based on time of day
   * Uses a bell curve: peak at noon, zero at night
   */
  private simulateSolarGeneration(timestamp: Date): number {
    const hour = timestamp.getHours();
    const minutes = timestamp.getMinutes();
    const timeOfDay = hour + minutes / 60;

    // Solar generation only during daylight hours (6 AM - 6 PM)
    if (timeOfDay < 6 || timeOfDay >= 18) {
      return 0;
    }

    // Bell curve centered at 12 PM (noon)
    // Peak generation: 10 AM - 3 PM
    const peakStart = 10;
    const peakEnd = 15;
    const center = 12; // Noon

    let generationFactor = 0;

    if (timeOfDay >= peakStart && timeOfDay <= peakEnd) {
      // Peak hours: 80-100% of capacity
      generationFactor = 0.8 + (Math.random() * 0.2);
    } else if (timeOfDay >= 6 && timeOfDay < peakStart) {
      // Morning ramp-up: 0-80% of capacity
      const progress = (timeOfDay - 6) / (peakStart - 6);
      generationFactor = progress * 0.8;
    } else if (timeOfDay > peakEnd && timeOfDay < 18) {
      // Evening ramp-down: 80-0% of capacity
      const progress = (18 - timeOfDay) / (18 - peakEnd);
      generationFactor = progress * 0.8;
    }

    // Base generation
    let generation = this.config.solarCapacity * generationFactor;

    // Add weather variation if enabled
    if (this.config.weatherVariation) {
      const variationPercent = this.config.weatherVariationPercent || 20;
      const variation = 1 + ((Math.random() * 2 - 1) * variationPercent) / 100;
      generation *= variation;
    }

    // Add small random noise for realism
    generation += (Math.random() * 0.1 - 0.05) * this.config.solarCapacity;

    return Math.max(0, Math.min(generation, this.config.solarCapacity));
  }

  /**
   * Simulate consumption based on time of day
   * Higher consumption during peak hours (morning and evening)
   */
  private simulateConsumption(timestamp: Date): number {
    const hour = timestamp.getHours();
    const minutes = timestamp.getMinutes();
    const timeOfDay = hour + minutes / 60;

    let consumption = this.config.baseConsumption; // Base load

    // Peak consumption hours
    const morningPeakStart = 6;
    const morningPeakEnd = 9;
    const eveningPeakStart = 18;
    const eveningPeakEnd = 22;

    if (
      (timeOfDay >= morningPeakStart && timeOfDay < morningPeakEnd) ||
      (timeOfDay >= eveningPeakStart && timeOfDay < eveningPeakEnd)
    ) {
      // Peak hours: use peak consumption
      const peakFactor = 0.7 + Math.random() * 0.3; // 70-100% of peak
      consumption = this.config.baseConsumption + 
        (this.config.peakConsumption - this.config.baseConsumption) * peakFactor;
    } else if (
      (timeOfDay >= morningPeakEnd && timeOfDay < eveningPeakStart) ||
      (timeOfDay >= eveningPeakEnd || timeOfDay < morningPeakStart)
    ) {
      // Off-peak hours: mostly base load with small variations
      const variation = 0.8 + Math.random() * 0.4; // 80-120% of base
      consumption = this.config.baseConsumption * variation;
    }

    // Add random variation for realism
    consumption += (Math.random() * 0.2 - 0.1) * this.config.baseConsumption;

    return Math.max(0, consumption);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MeterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): MeterConfig {
    return { ...this.config };
  }
}

