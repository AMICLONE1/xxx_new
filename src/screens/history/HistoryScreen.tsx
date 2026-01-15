import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types';
import { useTransactionStore } from '@/store';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

type HistoryScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  navigation: HistoryScreenNavigationProp;
}

type FilterType = 'all' | 'buy' | 'sell';

export default function HistoryScreen({ navigation }: Props) {
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [selectedChartType, setSelectedChartType] = useState<'line' | 'bar' | 'pie'>('line');
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const { getTransactions, getTotalStats } = useTransactionStore();
  const allTransactions = getTransactions('all');

  // Filter transactions based on selected filter
  const filteredTransactions = useMemo(() => {
    return getTransactions(selectedFilter);
  }, [selectedFilter, allTransactions.length]);

  // Calculate summary stats
  const stats = getTotalStats();

  // Prepare chart data
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#3b82f6',
    },
  };

  const lineChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        data: [300, 450, 320, 600, 540, 750],
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
        strokeWidth: 3,
      },
    ],
    legend: ['Energy Traded (kWh)'],
  };

  const barChartData = {
    labels: ['Buy', 'Sell'],
    datasets: [
      {
        data: [stats.totalBuyEnergy || 0, stats.totalSellEnergy || 0],
      },
    ],
  };

  const pieChartData = [
    {
      name: 'Buy',
      amount: stats.totalBuyAmount || 0,
      color: '#ef4444',
      legendFontColor: '#6b7280',
      legendFontSize: 14,
    },
    {
      name: 'Sell',
      amount: stats.totalSellAmount || 0,
      color: '#3b82f6',
      legendFontColor: '#6b7280',
      legendFontSize: 14,
    },
  ];

  const renderChart = () => {
    const chartWidth = width - 64;
    const chartHeight = 200;

    switch (selectedChartType) {
      case 'line':
        return (
          <LineChart
            data={lineChartData}
            width={chartWidth}
            height={chartHeight}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withInnerLines={false}
            withOuterLines={true}
            withVerticalLines={false}
            withHorizontalLines={true}
          />
        );
      case 'bar':
        return (
          <BarChart
            data={barChartData}
            width={chartWidth}
            height={chartHeight}
            chartConfig={chartConfig}
            style={styles.chart}
            yAxisLabel=""
            yAxisSuffix=" kWh"
            withInnerLines={false}
            fromZero
            showValuesOnTopOfBars
          />
        );
      case 'pie':
        return (
          <PieChart
            data={pieChartData}
            width={chartWidth}
            height={chartHeight}
            chartConfig={chartConfig}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
            style={styles.chart}
          />
        );
      default:
        return null;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderTransactionCard = (transaction: any, index: number) => {
    const isBuy = transaction.tradeType === 'buy';
    const iconName = isBuy ? 'arrow-down-circle' : 'arrow-up-circle';
    const iconColor = isBuy ? '#ef4444' : '#3b82f6';
    const date = transaction.timestamp ? new Date(transaction.timestamp) : new Date();

    return (
      <TouchableOpacity
        key={transaction.id}
        style={styles.transactionCard}
        activeOpacity={0.7}
        onPress={() => {
          setSelectedTransaction(transaction);
          setShowDetailModal(true);
        }}
      >
        <View style={[styles.transactionIconContainer, { backgroundColor: isBuy ? '#fee2e2' : '#dbeafe' }]}>
          <Ionicons name={iconName} size={28} color={iconColor} />
        </View>

        <View style={styles.transactionDetails}>
          <View style={styles.transactionHeader}>
            <Text style={styles.transactionTitle}>{transaction.counterPartyName}</Text>
            <Text style={[styles.transactionAmount, isBuy ? styles.buyAmount : styles.sellAmount]}>
              {isBuy ? '-' : '+'}₹{transaction.amount}
            </Text>
          </View>

          <View style={styles.transactionMeta}>
            <View style={styles.transactionMetaItem}>
              <MaterialCommunityIcons name="lightning-bolt" size={14} color="#64748b" />
              <Text style={styles.transactionMetaText}>{transaction.energyAmount} kWh</Text>
            </View>
            <View style={styles.transactionMetaItem}>
              <Ionicons name="calendar-outline" size={14} color="#64748b" />
              <Text style={styles.transactionMetaText}>{formatDate(date)}</Text>
            </View>
          </View>

          <View style={styles.transactionFooter}>
            <View style={[styles.transactionBadge, isBuy ? styles.buyBadge : styles.blueBadge]}>
              <Text style={[styles.transactionBadgeText, isBuy ? styles.buyBadgeText : styles.blueBadgeText]}>
                {isBuy ? 'BUY' : 'SELL'}
              </Text>
            </View>
            <Text style={styles.transactionRate}>@₹{transaction.pricePerUnit}/kWh</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.filterModal}>
          <View style={styles.filterModalHeader}>
            <Text style={styles.filterModalTitle}>Filter Transactions</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.filterOption, selectedFilter === 'all' && styles.filterOptionActive]}
            onPress={() => {
              setSelectedFilter('all');
              setShowFilterModal(false);
            }}
          >
            <View style={[styles.filterIconContainer, selectedFilter === 'all' && styles.filterIconActive]}>
              <Ionicons
                name="list"
                size={20}
                color={selectedFilter === 'all' ? '#3b82f6' : '#64748b'}
              />
            </View>
            <Text style={[styles.filterOptionText, selectedFilter === 'all' && styles.filterOptionTextActive]}>
              All Transactions
            </Text>
            {selectedFilter === 'all' && (
              <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterOption, selectedFilter === 'buy' && styles.filterOptionActive]}
            onPress={() => {
              setSelectedFilter('buy');
              setShowFilterModal(false);
            }}
          >
            <View style={[styles.filterIconContainer, selectedFilter === 'buy' && styles.filterIconActive]}>
              <Ionicons
                name="arrow-down-circle"
                size={20}
                color={selectedFilter === 'buy' ? '#3b82f6' : '#64748b'}
              />
            </View>
            <Text style={[styles.filterOptionText, selectedFilter === 'buy' && styles.filterOptionTextActive]}>
              Buy Only
            </Text>
            {selectedFilter === 'buy' && (
              <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterOption, selectedFilter === 'sell' && styles.filterOptionActive]}
            onPress={() => {
              setSelectedFilter('sell');
              setShowFilterModal(false);
            }}
          >
            <View style={[styles.filterIconContainer, selectedFilter === 'sell' && styles.filterIconActive]}>
              <Ionicons
                name="arrow-up-circle"
                size={20}
                color={selectedFilter === 'sell' ? '#3b82f6' : '#64748b'}
              />
            </View>
            <Text style={[styles.filterOptionText, selectedFilter === 'sell' && styles.filterOptionTextActive]}>
              Sell Only
            </Text>
            {selectedFilter === 'sell' && (
              <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderDetailModal = () => {
    if (!selectedTransaction) return null;
    const isBuy = selectedTransaction.tradeType === 'buy';
    const date = selectedTransaction.timestamp ? new Date(selectedTransaction.timestamp) : new Date();

    return (
      <Modal
        visible={showDetailModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDetailModal(false)}
        >
          <View style={styles.detailModal}>
            <View style={styles.detailModalHeader}>
              <View style={[styles.detailIconLarge, { backgroundColor: isBuy ? '#fee2e2' : '#dbeafe' }]}>
                <Ionicons
                  name={isBuy ? 'arrow-down-circle' : 'arrow-up-circle'}
                  size={40}
                  color={isBuy ? '#ef4444' : '#3b82f6'}
                />
              </View>
              <Text style={styles.detailModalTitle}>{selectedTransaction.counterPartyName}</Text>
              <View style={[styles.detailBadge, isBuy ? styles.buyBadge : styles.blueBadge]}>
                <Text style={[styles.detailBadgeText, isBuy ? styles.buyBadgeText : styles.blueBadgeText]}>
                  {isBuy ? 'PURCHASE' : 'SALE'}
                </Text>
              </View>
            </View>

            <View style={styles.detailAmount}>
              <Text style={styles.detailAmountLabel}>Amount</Text>
              <Text style={[styles.detailAmountValue, isBuy ? styles.buyAmount : styles.sellAmount]}>
                {isBuy ? '-' : '+'}₹{selectedTransaction.amount}
              </Text>
            </View>

            <View style={styles.detailInfoGrid}>
              <View style={styles.detailInfoRow}>
                <View style={styles.detailInfoItem}>
                  <View style={[styles.detailInfoIcon, { backgroundColor: '#fef3c7' }]}>
                    <MaterialCommunityIcons name="lightning-bolt" size={20} color="#f59e0b" />
                  </View>
                  <Text style={styles.detailInfoLabel}>Energy</Text>
                  <Text style={styles.detailInfoValue}>{selectedTransaction.energyAmount} kWh</Text>
                </View>

                <View style={styles.detailInfoItem}>
                  <View style={[styles.detailInfoIcon, { backgroundColor: '#dbeafe' }]}>
                    <MaterialCommunityIcons name="cash" size={20} color="#3b82f6" />
                  </View>
                  <Text style={styles.detailInfoLabel}>Rate</Text>
                  <Text style={styles.detailInfoValue}>₹{selectedTransaction.pricePerUnit}/kWh</Text>
                </View>
              </View>

              <View style={styles.detailInfoRow}>
                <View style={styles.detailInfoItem}>
                  <View style={[styles.detailInfoIcon, { backgroundColor: '#e0e7ff' }]}>
                    <Ionicons name="calendar-outline" size={20} color="#6366f1" />
                  </View>
                  <Text style={styles.detailInfoLabel}>Date</Text>
                  <Text style={styles.detailInfoValue}>{formatDate(date)}</Text>
                </View>

                <View style={styles.detailInfoItem}>
                  <View style={[styles.detailInfoIcon, { backgroundColor: '#f3e8ff' }]}>
                    <Ionicons name="time-outline" size={20} color="#8b5cf6" />
                  </View>
                  <Text style={styles.detailInfoLabel}>Time</Text>
                  <Text style={styles.detailInfoValue}>{formatTime(date)}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.detailCloseButton}
              onPress={() => setShowDetailModal(false)}
            >
              <Text style={styles.detailCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

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
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#1e293b" />
            </TouchableOpacity>
            <View>
              <Text style={styles.title}>Transaction History</Text>
              <Text style={styles.subtitle}>
                {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons name="filter" size={20} color="#1e293b" />
            {selectedFilter !== 'all' && <View style={styles.filterBadge} />}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary Stats - 2x2 Grid */}
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: '#fee2e2' }]}>
                  <Ionicons name="arrow-down-circle" size={22} color="#ef4444" />
                </View>
                <Text style={styles.statLabel}>Total Buy</Text>
                <Text style={[styles.statValue, { color: '#ef4444' }]}>₹{stats.totalBuyAmount}</Text>
                <Text style={styles.statSubValue}>{stats.totalBuyEnergy} kWh</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: '#dbeafe' }]}>
                  <Ionicons name="arrow-up-circle" size={22} color="#3b82f6" />
                </View>
                <Text style={styles.statLabel}>Total Sell</Text>
                <Text style={[styles.statValue, { color: '#3b82f6' }]}>₹{stats.totalSellAmount}</Text>
                <Text style={styles.statSubValue}>{stats.totalSellEnergy} kWh</Text>
              </View>

              <View style={[styles.statCard, styles.statCardFullWidth]}>
                <View style={[styles.statIcon, { backgroundColor: '#dbeafe' }]}>
                  <MaterialCommunityIcons name="cash-multiple" size={22} color="#3b82f6" />
                </View>
                <View style={styles.netAmountContent}>
                  <Text style={styles.statLabel}>Net Amount</Text>
                  <Text style={[styles.statValue, stats.netAmount >= 0 ? styles.positiveValue : styles.negativeValue]}>
                    {stats.netAmount >= 0 ? '+' : ''}₹{stats.netAmount}
                  </Text>
                  <Text style={styles.statSubValue}>{Math.abs(stats.netEnergy)} kWh</Text>
                </View>
                <View style={[styles.trendBadge, stats.netAmount >= 0 ? styles.trendPositive : styles.trendNegative]}>
                  <Ionicons
                    name={stats.netAmount >= 0 ? 'trending-up' : 'trending-down'}
                    size={14}
                    color={stats.netAmount >= 0 ? '#3b82f6' : '#ef4444'}
                  />
                  <Text style={[styles.trendText, stats.netAmount >= 0 ? { color: '#3b82f6' } : { color: '#ef4444' }]}>
                    {stats.netAmount >= 0 ? 'Profit' : 'Loss'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Chart Section */}
          <View style={styles.chartSection}>
            <View style={styles.chartHeader}>
              <Text style={styles.sectionTitle}>Analytics</Text>
              <View style={styles.chartTypeSelector}>
                <TouchableOpacity
                  style={[styles.chartTypeButton, selectedChartType === 'line' && styles.chartTypeButtonActive]}
                  onPress={() => setSelectedChartType('line')}
                >
                  <MaterialCommunityIcons
                    name="chart-line"
                    size={18}
                    color={selectedChartType === 'line' ? '#ffffff' : '#64748b'}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chartTypeButton, selectedChartType === 'bar' && styles.chartTypeButtonActive]}
                  onPress={() => setSelectedChartType('bar')}
                >
                  <MaterialCommunityIcons
                    name="chart-bar"
                    size={18}
                    color={selectedChartType === 'bar' ? '#ffffff' : '#64748b'}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chartTypeButton, selectedChartType === 'pie' && styles.chartTypeButtonActive]}
                  onPress={() => setSelectedChartType('pie')}
                >
                  <MaterialCommunityIcons
                    name="chart-pie"
                    size={18}
                    color={selectedChartType === 'pie' ? '#ffffff' : '#64748b'}
                  />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.chartContainer}>
              {renderChart()}
            </View>
          </View>

          {/* Transactions List */}
          {filteredTransactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <LinearGradient
                  colors={['#dbeafe', '#bfdbfe']}
                  style={styles.emptyIcon}
                >
                  <MaterialCommunityIcons name="history" size={64} color="#3b82f6" />
                </LinearGradient>
              </View>
              <Text style={styles.emptyText}>No transactions found</Text>
              <Text style={styles.emptySubtext}>
                {selectedFilter !== 'all'
                  ? `No ${selectedFilter} transactions yet`
                  : 'Your transaction history will appear here'}
              </Text>
            </View>
          ) : (
            <View style={styles.transactionsList}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              {filteredTransactions.map(renderTransactionCard)}
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>

        {renderFilterModal()}
        {renderDetailModal()}
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
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  filterBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  statsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: (width - 52) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statCardFullWidth: {
    width: width - 40,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 6,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  statSubValue: {
    fontSize: 11,
    color: '#94a3b8',
  },
  positiveValue: {
    color: '#3b82f6',
  },
  negativeValue: {
    color: '#ef4444',
  },
  netAmountContent: {
    flex: 1,
    marginLeft: 12,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  trendPositive: {
    backgroundColor: '#dbeafe',
  },
  trendNegative: {
    backgroundColor: '#fee2e2',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartSection: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartTypeSelector: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  chartTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  chartTypeButtonActive: {
    backgroundColor: '#3b82f6',
  },
  chartContainer: {
    alignItems: 'center',
    overflow: 'hidden',
  },
  chart: {
    borderRadius: 12,
    marginVertical: 8,
  },
  transactionsList: {
    gap: 12,
  },
  transactionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  transactionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  buyAmount: {
    color: '#ef4444',
  },
  sellAmount: {
    color: '#3b82f6',
  },
  transactionMeta: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  transactionMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  transactionMetaText: {
    fontSize: 12,
    color: '#64748b',
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  buyBadge: {
    backgroundColor: '#fee2e2',
  },
  sellBadge: {
    backgroundColor: '#dcfce7',
  },
  blueBadge: {
    backgroundColor: '#dbeafe',
  },
  transactionBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  buyBadgeText: {
    color: '#ef4444',
  },
  sellBadgeText: {
    color: '#10b981',
  },
  blueBadgeText: {
    color: '#3b82f6',
  },
  transactionRate: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: '#f8fafc',
    gap: 12,
  },
  filterOptionActive: {
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  filterIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterIconActive: {
    backgroundColor: '#eff6ff',
  },
  filterOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: '#1e293b',
    fontWeight: '600',
  },
  detailModal: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    margin: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  detailModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  detailIconLarge: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  detailBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  detailBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailAmount: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    marginBottom: 24,
  },
  detailAmountLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
    fontWeight: '500',
  },
  detailAmountValue: {
    fontSize: 36,
    fontWeight: '700',
  },
  detailInfoGrid: {
    gap: 12,
    marginBottom: 24,
  },
  detailInfoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailInfoItem: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  detailInfoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailInfoLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 6,
    fontWeight: '500',
  },
  detailInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
  },
  detailCloseButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  detailCloseButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
});
