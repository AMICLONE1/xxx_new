import React, { useState } from 'react';
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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types';
import { formatCurrency } from '@/utils/helpers';
import { paymentService } from '@/services/payments/paymentService';

type TopUpScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  navigation: TopUpScreenNavigationProp;
}

const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000];

export default function TopUpScreen({ navigation }: Props) {
  const [amount, setAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleQuickAmount = (quickAmount: number) => {
    setSelectedAmount(quickAmount);
    setAmount(quickAmount.toString());
  };

  const handleTopUp = async () => {
    const topUpAmount = parseFloat(amount);
    if (!amount || isNaN(topUpAmount) || topUpAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    if (topUpAmount < 10) {
      Alert.alert('Minimum Amount', 'Minimum top-up amount is ₹10');
      return;
    }

    setIsProcessing(true);
    try {
      // Note: Payment SDK (Razorpay/PhonePe) integration pending
      // For now, this will call the API which will return payment details
      // When SDK is integrated, uncomment the UPI app opening logic
      const response = await paymentService.initiateTopUp({
        amount: topUpAmount,
        paymentMethod: 'upi',
      });
      
      if (response.success && response.data) {
        // TODO: When Razorpay/PhonePe SDK is integrated:
        // if (response.data.upiIntent) {
        //   const opened = await paymentService.openUPIApp(response.data.upiIntent);
        //   if (opened) {
        //     // Monitor payment status
        //     navigation.goBack();
        //   }
        // }
        
        // For now, show success message
        Alert.alert(
          'Payment Initiated ✅',
          `Payment of ${formatCurrency(topUpAmount)} has been initiated.\n\nPayment ID: ${response.data.paymentId}\n\nPlease complete the payment in your UPI app.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        // Fallback to mock in development
        if (__DEV__) {
          Alert.alert(
            'Payment Initiated (Mock)',
            `Top-up of ${formatCurrency(topUpAmount)} has been initiated. Please complete the payment in the UPI app.`,
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        } else {
          throw new Error(response.error || 'Failed to initiate payment');
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to initiate payment');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>Top Up Wallet</Text>
          <Text style={styles.subtitle}>
            Add money to your wallet to buy energy
          </Text>

          <View style={styles.quickAmounts}>
            <Text style={styles.quickAmountsLabel}>Quick Amounts</Text>
            <View style={styles.quickAmountsGrid}>
              {QUICK_AMOUNTS.map((quickAmount) => (
                <TouchableOpacity
                  key={quickAmount}
                  style={[
                    styles.quickAmountButton,
                    selectedAmount === quickAmount && styles.quickAmountButtonActive,
                  ]}
                  onPress={() => handleQuickAmount(quickAmount)}
                >
                  <Text
                    style={[
                      styles.quickAmountText,
                      selectedAmount === quickAmount && styles.quickAmountTextActive,
                    ]}
                  >
                    {formatCurrency(quickAmount)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Enter Amount</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={(text) => {
                  setAmount(text);
                  setSelectedAmount(null);
                }}
              />
            </View>
            <Text style={styles.hint}>Minimum amount: ₹10</Text>
          </View>

          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Amount</Text>
              <Text style={styles.summaryValue}>
                {amount ? formatCurrency(parseFloat(amount) || 0) : formatCurrency(0)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Processing Fee</Text>
              <Text style={styles.summaryValue}>Free</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <Text style={styles.summaryTotalValue}>
                {amount ? formatCurrency(parseFloat(amount) || 0) : formatCurrency(0)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isProcessing && styles.submitButtonDisabled]}
            onPress={handleTopUp}
            disabled={isProcessing || !amount || parseFloat(amount) <= 0}
          >
            {isProcessing ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>Continue to Payment</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  quickAmounts: {
    marginBottom: 24,
  },
  quickAmountsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  quickAmountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAmountButton: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  quickAmountButtonActive: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  quickAmountTextActive: {
    color: '#10b981',
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6b7280',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    paddingVertical: 12,
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  summary: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
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
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
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
    color: '#10b981',
  },
  submitButton: {
    backgroundColor: '#10b981',
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

