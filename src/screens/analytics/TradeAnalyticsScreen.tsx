import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '@/types';

const { width } = Dimensions.get('window');

type ChartKey = 'bar' | 'line' | 'pie';

const chartOptions: { key: ChartKey; label: string }[] = [
  { key: 'bar', label: 'Bar Chart' },
  { key: 'line', label: 'Line Chart' },
  { key: 'pie', label: 'Pie Share' },
];

const chartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#10b981',
  },
};

const buyersData = [
  { id: '1', name: 'Solar Grid A', kwh: '2,000 kWh', rate: '6.1', amount: '12400' },
  { id: '2', name: 'Green Watt Ltd', kwh: '1,500 kWh', rate: '6.5', amount: '9800' },
  { id: '3', name: 'Energy Hub', kwh: '3,000 kWh', rate: '6.0', amount: '18200' },
];

const sellersData = [
  { id: '1', name: 'Grid Supply West', kwh: '3,100 kWh', rate: '7.2', amount: '22400' },
  { id: '2', name: 'City Power Co', kwh: '2,400 kWh', rate: '7.0', amount: '16900' },
  { id: '3', name: 'SunRise Energy', kwh: '1,950 kWh', rate: '7.3', amount: '14200' },
];

const TradeAnalyticsScreen = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'TradeAnalytics'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { mode } = route.params;
  const [selectedChart, setSelectedChart] = useState<ChartKey>('bar');
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);

  const isBuyer = mode === 'buyer';
  const entityList = isBuyer ? buyersData : sellersData;
  const selectedEntityData = selectedEntity ? entityList.find(e => e.id === selectedEntity) : null;

  const { chartData, transactions, summary, pieData } = useMemo(() => {
    if (isBuyer) {
      return {
        summary: {
          title: 'Buyer Insights',
          total: '₹1,24,500',
          avgRate: '₹6.2 / kWh',
          deals: 38,
          profit: '₹18,400',
        },
        chartData: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [
            {
              data: [2200, 1800, 2600, 2400, 2800, 3000],
              color: () => '#10b981',
              strokeWidth: 2,
            },
          ],
          legend: ['Energy Purchased (kWh)'],
        },
        pieData: [
          { name: 'Daytime', population: 35, color: '#10b981', legendFontColor: '#374151', legendFontSize: 12 },
          { name: 'Evening', population: 45, color: '#3b82f6', legendFontColor: '#374151', legendFontSize: 12 },
          { name: 'Night', population: 20, color: '#f59e0b', legendFontColor: '#374151', legendFontSize: 12 },
        ],
        transactions: [
          { id: '1', name: 'Solar Grid A', amount: '₹12,400', rate: '₹6.1', kwh: '2,000 kWh', date: 'Today, 2:30 PM' },
          { id: '2', name: 'Green Watt Ltd', amount: '₹9,800', rate: '₹6.5', kwh: '1,500 kWh', date: 'Yesterday, 5:10 PM' },
          { id: '3', name: 'Energy Hub', amount: '₹18,200', rate: '₹6.0', kwh: '3,000 kWh', date: '2 days ago' },
        ],
      };
    }

    return {
      summary: {
        title: 'Seller Insights',
        total: '₹1,68,900',
        avgRate: '₹7.1 / kWh',
        deals: 42,
        profit: '₹42,300',
      },
      chartData: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          {
            data: [2400, 2600, 2800, 3200, 3400, 3600],
            color: () => '#2563eb',
            strokeWidth: 2,
          },
        ],
        legend: ['Energy Sold (kWh)'],
      },
      pieData: [
        { name: 'Residential', population: 30, color: '#2563eb', legendFontColor: '#374151', legendFontSize: 12 },
        { name: 'Commercial', population: 50, color: '#10b981', legendFontColor: '#374151', legendFontSize: 12 },
        { name: 'Industrial', population: 20, color: '#f59e0b', legendFontColor: '#374151', legendFontSize: 12 },
      ],
      transactions: [
        { id: '1', name: 'Grid Supply West', amount: '₹22,400', rate: '₹7.2', kwh: '3,100 kWh', date: 'Today, 11:20 AM' },
        { id: '2', name: 'City Power Co', amount: '₹16,900', rate: '₹7.0', kwh: '2,400 kWh', date: 'Yesterday, 4:40 PM' },
        { id: '3', name: 'SunRise Energy', amount: '₹14,200', rate: '₹7.3', kwh: '1,950 kWh', date: '2 days ago' },
      ],
    };
  }, [isBuyer]);

  const renderChart = () => {
    const chartWidth = Math.max(width * 1.05, 360);

    if (selectedChart === 'pie') {
      return (
        <PieChart
          data={pieData}
          width={chartWidth}
          height={220}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="16"
          absolute
        />
      );
    }

    if (selectedChart === 'line') {
      return (
        <LineChart
          data={chartData}
          width={chartWidth}
          height={240}
          chartConfig={chartConfig}
          bezier
          style={{ borderRadius: 12 }}
        />
      );
    }

    return (
      <BarChart
        data={chartData}
        width={chartWidth}
        height={240}
        yAxisLabel=""
        yAxisSuffix=""
        chartConfig={chartConfig}
        style={{ borderRadius: 12 }}
        fromZero
      />
    );
  };

  const handleSelectEntity = (entity: typeof entityList[0]) => {
    setSelectedEntity(entity.id);
  };

  // Selection View
  if (!selectedEntity) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={isBuyer ? ['#ef4444', '#dc2626'] : ['#10b981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="chevron-left" size={28} color="#ffffff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{isBuyer ? 'Select Buyer' : 'Select Seller'}</Text>
            <Text style={styles.headerSubtitle}>
              {isBuyer ? 'Choose a buyer to view analytics' : 'Choose a seller to view analytics'}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.selectorContainer}>
          {entityList.map((entity) => (
            <TouchableOpacity
              key={entity.id}
              onPress={() => handleSelectEntity(entity)}
              style={styles.selectorCard}
            >
              <View style={styles.selectorIconCol}>
                <MaterialCommunityIcons
                  name={isBuyer ? 'arrow-down-bold-circle' : 'arrow-up-bold-circle'}
                  size={28}
                  color={isBuyer ? '#ef4444' : '#10b981'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectorName}>{entity.name}</Text>
                <View style={styles.selectorDetailsRow}>
                  <Text style={styles.selectorMetaPill}>{entity.kwh}</Text>
                  <Text style={styles.selectorMetaPill}>₹{entity.rate}/kWh</Text>
                </View>
              </View>
              <View style={styles.selectorAmount}>
                <Text style={[styles.selectorAmountValue, { color: isBuyer ? '#ef4444' : '#10b981' }]}>
                  ₹{entity.amount}
                </Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color="#9ca3af" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  // Detailed Analytics View
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={isBuyer ? ['#ef4444', '#dc2626'] : ['#10b981', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => setSelectedEntity(null)} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={28} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{isBuyer ? 'Buyer Analytics' : 'Seller Analytics'}</Text>
            <Text style={styles.headerSubtitle}>
              {isBuyer
                ? 'See purchase trends, pricing, and profitability'
                : 'See selling trends, pricing, and profitability'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.agreementButton}
            onPress={() =>
              navigation.navigate('Agreement', {
                mode,
                entityName: selectedEntityData?.name,
                amount: Number(selectedEntityData?.amount),
                rate: Number(selectedEntityData?.rate),
              })
            }
          >
            <MaterialCommunityIcons name="file-sign" size={18} color="#065f46" />
            <Text style={styles.agreementText}>Agreement</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>{summary.title}</Text>
        <View style={styles.summaryRow}>
          <View style={styles.metricBlock}>
            <Text style={styles.metricLabel}>Total Value</Text>
            <Text style={styles.metricValue}>{summary.total}</Text>
          </View>
          <View style={styles.metricBlock}>
            <Text style={styles.metricLabel}>Average Rate</Text>
            <Text style={styles.metricValue}>{summary.avgRate}</Text>
          </View>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.metricBlock}>
            <Text style={styles.metricLabel}>{isBuyer ? 'Purchases' : 'Deals Closed'}</Text>
            <Text style={styles.metricValue}>{summary.deals}</Text>
          </View>
          <View style={styles.metricBlock}>
            <Text style={styles.metricLabel}>Net Profit</Text>
            <Text style={styles.metricValue}>{summary.profit}</Text>
          </View>
        </View>
      </View>

      {/* Chart Selector */}
      <View style={styles.selectorRow}>
        <Text style={styles.sectionTitle}>Charts</Text>
        <View style={styles.selectorChips}>
          {chartOptions.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.chip, selectedChart === opt.key && styles.chipActive]}
              onPress={() => setSelectedChart(opt.key)}
            >
              <Text style={[styles.chipText, selectedChart === opt.key && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Chart */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chartCard}>{renderChart()}</View>
      </ScrollView>

      {/* Transactions */}
      <Text style={[styles.sectionTitle, { marginTop: 16, paddingHorizontal: 16 }]}>Recent {isBuyer ? 'Purchases' : 'Sales'}</Text>
      <View style={styles.listCard}>
        {transactions.map((item, idx) => (
          <View key={item.id}>
            <View style={styles.transactionItem}>
              <View style={styles.transactionHeader}>
                <MaterialCommunityIcons
                  name={isBuyer ? 'arrow-down-bold-circle' : 'arrow-up-bold-circle'}
                  size={20}
                  color={isBuyer ? '#ef4444' : '#10b981'}
                />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.entityName}>{item.name}</Text>
                  <Text style={styles.entityMeta}>{item.date}</Text>
                </View>
                <Text style={[styles.amountText, { color: isBuyer ? '#ef4444' : '#10b981' }]}>{item.amount}</Text>
              </View>
              <View style={styles.transactionMetaRow}>
                <Text style={styles.metaPill}>{item.kwh}</Text>
                <Text style={styles.metaPill}>Rate: {item.rate}</Text>
              </View>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: isBuyer ? '#ef4444' : '#10b981' }]}
                onPress={() =>
                  navigation.navigate('Agreement', {
                    mode,
                    entityName: item.name,
                    amount: Number(item.amount.replace(/[^\d.]/g, '')),
                    rate: Number(item.rate.replace(/[^\d.]/g, '')),
                  })
                }
              >
                <Text style={styles.actionButtonText}>{isBuyer ? 'Buy Electricity' : 'Sell Electricity'}</Text>
              </TouchableOpacity>
            </View>
            {idx < transactions.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  backButton: {
    marginRight: 12,
    padding: 8,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  agreementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf3',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  agreementText: {
    marginLeft: 6,
    fontWeight: '700',
    color: '#065f46',
    fontSize: 12,
  },
  selectorContainer: {
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  selectorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  selectorIconCol: {
    marginRight: 12,
  },
  selectorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  selectorDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  selectorMetaPill: {
    fontSize: 11,
    color: '#065f46',
    backgroundColor: '#ecfdf3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 2,
  },
  selectorAmount: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  selectorAmountValue: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metricBlock: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  selectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 18,
  },
  selectorChips: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginLeft: 8,
    backgroundColor: '#ffffff',
  },
  chipActive: {
    backgroundColor: '#ecfdf3',
    borderColor: '#10b981',
  },
  chipText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#065f46',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 12,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  listCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionItem: {
    paddingVertical: 12,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entityName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  entityMeta: {
    fontSize: 12,
    color: '#6b7280',
  },
  amountText: {
    fontSize: 14,
    fontWeight: '700',
  },
  transactionMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  metaPill: {
    fontSize: 12,
    color: '#065f46',
    backgroundColor: '#ecfdf3',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginRight: 8,
    marginBottom: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  actionButton: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default TradeAnalyticsScreen;
