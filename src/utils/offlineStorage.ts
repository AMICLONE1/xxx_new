import AsyncStorage from '@react-native-async-storage/async-storage';
import { EnergyData, Order } from '@/types';
import { logError } from '@/utils/errorUtils';

// Interfaces for cached data with string timestamps
interface CachedEnergyData extends Omit<EnergyData, 'timestamp'> {
  timestamp: string;
}

interface CachedOrder extends Omit<Order, 'createdAt' | 'completedAt'> {
  createdAt: string;
  completedAt?: string;
}

// Use AsyncStorage instead of MMKV for Expo Go compatibility
// MMKV requires NitroModules which needs new architecture
const STORAGE_PREFIX = 'powernetpro_';

const KEYS = {
  ENERGY_DATA: 'energy_data',
  PENDING_ORDERS: 'pending_orders',
  LAST_SYNC: 'last_sync',
  OFFLINE_QUEUE: 'offline_queue',
} as const;

class OfflineStorage {
  /**
   * Cache energy data (last 24 hours)
   */
  async cacheEnergyData(data: EnergyData[]): Promise<void> {
    try {
      const dataToCache = data.slice(0, 96); // 24 hours * 4 (15-min intervals)
      await AsyncStorage.setItem(STORAGE_PREFIX + KEYS.ENERGY_DATA, JSON.stringify(dataToCache));
    } catch (error) {
      console.error('Failed to cache energy data:', error);
    }
  }

  /**
   * Get cached energy data
   */
  async getCachedEnergyData(): Promise<EnergyData[]> {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_PREFIX + KEYS.ENERGY_DATA);
      if (cached) {
        const data: CachedEnergyData[] = JSON.parse(cached);
        // Convert timestamp strings back to Date objects
        return data.map((item) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
      }
    } catch (error: unknown) {
      logError('getCachedEnergyData', error);
    }
    return [];
  }

  /**
   * Queue order for sync when online
   */
  async queueOrder(order: Order): Promise<void> {
    try {
      const queue = await this.getQueuedOrders();
      queue.push(order);
      await AsyncStorage.setItem(STORAGE_PREFIX + KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to queue order:', error);
    }
  }

  /**
   * Get queued orders
   */
  async getQueuedOrders(): Promise<Order[]> {
    try {
      const queue = await AsyncStorage.getItem(STORAGE_PREFIX + KEYS.OFFLINE_QUEUE);
      if (queue) {
        const orders: CachedOrder[] = JSON.parse(queue);
        return orders.map((order) => ({
          ...order,
          createdAt: new Date(order.createdAt),
          completedAt: order.completedAt ? new Date(order.completedAt) : undefined,
        }));
      }
    } catch (error: unknown) {
      logError('getQueuedOrders', error);
    }
    return [];
  }

  /**
   * Clear queued orders after successful sync
   */
  async clearQueuedOrders(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_PREFIX + KEYS.OFFLINE_QUEUE);
    } catch (error) {
      console.error('Failed to clear queued orders:', error);
    }
  }

  /**
   * Set last sync timestamp
   */
  async setLastSync(timestamp: Date): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_PREFIX + KEYS.LAST_SYNC, timestamp.toISOString());
    } catch (error) {
      console.error('Failed to set last sync:', error);
    }
  }

  /**
   * Get last sync timestamp
   */
  async getLastSync(): Promise<Date | null> {
    try {
      const timestamp = await AsyncStorage.getItem(STORAGE_PREFIX + KEYS.LAST_SYNC);
      if (timestamp) {
        return new Date(timestamp);
      }
    } catch (error) {
      console.error('Failed to get last sync:', error);
    }
    return null;
  }

  /**
   * Clear all cached data
   */
  async clearAll(): Promise<void> {
    try {
      await Promise.all(
        Object.values(KEYS).map((key) =>
          AsyncStorage.removeItem(STORAGE_PREFIX + key)
        )
      );
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }
}

export const offlineStorage = new OfflineStorage();

