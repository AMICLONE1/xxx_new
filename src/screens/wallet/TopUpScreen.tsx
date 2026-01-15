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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types';
import { formatCurrency } from '@/utils/helpers';
import { paymentService } from '@/services/payments/paymentService';
import { RazorpayCheckout } from '@/components/payments/RazorpayCheckout';
import { getErrorMessage } from '@/utils/errorUtils';
import { useTheme } from '@/contexts';
import { LinearGradient } from 'expo-linear-gradient';

type TopUpScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  navigation: TopUpScreenNavigationProp;
}

const QUICK_AMOUNTS = [100, 500, 1000, 5000];

export default function TopUpScreen({ navigation }: Props) {
  const { isDark } = useTheme();

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
        if (response.data.razorpayKeyId) {
          console.log('Opening Razorpay checkout with key:', response.data.razorpayKeyId);
          setRazorpayData({
            orderId: response.data.orderId,
            amount: topUpAmount,
            keyId: response.data.razorpayKeyId,
          });
          setShowRazorpayCheckout(true);
        } else {
          console.warn('Razorpay key not found in response. Response data:', response.data);
          Alert.alert(
            'Payment Gateway Not Configured',
            `Razorpay is not configured on the backend. Please check Railway environment variables.\n\nResponse: ${JSON.stringify(response.data)}`,
            [{ text: 'OK' }]
          );
        }
      } else {
        const errorMsg = response.error || 'Failed to initiate payment';
        console.error('Top-up failed:', errorMsg);
        Alert.alert(
          'Payment Failed',
          `${errorMsg}\n\nPlease check:\n1. Backend is running\n2. Razorpay keys are set in Railway\n3. Network connection`,
          [{ text: 'OK' }]
        );
      }
    } catch (error: unknown) {
      console.error('Top-up error:', getErrorMessage(error));
      Alert.alert(
        'Error',
        getErrorMessage(error) || 'Failed to initiate payment. Please check your network connection and backend status.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = async (paymentId: string, orderId: string, signature: string) => {
    try {
      const verifyResponse = await paymentService.verifyPayment(paymentId);

      if (verifyResponse.success) {
        setShowRazorpayCheckout(false);
        Alert.alert(
          'Payment Successful',
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
    } catch (error: unknown) {
      Alert.alert('Error', getErrorMessage(error) || 'Failed to verify payment');
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

  const parsedAmount = parseFloat(amount) || 0;
  const platformFee = parsedAmount * 0.02;
  const totalAmount = parsedAmount + platformFee;

  return (
    <>
      <LinearGradient
        colors={isDark ? ['#1e293b', '#0f172a', '#020617'] : ['#e0f2fe', '#f0f9ff', '#ffffff']}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <SafeAreaView style={styles.container} edges={['top']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={[styles.backButton, isDark && styles.backButtonDark]}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color={isDark ? '#f1f5f9' : '#1e293b'} />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={[styles.title, isDark && styles.titleDark]}>Top Up Wallet</Text>
              <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>
                Purchase credits to trade solar energy instantly
              </Text>
            </View>
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Select Amount Card */}
            <View style={[styles.card, isDark && styles.cardDark]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, isDark && styles.cardTitleDark]}>Select Amount</Text>
                <View style={[styles.creditBadge, isDark && styles.creditBadgeDark]}>
                  <Text style={[styles.creditBadgeText, isDark && styles.creditBadgeTextDark]}>
                    1 Credit = ₹1.00
                  </Text>
                </View>
              </View>

              {/* Quick Amount Grid */}
              <View style={styles.quickAmountsGrid}>
                {QUICK_AMOUNTS.map((quickAmount) => (
                  <TouchableOpacity
                    key={quickAmount}
                    style={[
                      styles.quickAmountButton,
                      isDark && styles.quickAmountButtonDark,
                      selectedAmount === quickAmount && styles.quickAmountButtonActive,
                    ]}
                    onPress={() => handleQuickAmount(quickAmount)}
                  >
                    <Text
                      style={[
                        styles.quickAmountText,
                        isDark && styles.quickAmountTextDark,
                        selectedAmount === quickAmount && styles.quickAmountTextActive,
                      ]}
                    >
                      {formatCurrency(quickAmount)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={[styles.dividerLine, isDark && styles.dividerLineDark]} />
                <Text style={[styles.dividerText, isDark && styles.dividerTextDark]}>
                  OR ENTER CUSTOM AMOUNT
                </Text>
                <View style={[styles.dividerLine, isDark && styles.dividerLineDark]} />
              </View>

              {/* Custom Amount Input */}
              <View style={[styles.amountInputContainer, isDark && styles.amountInputContainerDark]}>
                <Text style={[styles.currencySymbol, isDark && styles.currencySymbolDark]}>₹</Text>
                <TextInput
                  style={[styles.amountInput, isDark && styles.amountInputDark]}
                  placeholder="0"
                  placeholderTextColor={isDark ? '#64748b' : '#9ca3af'}
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={(text) => {
                    setAmount(text);
                    setSelectedAmount(null);
                  }}
                />
              </View>
            </View>

            {/* Transaction Summary Card */}
            <View style={[styles.card, isDark && styles.cardDark]}>
              <View style={styles.summaryHeader}>
                <View style={[styles.summaryIconContainer, isDark && styles.summaryIconContainerDark]}>
                  <Ionicons name="receipt-outline" size={20} color="#3b82f6" />
                </View>
                <Text style={[styles.cardTitle, isDark && styles.cardTitleDark]}>Transaction Summary</Text>
              </View>

              <View style={styles.summaryContent}>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, isDark && styles.summaryLabelDark]}>Top-up Amount</Text>
                  <Text style={[styles.summaryValue, isDark && styles.summaryValueDark]}>
                    {formatCurrency(parsedAmount)}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, isDark && styles.summaryLabelDark]}>Platform Fee (2%)</Text>
                  <Text style={[styles.summaryValue, isDark && styles.summaryValueDark]}>
                    {formatCurrency(platformFee)}
                  </Text>
                </View>

                <View style={[styles.summaryDivider, isDark && styles.summaryDividerDark]} />

                <View style={styles.summaryTotalRow}>
                  <Text style={[styles.summaryTotalLabel, isDark && styles.summaryTotalLabelDark]}>Total to Pay</Text>
                  <Text style={styles.summaryTotalValue}>
                    {formatCurrency(totalAmount)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Payment Method Card */}
            <View style={[styles.card, isDark && styles.cardDark]}>
              <TouchableOpacity style={styles.paymentMethodRow}>
                <View style={[styles.paymentMethodIcon, isDark && styles.paymentMethodIconDark]}>
                  <MaterialCommunityIcons name="credit-card" size={24} color="#3b82f6" />
                </View>
                <View style={styles.paymentMethodInfo}>
                  <Text style={[styles.paymentMethodTitle, isDark && styles.paymentMethodTitleDark]}>
                    Visa •••• 4242
                  </Text>
                  <Text style={[styles.paymentMethodSubtitle, isDark && styles.paymentMethodSubtitleDark]}>
                    Primary Method
                  </Text>
                </View>
                <Text style={styles.changeText}>Change</Text>
              </TouchableOpacity>
            </View>

            {/* Pay Button */}
            <TouchableOpacity
              style={[
                styles.payButton,
                (isProcessing || !amount || parseFloat(amount) <= 0) && styles.payButtonDisabled,
              ]}
              onPress={handleTopUp}
              disabled={isProcessing || !amount || parseFloat(amount) <= 0}
            >
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                style={styles.payButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="wallet-plus" size={22} color="#ffffff" />
                    <Text style={styles.payButtonText}>
                      Pay {formatCurrency(totalAmount)}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Security Note */}
            <View style={styles.securityNote}>
              <Ionicons name="shield-checkmark" size={16} color="#3b82f6" />
              <Text style={[styles.securityText, isDark && styles.securityTextDark]}>
                Secured by Razorpay. Your payment information is encrypted.
              </Text>
            </View>

            {/* Bottom Spacing */}
            <View style={{ height: 32 }} />
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

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
  gradientBackground: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  backButtonDark: {
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
  },
  headerTextContainer: {
    marginLeft: 14,
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  titleDark: {
    color: '#f1f5f9',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  subtitleDark: {
    color: '#94a3b8',
  },
  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  // Card Styles
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardDark: {
    backgroundColor: '#1e293b',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  cardTitleDark: {
    color: '#f1f5f9',
  },
  creditBadge: {
    backgroundColor: '#eff6ff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  creditBadgeDark: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  creditBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  creditBadgeTextDark: {
    color: '#60a5fa',
  },
  // Quick Amount Grid
  quickAmountsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  quickAmountButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAmountButtonDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  quickAmountButtonActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  quickAmountText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  quickAmountTextDark: {
    color: '#e2e8f0',
  },
  quickAmountTextActive: {
    color: '#3b82f6',
  },
  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerLineDark: {
    backgroundColor: '#334155',
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginHorizontal: 12,
  },
  dividerTextDark: {
    color: '#64748b',
  },
  // Amount Input
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  amountInputContainerDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: '#64748b',
    marginRight: 8,
  },
  currencySymbolDark: {
    color: '#94a3b8',
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    paddingVertical: 12,
  },
  amountInputDark: {
    color: '#f1f5f9',
  },
  // Summary Styles
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  summaryIconContainerDark: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  summaryContent: {
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 15,
    color: '#64748b',
  },
  summaryLabelDark: {
    color: '#94a3b8',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
  },
  summaryValueDark: {
    color: '#e2e8f0',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 8,
  },
  summaryDividerDark: {
    backgroundColor: '#334155',
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  summaryTotalLabelDark: {
    color: '#f1f5f9',
  },
  summaryTotalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3b82f6',
  },
  // Payment Method
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  paymentMethodIconDark: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  paymentMethodTitleDark: {
    color: '#f1f5f9',
  },
  paymentMethodSubtitle: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '500',
  },
  paymentMethodSubtitleDark: {
    color: '#60a5fa',
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  // Pay Button
  payButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  payButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0.1,
  },
  payButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  // Security Note
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  securityText: {
    fontSize: 13,
    color: '#64748b',
  },
  securityTextDark: {
    color: '#94a3b8',
  },
});
