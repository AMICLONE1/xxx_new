/**
 * Analytics Data Generator
 * Generates realistic fake analytics data for different sites with varying
 * inverter/data logger characteristics
 */

export interface SiteProfile {
  id: string;
  name: string;
  discomName: string;
  consumerNumber: string;
  address?: string;
  // Inverter/Data Logger Characteristics
  inverterType: 'string' | 'micro' | 'hybrid' | 'central';
  dataLoggerInterval: number; // minutes (5, 15, 30)
  solarCapacity: number; // kW
  baseConsumption: number; // kW
  peakConsumption: number; // kW
  efficiency: number; // 0-100 (inverter efficiency)
  weatherPattern: 'sunny' | 'moderate' | 'cloudy' | 'variable';
  shading: boolean; // Has shading issues
  orientation: 'optimal' | 'east' | 'west' | 'north'; // Panel orientation
}

/**
 * 4 Different Site Profiles with Unique Characteristics
 */
export const SITE_PROFILES: SiteProfile[] = [
  {
    id: 'site-1',
    name: 'Site 1 - Residential Premium',
    discomName: 'MSEDCL',
    consumerNumber: 'MSEDCL-001234',
    address: '123 Green Energy Lane, Pune',
    inverterType: 'hybrid',
    dataLoggerInterval: 5, // High-frequency logging (5 min intervals)
    solarCapacity: 5.0, // 5 kW system
    baseConsumption: 0.4, // Low base load
    peakConsumption: 2.5, // Moderate peak
    efficiency: 96.5, // High efficiency hybrid inverter
    weatherPattern: 'sunny', // Mostly sunny location
    shading: false, // No shading issues
    orientation: 'optimal', // Optimal south-facing
  },
  {
    id: 'site-2',
    name: 'Site 2 - Commercial Building',
    discomName: 'Tata Power',
    consumerNumber: 'TATA-005678',
    address: '456 Business Park, Mumbai',
    inverterType: 'central',
    dataLoggerInterval: 15, // Standard logging (15 min intervals)
    solarCapacity: 25.0, // 25 kW commercial system
    baseConsumption: 3.0, // Higher base load (office equipment)
    peakConsumption: 12.0, // High peak (AC, lighting)
    efficiency: 94.0, // Good efficiency central inverter
    weatherPattern: 'moderate', // Moderate weather
    shading: false,
    orientation: 'optimal',
  },
  {
    id: 'site-3',
    name: 'Site 3 - Residential Standard',
    discomName: 'Adani Electricity',
    consumerNumber: 'ADANI-009012',
    address: '789 Residential Complex, Delhi',
    inverterType: 'string',
    dataLoggerInterval: 15, // Standard logging
    solarCapacity: 3.5, // 3.5 kW system
    baseConsumption: 0.5,
    peakConsumption: 2.0,
    efficiency: 92.0, // Standard string inverter efficiency
    weatherPattern: 'variable', // Variable weather (clouds, pollution)
    shading: true, // Has some shading from nearby buildings
    orientation: 'east', // East-facing panels
  },
  {
    id: 'site-4',
    name: 'Site 4 - Industrial Plant',
    discomName: 'BSES Yamuna',
    consumerNumber: 'BSES-003456',
    address: '321 Industrial Zone, Noida',
    inverterType: 'central',
    dataLoggerInterval: 30, // Lower frequency logging (30 min intervals)
    solarCapacity: 100.0, // 100 kW industrial system
    baseConsumption: 15.0, // Very high base load
    peakConsumption: 45.0, // Very high peak consumption
    efficiency: 95.5, // High efficiency industrial inverter
    weatherPattern: 'cloudy', // More cloudy due to industrial area
    shading: false,
    orientation: 'optimal',
  },
];

/**
 * Generate daily energy data for a site based on its profile
 */
function generateDailyEnergyData(
  site: SiteProfile,
  date: Date,
  daysBack: number = 0
): { generation: number; consumption: number; netExport: number } {
  const targetDate = new Date(date);
  targetDate.setDate(targetDate.getDate() - daysBack);
  
  const dayOfYear = Math.floor((targetDate.getTime() - new Date(targetDate.getFullYear(), 0, 0).getTime()) / 86400000);
  const isWeekend = targetDate.getDay() === 0 || targetDate.getDay() === 6;
  
  // Base daily generation (kWh) - varies by capacity and weather
  let baseDailyGeneration = site.solarCapacity * 4.5; // 4.5 sun hours average
  
  // Weather adjustments
  const weatherMultipliers = {
    sunny: 1.0 + (Math.random() * 0.2 - 0.1), // 90-110%
    moderate: 0.85 + (Math.random() * 0.2 - 0.1), // 75-95%
    cloudy: 0.65 + (Math.random() * 0.2 - 0.1), // 55-75%
    variable: 0.7 + (Math.random() * 0.4 - 0.2), // 50-90%
  };
  
  baseDailyGeneration *= weatherMultipliers[site.weatherPattern];
  
  // Shading impact
  if (site.shading) {
    baseDailyGeneration *= 0.85; // 15% reduction due to shading
  }
  
  // Orientation impact
  const orientationMultipliers = {
    optimal: 1.0,
    east: 0.88,
    west: 0.88,
    north: 0.65,
  };
  baseDailyGeneration *= orientationMultipliers[site.orientation];
  
  // Efficiency impact
  baseDailyGeneration *= (site.efficiency / 100);
  
  // Seasonal variation (simplified - higher in summer)
  const month = targetDate.getMonth();
  const seasonalMultiplier = 0.85 + (Math.sin((month - 2) * Math.PI / 6) * 0.15); // Peak in May
  baseDailyGeneration *= seasonalMultiplier;
  
  // Daily variation (some days better than others)
  baseDailyGeneration *= (0.85 + Math.random() * 0.3); // 85-115% variation
  
  // Daily consumption (kWh)
  const baseDailyConsumption = site.baseConsumption * 24; // Base load 24/7
  const peakHours = isWeekend ? 8 : 6; // Weekend has longer peak hours
  const peakConsumption = (site.peakConsumption - site.baseConsumption) * peakHours;
  const dailyConsumption = baseDailyConsumption + peakConsumption;
  
  // Add random variation to consumption
  const consumptionVariation = 0.9 + Math.random() * 0.2; // 90-110%
  const finalConsumption = dailyConsumption * consumptionVariation;
  
  const netExport = baseDailyGeneration - finalConsumption;
  
  return {
    generation: Math.max(0, parseFloat(baseDailyGeneration.toFixed(2))),
    consumption: Math.max(0, parseFloat(finalConsumption.toFixed(2))),
    netExport: parseFloat(netExport.toFixed(2)),
  };
}

/**
 * Generate analytics data for a site for a given period
 */
export function generateSiteAnalytics(
  siteId: string,
  period: 'day' | 'week' | 'month' | 'year' = 'month'
): {
  energyGenerated: number;
  energyConsumed: number;
  netExport: number;
  totalRevenue: number;
  activeTrades: number;
  completedTrades: number;
  efficiency: number;
  trends: { generation: string; revenue: string };
} {
  const site = SITE_PROFILES.find(s => s.id === siteId);
  if (!site) {
    // Default site if not found
    const defaultSite = SITE_PROFILES[0];
    return generateSiteAnalytics(defaultSite.id, period);
  }
  
  const now = new Date();
  let days = 30; // Default to month
  
  switch (period) {
    case 'day':
      days = 1;
      break;
    case 'week':
      days = 7;
      break;
    case 'month':
      days = 30;
      break;
    case 'year':
      days = 365;
      break;
  }
  
  // Generate daily data and aggregate
  let totalGeneration = 0;
  let totalConsumption = 0;
  
  for (let i = 0; i < days; i++) {
    const dailyData = generateDailyEnergyData(site, now, i);
    totalGeneration += dailyData.generation;
    totalConsumption += dailyData.consumption;
  }
  
  const netExport = totalGeneration - totalConsumption;
  
  // Calculate revenue (assume ₹7.50 per kWh exported, with some variation)
  const avgPricePerKWh = 7.5;
  const priceVariation = 0.9 + Math.random() * 0.2; // 90-110%
  const totalRevenue = Math.max(0, netExport) * avgPricePerKWh * priceVariation;
  
  // Active trades (varies by site size and activity)
  const baseActiveTrades = site.solarCapacity < 10 ? 2 : site.solarCapacity < 50 ? 5 : 8;
  const activeTrades = Math.floor(baseActiveTrades * (0.7 + Math.random() * 0.6));
  
  // Completed trades (more than active)
  const completedTrades = Math.floor(activeTrades * (2 + Math.random() * 3));
  
  // Efficiency (net export / generation * 100)
  const efficiency = totalGeneration > 0 
    ? ((netExport / totalGeneration) * 100)
    : 0;
  
  // Trends (simplified - random but realistic)
  const generationTrendValue = Math.random() * 20 - 5; // -5% to +15%
  const revenueTrendValue = Math.random() * 15 - 3; // -3% to +12%
  
  return {
    energyGenerated: parseFloat(totalGeneration.toFixed(2)),
    energyConsumed: parseFloat(totalConsumption.toFixed(2)),
    netExport: parseFloat(netExport.toFixed(2)),
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    activeTrades,
    completedTrades,
    efficiency: parseFloat(efficiency.toFixed(1)),
    trends: {
      generation: `${generationTrendValue >= 0 ? '+' : ''}${generationTrendValue.toFixed(1)}%`,
      revenue: `${revenueTrendValue >= 0 ? '+' : ''}${revenueTrendValue.toFixed(1)}%`,
    },
  };
}

/**
 * Generate aggregated analytics across all sites
 */
export function generateAggregatedAnalytics(
  period: 'day' | 'week' | 'month' | 'year' = 'month'
): {
  energyGenerated: number;
  energyConsumed: number;
  netExport: number;
  totalRevenue: number;
  activeTrades: number;
  completedTrades: number;
  efficiency: number;
  trends: { generation: string; revenue: string };
} {
  // Aggregate all sites
  let totalGeneration = 0;
  let totalConsumption = 0;
  let totalRevenue = 0;
  let totalActiveTrades = 0;
  let totalCompletedTrades = 0;
  
  SITE_PROFILES.forEach(site => {
    const siteAnalytics = generateSiteAnalytics(site.id, period);
    totalGeneration += siteAnalytics.energyGenerated;
    totalConsumption += siteAnalytics.energyConsumed;
    totalRevenue += siteAnalytics.totalRevenue;
    totalActiveTrades += siteAnalytics.activeTrades;
    totalCompletedTrades += siteAnalytics.completedTrades;
  });
  
  const netExport = totalGeneration - totalConsumption;
  const efficiency = totalGeneration > 0 
    ? ((netExport / totalGeneration) * 100)
    : 0;
  
  // Average trends
  const generationTrendValue = Math.random() * 15 - 2;
  const revenueTrendValue = Math.random() * 12 - 1;
  
  return {
    energyGenerated: parseFloat(totalGeneration.toFixed(2)),
    energyConsumed: parseFloat(totalConsumption.toFixed(2)),
    netExport: parseFloat(netExport.toFixed(2)),
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    activeTrades: totalActiveTrades,
    completedTrades: totalCompletedTrades,
    efficiency: parseFloat(efficiency.toFixed(1)),
    trends: {
      generation: `${generationTrendValue >= 0 ? '+' : ''}${generationTrendValue.toFixed(1)}%`,
      revenue: `${revenueTrendValue >= 0 ? '+' : ''}${revenueTrendValue.toFixed(1)}%`,
    },
  };
}

/**
 * Get site profiles (for listing sites)
 */
export function getSiteProfiles(): SiteProfile[] {
  return SITE_PROFILES;
}

/**
 * Get site profile by ID
 */
export function getSiteProfile(siteId: string): SiteProfile | undefined {
  return SITE_PROFILES.find(s => s.id === siteId);
}

