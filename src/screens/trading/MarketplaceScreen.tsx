import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { RootStackParamList, Seller } from '@/types';
import { becknClient } from '@/services/beckn/becknClient';
import { tradingService } from '@/services/api/tradingService';
import { formatCurrency, formatEnergy, calculateDistance } from '@/utils/helpers';
import { SEARCH_RADIUS_KM, MIN_SELL_PRICE, MAX_SELL_PRICE } from '@/utils/constants';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

type MarketplaceScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  navigation: MarketplaceScreenNavigationProp;
}

interface Filters {
  minPrice: string;
  maxPrice: string;
  greenEnergyOnly: boolean;
  minRating: string;
  radius: string;
}

export default function MarketplaceScreen({ navigation }: Props) {
  const { isConnected } = useNetworkStatus();
  const isOnline = isConnected;
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [filters, setFilters] = useState<Filters>({
    minPrice: MIN_SELL_PRICE.toString(),
    maxPrice: MAX_SELL_PRICE.toString(),
    greenEnergyOnly: false,
    minRating: '0',
    radius: SEARCH_RADIUS_KM.toString(),
  });

  // Get user location
  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to find nearby sellers');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (location?.coords) {
        setUserLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
      }
    } catch (error: any) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get location. Please try again.');
    }
  };

  // Search for sellers
  const searchSellers = useCallback(async () => {
    if (!isOnline) {
      // Load from cache if offline
      // This would be implemented with offlineStorage
      return;
    }

    setLoading(true);
    try {
      let results: Seller[] = [];

      // Try Beckn Protocol first
      if (userLocation) {
        try {
          const becknResponse = await becknClient.search({
            context: {
              domain: 'energy',
              action: 'search',
              location: {
                city: { name: 'Mumbai' }, // This would come from reverse geocoding
                country: { code: 'IND' },
              },
            },
            message: {
              intent: {
                item: {
                  descriptor: {
                    name: 'solar_energy',
                  },
                },
                fulfillment: {
                  type: 'delivery',
                },
              },
            },
          });

          // Transform Beckn response to Seller format
          if (becknResponse?.message?.catalog?.['bpp/providers']) {
            results = becknResponse.message.catalog['bpp/providers'].flatMap((provider) =>
              (provider.items || []).map((item) => {
                const location = provider.locations?.[0];
                const [lat, lng] = location?.gps?.split(',')?.map(Number) || [0, 0];
                const distance = userLocation
                  ? calculateDistance(userLocation.lat, userLocation.lng, lat, lng)
                  : undefined;

                return {
                  id: `${provider.id}_${item.id}`,
                  name: provider.descriptor?.name || 'Energy Seller',
                  location: { lat, lng },
                  pricePerUnit: parseFloat(item.descriptor?.price?.value || '0'),
                  availableEnergy: 100, // Default, would come from actual data
                  rating: 4.5, // Default
                  greenEnergy: true,
                  distance,
                };
              })
            );
          }
        } catch (becknError) {
          console.warn('Beckn search failed, trying API fallback:', becknError);
        }
      }

      // Fallback to API search
      if (results.length === 0 && userLocation) {
        try {
          const apiResponse = await tradingService.searchSellers({
            location: {
              lat: userLocation.lat,
              lng: userLocation.lng,
              radius: parseFloat(filters.radius) || SEARCH_RADIUS_KM,
            },
            minPrice: parseFloat(filters.minPrice) || undefined,
            maxPrice: parseFloat(filters.maxPrice) || undefined,
            greenEnergyOnly: filters.greenEnergyOnly || undefined,
            minRating: parseFloat(filters.minRating) || undefined,
          });

          if (apiResponse.success && apiResponse.data) {
            results = apiResponse.data.map((seller: any) => ({
              ...seller,
              distance: userLocation
                ? calculateDistance(
                    userLocation.lat,
                    userLocation.lng,
                    seller.location.lat,
                    seller.location.lng
                  )
                : undefined,
            }));
          }
        } catch (apiError) {
          console.error('API search failed:', apiError);
        }
      }

      // Apply filters
      let filteredResults = results;

      if (filters.minPrice) {
        filteredResults = filteredResults.filter(
          (s) => s.pricePerUnit >= parseFloat(filters.minPrice)
        );
      }
      if (filters.maxPrice) {
        filteredResults = filteredResults.filter(
          (s) => s.pricePerUnit <= parseFloat(filters.maxPrice)
        );
      }
      if (filters.greenEnergyOnly) {
        filteredResults = filteredResults.filter((s) => s.greenEnergy);
      }
      if (filters.minRating) {
        filteredResults = filteredResults.filter(
          (s) => (s.rating || 0) >= parseFloat(filters.minRating)
        );
      }
      if (filters.radius && userLocation) {
        filteredResults = filteredResults.filter(
          (s) => (s.distance || Infinity) <= parseFloat(filters.radius)
        );
      }

      // Sort by distance (if available) or price
      filteredResults.sort((a, b) => {
        if (a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance;
        }
        return a.pricePerUnit - b.pricePerUnit;
      });

      setSellers(filteredResults);
    } catch (error: any) {
      console.error('Error searching sellers:', error);
      Alert.alert('Error', 'Failed to search sellers. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userLocation, filters, isOnline]);

  useEffect(() => {
    if (userLocation) {
      searchSellers();
    }
  }, [userLocation, searchSellers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    searchSellers();
  }, [searchSellers]);

  const handleSellerPress = (seller: Seller) => {
    navigation.navigate('Order', {
      sellerId: seller.id,
      sellerName: seller.name,
      pricePerUnit: seller.pricePerUnit,
      availableEnergy: seller.availableEnergy,
    });
  };

  const renderSellerCard = (seller: Seller) => (
    <TouchableOpacity
      key={seller.id}
      style={styles.sellerCard}
      onPress={() => handleSellerPress(seller)}
    >
      <View style={styles.sellerHeader}>
        <View style={styles.sellerInfo}>
          <Text style={styles.sellerName}>{seller.name}</Text>
          {seller.distance !== undefined && (
            <Text style={styles.sellerDistance}>{seller.distance.toFixed(1)} km away</Text>
          )}
        </View>
        {seller.greenEnergy && (
          <View style={styles.greenBadge}>
            <Text style={styles.greenBadgeText}>🌱 Green</Text>
          </View>
        )}
      </View>

      <View style={styles.sellerDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Price</Text>
          <Text style={styles.detailValue}>{formatCurrency(seller.pricePerUnit)}/kWh</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Available</Text>
          <Text style={styles.detailValue}>{formatEnergy(seller.availableEnergy, 'kWh')}</Text>
        </View>
        {seller.rating !== undefined && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Rating</Text>
            <Text style={styles.detailValue}>⭐ {seller.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Min Price (₹/kWh)</Text>
        <TextInput
          style={styles.filterInput}
          value={filters.minPrice}
          onChangeText={(text) => setFilters({ ...filters, minPrice: text })}
          keyboardType="decimal-pad"
          placeholder="0"
        />
      </View>

      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Max Price (₹/kWh)</Text>
        <TextInput
          style={styles.filterInput}
          value={filters.maxPrice}
          onChangeText={(text) => setFilters({ ...filters, maxPrice: text })}
          keyboardType="decimal-pad"
          placeholder="50"
        />
      </View>

      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Search Radius (km)</Text>
        <TextInput
          style={styles.filterInput}
          value={filters.radius}
          onChangeText={(text) => setFilters({ ...filters, radius: text })}
          keyboardType="decimal-pad"
          placeholder="10"
        />
      </View>

      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Min Rating</Text>
        <TextInput
          style={styles.filterInput}
          value={filters.minRating}
          onChangeText={(text) => setFilters({ ...filters, minRating: text })}
          keyboardType="decimal-pad"
          placeholder="0"
        />
      </View>

      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Green Energy Only</Text>
        <Switch
          value={filters.greenEnergyOnly}
          onValueChange={(value) => setFilters({ ...filters, greenEnergyOnly: value })}
        />
      </View>

      <TouchableOpacity
        style={styles.applyButton}
        onPress={() => {
          setShowFilters(false);
          searchSellers();
        }}
      >
        <Text style={styles.applyButtonText}>Apply Filters</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Marketplace</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Text style={styles.filterButtonText}>🔍 Filters</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.viewModeButton}
            onPress={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
          >
            <Text style={styles.viewModeButtonText}>
              {viewMode === 'list' ? '🗺️ Map' : '📋 List'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {showFilters && renderFilters()}

      {viewMode === 'map' ? (
        <View style={styles.mapContainer}>
          <Text style={styles.mapPlaceholder}>
            Map view requires Mapbox credentials{'\n'}
            Configure MAPBOX_ACCESS_TOKEN in your .env file
          </Text>
          <TouchableOpacity
            style={styles.switchToListButton}
            onPress={() => setViewMode('list')}
          >
            <Text style={styles.switchToListButtonText}>Switch to List View</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#10b981" />
              <Text style={styles.loadingText}>Searching for sellers...</Text>
            </View>
          ) : sellers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No sellers found</Text>
              <Text style={styles.emptySubtext}>
                Try adjusting your filters or search radius
              </Text>
              {!userLocation && (
                <TouchableOpacity style={styles.locationButton} onPress={getLocation}>
                  <Text style={styles.locationButtonText}>Enable Location</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              <Text style={styles.resultsCount}>
                {sellers.length} seller{sellers.length !== 1 ? 's' : ''} found
              </Text>
              {sellers.map(renderSellerCard)}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  viewModeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  viewModeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  filtersContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  filterInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    textAlign: 'right',
    backgroundColor: '#ffffff',
  },
  applyButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  applyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  locationButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#10b981',
    borderRadius: 8,
  },
  locationButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  resultsCount: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  sellerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sellerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  sellerDistance: {
    fontSize: 12,
    color: '#6b7280',
  },
  greenBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  greenBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
  },
  sellerDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  mapContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  mapPlaceholder: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  switchToListButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#10b981',
    borderRadius: 8,
  },
  switchToListButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

