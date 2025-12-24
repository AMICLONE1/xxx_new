import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types';
import { useWalletStore } from '@/store';
import { formatCurrency, formatEnergy, getTimeAgo } from '@/utils/helpers';
import { Transaction } from '@/types';

type WalletScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Wallet'>;

interface Props {
  navigation: WalletScreenNavigationProp;
}

export default function WalletScreen({ navigation }: Props) {
  const { wallet, transactions } = useWalletStore();

  const handleTopUp = () => {
    navigation.navigate('TopUp');
  };

  const handleWithdraw = () => {
    // TODO: Navigate to withdrawal screen
    console.log('Navigate to withdrawal');
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const isPositive = item.type === 'energy_sale' || item.type === 'topup';
    const amountPrefix = isPositive ? '+' : '-';
    const amountColor = isPositive ? '#10b981' : '#ef4444';

    return (
      <View style={styles.transactionItem}>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionType}>
            {item.type ? item.type.replace(/_/g, ' ') : 'Transaction'}
          </Text>
          <Text style={styles.transactionTime}>
            {item.createdAt ? getTimeAgo(item.createdAt) : 'Unknown time'}
          </Text>
        </View>
        <Text style={[styles.transactionAmount, { color: amountColor }]}>
          {amountPrefix}
          {item.currency === 'INR' ? formatCurrency(item.amount || 0) : formatEnergy(item.amount || 0)}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>Wallet</Text>

          {/* Balance Cards */}
          {wallet ? (
            <View style={styles.balanceContainer}>
              <View style={[styles.balanceCard, styles.energyCard]}>
                <Text style={styles.balanceLabel}>Energy Balance</Text>
                <Text style={styles.balanceValue}>
                  {formatEnergy(wallet.energyBalance, 'kWh')}
                </Text>
              </View>
              <View style={[styles.balanceCard, styles.cashCard]}>
                <Text style={styles.balanceLabel}>Cash Balance</Text>
                <Text style={styles.balanceValue}>{formatCurrency(wallet.cashBalance)}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyBalance}>
              <Text style={styles.emptyText}>No wallet data available</Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleTopUp}>
              <Text style={styles.actionButtonText}>Top Up</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.withdrawButton]}
              onPress={handleWithdraw}
            >
              <Text style={[styles.actionButtonText, styles.withdrawButtonText]}>
                Withdraw
              </Text>
            </TouchableOpacity>
          </View>

          {/* Transaction History */}
          <Text style={styles.sectionTitle}>Transaction History</Text>
          {transactions.length > 0 ? (
            <FlatList
              data={transactions}
              renderItem={renderTransaction}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyTransactions}>
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          )}
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
    marginBottom: 24,
  },
  balanceContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  balanceCard: {
    flex: 1,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  energyCard: {
    backgroundColor: '#f0fdf4',
  },
  cashCard: {
    backgroundColor: '#fef3c7',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  emptyBalance: {
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  withdrawButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  withdrawButtonText: {
    color: '#10b981',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  transactionTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyTransactions: {
    padding: 24,
    alignItems: 'center',
  },
});
