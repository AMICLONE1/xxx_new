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

type WithdrawScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  navigation: WithdrawScreenNavigationProp;
}

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

export default function WithdrawScreen({ navigation }: Props) {
  const { isDark } = useTheme();

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
      colors={isDark ? ['#1e293b', '#0f172a', '#0f172a'] : ['#e0f2fe', '#f0f9ff', '#ffffff']}
      style={styles.gradientBackground}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)' }]}
          >
            <Ionicons name="arrow-back" size={22} color={isDark ? '#ffffff' : '#1e293b'} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: isDark ? '#ffffff' : '#1e293b' }]}>Withdraw Cash</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Balance Card */}
          <View style={[styles.balanceCard, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}>
            <LinearGradient
              colors={['#dbeafe', '#bfdbfe']}
              style={styles.balanceGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.balanceIconContainer}>
                <Ionicons name="wallet" size={20} color="#0ea5e9" />
              </View>
              <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
              <Text style={styles.balanceValue}>{formatCurrency(availableBalance)}</Text>
            </LinearGradient>
          </View>

          {/* Amount Input Card */}
          <View style={[styles.card, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}>
            <Text style={[styles.cardTitle, { color: isDark ? '#ffffff' : '#1e293b' }]}>Withdrawal Amount</Text>

            <View style={[styles.amountInputContainer, {
              backgroundColor: isDark ? '#0f172a' : '#f8fafc',
              borderColor: isDark ? '#334155' : '#e2e8f0'
            }]}>
              <Text style={[styles.currencySymbol, { color: isDark ? '#94a3b8' : '#64748b' }]}>₹</Text>
              <TextInput
                style={[styles.amountInput, { color: isDark ? '#ffffff' : '#1e293b' }]}
                placeholder="0.00"
                placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={(text) => {
                  setAmount(text);
                  setSelectedAmount(null);
                }}
              />
              <View style={styles.amountActions}>
                <Ionicons name="chevron-up" size={14} color={isDark ? '#64748b' : '#94a3b8'} />
                <Ionicons name="chevron-down" size={14} color={isDark ? '#64748b' : '#94a3b8'} />
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
                      {
                        backgroundColor: isDark ? '#0f172a' : '#f0f9ff',
                        borderColor: isSelected ? '#0ea5e9' : (isDark ? '#334155' : '#e0f2fe'),
                      },
                      isSelected && styles.quickAmountButtonSelected,
                      isDisabled && styles.quickAmountButtonDisabled,
                    ]}
                    onPress={() => !isDisabled && handleQuickAmount(quickAmount)}
                    disabled={isDisabled}
                  >
                    <Text
                      style={[
                        styles.quickAmountText,
                        { color: isDark ? '#e2e8f0' : '#475569' },
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
          <View style={[styles.card, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconContainer, { backgroundColor: isDark ? '#0f172a' : '#e0f2fe' }]}>
                <MaterialCommunityIcons name="bank" size={20} color="#0ea5e9" />
              </View>
              <Text style={[styles.cardTitle, { color: isDark ? '#ffffff' : '#1e293b', marginBottom: 0 }]}>Bank Details</Text>
            </View>

            {/* Account Number */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>ACCOUNT NUMBER</Text>
              <TextInput
                style={[styles.textInput, {
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                  color: isDark ? '#ffffff' : '#1e293b'
                }]}
                placeholder="Enter account number"
                placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                keyboardType="numeric"
                value={accountNumber}
                onChangeText={setAccountNumber}
                maxLength={18}
              />
            </View>

            {/* IFSC Code */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>IFSC CODE</Text>
              <TextInput
                style={[styles.textInput, {
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                  color: isDark ? '#ffffff' : '#1e293b'
                }]}
                placeholder="E.G. HDFC0001234"
                placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                value={ifscCode}
                onChangeText={(text) => setIfscCode(text.toUpperCase())}
                autoCapitalize="characters"
                maxLength={11}
              />
            </View>

            {/* Account Holder Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>ACCOUNT HOLDER NAME</Text>
              <TextInput
                style={[styles.textInput, {
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                  color: isDark ? '#ffffff' : '#1e293b'
                }]}
                placeholder="As per bank records"
                placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                value={accountHolderName}
                onChangeText={setAccountHolderName}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Summary Card */}
          <View style={[styles.card, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>Withdrawal Amount</Text>
              <Text style={[styles.summaryValue, { color: isDark ? '#ffffff' : '#1e293b' }]}>
                {amount ? formatCurrency(parseFloat(amount) || 0) : formatCurrency(0)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>Processing Fee</Text>
              <Text style={[styles.summaryValueFree, { color: '#10b981' }]}>Free</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]} />
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryTotalLabel, { color: isDark ? '#ffffff' : '#1e293b' }]}>You will receive</Text>
              <Text style={styles.summaryTotalValue}>
                {amount ? formatCurrency(parseFloat(amount) || 0) : formatCurrency(0)}
              </Text>
            </View>
          </View>

          {/* Info Note */}
          <View style={[styles.infoNote, { backgroundColor: isDark ? '#1e3a5f' : '#eff6ff' }]}>
            <Ionicons name="information-circle" size={18} color="#3b82f6" />
            <Text style={[styles.infoText, { color: isDark ? '#93c5fd' : '#1e40af' }]}>
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
              colors={['#0ea5e9', '#0284c7']}
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

const styles = StyleSheet.create({
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
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
  },
  balanceGradient: {
    padding: 24,
    alignItems: 'center',
  },
  balanceIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(14, 165, 233, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0369a1',
    letterSpacing: 1,
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#0c4a6e',
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
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
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
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: '600',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '600',
    paddingVertical: 12,
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
  },
  quickAmountButtonSelected: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0ea5e9',
  },
  quickAmountButtonDisabled: {
    opacity: 0.4,
  },
  quickAmountText: {
    fontSize: 13,
    fontWeight: '600',
  },
  quickAmountTextSelected: {
    color: '#0369a1',
  },
  quickAmountTextDisabled: {
    color: '#9ca3af',
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
  },
  textInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '500',
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
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryValueFree: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    marginVertical: 8,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0ea5e9',
  },
  // Info Note
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 14,
    marginBottom: 20,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  // Submit Button
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0ea5e9',
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
