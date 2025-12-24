import { MMKV } from 'react-native-mmkv';
import { EnergyData, Order } from '@/types';

// Create MMKV storage instance
// @ts-expect-error - MMKV type definitions may have issues with constructor
const storage = new MMKV({
  id: 'powernetpro-storage',
});

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
  cacheEnergyData(data: EnergyData[]): void {
    try {
      const dataToCache = data.slice(0, 96); // 24 hours * 4 (15-min intervals)
      storage.set(KEYS.ENERGY_DATA, JSON.stringify(dataToCache));
    } catch (error) {
      console.error('Failed to cache energy data:', error);
    }
  }

  /**
   * Get cached energy data
   */
  getCachedEnergyData(): EnergyData[] {
    try {
      const cached = storage.getString(KEYS.ENERGY_DATA);
      if (cached) {
        const data = JSON.parse(cached);
        // Convert timestamp strings back to Date objects
        return data.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
      }
    } catch (error) {
      console.error('Failed to get cached energy data:', error);
    }
    return [];
  }

  /**
   * Queue order for sync when online
   */
  queueOrder(order: Order): void {
    try {
      const queue = this.getQueuedOrders();
      queue.push(order);
      storage.set(KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to queue order:', error);
    }
  }

  /**
   * Get queued orders
   */
  getQueuedOrders(): Order[] {
    try {
      const queue = storage.getString(KEYS.OFFLINE_QUEUE);
      if (queue) {
        const orders = JSON.parse(queue);
        return orders.map((order: any) => ({
          ...order,
          createdAt: new Date(order.createdAt),
          completedAt: order.completedAt ? new Date(order.completedAt) : undefined,
        }));
      }
    } catch (error) {
      console.error('Failed to get queued orders:', error);
    }
    return [];
  }

  /**
   * Clear queued orders after successful sync
   */
  clearQueuedOrders(): void {
    try {
      storage.delete(KEYS.OFFLINE_QUEUE);
    } catch (error) {
      console.error('Failed to clear queued orders:', error);
    }
  }

  /**
   * Set last sync timestamp
   */
  setLastSync(timestamp: Date): void {
    try {
      storage.set(KEYS.LAST_SYNC, timestamp.toISOString());
    } catch (error) {
      console.error('Failed to set last sync:', error);
    }
  }

  /**
   * Get last sync timestamp
   */
  getLastSync(): Date | null {
    try {
      const timestamp = storage.getString(KEYS.LAST_SYNC);
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
  clearAll(): void {
    try {
      Object.values(KEYS).forEach((key) => {
        storage.delete(key);
      });
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }
}

export const offlineStorage = new OfflineStorage();

