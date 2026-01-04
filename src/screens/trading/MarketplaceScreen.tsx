import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Modal,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { locationService } from '@/services/locationService';
import Constants from 'expo-constants';
import { RootStackParamList, Seller } from '@/types';
import { becknClient } from '@/services/beckn/becknClient';
import { tradingService } from '@/services/api/tradingService';
import { formatCurrency, formatEnergy, calculateDistance } from '@/utils/helpers';
import { SEARCH_RADIUS_KM, MIN_SELL_PRICE, MAX_SELL_PRICE } from '@/utils/constants';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { generateMockSellers } from '@/services/mock/mockSellers';
import { MapboxWebView } from '@/components/mapbox/MapboxWebView';

const { width, height } = Dimensions.get('window');

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
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [selectedTradeOption, setSelectedTradeOption] = useState<'buy' | 'sell' | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Removed native map refs - using WebView now
  const [filters, setFilters] = useState<Filters>({
    minPrice: MIN_SELL_PRICE.toString(),
    maxPrice: MAX_SELL_PRICE.toString(),
    greenEnergyOnly: false,
    minRating: '0',
    radius: SEARCH_RADIUS_KM.toString(),
  });

  // Default location: Pune, India
  const DEFAULT_LOCATION = {
    lat: 18.5204, // Pune latitude
    lng: 73.8567, // Pune longitude
  };

  // Get user location using cached locationService
  useEffect(() => {
    getLocation();
  }, []);

  // Auto-refresh sellers every 30 seconds when enabled
  useEffect(() => {
    if (autoRefreshEnabled && userLocation) {
      // Initial load
      searchSellers();
      
      // Set up interval for auto-refresh
      autoRefreshIntervalRef.current = setInterval(() => {
        console.log('[MarketplaceScreen] Auto-refreshing sellers...');
        searchSellers();
      }, 30000); // 30 seconds
      
      return () => {
        if (autoRefreshIntervalRef.current) {
          clearInterval(autoRefreshIntervalRef.current);
        }
      };
    }
  }, [autoRefreshEnabled, userLocation, filters]);

  // Refresh location every minute
  useEffect(() => {
    const locationRefreshInterval = setInterval(() => {
      console.log('[MarketplaceScreen] Refreshing location...');
      getLocation(true);
    }, 60000); // 60 seconds
    
    return () => {
      clearInterval(locationRefreshInterval);
    };
  }, []);

  const getLocation = async (forceRefresh: boolean = false) => {
    try {
      console.log('[MarketplaceScreen] Getting location, forceRefresh:', forceRefresh);
      const cachedLocation = await locationService.getCurrentLocation(forceRefresh);
      
      if (cachedLocation) {
        console.log('[MarketplaceScreen] Got location:', cachedLocation.latitude, cachedLocation.longitude);
        setUserLocation({
          lat: cachedLocation.latitude,
          lng: cachedLocation.longitude,
        });
      } else {
        // Fallback to default location (Pune)
        console.log('[MarketplaceScreen] No location available, using default (Pune)');
        setUserLocation(DEFAULT_LOCATION);
      }
    } catch (error: any) {
      console.error('[MarketplaceScreen] Error getting location:', error);
      // Use default location (Pune) on error
      setUserLocation(DEFAULT_LOCATION);
    }
  };

  // Search for sellers
  const searchSellers = useCallback(async () => {
    if (!isOnline) {
      return;
    }

    setLoading(true);
    try {
      let results: Seller[] = [];

      if (userLocation) {
        try {
          const becknResponse = await becknClient.search({
            context: {
              domain: 'energy',
              action: 'search',
              location: {
                city: { name: 'Mumbai' },
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
                  availableEnergy: 100,
                  rating: 4.5,
                  greenEnergy: true,
                  distance,
                };
              })
            );
          }
        } catch (becknError) {
          // Beckn gateway is optional - silently fall back to API
          if (__DEV__) {
            console.log('Beckn gateway not available, using API fallback');
          }
        }
      }

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
          } else if (apiResponse.error) {
            // API failed, use mock data for development
            // Silently fall back to mock data - no need to log as it's expected
            const mockSellers = generateMockSellers(userLocation);
            results = mockSellers.map((seller) => ({
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
        } catch (apiError: any) {
          // Silently fall back to mock data - backend unavailable is expected in development
          const mockSellers = generateMockSellers(userLocation);
          results = mockSellers.map((seller) => ({
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
      }

      // If still no results and we have user location, use mock data
      if (results.length === 0 && userLocation) {
        console.warn('No sellers found from API/Beckn, using mock data for development');
        const mockSellers = generateMockSellers(userLocation);
        results = mockSellers.map((seller) => ({
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

      filteredResults.sort((a, b) => {
        if (a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance;
        }
        return a.pricePerUnit - b.pricePerUnit;
      });

      setSellers(filteredResults);

      // Map will auto-fit to show all sellers (handled by WebView)
    } catch (error: any) {
      console.error('Error searching sellers:', error);
      Alert.alert('Error', 'Failed to search sellers. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userLocation, filters, isOnline, viewMode, mapReady]);

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
    setSelectedSeller(seller);
    setShowTradeModal(true);
  };

  const handleTradeOptionSelect = (option: 'buy' | 'sell') => {
    setShowTradeModal(false);
    // Navigate to analytics with the selected mode
    navigation.navigate('TradeAnalytics', { mode: option === 'buy' ? 'seller' : 'buyer' });
  };

  const handleMarkerPress = (seller: Seller) => {
    setSelectedSeller(seller);
  };

  const renderSellerCard = (seller: Seller) => (
    <TouchableOpacity
      key={seller.id}
      style={styles.sellerCard}
      onPress={() => handleSellerPress(seller)}
      activeOpacity={0.7}
    >
      <View style={styles.sellerCardHeader}>
        <View style={styles.sellerInfo}>
          <View style={styles.sellerNameRow}>
            <MaterialCommunityIcons name="store" size={20} color="#10b981" />
            <Text style={styles.sellerName}>{seller.name}</Text>
          </View>
          {seller.distance !== undefined && (
            <View style={styles.distanceRow}>
              <Ionicons name="location" size={14} color="#6b7280" />
              <Text style={styles.sellerDistance}>{seller.distance.toFixed(1)} km away</Text>
            </View>
          )}
        </View>
        {seller.greenEnergy && (
          <View style={styles.greenBadge}>
            <MaterialCommunityIcons name="leaf" size={14} color="#065f46" />
            <Text style={styles.greenBadgeText}>Green</Text>
          </View>
        )}
      </View>

      <View style={styles.sellerDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="currency-inr" size={18} color="#6b7280" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Price</Text>
              <Text style={styles.detailValue}>{formatCurrency(seller.pricePerUnit)}/kWh</Text>
            </View>
          </View>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="lightning-bolt" size={18} color="#6b7280" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Available</Text>
              <Text style={styles.detailValue}>{formatEnergy(seller.availableEnergy, 'kWh')}</Text>
            </View>
          </View>
        </View>
        {seller.rating !== undefined && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={16} color="#fbbf24" />
            <Text style={styles.ratingText}>{seller.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderMapView = () => {
    const MAPBOX_TOKEN = Constants.expoConfig?.extra?.mapboxAccessToken || process.env.MAPBOX_ACCESS_TOKEN || '';
    
    if (!MAPBOX_TOKEN) {
      return (
        <View style={styles.mapContainer}>
          <View style={styles.mapPlaceholder}>
            <MaterialCommunityIcons name="map" size={64} color="#d1d5db" />
            <Text style={styles.mapPlaceholderText}>
              Map view requires Mapbox credentials{'\n'}
              Configure MAPBOX_ACCESS_TOKEN in your .env file or app.json
            </Text>
            <TouchableOpacity
              style={styles.switchToListButton}
              onPress={() => setViewMode('list')}
            >
              <Text style={styles.switchToListButtonText}>Switch to List View</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    const centerLocation = userLocation || DEFAULT_LOCATION;

    return (
      <View style={styles.mapContainer}>
        <MapboxWebView
          accessToken={MAPBOX_TOKEN}
          center={centerLocation}
          zoom={12}
          sellers={sellers}
          userLocation={userLocation || undefined}
          onMarkerClick={(sellerId) => {
            const seller = sellers.find(s => s.id === sellerId);
            if (seller) {
              handleMarkerPress(seller);
            }
          }}
          onMapReady={() => setMapReady(true)}
        />

        {/* Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity
            style={[styles.mapControlButton, autoRefreshEnabled && styles.mapControlButtonActive]}
            onPress={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
          >
            <MaterialCommunityIcons 
              name={autoRefreshEnabled ? "refresh" : "refresh-off"} 
              size={20} 
              color={autoRefreshEnabled ? "#10b981" : "#6b7280"} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mapControlButton}
            onPress={() => {
              getLocation(true);
              searchSellers();
            }}
          >
            <Ionicons name="locate" size={20} color="#10b981" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mapControlButton}
            onPress={() => setViewMode('list')}
          >
            <Ionicons name="list" size={20} color="#10b981" />
          </TouchableOpacity>
        </View>

        {/* Seller Info Modal */}
        {selectedSeller && (
          <Modal
            visible={!!selectedSeller}
            transparent
            animationType="slide"
            onRequestClose={() => setSelectedSeller(null)}
          >
            <View style={styles.sellerModalOverlay}>
              <View style={styles.sellerModal}>
                <View style={styles.sellerModalHeader}>
                  <Text style={styles.sellerModalTitle}>{selectedSeller.name}</Text>
                  <TouchableOpacity onPress={() => setSelectedSeller(null)}>
                    <Ionicons name="close" size={24} color="#111827" />
                  </TouchableOpacity>
                </View>
                <View style={styles.sellerModalContent}>
                  <View style={styles.sellerModalRow}>
                    <MaterialCommunityIcons name="currency-inr" size={20} color="#6b7280" />
                    <Text style={styles.sellerModalLabel}>Price:</Text>
                    <Text style={styles.sellerModalValue}>
                      {formatCurrency(selectedSeller.pricePerUnit)}/kWh
                    </Text>
                  </View>
                  <View style={styles.sellerModalRow}>
                    <MaterialCommunityIcons name="lightning-bolt" size={20} color="#6b7280" />
                    <Text style={styles.sellerModalLabel}>Available:</Text>
                    <Text style={styles.sellerModalValue}>
                      {formatEnergy(selectedSeller.availableEnergy, 'kWh')}
                    </Text>
                  </View>
                  {selectedSeller.distance !== undefined && (
                    <View style={styles.sellerModalRow}>
                      <Ionicons name="location" size={20} color="#6b7280" />
                      <Text style={styles.sellerModalLabel}>Distance:</Text>
                      <Text style={styles.sellerModalValue}>
                        {selectedSeller.distance.toFixed(1)} km
                      </Text>
                    </View>
                  )}
                  {selectedSeller.rating !== undefined && (
                    <View style={styles.sellerModalRow}>
                      <Ionicons name="star" size={20} color="#fbbf24" />
                      <Text style={styles.sellerModalLabel}>Rating:</Text>
                      <Text style={styles.sellerModalValue}>
                        {selectedSeller.rating.toFixed(1)}
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.sellerModalButton}
                  onPress={() => {
                    setSelectedSeller(null);
                    handleSellerPress(selectedSeller);
                  }}
                >
                  <LinearGradient
                    colors={['#10b981', '#059669']}
                    style={styles.sellerModalButtonGradient}
                  >
                    <Text style={styles.sellerModalButtonText}>View Details</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {/* Results Count Overlay */}
        {sellers.length > 0 && (
          <View style={styles.mapResultsOverlay}>
            <Text style={styles.mapResultsText}>
              {sellers.length} seller{sellers.length !== 1 ? 's' : ''} found
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderFilters = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.filtersContainer}>
          <View style={styles.filtersHeader}>
            <Text style={styles.filtersTitle}>Filter Sellers</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filtersContent}>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Price Range</Text>
              <View style={styles.filterRow}>
                <View style={styles.filterInputContainer}>
                  <Text style={styles.filterLabel}>Min Price (₹/kWh)</Text>
                  <TextInput
                    style={styles.filterInput}
                    value={filters.minPrice}
                    onChangeText={(text) => setFilters({ ...filters, minPrice: text })}
                    keyboardType="decimal-pad"
                    placeholder="0"
                  />
                </View>
                <View style={styles.filterInputContainer}>
                  <Text style={styles.filterLabel}>Max Price (₹/kWh)</Text>
                  <TextInput
                    style={styles.filterInput}
                    value={filters.maxPrice}
                    onChangeText={(text) => setFilters({ ...filters, maxPrice: text })}
                    keyboardType="decimal-pad"
                    placeholder="50"
                  />
                </View>
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Location</Text>
              <View style={styles.filterInputContainer}>
                <Text style={styles.filterLabel}>Search Radius (km)</Text>
                <TextInput
                  style={styles.filterInput}
                  value={filters.radius}
                  onChangeText={(text) => setFilters({ ...filters, radius: text })}
                  keyboardType="decimal-pad"
                  placeholder="10"
                />
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Quality</Text>
              <View style={styles.filterRow}>
                <View style={styles.filterInputContainer}>
                  <Text style={styles.filterLabel}>Min Rating</Text>
                  <TextInput
                    style={styles.filterInput}
                    value={filters.minRating}
                    onChangeText={(text) => setFilters({ ...filters, minRating: text })}
                    keyboardType="decimal-pad"
                    placeholder="0"
                  />
                </View>
                <View style={styles.switchRow}>
                  <View style={styles.switchLabelContainer}>
                    <Text style={styles.filterLabel}>Green Energy Only</Text>
                    <Text style={styles.filterHint}>Show only renewable energy sources</Text>
                  </View>
                  <Switch
                    value={filters.greenEnergyOnly}
                    onValueChange={(value) => setFilters({ ...filters, greenEnergyOnly: value })}
                    trackColor={{ false: '#d1d5db', true: '#10b981' }}
                    thumbColor="#ffffff"
                  />
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => {
                setShowFilters(false);
                searchSellers();
              }}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.applyButtonGradient}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#10b981', '#059669']}
        style={styles.gradientHeader}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Marketplace</Text>
            <Text style={styles.subtitle}>Find Energy Near Me</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowFilters(true)}
            >
              <Ionicons name="filter" size={20} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
            >
              <Ionicons 
                name={viewMode === 'list' ? 'map' : 'list'} 
                size={20} 
                color="#ffffff" 
              />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {renderFilters()}

      {viewMode === 'map' ? (
        renderMapView()
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
          }
        >
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#10b981" />
              <Text style={styles.loadingText}>Searching for sellers...</Text>
            </View>
          ) : sellers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="store-off" size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>No sellers found</Text>
              <Text style={styles.emptySubtext}>
                Try adjusting your filters or search radius
              </Text>
              {!userLocation && (
                <TouchableOpacity style={styles.locationButton} onPress={() => getLocation(true)}>
                  <LinearGradient
                    colors={['#10b981', '#059669']}
                    style={styles.locationButtonGradient}
                  >
                    <Ionicons name="location" size={20} color="#ffffff" />
                    <Text style={styles.locationButtonText}>Enable Location</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsCount}>
                  {sellers.length} seller{sellers.length !== 1 ? 's' : ''} found
                </Text>
                <TouchableOpacity onPress={() => setShowFilters(true)}>
                  <Text style={styles.filterLink}>Filter</Text>
                </TouchableOpacity>
              </View>
              {sellers.map(renderSellerCard)}
            </>
          )}
        </ScrollView>
      )}

      {/* Trade Modal */}
      <Modal
        visible={showTradeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTradeModal(false)}
      >
        <View style={styles.tradeModalOverlay}>
          <View style={styles.tradeModalContainer}>
            {selectedSeller && (
              <>
                <View style={styles.tradeModalHeader}>
                  <Text style={styles.tradeModalTitle}>{selectedSeller.name}</Text>
                  <TouchableOpacity onPress={() => setShowTradeModal(false)}>
                    <Ionicons name="close" size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.tradeModalInfo}>
                  <View style={styles.tradeModalInfoRow}>
                    <Text style={styles.tradeModalInfoLabel}>Price per kWh</Text>
                    <Text style={styles.tradeModalInfoValue}>{formatCurrency(selectedSeller.pricePerUnit)}</Text>
                  </View>
                  <View style={styles.tradeModalInfoRow}>
                    <Text style={styles.tradeModalInfoLabel}>Available</Text>
                    <Text style={styles.tradeModalInfoValue}>{formatEnergy(selectedSeller.availableEnergy)}</Text>
                  </View>
                </View>

                <Text style={styles.tradeModalQuestion}>What would you like to do?</Text>

                <TouchableOpacity
                  style={styles.tradeModalButton}
                  onPress={() => handleTradeOptionSelect('buy')}
                >
                  <LinearGradient
                    colors={['#10b981', '#059669']}
                    style={styles.tradeModalButtonGradient}
                  >
                    <Ionicons name="cart" size={24} color="#ffffff" />
                    <Text style={styles.tradeModalButtonText}>Buy Electricity</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.tradeModalButton}
                  onPress={() => handleTradeOptionSelect('sell')}
                >
                  <LinearGradient
                    colors={['#f59e0b', '#d97706']}
                    style={styles.tradeModalButtonGradient}
                  >
                    <Ionicons name="cash" size={24} color="#ffffff" />
                    <Text style={styles.tradeModalButtonText}>Sell Electricity</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.tradeModalCancelButton}
                  onPress={() => setShowTradeModal(false)}
                >
                  <Text style={styles.tradeModalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4',
  },
  gradientHeader: {
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#d1fae5',
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filtersContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filtersTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  filtersContent: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  filterRow: {
    gap: 12,
  },
  filterInputContainer: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  filterHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  switchLabelContainer: {
    flex: 1,
  },
  applyButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  applyButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
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
    padding: 20,
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
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  locationButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  locationButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  filterLink: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  sellerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sellerCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  sellerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sellerDistance: {
    fontSize: 12,
    color: '#6b7280',
  },
  greenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  greenBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
  },
  sellerDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  mapPlaceholderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  mapPlaceholderText: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  switchToListButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#10b981',
    borderRadius: 12,
  },
  switchToListButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  userLocationMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3b82f6',
    borderWidth: 3,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userLocationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  userLocationPulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    opacity: 0.3,
  },
  sellerMarker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  sellerMarkerGreen: {
    backgroundColor: '#22c55e',
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    gap: 12,
  },
  mapControlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  mapControlButtonActive: {
    backgroundColor: '#d1fae5',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  sellerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sellerModal: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '50%',
  },
  sellerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sellerModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  sellerModalContent: {
    gap: 16,
    marginBottom: 20,
  },
  sellerModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sellerModalLabel: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  sellerModalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  sellerModalButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  sellerModalButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  sellerModalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  mapResultsOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  mapResultsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  // Trade Modal Styles
  tradeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tradeModalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  tradeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  tradeModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
  },
  tradeModalInfo: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  tradeModalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tradeModalInfoLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  tradeModalInfoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  tradeModalQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  tradeModalButton: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tradeModalButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  tradeModalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  tradeModalCancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  tradeModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
});
