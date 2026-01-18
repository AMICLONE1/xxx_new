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
import { useFocusEffect } from '@react-navigation/native';
import { locationService } from '@/services/locationService';
import Constants from 'expo-constants';
import { RootStackParamList, Seller } from '@/types';
import { becknClient } from '@/services/beckn/becknClient';
import { tradingService } from '@/services/api/tradingService';
import { sellersService } from '@/services/api/sellersService';
import { formatCurrency, formatEnergy, calculateDistance } from '@/utils/helpers';
import { SEARCH_RADIUS_KM, MIN_SELL_PRICE, MAX_SELL_PRICE } from '@/utils/constants';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { MapboxWebView } from '@/components/mapbox/MapboxWebView';
import { buyersService } from '@/services/api/buyersService';
import { useAuthStore } from '@/store';
import { Buyer } from '@/types';
import { logError } from '@/utils/errorUtils';

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
  const { user } = useAuthStore();
  const userType = user?.userType || 'buyer'; // Default to buyer if not set

  // Buyers see sellers (to buy from), Sellers see buyers (info only)
  // No need for mode toggle - it's determined by userType
  const [directoryTab, setDirectoryTab] = useState<'market' | 'directory'>('market');
  const [allBuyers, setAllBuyers] = useState<Buyer[]>([]); // For directory view
  const [allSellers, setAllSellers] = useState<Seller[]>([]); // For directory view
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [filters, setFilters] = useState<Filters>({
    minPrice: MIN_SELL_PRICE.toString(),
    maxPrice: MAX_SELL_PRICE.toString(),
    greenEnergyOnly: false,
    minRating: '0',
    radius: SEARCH_RADIUS_KM.toString(),
  });

  // Default location: Pune, India
  const DEFAULT_LOCATION = {
    lat: 18.5204,
    lng: 73.8567,
  };

  // Debug: Log user type
  useEffect(() => {
    if (__DEV__) {
      console.log('[MarketplaceScreen] User type:', userType, 'User:', user?.email);
    }
  }, [userType, user]);

  // Get user location using cached locationService
  useEffect(() => {
    getLocation();
  }, []);

  // Search buyers - only for sellers to view buyer info
  const searchBuyers = useCallback(async () => {
    // Only sellers need to see buyers list
    if (!isOnline || userType !== 'seller') {
      return;
    }

    setLoading(true);
    try {
      let results: Buyer[] = [];

      if (userLocation) {
        try {
          const response = await buyersService.getBuyers({
            location: {
              lat: userLocation.lat,
              lng: userLocation.lng,
              radius: parseFloat(filters.radius) || SEARCH_RADIUS_KM,
            },
            maxPrice: parseFloat(filters.maxPrice) || undefined,
            status: 'active',
          });

          if (response.success && response.data) {
            results = response.data;
          }
        } catch (error: unknown) {
          logError('searchBuyers API', error);
        }
      }

      // Apply filters
      let filteredResults = results;
      if (filters.minPrice) {
        filteredResults = filteredResults.filter(
          (b) => b.maxPricePerUnit >= parseFloat(filters.minPrice)
        );
      }

      filteredResults.sort((a, b) => {
        if (a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance;
        }
        return b.maxPricePerUnit - a.maxPricePerUnit;
      });

      setBuyers(filteredResults);
    } catch (error: unknown) {
      logError('searchBuyers', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userLocation, filters, isOnline, userType]);

  // Fetch all buyers and sellers for directory view
  const fetchDirectory = useCallback(async () => {
    if (!isOnline) return;

    try {
      // Fetch all buyers for directory
      const buyersResponse = await buyersService.getBuyers();
      if (buyersResponse.success && buyersResponse.data) {
        setAllBuyers(buyersResponse.data);
      }

      // Fetch all sellers for directory
      const sellersResponse = await sellersService.getSellers();
      if (sellersResponse.success && sellersResponse.data) {
        setAllSellers(sellersResponse.data);
      }
    } catch (error: unknown) {
      logError('fetchDirectory', error);
    }
  }, [isOnline]);

  // Refresh location every minute - Added ref for proper cleanup
  const locationRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear existing interval first
    if (locationRefreshIntervalRef.current) {
      clearInterval(locationRefreshIntervalRef.current);
    }

    locationRefreshIntervalRef.current = setInterval(() => {
      if (__DEV__) console.log('[MarketplaceScreen] Refreshing location...');
      getLocation(true);
    }, 60000); // 60 seconds

    return () => {
      if (locationRefreshIntervalRef.current) {
        clearInterval(locationRefreshIntervalRef.current);
        locationRefreshIntervalRef.current = null;
      }
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
    } catch (error: unknown) {
      logError('getLocation', error);
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
        // First try to fetch from Supabase via tradingService
        try {
          if (__DEV__) {
            console.log('[MarketplaceScreen] Calling tradingService.searchSellers with location:', userLocation);
          }
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

          if (__DEV__) {
            console.log('[MarketplaceScreen] API Response:', apiResponse.success, 'Data length:', apiResponse.data?.length || 0);
          }

          if (apiResponse.success && apiResponse.data) {
            results = apiResponse.data;
            if (__DEV__) {
              console.log(`[MarketplaceScreen] Fetched ${results.length} sellers from database`);
            }
          }
        } catch (apiError: unknown) {
          if (__DEV__) {
            console.log('[MarketplaceScreen] Database fetch failed:', apiError);
          }
        }

        // If no results from database, try Beckn gateway
        if (results.length === 0) {
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
            // Beckn gateway is optional - silently fall back
            if (__DEV__) {
              console.log('[MarketplaceScreen] Beckn gateway not available');
            }
          }
        }

        // Log if no sellers found (no more mock data fallback)
        if (results.length === 0 && __DEV__) {
          console.log('[MarketplaceScreen] No sellers found in database. Sellers can add listings via the SellEnergy screen.');
        }
      }

      // No need to filter by radius again - tradingService already applies radius filter
      // Just sort and set the results
      let filteredResults = results;

      if (__DEV__) {
        console.log('[MarketplaceScreen] Setting sellers from API:', results.length, 'sellers');
      }

      // Sort by distance (closest first), fallback to price
      filteredResults.sort((a, b) => {
        if (a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance;
        }
        return a.pricePerUnit - b.pricePerUnit;
      });

      setSellers(filteredResults);

      // Map will auto-fit to show all sellers (handled by WebView)
    } catch (error: unknown) {
      logError('searchSellers', error);
      Alert.alert('Error', 'Failed to search sellers. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userLocation, filters, isOnline, viewMode, mapReady]);

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (userType === 'seller') {
        searchBuyers();
      } else {
        searchSellers();
      }
      fetchDirectory();
    }, [userType, searchBuyers, searchSellers, fetchDirectory])
  );

  // Auto-refresh based on mode - Fixed memory leak by clearing existing interval before creating new one
  useEffect(() => {
    // Always clear existing interval first to prevent stacking
    if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
      autoRefreshIntervalRef.current = null;
    }

    if (autoRefreshEnabled && userLocation && directoryTab === 'market') {
      // Sellers see buyers, buyers see sellers
      const searchFn = userType === 'seller' ? searchBuyers : searchSellers;

      // Initial load
      searchFn();

      // Set up interval for auto-refresh
      autoRefreshIntervalRef.current = setInterval(() => {
        if (__DEV__) console.log(`[MarketplaceScreen] Auto-refreshing ${userType === 'seller' ? 'buyers' : 'sellers'}...`);
        searchFn();
      }, 30000); // 30 seconds
    }

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
    };
  }, [autoRefreshEnabled, userLocation, filters, userType, directoryTab, searchSellers, searchBuyers]);

  useEffect(() => {
    if (__DEV__) {
      console.log('[MarketplaceScreen] Search trigger effect - userLocation:', !!userLocation, 'userType:', userType);
    }
    if (userLocation) {
      // Sellers see buyers, buyers see sellers
      if (userType === 'seller') {
        if (__DEV__) console.log('[MarketplaceScreen] Calling searchBuyers for seller');
        searchBuyers();
      } else {
        if (__DEV__) console.log('[MarketplaceScreen] Calling searchSellers for buyer');
        searchSellers();
      }
    }
  }, [userLocation, userType, searchSellers, searchBuyers]);

  // Fetch directory data when tab changes to directory or on mount
  useEffect(() => {
    if (directoryTab === 'directory') {
      fetchDirectory();
    }
  }, [directoryTab, fetchDirectory]);

  // Also fetch on initial mount for directory data
  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (directoryTab === 'directory') {
      fetchDirectory();
      setRefreshing(false);
    } else if (userType === 'seller') {
      searchBuyers();
    } else {
      searchSellers();
    }
  }, [searchSellers, searchBuyers, fetchDirectory, userType, directoryTab]);

  const handleSellerPress = (seller: Seller) => {
    setSelectedSeller(seller);
    setShowTradeModal(true);
  };

  const handleTradeOptionSelect = (option: 'buy' | 'sell') => {
    setShowTradeModal(false);
    if (option === 'buy' && selectedSeller) {
      // Navigate to order screen for buying
      navigation.navigate('Order', {
        sellerId: selectedSeller.userId || selectedSeller.id,
        sellerName: selectedSeller.name,
        pricePerUnit: selectedSeller.pricePerUnit,
        availableEnergy: selectedSeller.availableEnergy,
      });
    } else if (option === 'sell' && selectedBuyer) {
      // Navigate to sell energy screen
      navigation.navigate('SellEnergy', {
        buyerId: selectedBuyer.id,
        buyerName: selectedBuyer.name,
        maxPricePerUnit: selectedBuyer.maxPricePerUnit,
        energyNeeded: selectedBuyer.energyNeeded,
      });
    }
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
            <MaterialCommunityIcons name="store" size={20} color="#3b82f6" />
            <Text style={styles.sellerName}>{seller.name}</Text>
          </View>
          {seller.distance !== undefined && (
            <View style={styles.distanceRow}>
              <Ionicons name="location" size={14} color="#64748b" />
              <Text style={styles.sellerDistance}>{seller.distance.toFixed(1)} km away</Text>
            </View>
          )}
        </View>
        {seller.greenEnergy && (
          <View style={styles.greenBadge}>
            <MaterialCommunityIcons name="leaf" size={14} color="#10b981" />
            <Text style={styles.greenBadgeText}>Green</Text>
          </View>
        )}
      </View>

      <View style={styles.sellerDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="currency-inr" size={18} color="#3b82f6" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Price</Text>
              <Text style={styles.detailValue}>{formatCurrency(seller.pricePerUnit)}/kWh</Text>
            </View>
          </View>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="lightning-bolt" size={18} color="#3b82f6" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Available</Text>
              <Text style={styles.detailValue}>{formatEnergy(seller.availableEnergy, 'kWh')}</Text>
            </View>
          </View>
        </View>
        {seller.rating !== undefined && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={16} color="#3b82f6" />
            <Text style={styles.ratingText}>{seller.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const handleBuyerPress = (buyer: Buyer) => {
    setSelectedBuyer(buyer);
    setShowTradeModal(true);
  };

  const renderBuyerCard = (buyer: Buyer) => (
    <TouchableOpacity
      key={buyer.id}
      style={styles.buyerCard}
      onPress={() => handleBuyerPress(buyer)}
      activeOpacity={0.7}
    >
      <View style={styles.buyerCardHeader}>
        <View style={styles.buyerInfo}>
          <View style={styles.buyerNameRow}>
            <MaterialCommunityIcons name="account-arrow-down" size={20} color="#3b82f6" />
            <Text style={styles.buyerName}>{buyer.name}</Text>
          </View>
          {buyer.distance !== undefined && (
            <View style={styles.distanceRow}>
              <Ionicons name="location" size={14} color="#64748b" />
              <Text style={styles.buyerDistance}>{buyer.distance.toFixed(1)} km away</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.buyerDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="currency-inr" size={18} color="#3b82f6" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Max Price</Text>
              <Text style={styles.detailValue}>{formatCurrency(buyer.maxPricePerUnit)}/kWh</Text>
            </View>
          </View>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="lightning-bolt" size={18} color="#3b82f6" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Needed</Text>
              <Text style={styles.detailValue}>{formatEnergy(buyer.energyNeeded, 'kWh')}</Text>
            </View>
          </View>
        </View>
        {buyer.preferredDeliveryWindow && (
          <View style={styles.deliveryWindowRow}>
            <MaterialCommunityIcons name="clock-outline" size={16} color="#64748b" />
            <Text style={styles.deliveryWindowText}>{buyer.preferredDeliveryWindow}</Text>
          </View>
        )}
        {buyer.rating !== undefined && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={16} color="#3b82f6" />
            <Text style={styles.ratingText}>{buyer.rating.toFixed(1)}</Text>
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
          sellers={userType === 'buyer' ? sellers : []}
          buyers={userType === 'seller' ? buyers : []}
          userLocation={userLocation || undefined}
          showBuyers={userType === 'seller'}
          showSellers={userType === 'buyer'}
          onMarkerClick={(id, type) => {
            if (type === 'seller') {
              const seller = sellers.find(s => s.id === id);
              if (seller) {
                handleMarkerPress(seller);
              }
            } else if (type === 'buyer') {
              const buyer = buyers.find(b => b.id === id);
              if (buyer) {
                setSelectedBuyer(buyer);
              }
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
              name={autoRefreshEnabled ? "autorenew" : "autorenew-off"}
              size={20}
              color={autoRefreshEnabled ? "#3b82f6" : "#6b7280"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mapControlButton}
            onPress={() => {
              getLocation(true);
              searchSellers();
            }}
          >
            <Ionicons name="locate" size={20} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mapControlButton}
            onPress={() => setViewMode('list')}
          >
            <Ionicons name="list" size={20} color="#3b82f6" />
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
                  <View style={styles.sellerModalTitleRow}>
                    <View style={styles.sellerModalAvatar}>
                      <Ionicons name="person" size={24} color="#3b82f6" />
                    </View>
                    <Text style={styles.sellerModalTitle}>{selectedSeller.name}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.sellerModalCloseBtn}
                    onPress={() => setSelectedSeller(null)}
                  >
                    <Ionicons name="close" size={20} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
                <View style={styles.sellerModalContent}>
                  <View style={styles.sellerModalRow}>
                    <View style={styles.sellerModalIconContainer}>
                      <MaterialCommunityIcons name="currency-inr" size={18} color="#3b82f6" />
                    </View>
                    <View style={styles.sellerModalTextContainer}>
                      <Text style={styles.sellerModalLabel}>Price per kWh</Text>
                      <Text style={styles.sellerModalValue}>
                        {formatCurrency(selectedSeller.pricePerUnit)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.sellerModalRow}>
                    <View style={styles.sellerModalIconContainer}>
                      <MaterialCommunityIcons name="lightning-bolt" size={18} color="#f59e0b" />
                    </View>
                    <View style={styles.sellerModalTextContainer}>
                      <Text style={styles.sellerModalLabel}>Available Energy</Text>
                      <Text style={styles.sellerModalValue}>
                        {formatEnergy(selectedSeller.availableEnergy, 'kWh')}
                      </Text>
                    </View>
                  </View>
                  {selectedSeller.distance !== undefined && (
                    <View style={styles.sellerModalRow}>
                      <View style={styles.sellerModalIconContainer}>
                        <Ionicons name="location" size={18} color="#10b981" />
                      </View>
                      <View style={styles.sellerModalTextContainer}>
                        <Text style={styles.sellerModalLabel}>Distance</Text>
                        <Text style={styles.sellerModalValue}>
                          {selectedSeller.distance.toFixed(1)} km away
                        </Text>
                      </View>
                    </View>
                  )}
                  {selectedSeller.rating !== undefined && (
                    <View style={styles.sellerModalRow}>
                      <View style={styles.sellerModalIconContainer}>
                        <Ionicons name="star" size={18} color="#fbbf24" />
                      </View>
                      <View style={styles.sellerModalTextContainer}>
                        <Text style={styles.sellerModalLabel}>Rating</Text>
                        <Text style={styles.sellerModalValue}>
                          {selectedSeller.rating.toFixed(1)} ⭐
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.sellerModalButton}
                  onPress={() => {
                    const seller = selectedSeller;
                    setSelectedSeller(null);
                    navigation.navigate('Order', {
                      sellerId: seller.userId || seller.id,
                      sellerName: seller.name,
                      pricePerUnit: seller.pricePerUnit,
                      availableEnergy: seller.availableEnergy,
                    });
                  }}
                >
                  <LinearGradient
                    colors={['#3b82f6', '#1d4ed8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.sellerModalButtonGradient}
                  >
                    <Ionicons name="flash" size={20} color="#ffffff" />
                    <Text style={styles.sellerModalButtonText}>Buy Electricity</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {/* Results Count Overlay */}
        {(userType === 'buyer' ? sellers.length > 0 : buyers.length > 0) && (
          <View style={styles.mapResultsOverlay}>
            <Text style={styles.mapResultsText}>
              {userType === 'buyer'
                ? `${sellers.length} seller${sellers.length !== 1 ? 's' : ''} found`
                : `${buyers.length} buyer${buyers.length !== 1 ? 's' : ''} found`}
            </Text>
          </View>
        )}

        {/* Map Legend */}
        <View style={styles.mapLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendMarker, { backgroundColor: '#3b82f6' }]} />
            <Text style={styles.legendText}>Sellers</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendMarker, { backgroundColor: '#f59e0b' }]} />
            <Text style={styles.legendText}>Buyers</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendMarker, { backgroundColor: '#0062ff7a' }]} />
            <Text style={styles.legendText}>Your Location</Text>
          </View>
        </View>
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
            <Text style={styles.filtersTitle}>
              Filter {userType === 'buyer' ? 'Sellers' : 'Buyers'}
            </Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filtersContent}>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Price Range</Text>
              <View style={styles.filterRow}>
                <View style={styles.filterInputContainer}>
                  <Text style={styles.filterLabel}>
                    {userType === 'buyer' ? 'Min Price' : 'Min Max Price'} (₹/kWh)
                  </Text>
                  <TextInput
                    style={styles.filterInput}
                    value={filters.minPrice}
                    onChangeText={(text) => setFilters({ ...filters, minPrice: text })}
                    keyboardType="decimal-pad"
                    placeholder="0"
                  />
                </View>
                <View style={styles.filterInputContainer}>
                  <Text style={styles.filterLabel}>
                    {userType === 'buyer' ? 'Max Price' : 'Max Price'} (₹/kWh)
                  </Text>
                  <TextInput
                    style={styles.filterInput}
                    value={filters.maxPrice}
                    onChangeText={(text) => setFilters({ ...filters, maxPrice: text })}
                    keyboardType="decimal-pad"
                    placeholder="50"
                  />
                </View>
              </View>
              {userType === 'seller' && (
                <Text style={styles.filterHint}>
                  Filter buyers by their maximum price range
                </Text>
              )}
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
                {userType === 'buyer' && (
                  <View style={styles.switchRow}>
                    <View style={styles.switchLabelContainer}>
                      <Text style={styles.filterLabel}>Green Energy Only</Text>
                      <Text style={styles.filterHint}>Show only renewable energy sources</Text>
                    </View>
                    <Switch
                      value={filters.greenEnergyOnly}
                      onValueChange={(value) => setFilters({ ...filters, greenEnergyOnly: value })}
                      trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
                      thumbColor="#ffffff"
                    />
                  </View>
                )}
              </View>
            </View>

          </ScrollView>

          {/* Apply Filters Button - Fixed at bottom */}
          <View style={styles.applyButtonContainer}>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => {
                setShowFilters(false);
                if (userType === 'buyer') {
                  searchSellers();
                } else {
                  searchBuyers();
                }
              }}
            >
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                style={styles.applyButtonGradient}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <LinearGradient
      colors={['#e0f2fe', '#f0f9ff', '#ffffff']}
      style={styles.gradientBackground}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.headerSimple}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>Marketplace</Text>
              <Text style={styles.headerSubtitle}>
                {userType === 'seller' ? 'View Energy Buyers' : 'Find Energy Sellers'}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setShowFilters(true)}
              >
                <Ionicons name="filter" size={20} color="#3b82f6" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
              >
                <Ionicons
                  name={viewMode === 'list' ? 'map' : 'list'}
                  size={20}
                  color="#3b82f6"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Seller: Prominent List Energy CTA - hidden in map view */}
          {userType === 'seller' && viewMode !== 'map' && (
            <TouchableOpacity
              style={styles.listEnergyCta}
              onPress={() => navigation.navigate('SellEnergy', {})}
            >
              <LinearGradient
                colors={['#0ea5e9', '#0284c7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.listEnergyCtaGradient}
              >
                <MaterialCommunityIcons name="solar-panel" size={24} color="#ffffff" />
                <View style={styles.listEnergyCtaText}>
                  <Text style={styles.listEnergyCtaTitle}>List Your Energy for Sale</Text>
                  <Text style={styles.listEnergyCtaSubtitle}>Sell to buyers in the marketplace</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#ffffff" />
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Tab Navigation: Market / Directory - hidden in map view */}
          {viewMode !== 'map' && (
            <View style={styles.tabNavigation}>
              <TouchableOpacity
                style={[styles.tabButton, directoryTab === 'market' && styles.tabButtonActive]}
                onPress={() => setDirectoryTab('market')}
              >
                <Text style={[styles.tabButtonText, directoryTab === 'market' && styles.tabButtonTextActive]}>
                  {userType === 'buyer' ? 'Browse Sellers' : 'Browse Buyers'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, directoryTab === 'directory' && styles.tabButtonActive]}
                onPress={() => setDirectoryTab('directory')}
              >
                <Text style={[styles.tabButtonText, directoryTab === 'directory' && styles.tabButtonTextActive]}>
                  {userType === 'buyer' ? 'Buyers Directory' : 'Sellers Directory'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Toggle removed - role determines view (buyers see sellers, sellers see buyers) */}
        </View>

        {renderFilters()}

        {viewMode === 'map' ? (
          renderMapView()
        ) : (
          <>
            {__DEV__ && console.log('[MarketplaceScreen] Rendering - userType:', userType, 'sellers:', sellers.length, 'buyers:', buyers.length, 'loading:', loading, 'directoryTab:', directoryTab)}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
              }
            >
              {/* Directory Tab Content */}
              {directoryTab === 'directory' ? (
                <>
                  <View style={styles.directoryHeader}>
                    <Text style={styles.directoryTitle}>
                      {userType === 'buyer' ? 'All Buyers in the Network' : 'All Sellers in the Network'}
                    </Text>
                    <Text style={styles.directorySubtitle}>
                      {userType === 'buyer'
                        ? `${allBuyers.length} buyers registered`
                        : `${allSellers.length} sellers registered`}
                    </Text>
                  </View>
                  {userType === 'buyer' ? (
                    allBuyers.length > 0 ? (
                      allBuyers.map((buyer) => (
                        <View key={buyer.id} style={styles.directoryCard}>
                          <View style={styles.directoryCardHeader}>
                            <MaterialCommunityIcons name="account" size={24} color="#3b82f6" />
                            <Text style={styles.directoryCardName}>{buyer.name}</Text>
                          </View>
                          <View style={styles.directoryCardInfo}>
                            <Text style={styles.directoryCardDetail}>
                              <MaterialCommunityIcons name="lightning-bolt" size={14} color="#64748b" />
                              {' '}Needs: {formatEnergy(buyer.energyNeeded, 'kWh')}
                            </Text>
                            <Text style={styles.directoryCardDetail}>
                              <MaterialCommunityIcons name="currency-inr" size={14} color="#64748b" />
                              {' '}Max: {formatCurrency(buyer.maxPricePerUnit)}/kWh
                            </Text>
                            {buyer.location?.address && (
                              <Text style={styles.directoryCardDetail}>
                                <Ionicons name="location" size={14} color="#64748b" />
                                {' '}{buyer.location.address}
                              </Text>
                            )}
                          </View>
                        </View>
                      ))
                    ) : (
                      <View style={styles.emptyDirectory}>
                        <MaterialCommunityIcons name="account-group" size={48} color="#d1d5db" />
                        <Text style={styles.emptyDirectoryText}>No buyers registered yet</Text>
                      </View>
                    )
                  ) : (
                    allSellers.length > 0 ? (
                      allSellers.map((seller) => (
                        <View key={seller.id} style={styles.directoryCard}>
                          <View style={styles.directoryCardHeader}>
                            <MaterialCommunityIcons name="store" size={24} color="#10b981" />
                            <Text style={styles.directoryCardName}>{seller.name}</Text>
                            {seller.greenEnergy && (
                              <View style={styles.greenBadgeSmall}>
                                <MaterialCommunityIcons name="leaf" size={12} color="#10b981" />
                              </View>
                            )}
                          </View>
                          <View style={styles.directoryCardInfo}>
                            <Text style={styles.directoryCardDetail}>
                              <MaterialCommunityIcons name="lightning-bolt" size={14} color="#64748b" />
                              {' '}Available: {formatEnergy(seller.availableEnergy, 'kWh')}
                            </Text>
                            <Text style={styles.directoryCardDetail}>
                              <MaterialCommunityIcons name="currency-inr" size={14} color="#64748b" />
                              {' '}Price: {formatCurrency(seller.pricePerUnit)}/kWh
                            </Text>
                            {seller.rating !== undefined && seller.rating > 0 && (
                              <Text style={styles.directoryCardDetail}>
                                <Ionicons name="star" size={14} color="#fbbf24" />
                                {' '}{seller.rating.toFixed(1)} rating
                              </Text>
                            )}
                          </View>
                        </View>
                      ))
                    ) : (
                      <View style={styles.emptyDirectory}>
                        <MaterialCommunityIcons name="store-off" size={48} color="#d1d5db" />
                        <Text style={styles.emptyDirectoryText}>No sellers registered yet</Text>
                      </View>
                    )
                  )}
                </>
              ) : (
                /* Market Tab Content - Original functionality */
                loading && !refreshing ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={styles.loadingText}>
                      Searching for {userType === 'seller' ? 'buyers' : 'sellers'}...
                    </Text>
                  </View>
                ) : (userType === 'seller' ? buyers.length === 0 : sellers.length === 0) ? (
                  <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons
                      name={userType === 'seller' ? 'account-off' : 'store-off'}
                      size={64}
                      color="#d1d5db"
                    />
                    <Text style={styles.emptyText}>
                      No {userType === 'seller' ? 'buyers' : 'sellers'} found
                    </Text>
                    <Text style={styles.emptySubtext}>
                      {userType === 'seller'
                        ? 'Try adjusting your filters or search radius'
                        : 'No sellers are currently listing energy. Be the first to sell!'}
                    </Text>
                    {userType === 'buyer' && (
                      <TouchableOpacity
                        style={styles.listEnergyButton}
                        onPress={() => navigation.navigate('SellEnergy', {})}
                      >
                        <LinearGradient
                          colors={['#0ea5e9', '#0284c7']}
                          style={styles.listEnergyButtonGradient}
                        >
                          <MaterialCommunityIcons name="solar-panel" size={20} color="#ffffff" />
                          <Text style={styles.listEnergyButtonText}>List Your Energy</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                    {!userLocation && (
                      <TouchableOpacity style={styles.locationButton} onPress={() => getLocation(true)}>
                        <LinearGradient
                          colors={['#3b82f6', '#2563eb']}
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
                        {userType === 'seller'
                          ? `${buyers.length} buyer${buyers.length !== 1 ? 's' : ''} found`
                          : `${sellers.length} seller${sellers.length !== 1 ? 's' : ''} found`}
                      </Text>
                      <TouchableOpacity onPress={() => setShowFilters(true)}>
                        <Text style={styles.filterLink}>Filter</Text>
                      </TouchableOpacity>
                    </View>
                    {userType === 'seller'
                      ? buyers.map(renderBuyerCard)
                      : sellers.map(renderSellerCard)}
                  </>
                )
              )}
            </ScrollView>
          </>
        )}

        {/* Trade Modal - For Buyers viewing Sellers */}
        <Modal
          visible={showTradeModal && userType === 'buyer' && !!selectedSeller}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setShowTradeModal(false);
            setSelectedSeller(null);
          }}
        >
          <View style={styles.tradeModalOverlay}>
            <View style={styles.tradeModalContainer}>
              {selectedSeller && (
                <>
                  <View style={styles.tradeModalHeader}>
                    <Text style={styles.tradeModalTitle}>{selectedSeller.name}</Text>
                    <TouchableOpacity onPress={() => {
                      setShowTradeModal(false);
                      setSelectedSeller(null);
                    }}>
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
                    {selectedSeller.distance !== undefined && (
                      <View style={styles.tradeModalInfoRow}>
                        <Text style={styles.tradeModalInfoLabel}>Distance</Text>
                        <Text style={styles.tradeModalInfoValue}>{selectedSeller.distance.toFixed(1)} km</Text>
                      </View>
                    )}
                    {selectedSeller.rating !== undefined && (
                      <View style={styles.tradeModalInfoRow}>
                        <Text style={styles.tradeModalInfoLabel}>Rating</Text>
                        <Text style={styles.tradeModalInfoValue}>⭐ {selectedSeller.rating.toFixed(1)}</Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.tradeModalButton}
                    onPress={() => handleTradeOptionSelect('buy')}
                  >
                    <LinearGradient
                      colors={['#3b82f6', '#2563eb']}
                      style={styles.tradeModalButtonGradient}
                    >
                      <Ionicons name="cart" size={24} color="#ffffff" />
                      <Text style={styles.tradeModalButtonText}>Buy Electricity</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.tradeModalCancelButton}
                    onPress={() => {
                      setShowTradeModal(false);
                      setSelectedSeller(null);
                    }}
                  >
                    <Text style={styles.tradeModalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Info Modal - For Sellers viewing Buyers (read-only, no sell action) */}
        <Modal
          visible={showTradeModal && userType === 'seller' && !!selectedBuyer}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setShowTradeModal(false);
            setSelectedBuyer(null);
          }}
        >
          <View style={styles.tradeModalOverlay}>
            <View style={styles.tradeModalContainer}>
              {selectedBuyer && (
                <>
                  <View style={styles.tradeModalHeader}>
                    <Text style={styles.tradeModalTitle}>{selectedBuyer.name}</Text>
                    <TouchableOpacity onPress={() => {
                      setShowTradeModal(false);
                      setSelectedBuyer(null);
                    }}>
                      <Ionicons name="close" size={24} color="#6b7280" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.tradeModalInfo}>
                    <View style={styles.tradeModalInfoRow}>
                      <Text style={styles.tradeModalInfoLabel}>Max Price per kWh</Text>
                      <Text style={styles.tradeModalInfoValue}>{formatCurrency(selectedBuyer.maxPricePerUnit)}</Text>
                    </View>
                    <View style={styles.tradeModalInfoRow}>
                      <Text style={styles.tradeModalInfoLabel}>Energy Needed</Text>
                      <Text style={styles.tradeModalInfoValue}>{formatEnergy(selectedBuyer.energyNeeded)}</Text>
                    </View>
                    {selectedBuyer.distance !== undefined && (
                      <View style={styles.tradeModalInfoRow}>
                        <Text style={styles.tradeModalInfoLabel}>Distance</Text>
                        <Text style={styles.tradeModalInfoValue}>{selectedBuyer.distance.toFixed(1)} km</Text>
                      </View>
                    )}
                    {selectedBuyer.preferredDeliveryWindow && (
                      <View style={styles.tradeModalInfoRow}>
                        <Text style={styles.tradeModalInfoLabel}>Delivery Window</Text>
                        <Text style={styles.tradeModalInfoValue}>{selectedBuyer.preferredDeliveryWindow}</Text>
                      </View>
                    )}
                    {selectedBuyer.rating !== undefined && (
                      <View style={styles.tradeModalInfoRow}>
                        <Text style={styles.tradeModalInfoLabel}>Rating</Text>
                        <Text style={styles.tradeModalInfoValue}>⭐ {selectedBuyer.rating.toFixed(1)}</Text>
                      </View>
                    )}
                  </View>

                  {/* Info-only notice - sellers cannot initiate sales */}
                  <View style={styles.infoNotice}>
                    <Ionicons name="information-circle" size={20} color="#6b7280" />
                    <Text style={styles.infoNoticeText}>
                      Only buyers can place energy orders. List your energy for sale and wait for buyers to order.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.tradeModalCancelButton}
                    onPress={() => {
                      setShowTradeModal(false);
                      setSelectedBuyer(null);
                    }}
                  >
                    <Text style={styles.tradeModalCancelText}>Close</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  headerSimple: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  toggleContainer: {
    marginTop: 0,
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
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 40,
  },
  filtersContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    width: '100%',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 24,
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
  applyButtonContainer: {
    padding: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  applyButton: {
    borderRadius: 12,
    overflow: 'hidden',
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
  listEnergyButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 12,
  },
  listEnergyButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listEnergyButtonText: {
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
    color: '#3b82f6',
    fontWeight: '600',
  },
  sellerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  buyerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  buyerCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  buyerInfo: {
    flex: 1,
  },
  buyerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  buyerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  buyerDistance: {
    fontSize: 12,
    color: '#6b7280',
  },
  buyerDetails: {
    gap: 12,
  },
  deliveryWindowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  deliveryWindowText: {
    fontSize: 12,
    color: '#6b7280',
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
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  greenBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
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
    backgroundColor: '#3b82f6',
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
    backgroundColor: '#dbeafe',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  sellerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sellerModal: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  sellerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sellerModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sellerModalAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerModalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  sellerModalContent: {
    gap: 12,
    marginBottom: 20,
  },
  sellerModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 12,
  },
  sellerModalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerModalTextContainer: {
    flex: 1,
  },
  sellerModalLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  sellerModalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  sellerModalButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  sellerModalButtonGradient: {
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  sellerModalButtonText: {
    color: '#ffffff',
    fontSize: 15,
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
  mapLegend: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
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
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
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
    backgroundColor: '#f8fafc',
    borderRadius: 16,
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
  // Tab Navigation Styles
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginTop: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  tabButtonTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  // List Energy CTA Styles (for sellers)
  listEnergyCta: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  listEnergyCtaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  listEnergyCtaText: {
    flex: 1,
  },
  listEnergyCtaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  listEnergyCtaSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  // Directory Styles
  directoryHeader: {
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  directoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  directorySubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  directoryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  directoryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  directoryCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  directoryCardInfo: {
    gap: 6,
  },
  directoryCardDetail: {
    fontSize: 14,
    color: '#64748b',
  },
  emptyDirectory: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyDirectoryText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 12,
  },
  greenBadgeSmall: {
    padding: 4,
    backgroundColor: '#d1fae5',
    borderRadius: 8,
  },
  // Info Notice styles
  infoNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  infoNoticeText: {
    flex: 1,
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
});
