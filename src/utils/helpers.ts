import { EnergyData } from '@/types';

/**
 * Calculate carbon saved based on energy generation
 */
export const calculateCarbonSaved = (energyKWh: number): number => {
  return energyKWh * 0.82; // kg CO2 per kWh (India grid average)
};

/**
 * Format energy value with units
 */
export const formatEnergy = (value: number, unit: 'kW' | 'kWh' = 'kWh'): string => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} M${unit}`;
  }
  return `${value.toFixed(2)} ${unit}`;
};

/**
 * Format currency (INR)
 */
export const formatCurrency = (amount: number): string => {
  return `₹${amount.toFixed(2)}`;
};

/**
 * Format phone number for display
 */
export const formatPhoneNumber = (phone: string): string => {
  if (phone.startsWith('+91')) {
    return phone.replace('+91', '').replace(/(\d{5})(\d{5})/, '$1 $2');
  }
  return phone;
};

/**
 * Validate phone number (Indian format)
 */
export const validatePhoneNumber = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 || (cleaned.startsWith('91') && cleaned.length === 12);
};

/**
 * Validate email address
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim().toLowerCase());
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Get time ago string
 */
export const getTimeAgo = (date: Date): string => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Calculate daily yield from energy data
 */
export const calculateDailyYield = (energyData: EnergyData[]): number => {
  return energyData.reduce((sum, data) => sum + data.generation, 0);
};

/**
 * Check if device is online
 */
export const isOnline = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // This will be implemented with NetInfo
    resolve(navigator.onLine);
  });
};

