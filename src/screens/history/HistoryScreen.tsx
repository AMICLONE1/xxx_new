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
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#10b981',
    },
  };

  const lineChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        data: [300, 450, 320, 600, 540, 750],
        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
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
      color: '#10b981',
      legendFontColor: '#6b7280',
      legendFontSize: 14,
    },
  ];

  const renderChart = () => {
    const chartWidth = width - 40;
    const chartHeight = 220;

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

  const renderTransactionCard = (transaction: any) => {
    const isBuy = transaction.tradeType === 'buy';
    const iconName = isBuy ? 'arrow-down-circle' : 'arrow-up-circle';
    const iconColor = isBuy ? '#ef4444' : '#10b981';
    const date = transaction.timestamp ? new Date(transaction.timestamp) : new Date();

    return (
      <View key={transaction.id} style={styles.transactionCard}>
        <View style={styles.transactionIcon}>
          <Ionicons name={iconName} size={32} color={iconColor} />
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
              <MaterialCommunityIcons name="lightning-bolt" size={14} color="#6b7280" />
              <Text style={styles.transactionMetaText}>{transaction.energyAmount} kWh</Text>
            </View>
            <View style={styles.transactionMetaItem}>
              <Ionicons name="calendar-outline" size={14} color="#6b7280" />
              <Text style={styles.transactionMetaText}>{formatDate(date)}</Text>
            </View>
            <View style={styles.transactionMetaItem}>
              <Ionicons name="time-outline" size={14} color="#6b7280" />
              <Text style={styles.transactionMetaText}>{formatTime(date)}</Text>
            </View>
          </View>

          <View style={styles.transactionFooter}>
            <View style={[styles.transactionBadge, isBuy ? styles.buyBadge : styles.sellBadge]}>
              <Text style={[styles.transactionBadgeText, isBuy ? styles.buyBadgeText : styles.sellBadgeText]}>
                {isBuy ? 'BUY' : 'SELL'}
              </Text>
            </View>
            <Text style={styles.transactionRate}>@₹{transaction.pricePerUnit}/kWh</Text>
          </View>
        </View>
      </View>
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
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.filterOption, selectedFilter === 'all' && styles.filterOptionActive]}
            onPress={() => {
              setSelectedFilter('all');
              setShowFilterModal(false);
            }}
          >
            <Ionicons 
              name="list" 
              size={24} 
              color={selectedFilter === 'all' ? '#10b981' : '#6b7280'} 
            />
            <Text style={[styles.filterOptionText, selectedFilter === 'all' && styles.filterOptionTextActive]}>
              All Transactions
            </Text>
            {selectedFilter === 'all' && (
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterOption, selectedFilter === 'buy' && styles.filterOptionActive]}
            onPress={() => {
              setSelectedFilter('buy');
              setShowFilterModal(false);
            }}
          >
            <Ionicons 
              name="arrow-down-circle" 
              size={24} 
              color={selectedFilter === 'buy' ? '#10b981' : '#6b7280'} 
            />
            <Text style={[styles.filterOptionText, selectedFilter === 'buy' && styles.filterOptionTextActive]}>
              Buy Only
            </Text>
            {selectedFilter === 'buy' && (
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterOption, selectedFilter === 'sell' && styles.filterOptionActive]}
            onPress={() => {
              setSelectedFilter('sell');
              setShowFilterModal(false);
            }}
          >
            <Ionicons 
              name="arrow-up-circle" 
              size={24} 
              color={selectedFilter === 'sell' ? '#10b981' : '#6b7280'} 
            />
            <Text style={[styles.filterOptionText, selectedFilter === 'sell' && styles.filterOptionTextActive]}>
              Sell Only
            </Text>
            {selectedFilter === 'sell' && (
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#10b981', '#059669']} style={styles.gradientHeader}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
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
            <Ionicons name="filter" size={20} color="#ffffff" />
            {selectedFilter !== 'all' && <View style={styles.filterBadge} />}
          </TouchableOpacity>
        </View>

        {/* Summary Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="arrow-down-circle" size={20} color="#ffffff" />
            <Text style={styles.statLabel}>Total Buy</Text>
            <Text style={styles.statValue}>₹{stats.totalBuyAmount}</Text>
            <Text style={styles.statSubValue}>{stats.totalBuyEnergy} kWh</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="arrow-up-circle" size={20} color="#ffffff" />
            <Text style={styles.statLabel}>Total Sell</Text>
            <Text style={styles.statValue}>₹{stats.totalSellAmount}</Text>
            <Text style={styles.statSubValue}>{stats.totalSellEnergy} kWh</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="cash-multiple" size={20} color="#ffffff" />
            <Text style={styles.statLabel}>Net Amount</Text>
            <Text style={[styles.statValue, stats.netAmount >= 0 ? styles.positiveValue : styles.negativeValue]}>
              ₹{Math.abs(stats.netAmount)}
            </Text>
            <Text style={styles.statSubValue}>{Math.abs(stats.netEnergy)} kWh</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Chart Section */}
        <View style={styles.chartSection}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Analytics Overview</Text>
            <View style={styles.chartTypeSelector}>
              <TouchableOpacity
                style={[styles.chartTypeButton, selectedChartType === 'line' && styles.chartTypeButtonActive]}
                onPress={() => setSelectedChartType('line')}
              >
                <MaterialCommunityIcons 
                  name="chart-line" 
                  size={20} 
                  color={selectedChartType === 'line' ? '#ffffff' : '#6b7280'} 
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chartTypeButton, selectedChartType === 'bar' && styles.chartTypeButtonActive]}
                onPress={() => setSelectedChartType('bar')}
              >
                <MaterialCommunityIcons 
                  name="chart-bar" 
                  size={20} 
                  color={selectedChartType === 'bar' ? '#ffffff' : '#6b7280'} 
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chartTypeButton, selectedChartType === 'pie' && styles.chartTypeButtonActive]}
                onPress={() => setSelectedChartType('pie')}
              >
                <MaterialCommunityIcons 
                  name="chart-pie" 
                  size={20} 
                  color={selectedChartType === 'pie' ? '#ffffff' : '#6b7280'} 
                />
              </TouchableOpacity>
            </View>
          </View>
          {renderChart()}
        </View>

        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="history" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No transactions found</Text>
            <Text style={styles.emptySubtext}>
              {selectedFilter !== 'all' 
                ? `No ${selectedFilter} transactions yet` 
                : 'Your transaction history will appear here'}
            </Text>
          </View>
        ) : (
          <View style={styles.transactionsList}>
            <Text style={styles.sectionTitle}>Transaction History</Text>
            {filteredTransactions.map(renderTransactionCard)}
          </View>
        )}
      </ScrollView>

      {renderFilterModal()}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#d1fae5',
    fontWeight: '500',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fbbf24',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#d1fae5',
    marginTop: 4,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 4,
  },
  statSubValue: {
    fontSize: 10,
    color: '#d1fae5',
    marginTop: 2,
  },
  positiveValue: {
    color: '#d1fae5',
  },
  negativeValue: {
    color: '#fecaca',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  chartSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  chartTypeSelector: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 2,
    gap: 4,
  },
  chartTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  chartTypeButtonActive: {
    backgroundColor: '#10b981',
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  transactionsList: {
    gap: 12,
  },
  transactionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  transactionIcon: {
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
    color: '#111827',
    flex: 1,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  buyAmount: {
    color: '#ef4444',
  },
  sellAmount: {
    color: '#10b981',
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
    color: '#6b7280',
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  buyBadge: {
    backgroundColor: '#fee2e2',
  },
  sellBadge: {
    backgroundColor: '#d1fae5',
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
  transactionRate: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
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
    padding: 20,
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
    gap: 12,
  },
  filterOptionActive: {
    backgroundColor: '#d1fae5',
  },
  filterOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: '#047857',
    fontWeight: '600',
  },
});
