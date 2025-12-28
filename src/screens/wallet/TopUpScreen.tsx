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
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types';
import { formatCurrency } from '@/utils/helpers';
import { paymentService } from '@/services/payments/paymentService';
import { RazorpayCheckout } from '@/components/payments/RazorpayCheckout';

type TopUpScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  navigation: TopUpScreenNavigationProp;
}

const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000];

export default function TopUpScreen({ navigation }: Props) {
  const [amount, setAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRazorpayCheckout, setShowRazorpayCheckout] = useState(false);
  const [razorpayData, setRazorpayData] = useState<{
    orderId: string;
    amount: number;
    keyId: string;
  } | null>(null);

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
      const response = await paymentService.initiateTopUp({
        amount: topUpAmount,
        paymentMethod: 'upi',
      });
      
      console.log('Top-up response:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data) {
        // Check if Razorpay is configured
        if (response.data.razorpayKeyId) {
          console.log('Opening Razorpay checkout with key:', response.data.razorpayKeyId);
          // Open Razorpay checkout
          setRazorpayData({
            orderId: response.data.orderId,
            amount: topUpAmount,
            keyId: response.data.razorpayKeyId,
          });
          setShowRazorpayCheckout(true);
        } else {
          // No Razorpay key - backend might not have keys configured
          console.warn('Razorpay key not found in response. Response data:', response.data);
          Alert.alert(
            'Payment Gateway Not Configured',
            `Razorpay is not configured on the backend. Please check Railway environment variables.\n\nResponse: ${JSON.stringify(response.data)}`,
            [{ text: 'OK' }]
          );
        }
      } else {
        // API call failed or returned error
        const errorMsg = response.error || 'Failed to initiate payment';
        console.error('Top-up failed:', errorMsg);
        Alert.alert(
          'Payment Failed',
          `${errorMsg}\n\nPlease check:\n1. Backend is running\n2. Razorpay keys are set in Railway\n3. Network connection`,
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Top-up error:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to initiate payment. Please check your network connection and backend status.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = async (paymentId: string, orderId: string, signature: string) => {
    try {
      // Verify payment with backend
      const verifyResponse = await paymentService.verifyPayment(paymentId);
      
      if (verifyResponse.success) {
        setShowRazorpayCheckout(false);
        Alert.alert(
          'Payment Successful ✅',
          `Your wallet has been topped up successfully!\n\nAmount: ${formatCurrency(razorpayData?.amount || 0)}\nPayment ID: ${paymentId}`,
          [
            {
              text: 'OK',
              onPress: () => {
                setRazorpayData(null);
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        throw new Error(verifyResponse.error || 'Payment verification failed');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to verify payment');
    }
  };

  const handlePaymentError = (error: string) => {
    setShowRazorpayCheckout(false);
    Alert.alert('Payment Failed', error || 'Payment could not be completed. Please try again.');
    setRazorpayData(null);
  };

  const handlePaymentClose = () => {
    setShowRazorpayCheckout(false);
    setRazorpayData(null);
  };

  return (
    <>
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={24} color="#374151" />
      </TouchableOpacity>

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

    {/* Razorpay Checkout Modal */}
    <Modal
      visible={showRazorpayCheckout}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handlePaymentClose}
    >
      {razorpayData && (
        <RazorpayCheckout
          orderId={razorpayData.orderId}
          amount={razorpayData.amount}
          keyId={razorpayData.keyId}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
          onClose={handlePaymentClose}
        />
      )}
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 16,
    left: 16,
    zIndex: 10,
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  scrollView: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 50 : 60,
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

