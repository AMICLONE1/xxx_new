import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';

const LOCATION_CACHE_KEY = 'cached_gps_location';
const LOCATION_CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes cache
const GPS_TIMEOUT_MS = 15000; // 15 seconds timeout

// Default location: Pune, India (used when GPS is unavailable)
const DEFAULT_LOCATION = {
  latitude: 18.5204,
  longitude: 73.8567,
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411001',
};

export interface CachedLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
  address?: {
    city?: string;
    state?: string;
    pincode?: string;
  };
  isDefault?: boolean; // Flag to indicate if this is a default/fallback location
}

class LocationService {
  private cachedLocation: CachedLocation | null = null;
  private isGettingLocation: boolean = false;

  /**
   * Check if device location services are enabled
   */
  async isLocationServicesEnabled(): Promise<boolean> {
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      console.log('[LocationService] Location services enabled:', enabled);
      return enabled;
    } catch (error) {
      console.error('[LocationService] Error checking location services:', error);
      return false;
    }
  }

  /**
   * Get current location with caching support
   * - First checks memory cache
   * - Then checks persistent storage cache
   * - Falls back to last known position
   * - Finally tries fresh GPS with timeout
   * - If all fails, returns default location (Pune)
   */
  async getCurrentLocation(forceRefresh: boolean = false): Promise<CachedLocation | null> {
    // Prevent concurrent GPS requests
    if (this.isGettingLocation) {
      console.log('[LocationService] GPS request already in progress, waiting...');
      await this.waitForLocation();
      return this.cachedLocation;
    }

    // Check memory cache first (if not forcing refresh)
    if (!forceRefresh && this.cachedLocation && this.isCacheValid(this.cachedLocation.timestamp)) {
      console.log('[LocationService] Using memory cached location');
      return this.cachedLocation;
    }

    // Check persistent storage cache
    if (!forceRefresh) {
      const storedLocation = await this.loadCachedLocation();
      if (storedLocation && this.isCacheValid(storedLocation.timestamp)) {
        console.log('[LocationService] Using stored cached location');
        this.cachedLocation = storedLocation;
        return storedLocation;
      }
    }

    // Check if location services are enabled
    const servicesEnabled = await this.isLocationServicesEnabled();
    if (!servicesEnabled) {
      console.log('[LocationService] Location services are DISABLED on device');
      console.log('[LocationService] Using default location (Pune)');
      return this.getDefaultLocation();
    }

    // Check permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('[LocationService] Location permission denied');
      console.log('[LocationService] Using default location (Pune)');
      return this.getDefaultLocation();
    }

    this.isGettingLocation = true;

    try {
      // Try to get last known position first (very fast)
      console.log('[LocationService] Checking last known position...');
      try {
        const lastKnown = await Location.getLastKnownPositionAsync();
        
        if (lastKnown && this.isCacheValid(lastKnown.timestamp)) {
          console.log('[LocationService] Using last known position');
          const cachedLoc = await this.createCachedLocation(lastKnown);
          return cachedLoc;
        }
      } catch (lastKnownError: unknown) {
        console.log('[LocationService] Last known position not available:', lastKnownError instanceof Error ? lastKnownError.message : 'Unknown error');
      }

      // Get fresh GPS with timeout
      console.log('[LocationService] Getting fresh GPS location...');
      const location = await this.getLocationWithTimeout();
      
      if (location) {
        console.log('[LocationService] Got fresh GPS location');
        const cachedLoc = await this.createCachedLocation(location);
        return cachedLoc;
      }

      // If we have any cached location (even expired), use it as fallback
      if (this.cachedLocation) {
        console.log('[LocationService] Using expired cache as fallback');
        return this.cachedLocation;
      }

      // Final fallback: use default location
      console.log('[LocationService] GPS failed, using default location (Pune)');
      return this.getDefaultLocation();
    } catch (error: unknown) {
      console.error('[LocationService] Error getting location:', error instanceof Error ? error.message : 'Unknown error');
      // Return cached location if available, otherwise default
      return this.cachedLocation || this.getDefaultLocation();
    } finally {
      this.isGettingLocation = false;
    }
  }

  /**
   * Get default location (Pune) as fallback
   */
  private getDefaultLocation(): CachedLocation {
    const defaultLoc: CachedLocation = {
      latitude: DEFAULT_LOCATION.latitude,
      longitude: DEFAULT_LOCATION.longitude,
      timestamp: Date.now(),
      address: {
        city: DEFAULT_LOCATION.city,
        state: DEFAULT_LOCATION.state,
        pincode: DEFAULT_LOCATION.pincode,
      },
      isDefault: true,
    };
    
    // Cache the default location
    this.cachedLocation = defaultLoc;
    
    return defaultLoc;
  }

  /**
   * Get fresh GPS location with timeout
   */
  private async getLocationWithTimeout(): Promise<Location.LocationObject | null> {
    return new Promise(async (resolve) => {
      const timeoutId = setTimeout(() => {
        console.log('[LocationService] GPS timeout after', GPS_TIMEOUT_MS, 'ms');
        resolve(null);
      }, GPS_TIMEOUT_MS);

      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        clearTimeout(timeoutId);
        resolve(location);
      } catch (error: unknown) {
        clearTimeout(timeoutId);
        // Silently handle GPS errors - fallback location will be used
        if (__DEV__) {
          console.log('[LocationService] GPS unavailable, using fallback location');
        }
        resolve(null);
      }
    });
  }

  /**
   * Create cached location with reverse geocoding
   */
  private async createCachedLocation(location: Location.LocationObject): Promise<CachedLocation> {
    let address: CachedLocation['address'];

    try {
      const [geo] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (geo) {
        address = {
          city: geo.city || geo.subregion || '',
          state: geo.region || '',
          pincode: geo.postalCode || '',
        };
      }
    } catch (error) {
      console.error('[LocationService] Reverse geocode error:', error);
    }

    const cachedLocation: CachedLocation = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: Date.now(),
      address,
    };

    // Save to memory and persistent storage
    this.cachedLocation = cachedLocation;
    await this.saveCachedLocation(cachedLocation);

    return cachedLocation;
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < LOCATION_CACHE_EXPIRY_MS;
  }

  /**
   * Load cached location from persistent storage
   */
  private async loadCachedLocation(): Promise<CachedLocation | null> {
    try {
      const stored = await SecureStore.getItemAsync(LOCATION_CACHE_KEY);
      if (stored) {
        return JSON.parse(stored) as CachedLocation;
      }
    } catch (error) {
      console.error('[LocationService] Error loading cached location:', error);
    }
    return null;
  }

  /**
   * Save location to persistent storage
   */
  private async saveCachedLocation(location: CachedLocation): Promise<void> {
    try {
      await SecureStore.setItemAsync(LOCATION_CACHE_KEY, JSON.stringify(location));
      console.log('[LocationService] Location cached to storage');
    } catch (error) {
      console.error('[LocationService] Error saving cached location:', error);
    }
  }

  /**
   * Wait for ongoing location request
   */
  private async waitForLocation(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.isGettingLocation) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // Maximum wait of 20 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 20000);
    });
  }

  /**
   * Clear all cached location data
   */
  async clearCache(): Promise<void> {
    this.cachedLocation = null;
    try {
      await SecureStore.deleteItemAsync(LOCATION_CACHE_KEY);
    } catch (error) {
      console.error('[LocationService] Error clearing cache:', error);
    }
  }

  /**
   * Get cached location without fetching new one
   */
  getCachedLocation(): CachedLocation | null {
    return this.cachedLocation;
  }
}

// Export singleton instance
export const locationService = new LocationService();
