/**
 * Meter Configuration for Fake Energy Meter Simulation
 */

export interface MeterConfig {
  solarCapacity: number; // kW - Maximum solar panel capacity
  dailyTarget: number; // kWh - Target daily generation
  baseConsumption: number; // kW - Base load consumption (24/7)
  peakConsumption: number; // kW - Peak consumption during peak hours
  location?: {
    lat: number;
    lng: number;
  };
  weatherVariation?: boolean; // Enable weather simulation
  weatherVariationPercent?: number; // ± percentage for weather (default 20%)
}

/**
 * Default meter configuration
 */
export const DEFAULT_METER_CONFIG: MeterConfig = {
  solarCapacity: 5.0, // 5 kW solar system
  dailyTarget: 25.0, // 25 kWh per day target
  baseConsumption: 0.5, // 0.5 kW base load
  peakConsumption: 2.0, // 2.0 kW peak consumption
  weatherVariation: true,
  weatherVariationPercent: 20, // ±20% variation
};

/**
 * Predefined meter configurations for different scenarios
 */
export const METER_PRESETS: Record<string, MeterConfig> = {
  small: {
    solarCapacity: 3.0,
    dailyTarget: 15.0,
    baseConsumption: 0.3,
    peakConsumption: 1.5,
    weatherVariation: true,
    weatherVariationPercent: 20,
  },
  medium: {
    solarCapacity: 5.0,
    dailyTarget: 25.0,
    baseConsumption: 0.5,
    peakConsumption: 2.0,
    weatherVariation: true,
    weatherVariationPercent: 20,
  },
  large: {
    solarCapacity: 10.0,
    dailyTarget: 50.0,
    baseConsumption: 1.0,
    peakConsumption: 4.0,
    weatherVariation: true,
    weatherVariationPercent: 20,
  },
  commercial: {
    solarCapacity: 50.0,
    dailyTarget: 250.0,
    baseConsumption: 5.0,
    peakConsumption: 20.0,
    weatherVariation: true,
    weatherVariationPercent: 15,
  },
};

/**
 * Get meter config by preset name or return default
 */
export const getMeterConfig = (preset?: string): MeterConfig => {
  if (preset && METER_PRESETS[preset]) {
    return { ...METER_PRESETS[preset] };
  }
  return { ...DEFAULT_METER_CONFIG };
};

