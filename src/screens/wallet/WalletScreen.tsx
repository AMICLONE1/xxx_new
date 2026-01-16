import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh delay - data is managed by store
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshing(false);
  };

  const handleTopUp = () => {
    navigation.navigate('TopUp');
  };

  const handleWithdraw = () => {
    navigation.navigate('Withdraw');
  };

  const handleTransactionHistory = () => {
    navigation.navigate('History');
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'energy_sale':
        return <MaterialCommunityIcons name="lightning-bolt" size={20} color="#10b981" />;
      case 'energy_purchase':
        return <MaterialCommunityIcons name="flash" size={20} color="#3b82f6" />;
      case 'topup':
        return <MaterialCommunityIcons name="plus-circle" size={20} color="#10b981" />;
      case 'withdrawal':
        return <MaterialCommunityIcons name="minus-circle" size={20} color="#ef4444" />;
      default:
        return <Ionicons name="swap-horizontal" size={20} color="#6b7280" />;
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const isPositive = item.type === 'energy_sale' || item.type === 'topup';
    const amountPrefix = isPositive ? '+' : '-';
    const amountColor = isPositive ? '#10b981' : '#ef4444';

    return (
      <View style={styles.transactionItem}>
        <View style={[styles.transactionIconContainer, { backgroundColor: isPositive ? '#dcfce7' : '#fee2e2' }]}>
          {getTransactionIcon(item.type || '')}
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionType}>
            {item.type ? item.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Transaction'}
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

  // Calculate savings (mock data - can be replaced with actual calculation)
  const savingsThisMonth = wallet ? Math.abs(wallet.cashBalance * 0.02) : 0;

  return (
    <LinearGradient
      colors={['#e0f2fe', '#f0f9ff', '#ffffff']}
      style={styles.gradientBackground}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Wallet</Text>
            <Text style={styles.headerSubtitle}>Manage your balance</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
          }
        >
          {/* Main Balance Card */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Total Balance</Text>
            <Text style={styles.balanceAmount}>
              {wallet ? formatCurrency(wallet.cashBalance) : '₹0.00'}
            </Text>

            {/* Savings indicator */}
            {savingsThisMonth > 0 && (
              <View style={styles.savingsRow}>
                <View style={styles.savingsBadge}>
                  <Ionicons name="trending-up" size={14} color="#10b981" />
                  <Text style={styles.savingsAmount}>{formatCurrency(savingsThisMonth)}</Text>
                </View>
                <Text style={styles.savingsText}>Nice job! You've saved this month</Text>
              </View>
            )}

            {/* Energy Balance */}
            <View style={styles.energyBalanceRow}>
              <View style={styles.energyIcon}>
                <MaterialCommunityIcons name="lightning-bolt" size={16} color="#3b82f6" />
              </View>
              <Text style={styles.energyBalanceText}>
                Energy: {wallet ? formatEnergy(wallet.energyBalance, 'kWh') : '0 kWh'}
              </Text>
            </View>
          </View>

          {/* Action Buttons - 3 buttons in a row */}
          <View style={styles.actionsContainer}>
            {/* Top Up Button */}
            <TouchableOpacity style={styles.actionButton} onPress={handleTopUp} activeOpacity={0.7}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#dbeafe' }]}>
                <Ionicons name="arrow-up" size={22} color="#3b82f6" />
              </View>
              <Text style={styles.actionButtonText}>Top Up</Text>
            </TouchableOpacity>

            {/* Transaction History Button - Center with different style */}
            <TouchableOpacity style={styles.actionButton} onPress={handleTransactionHistory} activeOpacity={0.7}>
              <View style={[styles.actionIconContainerMain]}>
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  style={styles.actionIconGradient}
                >
                  <MaterialCommunityIcons name="swap-horizontal" size={24} color="#ffffff" />
                </LinearGradient>
              </View>
              <Text style={styles.actionButtonText}>History</Text>
            </TouchableOpacity>

            {/* Withdraw Button */}
            <TouchableOpacity style={styles.actionButton} onPress={handleWithdraw} activeOpacity={0.7}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#dbeafe' }]}>
                <Ionicons name="arrow-down" size={22} color="#3b82f6" />
              </View>
              <Text style={styles.actionButtonText}>Withdraw</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Transactions Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            {transactions.length > 0 && (
              <TouchableOpacity onPress={handleTransactionHistory}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            )}
          </View>

          {transactions.length > 0 ? (
            <View style={styles.transactionsContainer}>
              <FlatList
                data={transactions.slice(0, 5)}
                renderItem={renderTransaction}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.transactionSeparator} />}
              />
            </View>
          ) : (
            <View style={styles.emptyTransactions}>
              <View style={styles.emptyIconContainer}>
                <MaterialCommunityIcons name="history" size={40} color="#d1d5db" />
              </View>
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>
                Your transaction history will appear here
              </Text>
            </View>
          )}

          {/* Quick Stats Cards */}
          {wallet && (
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: '#dcfce7' }]}>
                  <MaterialCommunityIcons name="trending-up" size={20} color="#10b981" />
                </View>
                <Text style={styles.statLabel}>Energy Sold</Text>
                <Text style={styles.statValue}>{formatEnergy(wallet.energyBalance * 0.3, 'kWh')}</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: '#dbeafe' }]}>
                  <MaterialCommunityIcons name="cart" size={20} color="#3b82f6" />
                </View>
                <Text style={styles.statLabel}>Energy Bought</Text>
                <Text style={styles.statValue}>{formatEnergy(wallet.energyBalance * 0.2, 'kWh')}</Text>
              </View>
            </View>
          )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  balanceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    marginTop: 10,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 42,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  savingsAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10b981',
  },
  savingsText: {
    fontSize: 13,
    color: '#64748b',
  },
  energyBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  energyIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  energyBalanceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 32,
  },
  actionButton: {
    alignItems: 'center',
    gap: 8,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  actionIconContainerMain: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionIconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  transactionsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 24,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  transactionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  transactionTime: {
    fontSize: 12,
    color: '#64748b',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  transactionSeparator: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginLeft: 72,
  },
  emptyTransactions: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
});
