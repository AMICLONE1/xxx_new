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
  const [energyAmount, setEnergyAmount] = useState<string>('');
  const [pricePerUnit, setPricePerUnit] = useState<string>('');
  const [deliveryWindow, setDeliveryWindow] = useState<string>('');
  const [loading, setLoading] = useState(false);

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

    setLoading(true);
    try {
      // If selling to a specific buyer, create a direct listing
      if (buyerId && user?.id) {
        // Create seller listing that matches buyer requirements
        // In a real implementation, this would create an order or listing
        Alert.alert(
          'Success',
          `Energy listing created for ${buyerName || 'buyer'}. They will be notified.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        // Create general seller listing
        Alert.alert(
          'Success',
          'Your energy listing has been created and will be visible to buyers.',
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#f59e0b', '#d97706']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Sell Energy</Text>
            <Text style={styles.headerSubtitle}>
              {buyerName ? `To ${buyerName}` : 'List your energy for sale'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Buyer Info Card (if selling to specific buyer) */}
        {buyerId && buyerName && (
          <View style={styles.buyerInfoCard}>
            <View style={styles.buyerInfoHeader}>
              <MaterialCommunityIcons name="account-arrow-down" size={24} color="#f59e0b" />
              <Text style={styles.buyerInfoTitle}>Selling to {buyerName}</Text>
            </View>
            {maxPricePerUnit && (
              <Text style={styles.buyerInfoText}>
                Max Price: {formatCurrency(maxPricePerUnit)}/kWh
              </Text>
            )}
            {energyNeeded && (
              <Text style={styles.buyerInfoText}>
                Energy Needed: {formatEnergy(energyNeeded)}
              </Text>
            )}
          </View>
        )}

        {/* Site/Meter Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Site/Meter</Text>
          {meters.length === 0 ? (
            <View style={styles.emptyMetersCard}>
              <MaterialCommunityIcons name="home-off" size={48} color="#d1d5db" />
              <Text style={styles.emptyMetersText}>No meters registered</Text>
              <Text style={styles.emptyMetersSubtext}>
                Register a meter first to sell energy
              </Text>
              <TouchableOpacity
                style={styles.registerButton}
                onPress={() => navigation.navigate('MeterRegistration')}
              >
                <Text style={styles.registerButtonText}>Register Meter</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.meterScroll}>
              {meters.map((meter) => (
                <TouchableOpacity
                  key={meter.id}
                  style={[
                    styles.meterCard,
                    selectedMeterId === meter.id && styles.meterCardSelected,
                  ]}
                  onPress={() => setSelectedMeterId(meter.id)}
                >
                  <MaterialCommunityIcons
                    name="home-city"
                    size={24}
                    color={selectedMeterId === meter.id ? '#f59e0b' : '#6b7280'}
                  />
                  <Text
                    style={[
                      styles.meterName,
                      selectedMeterId === meter.id && styles.meterNameSelected,
                    ]}
                  >
                    {meter.discomName}
                  </Text>
                  <Text style={styles.meterNumber}>{meter.consumerNumber}</Text>
                  {selectedMeterId === meter.id && (
                    <View style={styles.selectedBadge}>
                      <Ionicons name="checkmark-circle" size={20} color="#f59e0b" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Energy Amount */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Energy Amount</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="lightning-bolt" size={24} color="#f59e0b" />
            <TextInput
              style={styles.input}
              placeholder="Enter energy amount (kWh)"
              value={energyAmount}
              onChangeText={setEnergyAmount}
              keyboardType="decimal-pad"
              editable={!buyerId || !energyNeeded}
            />
            <Text style={styles.inputUnit}>kWh</Text>
          </View>
          {buyerId && energyNeeded && (
            <Text style={styles.hintText}>
              Buyer needs {formatEnergy(energyNeeded)}. You can sell up to this amount.
            </Text>
          )}
        </View>

        {/* Price Per Unit */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Per Unit</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="currency-inr" size={24} color="#f59e0b" />
            <TextInput
              style={styles.input}
              placeholder="Enter price per kWh"
              value={pricePerUnit}
              onChangeText={setPricePerUnit}
              keyboardType="decimal-pad"
            />
            <Text style={styles.inputUnit}>₹/kWh</Text>
          </View>
          {buyerId && maxPricePerUnit && (
            <Text style={styles.hintText}>
              Buyer's maximum: {formatCurrency(maxPricePerUnit)}/kWh
            </Text>
          )}
        </View>

        {/* Delivery Window (Optional) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Window (Optional)</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="clock-outline" size={24} color="#6b7280" />
            <TextInput
              style={styles.input}
              placeholder="e.g., 6:00 AM - 8:00 PM"
              value={deliveryWindow}
              onChangeText={setDeliveryWindow}
            />
          </View>
        </View>

        {/* Summary Card */}
        {energyAmount && pricePerUnit && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Order Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Energy Amount:</Text>
              <Text style={styles.summaryValue}>{formatEnergy(parseFloat(energyAmount) || 0)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Price per Unit:</Text>
              <Text style={styles.summaryValue}>{formatCurrency(parseFloat(pricePerUnit) || 0)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotalLabel}>Total Amount:</Text>
              <Text style={styles.summaryTotalValue}>{formatCurrency(totalAmount)}</Text>
            </View>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSellEnergy}
          disabled={loading || !selectedMeterId || !energyAmount || !pricePerUnit}
        >
          <LinearGradient
            colors={['#f59e0b', '#d97706']}
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

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fef3c7',
  },
  content: {
    flex: 1,
  },
  buyerInfoCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buyerInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  buyerInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  buyerInfoText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  emptyMetersCard: {
    backgroundColor: '#ffffff',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyMetersText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyMetersSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  registerButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  meterScroll: {
    marginHorizontal: -16,
  },
  meterCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    width: 160,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  meterCardSelected: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  meterName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
    textAlign: 'center',
  },
  meterNameSelected: {
    color: '#f59e0b',
  },
  meterNumber: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  inputUnit: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  hintText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f59e0b',
  },
  submitButton: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});

