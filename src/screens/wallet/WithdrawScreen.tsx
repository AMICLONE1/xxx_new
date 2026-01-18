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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types';
import { useWalletStore } from '@/store';
import { formatCurrency } from '@/utils/helpers';
import { paymentService } from '@/services/payments/paymentService';
import { getErrorMessage } from '@/utils/errorUtils';
import { useTheme } from '@/contexts';
import { getThemedColors, ThemedColors } from '@/utils/themedStyles';

type WithdrawScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  navigation: WithdrawScreenNavigationProp;
}

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

export default function WithdrawScreen({ navigation }: Props) {
  const { isDark } = useTheme();
  const colors = getThemedColors(isDark);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { wallet } = useWalletStore();
  const [amount, setAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const availableBalance = wallet?.cashBalance || 0;

  const handleQuickAmount = (quickAmount: number) => {
    if (quickAmount > availableBalance) {
      Alert.alert('Insufficient Balance', `Available balance: ${formatCurrency(availableBalance)}`);
      return;
    }
    setSelectedAmount(quickAmount);
    setAmount(quickAmount.toString());
  };

  const handleWithdraw = async () => {
    const withdrawAmount = parseFloat(amount);

    if (!amount || isNaN(withdrawAmount) || withdrawAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    if (withdrawAmount < 100) {
      Alert.alert('Minimum Amount', 'Minimum withdrawal amount is ₹100');
      return;
    }

    if (withdrawAmount > availableBalance) {
      Alert.alert('Insufficient Balance', `Available balance: ${formatCurrency(availableBalance)}`);
      return;
    }

    if (!accountNumber || accountNumber.length < 9) {
      Alert.alert('Invalid Account', 'Please enter a valid account number');
      return;
    }

    if (!ifscCode || ifscCode.length !== 11) {
      Alert.alert('Invalid IFSC', 'Please enter a valid IFSC code (11 characters)');
      return;
    }

    if (!accountHolderName || accountHolderName.trim().length < 3) {
      Alert.alert('Invalid Name', 'Please enter account holder name');
      return;
    }

    setIsProcessing(true);
    try {
      const bankAccountId = `${accountNumber}_${ifscCode}`;

      const response = await paymentService.requestWithdrawal({
        amount: withdrawAmount,
        bankAccountId: bankAccountId,
      });

      if (response.success && response.data) {
        Alert.alert(
          'Withdrawal Request Submitted',
          `Your withdrawal request of ${formatCurrency(withdrawAmount)} has been submitted successfully.\n\nRequest ID: ${response.data.requestId}\n\nIt will be processed within 2-3 business days.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert(
          'Withdrawal Failed',
          response.error || 'Failed to submit withdrawal request. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: unknown) {
      Alert.alert('Error', getErrorMessage(error) || 'Failed to process withdrawal request');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <LinearGradient
      colors={colors.backgroundGradient as [string, string, ...string[]]}
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
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Withdraw Cash</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Balance Card */}
          <View style={styles.balanceCard}>
            <LinearGradient
              colors={[colors.primaryLight, colors.backgroundSecondary]}
              style={styles.balanceGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.balanceIconContainer}>
                <Ionicons name="wallet" size={20} color={colors.primary} />
              </View>
              <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
              <Text style={styles.balanceValue}>{formatCurrency(availableBalance)}</Text>
            </LinearGradient>
          </View>

          {/* Amount Input Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Withdrawal Amount</Text>

            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={(text) => {
                  setAmount(text);
                  setSelectedAmount(null);
                }}
              />
              <View style={styles.amountActions}>
                <Ionicons name="chevron-up" size={14} color={colors.textMuted} />
                <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
              </View>
            </View>

            {/* Quick Amount Buttons */}
            <View style={styles.quickAmountsContainer}>
              {QUICK_AMOUNTS.map((quickAmount) => {
                const isSelected = selectedAmount === quickAmount;
                const isDisabled = quickAmount > availableBalance;
                return (
                  <TouchableOpacity
                    key={quickAmount}
                    style={[
                      styles.quickAmountButton,
                      isSelected && styles.quickAmountButtonSelected,
                      isDisabled && styles.quickAmountButtonDisabled,
                    ]}
                    onPress={() => !isDisabled && handleQuickAmount(quickAmount)}
                    disabled={isDisabled}
                  >
                    <Text
                      style={[
                        styles.quickAmountText,
                        isSelected && styles.quickAmountTextSelected,
                        isDisabled && styles.quickAmountTextDisabled,
                      ]}
                    >
                      + ₹{quickAmount}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Bank Details Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconContainer}>
                <MaterialCommunityIcons name="bank" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { marginBottom: 0 }]}>Bank Details</Text>
            </View>

            {/* Account Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ACCOUNT NUMBER</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter account number"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={accountNumber}
                onChangeText={setAccountNumber}
                maxLength={18}
              />
            </View>

            {/* IFSC Code */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>IFSC CODE</Text>
              <TextInput
                style={styles.textInput}
                placeholder="E.G. HDFC0001234"
                placeholderTextColor={colors.textMuted}
                value={ifscCode}
                onChangeText={(text) => setIfscCode(text.toUpperCase())}
                autoCapitalize="characters"
                maxLength={11}
              />
            </View>

            {/* Account Holder Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ACCOUNT HOLDER NAME</Text>
              <TextInput
                style={styles.textInput}
                placeholder="As per bank records"
                placeholderTextColor={colors.textMuted}
                value={accountHolderName}
                onChangeText={setAccountHolderName}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Summary Card */}
          <View style={styles.card}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Withdrawal Amount</Text>
              <Text style={styles.summaryValue}>
                {amount ? formatCurrency(parseFloat(amount) || 0) : formatCurrency(0)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Processing Fee</Text>
              <Text style={[styles.summaryValueFree, { color: colors.success }]}>Free</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotalLabel}>You will receive</Text>
              <Text style={styles.summaryTotalValue}>
                {amount ? formatCurrency(parseFloat(amount) || 0) : formatCurrency(0)}
              </Text>
            </View>
          </View>

          {/* Info Note */}
          <View style={styles.infoNote}>
            <Ionicons name="information-circle" size={18} color={colors.primary} />
            <Text style={styles.infoText}>
              Withdrawals are processed within 2-3 business days. Ensure your bank details are correct.
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!amount || parseFloat(amount) <= 0 || !accountNumber || !ifscCode || !accountHolderName || isProcessing) &&
              styles.submitButtonDisabled
            ]}
            onPress={handleWithdraw}
            disabled={
              isProcessing ||
              !amount ||
              parseFloat(amount) <= 0 ||
              !accountNumber ||
              !ifscCode ||
              !accountHolderName
            }
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.submitButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isProcessing ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Request Withdrawal</Text>
                  <Ionicons name="chevron-forward" size={20} color="#ffffff" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const createStyles = (colors: ThemedColors) => StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  // Balance Card
  balanceCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    backgroundColor: colors.card,
  },
  balanceGradient: {
    padding: 24,
    alignItems: 'center',
  },
  balanceIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryDark,
    letterSpacing: 1,
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.text,
  },
  // Card Styles
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    backgroundColor: colors.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    color: colors.text,
  },
  // Amount Input
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.border,
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: '600',
    marginRight: 8,
    color: colors.textSecondary,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '600',
    paddingVertical: 12,
    color: colors.text,
  },
  amountActions: {
    alignItems: 'center',
    gap: 2,
  },
  // Quick Amounts
  quickAmountsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  quickAmountButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.border,
  },
  quickAmountButtonSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  quickAmountButtonDisabled: {
    opacity: 0.4,
  },
  quickAmountText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  quickAmountTextSelected: {
    color: colors.primary,
  },
  quickAmountTextDisabled: {
    color: colors.textMuted,
  },
  // Input Groups
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
    color: colors.textSecondary,
  },
  textInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '500',
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.border,
    color: colors.text,
  },
  // Summary
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  summaryValueFree: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    marginVertical: 8,
    backgroundColor: colors.border,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  // Info Note
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 14,
    marginBottom: 20,
    gap: 10,
    backgroundColor: colors.primaryLight,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    color: colors.primaryDark,
  },
  // Submit Button
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonGradient: {
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
