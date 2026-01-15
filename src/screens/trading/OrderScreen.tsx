import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types';
import { useTradingStore, useWalletStore } from '@/store';
import { tradingService } from '@/services/api/tradingService';
import { formatEnergy, formatCurrency } from '@/utils/helpers';
import { getErrorMessage } from '@/utils/errorUtils';
import { LinearGradient } from 'expo-linear-gradient';

type OrderScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  navigation: OrderScreenNavigationProp;
  route: {
    params: {
      sellerId: string;
      sellerName: string;
      pricePerUnit: number;
      availableEnergy: number;
    };
  };
}

export default function OrderScreen({ navigation, route }: Props) {
  if (!route.params) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.content}>
          <Text style={styles.title}>Error</Text>
          <Text>Missing order parameters</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { sellerId, sellerName, pricePerUnit, availableEnergy } = route.params;
  const { addOrder } = useTradingStore();
  const { wallet } = useWalletStore();
  const [energyAmount, setEnergyAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const energyValue = parseFloat(energyAmount) || 0;
  const totalPrice = energyValue * pricePerUnit;
  const canAfford = wallet ? wallet.cashBalance >= totalPrice : false;

  const handlePlaceOrder = async () => {
    if (!energyAmount || energyValue <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid energy amount');
      return;
    }

    if (energyValue > availableEnergy) {
      Alert.alert(
        'Insufficient Energy',
        `Only ${formatEnergy(availableEnergy, 'kWh')} available`
      );
      return;
    }

    if (!canAfford) {
      Alert.alert('Insufficient Balance', 'Please top up your wallet');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await tradingService.createOrder({
        sellerId,
        energyAmount: energyValue,
        pricePerUnit,
      });
      
      if (response.success && response.data) {
        addOrder(response.data);
        navigation.goBack();
        Alert.alert('Success ✅', 'Order placed successfully!');
      } else {
        // Fallback to mock if API fails (for development)
        if (__DEV__) {
          const mockOrder = {
            id: `order_${Date.now()}`,
            buyerId: 'current_user_id',
            sellerId,
            energyAmount: energyValue,
            pricePerUnit,
            totalPrice,
            status: 'pending' as const,
            createdAt: new Date(),
          };
          addOrder(mockOrder);
          navigation.goBack();
          Alert.alert('Success (Mock)', 'Order placed successfully (using mock data)');
        } else {
          throw new Error(response.error || 'Failed to place order');
        }
      }
    } catch (error: unknown) {
      Alert.alert('Error', getErrorMessage(error) || 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LinearGradient 
      colors={['#e0f2fe', '#f0f9ff', '#ffffff']}
      style={styles.gradientBackground}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      >

      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.content}>
            {/* Header with Back Button */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="arrow-back" size={24} color="#374151" />
              </TouchableOpacity>
              <Text style={styles.title}>Place Order</Text>
            </View>

            <View style={styles.sellerInfo}>
              <Text style={styles.sellerLabel}>Seller</Text>
              <Text style={styles.sellerName}>{sellerName}</Text>
            </View>

            <View style={styles.priceInfo}>
              <Text style={styles.priceLabel}>Price per unit</Text>
              <Text style={styles.priceValue}>{formatCurrency(pricePerUnit)}</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Energy Amount (kWh)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                keyboardType="decimal-pad"
                value={energyAmount}
                onChangeText={setEnergyAmount}
              />
              <Text style={styles.hint}>
                Available: {formatEnergy(availableEnergy, 'kWh')}
              </Text>
            </View>

            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Energy</Text>
                <Text style={styles.summaryValue}>
                  {formatEnergy(energyValue, 'kWh')}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Price per unit</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(pricePerUnit)}
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryTotal]}>
                <Text style={styles.summaryTotalLabel}>Total</Text>
                <Text style={styles.summaryTotalValue}>
                  {formatCurrency(totalPrice)}
                </Text>
              </View>
            </View>

            {wallet && (
              <View style={styles.balanceInfo}>
                <Text style={styles.balanceLabel}>Wallet Balance</Text>
                <Text style={styles.balanceValue}>
                  {formatCurrency(wallet.cashBalance)}
                </Text>
                {!canAfford && (
                  <Text style={styles.balanceWarning}>
                    Insufficient balance. Top up required.
                  </Text>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.submitButton,
                (!canAfford || isSubmitting) && styles.submitButtonDisabled,
              ]}
              onPress={handlePlaceOrder}
              disabled={!canAfford || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>Place Order</Text>
              )}
            </TouchableOpacity>
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
    // backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  sellerInfo: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation : 3
  },
  sellerLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  sellerName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  priceInfo: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    elevation : 3
  },
  priceLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  hint: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 7,
  },
  summary: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    elevation : 3
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 8,
    paddingTop: 16,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  summaryTotalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  balanceInfo: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  balanceWarning: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

