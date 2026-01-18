import React, { useState, useMemo } from 'react';
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
import { supabaseDatabaseService } from '@/services/supabase/databaseService';
import { RazorpayCheckout } from '@/components/payments/RazorpayCheckout';
import { getErrorMessage } from '@/utils/errorUtils';
import { useTheme } from '@/contexts';
import { getThemedColors, ThemedColors } from '@/utils/themedStyles';
import { useAuthStore, useWalletStore } from '@/store';
import { LinearGradient } from 'expo-linear-gradient';

type TopUpScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  navigation: TopUpScreenNavigationProp;
}

const QUICK_AMOUNTS = [100, 500, 1000, 5000];

export default function TopUpScreen({ navigation }: Props) {
  const { isDark } = useTheme();
  const colors = getThemedColors(isDark);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { user } = useAuthStore();
  const { updateBalance } = useWalletStore();

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

    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated. Please login again.');
      return;
    }

    setIsProcessing(true);
    try {
      // FAKE TRANSACTION: Simulate payment processing
      console.log('[TopUp] Processing fake top-up for user:', user.id, 'Amount:', topUpAmount);

      // 1. Get current wallet (or create if doesn't exist)
      let currentWallet = await supabaseDatabaseService.getWallet(user.id);
      if (!currentWallet) {
        console.log('[TopUp] Creating wallet for user:', user.id);
        currentWallet = await supabaseDatabaseService.createWallet(user.id);
      }

      // 2. Update wallet balance with top-up amount
      const newBalance = currentWallet.cashBalance + topUpAmount;
      await supabaseDatabaseService.updateWallet(user.id, {
        cashBalance: newBalance,
      });
      console.log('[TopUp] Wallet updated. New balance:', newBalance);

      // 3. Create transaction record
      await supabaseDatabaseService.createTransaction({
        userId: user.id,
        type: 'topup',
        amount: topUpAmount,
        currency: 'INR',
        status: 'completed',
        description: `Wallet top-up of ${formatCurrency(topUpAmount)}`,
      });
      console.log('[TopUp] Transaction record created');

      // 4. Update local wallet state
      updateBalance(0, topUpAmount);

      // 5. Show success and navigate back
      Alert.alert(
        'Top-Up Successful! ✅',
        `Your wallet has been credited with ${formatCurrency(topUpAmount)}\n\nNew Balance: ${formatCurrency(newBalance)}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: unknown) {
      console.error('[TopUp] Error:', getErrorMessage(error));
      Alert.alert(
        'Top-Up Failed',
        getErrorMessage(error) || 'Failed to process top-up. Please try again.'
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
        colors={colors.backgroundGradient as [string, string, ...string[]]}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <SafeAreaView style={styles.container} edges={['top']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Top Up Wallet</Text>
              <Text style={styles.subtitle}>
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
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Select Amount</Text>
                <View style={styles.creditBadge}>
                  <Text style={styles.creditBadgeText}>
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

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>
                  OR ENTER CUSTOM AMOUNT
                </Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Custom Amount Input */}
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
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
            <View style={styles.card}>
              <View style={styles.summaryHeader}>
                <View style={styles.summaryIconContainer}>
                  <Ionicons name="receipt-outline" size={20} color={colors.primary} />
                </View>
                <Text style={styles.cardTitle}>Transaction Summary</Text>
              </View>

              <View style={styles.summaryContent}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Top-up Amount</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(parsedAmount)}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Platform Fee (2%)</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(platformFee)}
                  </Text>
                </View>

                <View style={styles.summaryDivider} />

                <View style={styles.summaryTotalRow}>
                  <Text style={styles.summaryTotalLabel}>Total to Pay</Text>
                  <Text style={styles.summaryTotalValue}>
                    {formatCurrency(totalAmount)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Payment Method Card */}
            <View style={styles.card}>
              <TouchableOpacity style={styles.paymentMethodRow}>
                <View style={styles.paymentMethodIcon}>
                  <MaterialCommunityIcons name="credit-card" size={24} color={colors.primary} />
                </View>
                <View style={styles.paymentMethodInfo}>
                  <Text style={styles.paymentMethodTitle}>
                    Visa •••• 4242
                  </Text>
                  <Text style={styles.paymentMethodSubtitle}>
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
                colors={[colors.primary, colors.primaryDark]}
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
              <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
              <Text style={styles.securityText}>
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

const createStyles = (colors: ThemedColors) => StyleSheet.create({
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
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTextContainer: {
    marginLeft: 14,
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
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
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
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
    color: colors.text,
  },
  creditBadge: {
    backgroundColor: colors.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  creditBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
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
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAmountButtonActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  quickAmountText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  quickAmountTextActive: {
    color: colors.primary,
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
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginHorizontal: 12,
  },
  // Amount Input
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textSecondary,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    paddingVertical: 12,
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
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  summaryTotalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
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
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  paymentMethodSubtitle: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  // Pay Button
  payButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: colors.primary,
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
    color: colors.textSecondary,
  },
});
