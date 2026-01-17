import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types';
import { useMeterStore } from '@/store/meterStore';
import { useAuthStore } from '@/store';
import { buyersService } from '@/services/api/buyersService';
import { tradingService } from '@/services/api/tradingService';
import { getErrorMessage } from '@/utils/errorUtils';
import { locationService } from '@/services/locationService';
import { supabaseDatabaseService } from '@/services/supabase/databaseService';

type SellEnergyScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SellEnergy'>;

interface Props {
  navigation: SellEnergyScreenNavigationProp;
  route: {
    params?: {
      buyerId?: string;
      buyerName?: string;
      maxPricePerUnit?: number;
      energyNeeded?: number;
    };
  };
}

export default function SellEnergyScreen({ navigation, route }: Props) {
  const { meters } = useMeterStore();
  const { user } = useAuthStore();
  const { buyerId, buyerName, maxPricePerUnit, energyNeeded } = route.params || {};

  const [selectedMeterId, setSelectedMeterId] = useState<string>('');
  const [plantName, setPlantName] = useState<string>('');
  const [energyAmount, setEnergyAmount] = useState<string>('');
  const [pricePerUnit, setPricePerUnit] = useState<string>('');
  const [deliveryWindow, setDeliveryWindow] = useState<string>('');
  const [greenEnergy, setGreenEnergy] = useState<boolean>(true);
  // Default location: Pune, India (used when user location is unavailable)
  const DEFAULT_LOCATION = { lat: 18.5204, lng: 73.8567 };
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>(DEFAULT_LOCATION);
  const [loading, setLoading] = useState(false);

  // Fetch user location on mount, fallback to Pune if unavailable
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const location = await locationService.getCurrentLocation();
        if (location) {
          setUserLocation({
            lat: location.latitude,
            lng: location.longitude,
          });
        } else {
          // Fallback to default Pune location
          console.log('[SellEnergy] No location available, using default Pune location');
          setUserLocation(DEFAULT_LOCATION);
        }
      } catch (error) {
        console.log('[SellEnergy] Failed to get location, using default Pune:', error);
        // Keep default Pune location on error
        setUserLocation(DEFAULT_LOCATION);
      }
    };
    fetchLocation();
  }, []);

  useEffect(() => {
    if (meters.length > 0 && !selectedMeterId) {
      setSelectedMeterId(meters[0].id);
    }
    if (maxPricePerUnit) {
      setPricePerUnit(maxPricePerUnit.toString());
    }
    if (energyNeeded) {
      setEnergyAmount(energyNeeded.toString());
    }
  }, [meters, maxPricePerUnit, energyNeeded]);

  const selectedMeter = meters.find(m => m.id === selectedMeterId);

  const handleSellEnergy = async () => {
    if (!plantName.trim()) {
      Alert.alert('Error', 'Please enter your solar plant name');
      return;
    }

    if (!selectedMeterId) {
      Alert.alert('Error', 'Please select a meter/site');
      return;
    }

    const energy = parseFloat(energyAmount);
    const price = parseFloat(pricePerUnit);

    if (!energy || energy <= 0) {
      Alert.alert('Error', 'Please enter a valid energy amount');
      return;
    }

    if (!price || price <= 0) {
      Alert.alert('Error', 'Please enter a valid price per unit');
      return;
    }

    if (buyerId && maxPricePerUnit && price > maxPricePerUnit) {
      Alert.alert(
        'Price Too High',
        `This buyer's maximum price is ₹${maxPricePerUnit}/kWh. Please adjust your price.`
      );
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'Please log in to create a listing');
      return;
    }

    setLoading(true);
    try {
      // Check if user already has a seller listing
      const existingSeller = await supabaseDatabaseService.getSellerByUserId(user.id);

      if (existingSeller) {
        // Update existing seller listing
        await supabaseDatabaseService.updateSeller(user.id, {
          name: plantName.trim(),
          pricePerUnit: price,
          availableEnergy: energy,
          greenEnergy: greenEnergy,
          location: userLocation,
          status: 'active',
        });
      } else {
        // Create new seller listing
        await supabaseDatabaseService.createSeller({
          userId: user.id,
          name: plantName.trim(),
          pricePerUnit: price,
          availableEnergy: energy,
          greenEnergy: greenEnergy,
          location: userLocation,
        });
      }

      // If selling to a specific buyer, notify them (placeholder for now)
      if (buyerId && buyerName) {
        Alert.alert(
          'Success',
          `Energy listing created for ${buyerName}. They will be notified.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert(
          'Success',
          'Your energy listing has been created and is now visible to buyers in the marketplace!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error: unknown) {
      Alert.alert('Error', getErrorMessage(error) || 'Failed to create energy listing');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const formatEnergy = (value: number) => {
    return `${value.toFixed(2)} kWh`;
  };

  const totalAmount = parseFloat(energyAmount) * parseFloat(pricePerUnit) || 0;

  return (
    <LinearGradient
      colors={['#e0f2fe', '#f0f9ff', '#ffffff']}
      style={styles.gradientBackground}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Sell Energy</Text>
            <Text style={styles.headerSubtitle}>
              {buyerName ? `To ${buyerName}` : 'List your energy for sale'}
            </Text>
          </View>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Buyer Info Card (if selling to specific buyer) */}
            {buyerId && buyerName && (
              <View style={styles.buyerInfoCard}>
                <View style={styles.buyerInfoHeader}>
                  <View style={styles.buyerIconContainer}>
                    <MaterialCommunityIcons name="account-arrow-down" size={22} color="#0ea5e9" />
                  </View>
                  <View style={styles.buyerInfoTextContainer}>
                    <Text style={styles.buyerInfoTitle}>Selling to {buyerName}</Text>
                    <View style={styles.buyerInfoDetails}>
                      {maxPricePerUnit && (
                        <Text style={styles.buyerInfoText}>
                          Max: {formatCurrency(maxPricePerUnit)}/kWh
                        </Text>
                      )}
                      {energyNeeded && (
                        <Text style={styles.buyerInfoText}>
                          Need: {formatEnergy(energyNeeded)}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Main Form Card */}
            <View style={styles.formCard}>
              <View style={styles.formHeaderRow}>
                <View style={styles.formIconContainer}>
                  <LinearGradient
                    colors={['#0ea5e9', '#0284c7']}
                    style={styles.formIconGradient}
                  >
                    <MaterialCommunityIcons name="solar-power" size={28} color="#ffffff" />
                  </LinearGradient>
                </View>
                <View style={styles.formHeaderText}>
                  <Text style={styles.formSectionTitle}>Energy Listing Details</Text>
                  <Text style={styles.formHelperText}>Fill in your solar plant information</Text>
                </View>
              </View>

              {/* Solar Plant Name Input */}
              <View style={styles.inputCard}>
                <View style={styles.inputLabelRow}>
                  <MaterialCommunityIcons name="solar-panel" size={18} color="#0ea5e9" />
                  <Text style={styles.inputLabel}>Solar Plant Name *</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your solar plant/site name"
                  placeholderTextColor="#94a3b8"
                  value={plantName}
                  onChangeText={setPlantName}
                  autoCapitalize="words"
                />
              </View>

              {/* Green Energy Toggle */}
              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <View style={styles.toggleIconContainer}>
                    <MaterialCommunityIcons name="leaf" size={20} color="#0ea5e9" />
                  </View>
                  <View style={styles.toggleTextContainer}>
                    <Text style={styles.toggleTitle}>Green Energy</Text>
                    <Text style={styles.toggleSubtitle}>Certified renewable source</Text>
                  </View>
                </View>
                <Switch
                  value={greenEnergy}
                  onValueChange={setGreenEnergy}
                  trackColor={{ false: '#e5e7eb', true: '#7dd3fc' }}
                  thumbColor={greenEnergy ? '#0ea5e9' : '#9ca3af'}
                />
              </View>

              {/* Energy Amount Input */}
              <View style={styles.inputCard}>
                <View style={styles.inputLabelRow}>
                  <MaterialCommunityIcons name="lightning-bolt" size={18} color="#0ea5e9" />
                  <Text style={styles.inputLabel}>Energy Amount *</Text>
                </View>
                <View style={styles.inputWithUnit}>
                  <TextInput
                    style={[styles.input, styles.inputFlex]}
                    placeholder="Enter energy amount"
                    placeholderTextColor="#94a3b8"
                    value={energyAmount}
                    onChangeText={setEnergyAmount}
                    keyboardType="decimal-pad"
                    editable={!buyerId || !energyNeeded}
                  />
                  <View style={styles.unitBadge}>
                    <Text style={styles.unitText}>kWh</Text>
                  </View>
                </View>
                {buyerId && energyNeeded && (
                  <Text style={styles.inputHint}>
                    Buyer needs {formatEnergy(energyNeeded)}
                  </Text>
                )}
              </View>

              {/* Price Per Unit Input */}
              <View style={styles.inputCard}>
                <View style={styles.inputLabelRow}>
                  <MaterialCommunityIcons name="currency-inr" size={18} color="#0ea5e9" />
                  <Text style={styles.inputLabel}>Price Per Unit *</Text>
                </View>
                <View style={styles.inputWithUnit}>
                  <TextInput
                    style={[styles.input, styles.inputFlex]}
                    placeholder="Enter price per kWh"
                    placeholderTextColor="#94a3b8"
                    value={pricePerUnit}
                    onChangeText={setPricePerUnit}
                    keyboardType="decimal-pad"
                  />
                  <View style={styles.unitBadge}>
                    <Text style={styles.unitText}>₹/kWh</Text>
                  </View>
                </View>
                {buyerId && maxPricePerUnit && (
                  <Text style={styles.inputHint}>
                    Buyer's max: {formatCurrency(maxPricePerUnit)}/kWh
                  </Text>
                )}
              </View>

              {/* Delivery Window Input */}
              <View style={styles.inputCard}>
                <View style={styles.inputLabelRow}>
                  <MaterialCommunityIcons name="clock-outline" size={18} color="#0ea5e9" />
                  <Text style={styles.inputLabel}>Delivery Window (Optional)</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 6:00 AM - 8:00 PM"
                  placeholderTextColor="#94a3b8"
                  value={deliveryWindow}
                  onChangeText={setDeliveryWindow}
                />
              </View>
            </View>

            {/* Meter Selection Card */}
            <View style={styles.meterCard}>
              <View style={styles.formHeaderRow}>
                <View style={styles.formIconContainer}>
                  <View style={styles.meterIconBg}>
                    <MaterialCommunityIcons name="home-city" size={22} color="#0ea5e9" />
                  </View>
                </View>
                <View style={styles.formHeaderText}>
                  <Text style={styles.formSectionTitle}>Select Site/Meter</Text>
                  <Text style={styles.formHelperText}>Choose registered meter</Text>
                </View>
              </View>

              {meters.length === 0 ? (
                <View style={styles.emptyMetersContainer}>
                  <MaterialCommunityIcons name="home-off" size={48} color="#cbd5e1" />
                  <Text style={styles.emptyMetersText}>No meters registered</Text>
                  <Text style={styles.emptyMetersSubtext}>
                    Register a meter first to sell energy
                  </Text>
                  <TouchableOpacity
                    style={styles.registerMeterButton}
                    onPress={() => navigation.navigate('MeterRegistration')}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#0ea5e9', '#0284c7']}
                      style={styles.registerMeterButtonGradient}
                    >
                      <Ionicons name="add-circle" size={20} color="#ffffff" />
                      <Text style={styles.registerMeterButtonText}>Register Meter</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.meterScroll}>
                  {meters.map((meter) => (
                    <TouchableOpacity
                      key={meter.id}
                      style={[
                        styles.meterItem,
                        selectedMeterId === meter.id && styles.meterItemSelected,
                      ]}
                      onPress={() => setSelectedMeterId(meter.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.meterItemIcon,
                        selectedMeterId === meter.id && styles.meterItemIconSelected,
                      ]}>
                        <MaterialCommunityIcons
                          name="home-city"
                          size={24}
                          color={selectedMeterId === meter.id ? '#ffffff' : '#0ea5e9'}
                        />
                      </View>
                      <Text
                        style={[
                          styles.meterName,
                          selectedMeterId === meter.id && styles.meterNameSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {meter.discomName}
                      </Text>
                      <Text style={styles.meterNumber}>{meter.consumerNumber}</Text>
                      {selectedMeterId === meter.id && (
                        <View style={styles.selectedBadge}>
                          <Ionicons name="checkmark-circle" size={20} color="#0ea5e9" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Summary Card */}
            {energyAmount && pricePerUnit && (
              <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <View style={styles.summaryIconContainer}>
                    <MaterialCommunityIcons name="clipboard-check" size={22} color="#0ea5e9" />
                  </View>
                  <Text style={styles.summaryTitle}>Order Summary</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Energy Amount</Text>
                  <Text style={styles.summaryValue}>{formatEnergy(parseFloat(energyAmount) || 0)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Price per Unit</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(parseFloat(pricePerUnit) || 0)}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryTotalLabel}>Total Amount</Text>
                  <Text style={styles.summaryTotalValue}>{formatCurrency(totalAmount)}</Text>
                </View>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSellEnergy}
              disabled={loading || !selectedMeterId || !energyAmount || !pricePerUnit}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#0ea5e9', '#0284c7']}
                style={styles.submitButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="cash-check" size={24} color="#ffffff" />
                    <Text style={styles.submitButtonText}>
                      {buyerId ? 'Sell to Buyer' : 'List Energy for Sale'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={{ height: 32 }} />
          </View>
        </ScrollView>
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
  // Header
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  // Buyer Info Card
  buyerInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  buyerInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  buyerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyerInfoTextContainer: {
    flex: 1,
  },
  buyerInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  buyerInfoDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  buyerInfoText: {
    fontSize: 13,
    color: '#64748b',
  },
  // Form Card
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  formIconContainer: {
    marginRight: 14,
  },
  formIconGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  formHeaderText: {
    flex: 1,
  },
  formSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  formHelperText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  // Input Card
  inputCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1e293b',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  inputFlex: {
    flex: 1,
  },
  inputWithUnit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  unitBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  unitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0284c7',
  },
  inputHint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
    fontStyle: 'italic',
  },
  // Toggle Card
  toggleCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  toggleSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  // Meter Card
  meterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  meterIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  meterScroll: {
    marginTop: 4,
  },
  meterItem: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 16,
    marginRight: 12,
    width: 150,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  meterItemSelected: {
    borderColor: '#0ea5e9',
    backgroundColor: '#e0f2fe',
  },
  meterItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  meterItemIconSelected: {
    backgroundColor: '#0ea5e9',
  },
  meterName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 4,
  },
  meterNameSelected: {
    color: '#0284c7',
  },
  meterNumber: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  emptyMetersContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyMetersText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyMetersSubtext: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  registerMeterButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  registerMeterButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  registerMeterButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Summary Card
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0ea5e9',
  },
  // Submit Button
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonDisabled: {
    shadowOpacity: 0.1,
    elevation: 2,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
});
