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

type WithdrawScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  navigation: WithdrawScreenNavigationProp;
}

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000];

export default function WithdrawScreen({ navigation }: Props) {
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
      // Create bank account ID from account details (or use existing if saved)
      // For now, we'll send account details directly
      // In production, you'd save bank accounts and use bankAccountId
      const bankAccountId = `${accountNumber}_${ifscCode}`; // Temporary ID
      
      const response = await paymentService.requestWithdrawal({
        amount: withdrawAmount,
        bankAccountId: bankAccountId,
      });

      if (response.success && response.data) {
        Alert.alert(
          'Withdrawal Request Submitted ✅',
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
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process withdrawal request');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#10b981', '#059669']}
        style={styles.gradientHeader}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Withdraw Cash</Text>
            <Text style={styles.headerSubtitle}>Transfer to your bank account</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Available Balance */}
          <View style={styles.balanceCard}>
            <LinearGradient
              colors={['#fef3c7', '#fde68a']}
              style={styles.balanceCardGradient}
            >
              <View style={styles.balanceHeader}>
                <MaterialCommunityIcons name="wallet" size={24} color="#f59e0b" />
                <Text style={styles.balanceLabel}>Available Balance</Text>
              </View>
              <Text style={styles.balanceValue}>{formatCurrency(availableBalance)}</Text>
            </LinearGradient>
          </View>

          {/* Quick Amounts */}
          <View style={styles.quickAmounts}>
            <Text style={styles.sectionTitle}>Quick Amounts</Text>
            <View style={styles.quickAmountsGrid}>
              {QUICK_AMOUNTS.map((quickAmount) => {
                const isDisabled = quickAmount > availableBalance;
                return (
                  <TouchableOpacity
                    key={quickAmount}
                    style={[
                      styles.quickAmountButton,
                      selectedAmount === quickAmount && styles.quickAmountButtonActive,
                      isDisabled && styles.quickAmountButtonDisabled,
                    ]}
                    onPress={() => !isDisabled && handleQuickAmount(quickAmount)}
                    disabled={isDisabled}
                  >
                    <Text
                      style={[
                        styles.quickAmountText,
                        selectedAmount === quickAmount && styles.quickAmountTextActive,
                        isDisabled && styles.quickAmountTextDisabled,
                      ]}
                    >
                      {formatCurrency(quickAmount)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Amount Input */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Withdrawal Amount</Text>
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
            <Text style={styles.hint}>Minimum withdrawal: ₹100</Text>
          </View>

          {/* Bank Details */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Bank Account Details</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Account Holder Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter account holder name"
                value={accountHolderName}
                onChangeText={setAccountHolderName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Account Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter account number"
                keyboardType="numeric"
                value={accountNumber}
                onChangeText={setAccountNumber}
                maxLength={18}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>IFSC Code</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter IFSC code"
                value={ifscCode}
                onChangeText={(text) => setIfscCode(text.toUpperCase())}
                autoCapitalize="characters"
                maxLength={11}
              />
            </View>
          </View>

          {/* Summary */}
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Withdrawal Amount</Text>
              <Text style={styles.summaryValue}>
                {amount ? formatCurrency(parseFloat(amount) || 0) : formatCurrency(0)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Processing Fee</Text>
              <Text style={styles.summaryValue}>Free</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryTotalLabel}>You will receive</Text>
              <Text style={styles.summaryTotalValue}>
                {amount ? formatCurrency(parseFloat(amount) || 0) : formatCurrency(0)}
              </Text>
            </View>
          </View>

          {/* Info Note */}
          <View style={styles.infoNote}>
            <Ionicons name="information-circle" size={20} color="#3b82f6" />
            <Text style={styles.infoText}>
              Withdrawals are processed within 2-3 business days. Please ensure your bank details are correct.
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isProcessing && styles.submitButtonDisabled]}
            onPress={handleWithdraw}
            disabled={
              isProcessing ||
              !amount ||
              parseFloat(amount) <= 0 ||
              !accountNumber ||
              !ifscCode ||
              !accountHolderName
            }
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.submitButtonGradient}
            >
              {isProcessing ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <MaterialCommunityIcons name="bank-transfer" size={20} color="#ffffff" />
                  <Text style={styles.submitButtonText}>Request Withdrawal</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4',
  },
  gradientHeader: {
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#d1fae5',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  balanceCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  balanceCardGradient: {
    padding: 20,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  quickAmounts: {
    marginBottom: 24,
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
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  quickAmountButtonActive: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
  },
  quickAmountButtonDisabled: {
    opacity: 0.5,
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
  quickAmountTextDisabled: {
    color: '#9ca3af',
  },
  inputSection: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
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
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  currencySymbol: {
    fontSize: 24,
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
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#111827',
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
  },
  summary: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
  infoNote: {
    flexDirection: 'row',
    backgroundColor: '#dbeafe',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 18,
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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

