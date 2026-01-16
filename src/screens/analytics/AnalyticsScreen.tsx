import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useMeterStore } from '@/store/meterStore';
import { useAuthStore } from '@/store';
import { useTransactionStore } from '@/store/transactionStore';
import { analyticsService } from '@/services/api/analyticsService';
import { transactionsService } from '@/services/api/transactionsService';
import { SiteSelector } from '@/components/analytics/SiteSelector';
import { MeterSelector } from '@/components/analytics/MeterSelector';
import { Site, SiteAnalytics, Transaction } from '@/types';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types';
import { formatEnergy as formatEnergyUtil, formatCurrency as formatCurrencyUtil } from '@/utils/helpers';
import { logger } from '@/utils/logger';

const { width } = Dimensions.get('window');

const AnalyticsScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { meters, energyData } = useMeterStore();
  const { user } = useAuthStore();
  const { transactions } = useTransactionStore();
  const [selectedSiteId, setSelectedSiteId] = useState<string | 'all'>('all');
  const [selectedMeterId, setSelectedMeterId] = useState<string | 'all'>('all');
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [userSites, setUserSites] = useState<{ id: string; name: string; }[]>([]);
  const [analytics, setAnalytics] = useState<SiteAnalytics | null>(null);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');
  const [loading, setLoading] = useState(true);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChartType, setSelectedChartType] = useState<'generation' | 'consumption' | 'comparison' | 'netExport'>('generation');

  // Check if user is a buyer
  const isBuyer = user?.userType === 'buyer';

  // Initialize user sites (up to 6 sites)
  useEffect(() => {
    // Create default placeholder sites (without data logger IDs)
    const defaultSites = Array.from({ length: Math.min(6, Math.max(3, meters.length)) }, (_, i) => ({
      id: `site-${i + 1}`,
      name: `Site ${i + 1}`,
    }));
    setUserSites(defaultSites);
    
    // Don't select any sites by default - user must add them first
    setSelectedSiteIds([]);
  }, [meters.length]);

  // Convert meters to sites format for the meter selector
  useEffect(() => {
    if (meters.length > 0) {
      const sitesData: Site[] = meters.map((meter, index) => ({
        id: meter.id,
        name: `Site ${index + 1} - ${meter.discomName}`,
        discomName: meter.discomName,
        consumerNumber: meter.consumerNumber,
        address: meter.address,
      }));
      setSites(sitesData);
    }
  }, [meters]);

  // Handler for adding a new site
  const handleAddSite = useCallback((siteName: string, dataLoggerId: string) => {
    const newSiteNumber = userSites.length + 1;
    const newSite = {
      id: `site-${newSiteNumber}`,
      name: siteName,
      dataLoggerId: dataLoggerId,
    };
    setUserSites([...userSites, newSite]);
    setSelectedSiteId(newSite.id);
    
    // Auto-select the new site (up to 2 sites can be selected)
    setSelectedSiteIds(prev => {
      if (prev.length < 2) {
        return [...prev, newSite.id];
      }
      return prev;
    });
  }, [userSites]);

  // Handler for deleting a site
  const handleDeleteSite = useCallback((siteId: string) => {
    setUserSites(prevSites => prevSites.filter(site => site.id !== siteId));
    // If the deleted site was selected, remove it from multi-selection
    setSelectedSiteIds(prev => prev.filter(id => id !== siteId));
    if (selectedSiteId === siteId) {
      setSelectedSiteId('all');
    }
  }, [selectedSiteId]);

  // Handler for multi-site selection
  const handleMultiSiteChange = useCallback((siteIds: string[]) => {
    setSelectedSiteIds(siteIds);
    // Reset meter selection when sites change
    setSelectedMeterId('all');
  }, []);

  // Load analytics function
  const loadAnalytics = useCallback(async (showRefresh = false) => {
    if (!user?.id) return;

    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      // If both are 'all', show aggregated analytics
      if (selectedSiteId === 'all' && selectedMeterId === 'all') {
        const response = await analyticsService.getAggregatedAnalytics({ period: 'month' });
        if (response.success && response.data) {
          setAnalytics(response.data);
          setSelectedSite(null);
        } else {
          setError(response.error || 'Failed to load analytics');
        }
      } else if (selectedSiteId !== 'all') {
        // If a specific site is selected, use site analytics
        const site = sites.find(s => s.id === selectedSiteId);
        if (site) {
          setSelectedSite(site);
          const response = await analyticsService.getSiteAnalytics(selectedSiteId, { period: 'month' });
          if (response.success && response.data) {
            setAnalytics(response.data);
          } else {
            setError(response.error || 'Failed to load site analytics');
          }
        }
      } else if (selectedMeterId !== 'all') {
        // If a specific meter is selected, treat it as a site
        const meter = meters.find(m => m.id === selectedMeterId);
        if (meter) {
          const site = {
            id: meter.id,
            name: `Meter ${meter.consumerNumber}`,
            discomName: meter.discomName,
            consumerNumber: meter.consumerNumber,
            address: meter.address,
          };
          setSelectedSite(site);
          const response = await analyticsService.getSiteAnalytics(selectedMeterId, { period: 'month' });
          if (response.success && response.data) {
            setAnalytics(response.data);
          } else {
            setError(response.error || 'Failed to load meter analytics');
          }
        }
      }
    } catch (error: unknown) {
      logger.error('AnalyticsScreen', 'Error loading analytics:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while loading analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedSiteId, selectedMeterId, sites, meters, user?.id]);

  // Load analytics when site selection changes
  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Refresh handler
  const onRefresh = useCallback(() => {
    loadAnalytics(true);
  }, [loadAnalytics]);

  // Load transactions from API
  useEffect(() => {
    if (!user?.id) return;

    const loadTransactions = async () => {
      setTransactionsLoading(true);
      try {
        const response = await transactionsService.getTransactions({
          limit: 20,
          status: 'completed',
        });
        if (response.success && response.data) {
          // Update transaction store with fetched data
          // Note: In a real app, you'd update the store properly
        }
      } catch (error) {
        console.error('Error loading transactions:', error);
      } finally {
        setTransactionsLoading(false);
      }
    };

    loadTransactions();
  }, [user?.id]);

  // Filter transactions by site (if we had meter_id in transactions, we'd filter properly)
  // For now, we'll show all transactions but add site context where possible
  const filteredTransactions = useMemo(() => {
    // Since transactions don't have meter_id, we show all transactions
    // In a real implementation, you'd link transactions to orders, and orders to meters
    return transactions
      .filter(tx => tx.status === 'completed')
      .slice(0, 10) // Show last 10
      .sort((a, b) => {
        const dateA = a.timestamp || a.createdAt || new Date(0);
        const dateB = b.timestamp || b.createdAt || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
  }, [transactions, selectedSiteId]);

  // Calculate monthly summary from transactions and analytics
  const monthlySummary = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthTransactions = transactions.filter(tx => {
      const txDate = tx.timestamp || tx.createdAt || new Date(0);
      return txDate >= startOfMonth && tx.status === 'completed';
    });

    const sales = monthTransactions.filter(tx => tx.tradeType === 'sell' || tx.type === 'energy_sale');
    const purchases = monthTransactions.filter(tx => tx.tradeType === 'buy' || tx.type === 'energy_purchase');

    const totalSales = sales.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const totalPurchases = purchases.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const totalEnergySold = sales.reduce((sum, tx) => sum + (tx.energyAmount || 0), 0);
    const totalEnergyBought = purchases.reduce((sum, tx) => sum + (tx.energyAmount || 0), 0);

    const daysInMonth = now.getDate();
    const avgDailyRevenue = daysInMonth > 0 ? (totalSales - totalPurchases) / daysInMonth : 0;

    // Calculate peak trading hours (simplified - would need timestamp analysis)
    // Group transactions by hour and find peak
    const hourCounts: { [key: number]: number } = {};
    monthTransactions.forEach(tx => {
      const txDate = tx.timestamp || tx.createdAt || new Date();
      const hour = txDate.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    let peakStart = 10;
    let peakEnd = 16;
    let maxCount = 0;
    for (let h = 0; h < 24; h++) {
      if ((hourCounts[h] || 0) > maxCount) {
        maxCount = hourCounts[h] || 0;
        peakStart = h;
        peakEnd = h + 4;
      }
    }
    
    const formatHour = (h: number) => {
      const period = h >= 12 ? 'PM' : 'AM';
      const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
      return `${hour12} ${period}`;
    };
    
    const peakHours = maxCount > 0 
      ? `${formatHour(peakStart)} - ${formatHour(peakEnd)}`
      : '10 AM - 4 PM';

    // Calculate generation time from analytics
    // Assuming average generation rate, calculate hours
    const energyGenerated = analytics?.energyGenerated || 0;
    const avgGenerationRate = 5; // kW average (simplified)
    const generationHours = avgGenerationRate > 0 ? (energyGenerated / avgGenerationRate / 30).toFixed(1) : '0';

    return {
      generationTime: `${generationHours} hours/day`,
      avgDailyRevenue: `₹${Math.round(Math.max(0, avgDailyRevenue))}`,
      peakTradingHours: peakHours,
      totalSales,
      totalPurchases,
      netRevenue: totalSales - totalPurchases,
    };
  }, [transactions, analytics]);

  // Buyer-specific analytics data (Smart Meter Analytics)
  const buyerAnalytics = useMemo(() => {
    if (!isBuyer) return null;

    // Calculate consumption data from energyData or use mock data
    const consumptionData = energyData?.map(d => d.consumption) || [];
    const totalConsumption = consumptionData.reduce((a, b) => a + b, 0) * 0.25; // 15-min intervals to kWh
    const avgConsumption = consumptionData.length > 0
      ? consumptionData.reduce((a, b) => a + b, 0) / consumptionData.length
      : 0;
    const peakConsumption = consumptionData.length > 0 ? Math.max(...consumptionData) : 0;

    // Time-of-Use (ToU) Data - categorize by peak/off-peak hours
    // Peak hours: 6 PM - 10 PM (18:00 - 22:00)
    // Off-peak hours: All other times
    let peakHoursConsumption = 0;
    let offPeakHoursConsumption = 0;

    energyData?.forEach(d => {
      const hour = d.timestamp.getHours();
      const consumption = d.consumption * 0.25; // Convert to kWh
      if (hour >= 18 && hour < 22) {
        peakHoursConsumption += consumption;
      } else {
        offPeakHoursConsumption += consumption;
      }
    });

    // Billing & Cost Analytics
    const peakRate = 8.5; // INR per kWh during peak hours
    const offPeakRate = 5.5; // INR per kWh during off-peak hours
    const peakCost = peakHoursConsumption * peakRate;
    const offPeakCost = offPeakHoursConsumption * offPeakRate;
    const totalCost = peakCost + offPeakCost;
    const avgDailyCost = totalCost / 30; // Assuming monthly data

    // Energy purchases from P2P trading
    const purchases = transactions.filter(tx =>
      tx.tradeType === 'buy' || tx.type === 'energy_purchase'
    );
    const totalPurchased = purchases.reduce((sum, tx) => sum + (tx.energyAmount || 0), 0);
    const totalPurchaseCost = purchases.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const avgPurchaseRate = totalPurchased > 0 ? totalPurchaseCost / totalPurchased : 0;

    // Power Quality Metrics (simulated based on available data)
    const powerFactor = 0.92 + Math.random() * 0.06; // 0.92 - 0.98
    const voltageStability = 98 + Math.random() * 1.5; // 98% - 99.5%
    const frequency = 49.95 + Math.random() * 0.1; // 49.95 - 50.05 Hz

    // Environmental Analytics
    const gridEmissionFactor = 0.82; // kg CO2 per kWh (India average)
    const p2pEmissionFactor = 0.05; // kg CO2 per kWh (solar energy)
    const gridEmissions = (totalConsumption - totalPurchased) * gridEmissionFactor;
    const p2pEmissions = totalPurchased * p2pEmissionFactor;
    const totalEmissions = gridEmissions + p2pEmissions;
    const emissionsSaved = totalPurchased * (gridEmissionFactor - p2pEmissionFactor);
    const treesEquivalent = Math.round(emissionsSaved / 21); // ~21 kg CO2 per tree per year

    return {
      // Electricity Consumption Data
      totalConsumption,
      avgConsumption,
      peakConsumption,

      // Time-of-Use (ToU) Data
      peakHoursConsumption,
      offPeakHoursConsumption,
      peakHoursPercentage: totalConsumption > 0
        ? (peakHoursConsumption / totalConsumption) * 100
        : 0,

      // Billing & Cost Analytics
      totalCost,
      avgDailyCost,
      peakCost,
      offPeakCost,
      totalPurchased,
      totalPurchaseCost,
      avgPurchaseRate,
      savingsFromP2P: (totalPurchased * offPeakRate) - totalPurchaseCost, // Savings vs off-peak grid rate

      // Power Quality Metrics
      powerFactor,
      voltageStability,
      frequency,

      // Environmental Analytics
      totalEmissions,
      emissionsSaved,
      treesEquivalent,
      greenEnergyPercentage: totalConsumption > 0
        ? (totalPurchased / totalConsumption) * 100
        : 0,
    };
  }, [isBuyer, energyData, transactions]);

  // Use centralized utility functions (imported from @/utils/helpers)
  const formatEnergy = (value: number) => formatEnergyUtil(value, 'kWh');
  const formatCurrency = (value: number) => formatCurrencyUtil(value).replace('.00', '');

  // Prepare chart data from energy data based on time range
  const { chartData, stats } = useMemo(() => {
    logger.log('AnalyticsScreen', '📊 Chart Data Debug:', {
      hasEnergyData: !!energyData,
      energyDataLength: energyData?.length || 0,
      timeRange,
      firstData: energyData?.[0],
    });
    
    if (!energyData || energyData.length === 0) {
      logger.warn('AnalyticsScreen', 'No energy data available');
      return {
        chartData: {
          labels: ['No Data'],
          datasets: [{ data: [0] }],
        },
        stats: {
          avgGeneration: 0,
          maxGeneration: 0,
          avgConsumption: 0,
          maxConsumption: 0,
          totalGenerated: 0,
          netExported: 0,
        },
      };
    }

    // Filter data based on time range
    const now = new Date();
    const filterDate = new Date();
    
    switch (timeRange) {
      case 'day':
        filterDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        filterDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        filterDate.setMonth(now.getMonth() - 1);
        break;
    }
    
    const filtered = energyData
      .filter(d => d.timestamp >= filterDate)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .slice(-96);

    logger.log('AnalyticsScreen', '📈 Filtered data:', { 
      total: energyData.length, 
      filtered: filtered.length,
      filterDate: filterDate.toISOString(),
    });

    if (filtered.length === 0) {
      logger.warn('AnalyticsScreen', 'No data after filtering');
      return {
        chartData: {
          labels: ['No Data'],
          datasets: [{ data: [0] }],
        },
        stats: {
          avgGeneration: 0,
          maxGeneration: 0,
          avgConsumption: 0,
          maxConsumption: 0,
          totalGenerated: 0,
          netExported: 0,
        },
      };
    }

    // Generate labels based on time range
    const labelInterval = timeRange === 'day' ? 8 : timeRange === 'week' ? 12 : 16;
    const labels = filtered.map((d, i) => {
      if (i % labelInterval === 0) {
        if (timeRange === 'day') {
          return `${d.timestamp.getHours().toString().padStart(2, '0')}:${d.timestamp.getMinutes().toString().padStart(2, '0')}`;
        } else {
          return `${d.timestamp.getDate()}/${d.timestamp.getMonth() + 1}`;
        }
      }
      return '';
    });

    const generationData = filtered.map(d => Number(d.generation) || 0);
    const consumptionData = filtered.map(d => Number(d.consumption) || 0);
    const netExportData = filtered.map((d, i) => generationData[i] - consumptionData[i]);

    // Calculate stats
    const avgGen = generationData.reduce((a, b) => a + b, 0) / generationData.length;
    const maxGen = Math.max(...generationData);
    const avgCon = consumptionData.reduce((a, b) => a + b, 0) / consumptionData.length;
    const maxCon = Math.max(...consumptionData);
    const totalGen = generationData.reduce((a, b) => a + b, 0) * 0.25; // 15-min intervals to kWh
    const netExp = netExportData.reduce((a, b) => a + b, 0) * 0.25;

    logger.log('AnalyticsScreen', '✅ Chart data prepared:', {
      dataPoints: generationData.length,
      avgGen: avgGen.toFixed(2),
      avgCon: avgCon.toFixed(2),
      totalGen: totalGen.toFixed(2),
    });

    return {
      chartData: {
        labels,
        generation: generationData,
        consumption: consumptionData,
        netExport: netExportData,
      },
      stats: {
        avgGeneration: avgGen,
        maxGeneration: maxGen,
        avgConsumption: avgCon,
        maxConsumption: maxCon,
        totalGenerated: totalGen,
        netExported: netExp,
      },
    };
  }, [energyData, selectedSiteId, selectedMeterId, timeRange]);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-IN', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <LinearGradient
      colors={['#e0f2fe', '#f0f9ff', '#ffffff']}
      style={styles.gradientBackground}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={[styles.container, { backgroundColor: 'transparent' }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
          }
        >
          {/* Header */}
          <View style={styles.headerSimple}>
          <Text style={styles.headerTitleNew}>{isBuyer ? 'Smart Meter Analytics' : 'Energy Analytics'}</Text>
          <Text style={styles.headerSubtitleNew}>{isBuyer ? 'Your Consumption Insights' : 'Your Trading Performance'}</Text>
        </View>

      {/* Site & Meter Selector Row */}
      {(userSites.length > 0 || meters.length > 0) && (
        <View style={styles.selectorRow}>
          <SiteSelector
            sites={userSites}
            selectedSiteId={selectedSiteId}
            selectedSiteIds={selectedSiteIds}
            multiSelect={true}
            onSiteChange={(siteId) => {
              if (siteId === 'add') {
                // This is now handled by onAddSite callback
              } else {
                setSelectedSiteId(siteId);
                if (siteId !== 'all') {
                  setSelectedMeterId('all'); // Reset meter when site is selected
                }
              }
            }}
            onMultiSiteChange={handleMultiSiteChange}
            onAddSite={handleAddSite}
            onDeleteSite={handleDeleteSite}
          />
          {meters.length > 0 && (
            <MeterSelector
              meters={meters}
              sites={sites}
              selectedMeterId={selectedMeterId}
              onMeterChange={(meterId) => {
                setSelectedMeterId(meterId);
                if (meterId !== 'all') {
                  setSelectedSiteId('all'); // Reset site when meter is selected
                }
              }}
            />
          )}
        </View>
      )}

      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        <TouchableOpacity
          style={[styles.timeRangeButton, timeRange === 'day' && styles.timeRangeButtonActive]}
          onPress={() => setTimeRange('day')}
        >
          <Text style={[styles.timeRangeText, timeRange === 'day' && styles.timeRangeTextActive]}>
            Day
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeRangeButton, timeRange === 'week' && styles.timeRangeButtonActive]}
          onPress={() => setTimeRange('week')}
        >
          <Text style={[styles.timeRangeText, timeRange === 'week' && styles.timeRangeTextActive]}>
            Week
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeRangeButton, timeRange === 'month' && styles.timeRangeButtonActive]}
          onPress={() => setTimeRange('month')}
        >
          <Text style={[styles.timeRangeText, timeRange === 'month' && styles.timeRangeTextActive]}>
            Month
          </Text>
        </TouchableOpacity>
      </View>

      {/* Key Metrics Section - Different for Buyer vs Seller */}
      {isBuyer && buyerAnalytics ? (
        /* ========== BUYER ANALYTICS - Smart Meter Data ========== */
        <>
          {/* Electricity Consumption Data */}
          <View style={styles.energyMetricsSection}>
            <Text style={styles.sectionTitleNew}>Electricity Consumption</Text>

            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <View style={[styles.metricIcon, { backgroundColor: '#fee2e2' }]}>
                  <MaterialCommunityIcons name="flash" size={18} color="#ef4444" />
                </View>
                <Text style={styles.metricLabel}>TOTAL CONSUMPTION</Text>
                <Text style={styles.metricValue}>
                  {buyerAnalytics.totalConsumption.toFixed(2)} <Text style={styles.metricUnit}>kWh</Text>
                </Text>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIcon, { backgroundColor: '#fee2e2' }]}>
                  <MaterialCommunityIcons name="gauge" size={18} color="#ef4444" />
                </View>
                <Text style={styles.metricLabel}>AVG CONSUMPTION</Text>
                <Text style={styles.metricValue}>
                  {buyerAnalytics.avgConsumption.toFixed(2)} <Text style={styles.metricUnit}>kW</Text>
                </Text>
              </View>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <View style={[styles.metricIcon, { backgroundColor: '#fef3c7' }]}>
                  <MaterialCommunityIcons name="flash-alert" size={18} color="#f59e0b" />
                </View>
                <Text style={styles.metricLabel}>PEAK DEMAND</Text>
                <Text style={styles.metricValue}>
                  {buyerAnalytics.peakConsumption.toFixed(2)} <Text style={styles.metricUnit}>kW</Text>
                </Text>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIcon, { backgroundColor: '#dbeafe' }]}>
                  <MaterialCommunityIcons name="cart" size={18} color="#3b82f6" />
                </View>
                <Text style={styles.metricLabel}>P2P PURCHASED</Text>
                <Text style={styles.metricValue}>
                  {buyerAnalytics.totalPurchased.toFixed(2)} <Text style={styles.metricUnit}>kWh</Text>
                </Text>
              </View>
            </View>
          </View>

          {/* Time-of-Use (ToU) Data */}
          <View style={styles.energyMetricsSection}>
            <Text style={styles.sectionTitleNew}>Time-of-Use Analysis</Text>

            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <View style={[styles.metricIcon, { backgroundColor: '#fef3c7' }]}>
                  <MaterialCommunityIcons name="weather-sunny" size={18} color="#f59e0b" />
                </View>
                <Text style={styles.metricLabel}>PEAK HOURS (6-10 PM)</Text>
                <Text style={styles.metricValue}>
                  {buyerAnalytics.peakHoursConsumption.toFixed(2)} <Text style={styles.metricUnit}>kWh</Text>
                </Text>
                <View style={[styles.trendBadge, { backgroundColor: '#fef3c7' }]}>
                  <Text style={[styles.trendText, { color: '#f59e0b' }]}>
                    {buyerAnalytics.peakHoursPercentage.toFixed(1)}% of total
                  </Text>
                </View>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIcon, { backgroundColor: '#dbeafe' }]}>
                  <MaterialCommunityIcons name="weather-night" size={18} color="#3b82f6" />
                </View>
                <Text style={styles.metricLabel}>OFF-PEAK HOURS</Text>
                <Text style={styles.metricValue}>
                  {buyerAnalytics.offPeakHoursConsumption.toFixed(2)} <Text style={styles.metricUnit}>kWh</Text>
                </Text>
                <View style={[styles.trendBadge, { backgroundColor: '#dbeafe' }]}>
                  <Text style={[styles.trendText, { color: '#3b82f6' }]}>
                    {(100 - buyerAnalytics.peakHoursPercentage).toFixed(1)}% of total
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Billing & Cost Analytics */}
          <View style={styles.energyMetricsSection}>
            <Text style={styles.sectionTitleNew}>Billing & Cost Analytics</Text>

            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <View style={[styles.metricIcon, { backgroundColor: '#fee2e2' }]}>
                  <MaterialCommunityIcons name="currency-inr" size={18} color="#ef4444" />
                </View>
                <Text style={styles.metricLabel}>TOTAL COST</Text>
                <Text style={styles.metricValue}>
                  {formatCurrency(buyerAnalytics.totalCost)}
                </Text>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIcon, { backgroundColor: '#fef3c7' }]}>
                  <MaterialCommunityIcons name="calendar-today" size={18} color="#f59e0b" />
                </View>
                <Text style={styles.metricLabel}>AVG DAILY COST</Text>
                <Text style={styles.metricValue}>
                  {formatCurrency(buyerAnalytics.avgDailyCost)}
                </Text>
              </View>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <View style={[styles.metricIcon, { backgroundColor: '#dbeafe' }]}>
                  <MaterialCommunityIcons name="handshake" size={18} color="#3b82f6" />
                </View>
                <Text style={styles.metricLabel}>P2P PURCHASE COST</Text>
                <Text style={styles.metricValue}>
                  {formatCurrency(buyerAnalytics.totalPurchaseCost)}
                </Text>
                <View style={[styles.trendBadge, { backgroundColor: '#dbeafe' }]}>
                  <Text style={[styles.trendText, { color: '#3b82f6' }]}>
                    Avg: {formatCurrency(buyerAnalytics.avgPurchaseRate)}/kWh
                  </Text>
                </View>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIcon, { backgroundColor: '#dcfce7' }]}>
                  <MaterialCommunityIcons name="piggy-bank" size={18} color="#10b981" />
                </View>
                <Text style={styles.metricLabel}>P2P SAVINGS</Text>
                <Text style={[styles.metricValue, { color: buyerAnalytics.savingsFromP2P >= 0 ? '#10b981' : '#ef4444' }]}>
                  {buyerAnalytics.savingsFromP2P >= 0 ? '+' : ''}{formatCurrency(buyerAnalytics.savingsFromP2P)}
                </Text>
              </View>
            </View>
          </View>

          {/* Power Quality Metrics */}
          <View style={styles.energyMetricsSection}>
            <Text style={styles.sectionTitleNew}>Power Quality Metrics</Text>

            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <View style={[styles.metricIcon, { backgroundColor: '#ede9fe' }]}>
                  <MaterialCommunityIcons name="sine-wave" size={18} color="#8b5cf6" />
                </View>
                <Text style={styles.metricLabel}>POWER FACTOR</Text>
                <Text style={styles.metricValue}>
                  {buyerAnalytics.powerFactor.toFixed(2)}
                </Text>
                <View style={[styles.efficiencyBadge, {
                  backgroundColor: buyerAnalytics.powerFactor >= 0.95 ? '#dcfce7' : buyerAnalytics.powerFactor >= 0.9 ? '#fef3c7' : '#fee2e2'
                }]}>
                  <Text style={[styles.efficiencyBadgeText, {
                    color: buyerAnalytics.powerFactor >= 0.95 ? '#10b981' : buyerAnalytics.powerFactor >= 0.9 ? '#f59e0b' : '#ef4444'
                  }]}>
                    {buyerAnalytics.powerFactor >= 0.95 ? 'Excellent' : buyerAnalytics.powerFactor >= 0.9 ? 'Good' : 'Fair'}
                  </Text>
                </View>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIcon, { backgroundColor: '#dbeafe' }]}>
                  <MaterialCommunityIcons name="signal" size={18} color="#3b82f6" />
                </View>
                <Text style={styles.metricLabel}>VOLTAGE STABILITY</Text>
                <Text style={styles.metricValue}>
                  {buyerAnalytics.voltageStability.toFixed(1)}<Text style={styles.metricUnit}>%</Text>
                </Text>
              </View>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <View style={[styles.metricIcon, { backgroundColor: '#e0f2fe' }]}>
                  <MaterialCommunityIcons name="pulse" size={18} color="#0ea5e9" />
                </View>
                <Text style={styles.metricLabel}>GRID FREQUENCY</Text>
                <Text style={styles.metricValue}>
                  {buyerAnalytics.frequency.toFixed(2)} <Text style={styles.metricUnit}>Hz</Text>
                </Text>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIcon, { backgroundColor: '#dcfce7' }]}>
                  <MaterialCommunityIcons name="check-circle" size={18} color="#10b981" />
                </View>
                <Text style={styles.metricLabel}>SUPPLY QUALITY</Text>
                <Text style={styles.metricValue}>Good</Text>
              </View>
            </View>
          </View>

          {/* Environmental Analytics */}
          <View style={styles.energyMetricsSection}>
            <Text style={styles.sectionTitleNew}>Environmental Impact</Text>

            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <View style={[styles.metricIcon, { backgroundColor: '#dcfce7' }]}>
                  <MaterialCommunityIcons name="leaf" size={18} color="#10b981" />
                </View>
                <Text style={styles.metricLabel}>GREEN ENERGY</Text>
                <Text style={styles.metricValue}>
                  {buyerAnalytics.greenEnergyPercentage.toFixed(1)}<Text style={styles.metricUnit}>%</Text>
                </Text>
                <View style={[styles.trendBadge, { backgroundColor: '#dcfce7' }]}>
                  <Text style={[styles.trendText, { color: '#10b981' }]}>
                    From P2P solar
                  </Text>
                </View>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIcon, { backgroundColor: '#fee2e2' }]}>
                  <MaterialCommunityIcons name="factory" size={18} color="#ef4444" />
                </View>
                <Text style={styles.metricLabel}>CO2 EMISSIONS</Text>
                <Text style={styles.metricValue}>
                  {buyerAnalytics.totalEmissions.toFixed(1)} <Text style={styles.metricUnit}>kg</Text>
                </Text>
              </View>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <View style={[styles.metricIcon, { backgroundColor: '#dcfce7' }]}>
                  <MaterialCommunityIcons name="cloud-check" size={18} color="#10b981" />
                </View>
                <Text style={styles.metricLabel}>EMISSIONS SAVED</Text>
                <Text style={[styles.metricValue, { color: '#10b981' }]}>
                  {buyerAnalytics.emissionsSaved.toFixed(1)} <Text style={styles.metricUnit}>kg CO2</Text>
                </Text>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIcon, { backgroundColor: '#dcfce7' }]}>
                  <MaterialCommunityIcons name="tree" size={18} color="#10b981" />
                </View>
                <Text style={styles.metricLabel}>TREES EQUIVALENT</Text>
                <Text style={[styles.metricValue, { color: '#10b981' }]}>
                  {buyerAnalytics.treesEquivalent} <Text style={styles.metricUnit}>trees</Text>
                </Text>
              </View>
            </View>
          </View>
        </>
      ) : (
        /* ========== SELLER ANALYTICS - Inverter Data ========== */
        chartData.generation && chartData.generation.length > 0 && chartData.labels[0] !== 'No Data' && (
        <View style={styles.energyMetricsSection}>
          <Text style={styles.sectionTitleNew}>Key Metrics</Text>

          {/* Row 1: Average Generation | Peak Generation */}
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: '#dbeafe' }]}>
                <MaterialCommunityIcons name="solar-power" size={18} color="#3b82f6" />
              </View>
              <Text style={styles.metricLabel}>AVG GENERATION</Text>
              <Text style={styles.metricValue}>
                {stats.avgGeneration.toFixed(2)} <Text style={styles.metricUnit}>kW</Text>
              </Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: '#dbeafe' }]}>
                <MaterialCommunityIcons name="lightning-bolt" size={18} color="#3b82f6" />
              </View>
              <Text style={styles.metricLabel}>PEAK GENERATION</Text>
              <Text style={styles.metricValue}>
                {stats.maxGeneration.toFixed(2)} <Text style={styles.metricUnit}>kW</Text>
              </Text>
            </View>
          </View>

          {/* Row 2: Average Consumption | Peak Consumption */}
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: '#fee2e2' }]}>
                <MaterialCommunityIcons name="flash" size={18} color="#ef4444" />
              </View>
              <Text style={styles.metricLabel}>AVG CONSUMPTION</Text>
              <Text style={styles.metricValue}>
                {stats.avgConsumption.toFixed(2)} <Text style={styles.metricUnit}>kW</Text>
              </Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: '#fee2e2' }]}>
                <MaterialCommunityIcons name="flash-alert" size={18} color="#ef4444" />
              </View>
              <Text style={styles.metricLabel}>PEAK CONSUMPTION</Text>
              <Text style={styles.metricValue}>
                {stats.maxConsumption.toFixed(2)} <Text style={styles.metricUnit}>kW</Text>
              </Text>
            </View>
          </View>

          {/* Row 3: Total Generated | Net Export */}
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: '#dbeafe' }]}>
                <MaterialCommunityIcons name="chart-bar" size={18} color="#3b82f6" />
              </View>
              <Text style={styles.metricLabel}>TOTAL GENERATED</Text>
              <Text style={styles.metricValue}>
                {stats.totalGenerated.toFixed(2)} <Text style={styles.metricUnit}>kWh</Text>
              </Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: stats.netExported >= 0 ? '#dbeafe' : '#fee2e2' }]}>
                <MaterialCommunityIcons name="swap-horizontal" size={18} color={stats.netExported >= 0 ? '#3b82f6' : '#ef4444'} />
              </View>
              <Text style={styles.metricLabel}>NET EXPORT</Text>
              <Text style={[styles.metricValue, { color: stats.netExported >= 0 ? '#3b82f6' : '#ef4444' }]}>
                {stats.netExported >= 0 ? '+' : ''}{stats.netExported.toFixed(2)} <Text style={styles.metricUnit}>kWh</Text>
              </Text>
            </View>
          </View>
        </View>
        )
      )}

      {/* Site/Meter Information Card (when single site or meter selected) */}
      {selectedSite && (selectedSiteId !== 'all' || selectedMeterId !== 'all') && (
        <View style={styles.siteInfoCard}>
          <View style={styles.siteInfoHeader}>
            <MaterialCommunityIcons 
              name={selectedMeterId !== 'all' ? "speedometer" : "home-city"} 
              size={26} 
              color="#10b981" 
            />
            <Text style={styles.siteInfoTitle}>
              {selectedMeterId !== 'all' 
                ? `Meter ${selectedSite.consumerNumber || 'Details'}` 
                : selectedSite.name}
            </Text>
          </View>
          <View style={styles.siteInfoDetails}>
            <View style={styles.siteInfoRow}>
              <Text style={styles.siteInfoLabel}>DISCOM:</Text>
              <Text style={styles.siteInfoValue}>{selectedSite.discomName}</Text>
            </View>
            <View style={styles.siteInfoRow}>
              <Text style={styles.siteInfoLabel}>Consumer No:</Text>
              <Text style={styles.siteInfoValue}>{selectedSite.consumerNumber}</Text>
            </View>
            {selectedSite.address && (
              <View style={styles.siteInfoRow}>
                <Text style={styles.siteInfoLabel}>Address:</Text>
                <Text style={styles.siteInfoValue}>{selectedSite.address}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Stats Cards in 2x2 Grid - Only shown for Sellers */}
      {!isBuyer && (
        loading ? (
          <View style={styles.loadingContainerNew}>
            <View style={styles.loadingIconContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
            <Text style={styles.loadingTextNew}>Loading analytics...</Text>
            <Text style={styles.loadingSubtext}>Fetching your energy data</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainerNew}>
            <View style={styles.errorIconContainer}>
              <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#ef4444" />
            </View>
            <Text style={styles.errorTextNew}>Error Loading Analytics</Text>
            <Text style={styles.errorSubtextNew}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButtonNew}
              onPress={() => loadAnalytics()}
            >
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                style={styles.retryButtonGradientNew}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MaterialCommunityIcons name="refresh" size={18} color="#ffffff" />
                <Text style={styles.retryButtonTextNew}>Try Again</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : analytics ? (
          <View style={styles.analyticsStatsSection}>
            <Text style={styles.sectionTitleNew}>Trading Overview</Text>

            {/* Row 1: Energy Generated | Total Revenue */}
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <View style={[styles.metricIcon, { backgroundColor: '#e0f2fe' }]}>
                  <MaterialCommunityIcons name="lightning-bolt" size={18} color="#0ea5e9" />
                </View>
                <Text style={styles.metricLabel}>ENERGY GENERATED</Text>
                <Text style={styles.metricValue}>{formatEnergy(analytics.energyGenerated)}</Text>
                <View style={styles.trendBadge}>
                  <MaterialCommunityIcons
                    name={analytics.trends.generation.startsWith('+') ? 'trending-up' : 'trending-down'}
                    size={12}
                    color={analytics.trends.generation.startsWith('+') ? '#10b981' : '#ef4444'}
                  />
                  <Text style={[styles.trendText, { color: analytics.trends.generation.startsWith('+') ? '#10b981' : '#ef4444' }]}>
                    {analytics.trends.generation}
                  </Text>
                </View>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIcon, { backgroundColor: '#dbeafe' }]}>
                  <MaterialCommunityIcons name="currency-inr" size={18} color="#3b82f6" />
                </View>
                <Text style={styles.metricLabel}>TOTAL REVENUE</Text>
                <Text style={styles.metricValue}>{formatCurrency(analytics.totalRevenue)}</Text>
                <View style={styles.trendBadge}>
                  <MaterialCommunityIcons
                    name={analytics.trends.revenue.startsWith('+') ? 'trending-up' : 'trending-down'}
                    size={12}
                    color={analytics.trends.revenue.startsWith('+') ? '#10b981' : '#ef4444'}
                  />
                  <Text style={[styles.trendText, { color: analytics.trends.revenue.startsWith('+') ? '#10b981' : '#ef4444' }]}>
                    {analytics.trends.revenue}
                  </Text>
                </View>
              </View>
            </View>

            {/* Row 2: Active Trades | Efficiency */}
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <View style={[styles.metricIcon, { backgroundColor: '#ccfbf1' }]}>
                  <MaterialCommunityIcons name="swap-horizontal" size={18} color="#14b8a6" />
                </View>
                <Text style={styles.metricLabel}>ACTIVE TRADES</Text>
                <Text style={styles.metricValue}>{analytics.activeTrades}</Text>
                <View style={styles.trendBadge}>
                  <MaterialCommunityIcons name="check-circle" size={12} color="#10b981" />
                  <Text style={[styles.trendText, { color: '#64748b' }]}>
                    {analytics.completedTrades} completed
                  </Text>
                </View>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIcon, { backgroundColor: '#ede9fe' }]}>
                  <MaterialCommunityIcons name="star" size={18} color="#8b5cf6" />
                </View>
                <Text style={styles.metricLabel}>EFFICIENCY</Text>
                <Text style={styles.metricValue}>{analytics.efficiency.toFixed(1)}%</Text>
                <View style={[styles.efficiencyBadge, {
                  backgroundColor: analytics.efficiency >= 90 ? '#dcfce7' : analytics.efficiency >= 70 ? '#fef3c7' : '#fee2e2'
                }]}>
                  <Text style={[styles.efficiencyBadgeText, {
                    color: analytics.efficiency >= 90 ? '#10b981' : analytics.efficiency >= 70 ? '#f59e0b' : '#ef4444'
                  }]}>
                    {analytics.efficiency >= 90 ? 'Excellent' : analytics.efficiency >= 70 ? 'Good' : 'Fair'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyContainerNew}>
            <View style={styles.emptyIconContainer}>
              <MaterialCommunityIcons name="chart-line-variant" size={48} color="#94a3b8" />
            </View>
            <Text style={styles.emptyTextNew}>No Analytics Data</Text>
            <Text style={styles.emptySubtextNew}>
              {sites.length === 0
                ? 'Register a meter to view analytics'
                : 'Analytics data will appear here once available'}
            </Text>
          </View>
        )
      )}

      {/* Graphical Analysis Section - Different for Buyer vs Seller */}
      {isBuyer ? (
        /* Buyer: Show only Consumption Chart */
        <View style={styles.chartsSection}>
          <Text style={styles.sectionTitleNew}>Consumption Analysis</Text>

          {chartData.consumption && chartData.consumption.length > 0 && chartData.labels[0] !== 'No Data' ? (
            <View style={styles.chartCard}>
              {/* Chart Header */}
              <View style={styles.chartCardHeader}>
                <Text style={styles.chartCardTitle}>Electricity Consumption Trends</Text>
                <View style={styles.chartLegend}>
                  <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                  <Text style={styles.legendText}>kW</Text>
                </View>
              </View>

              {/* Chart Content */}
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <LineChart
                  data={{
                    labels: chartData.labels,
                    datasets: [{
                      data: chartData.consumption && chartData.consumption.length > 0 ? chartData.consumption : [0],
                      color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                      strokeWidth: 2,
                    }],
                  }}
                  width={Math.max(width - 48, (chartData.consumption?.length || 1) * 8)}
                  height={220}
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 2,
                    color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                    propsForDots: { r: '4', strokeWidth: '2', stroke: '#ef4444' },
                    propsForBackgroundLines: {
                      strokeDasharray: '',
                      stroke: '#e5e7eb',
                      strokeWidth: 1,
                    },
                  }}
                  bezier
                  style={styles.chart}
                  withDots={true}
                  withShadow={false}
                />
              </ScrollView>
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <MaterialCommunityIcons name="chart-line-variant" size={48} color="#d1d5db" />
              <Text style={styles.noDataText}>No consumption data available</Text>
              <Text style={styles.noDataSubtext}>Register your smart meter to start tracking consumption</Text>
            </View>
          )}
        </View>
      ) : (
        /* Seller: Show Full Graphical Analysis with Generation, Consumption, etc. */
        <View style={styles.chartsSection}>
          <Text style={styles.sectionTitleNew}>Graphical Analysis</Text>

          {chartData.generation && chartData.generation.length > 0 && chartData.labels[0] !== 'No Data' ? (
          <View style={styles.chartCard}>
            {/* Chart Type Selector */}
            <View style={styles.chartTypeSelector}>
              <TouchableOpacity
                style={[styles.chartTypeButton, selectedChartType === 'generation' && styles.chartTypeButtonActive]}
                onPress={() => setSelectedChartType('generation')}
              >
                <MaterialCommunityIcons
                  name="solar-power"
                  size={16}
                  color={selectedChartType === 'generation' ? '#ffffff' : '#6b7280'}
                />
                <Text style={[styles.chartTypeText, selectedChartType === 'generation' && styles.chartTypeTextActive]}>
                  Generation
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chartTypeButton, selectedChartType === 'consumption' && styles.chartTypeButtonActive]}
                onPress={() => setSelectedChartType('consumption')}
              >
                <MaterialCommunityIcons
                  name="flash"
                  size={16}
                  color={selectedChartType === 'consumption' ? '#ffffff' : '#6b7280'}
                />
                <Text style={[styles.chartTypeText, selectedChartType === 'consumption' && styles.chartTypeTextActive]}>
                  Consumption
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chartTypeButton, selectedChartType === 'comparison' && styles.chartTypeButtonActive]}
                onPress={() => setSelectedChartType('comparison')}
              >
                <MaterialCommunityIcons
                  name="compare"
                  size={16}
                  color={selectedChartType === 'comparison' ? '#ffffff' : '#6b7280'}
                />
                <Text style={[styles.chartTypeText, selectedChartType === 'comparison' && styles.chartTypeTextActive]}>
                  Compare
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chartTypeButton, selectedChartType === 'netExport' && styles.chartTypeButtonActive]}
                onPress={() => setSelectedChartType('netExport')}
              >
                <MaterialCommunityIcons
                  name="swap-horizontal"
                  size={16}
                  color={selectedChartType === 'netExport' ? '#ffffff' : '#6b7280'}
                />
                <Text style={[styles.chartTypeText, selectedChartType === 'netExport' && styles.chartTypeTextActive]}>
                  Net Export
                </Text>
              </TouchableOpacity>
            </View>

            {/* Chart Header */}
            <View style={styles.chartCardHeader}>
              <Text style={styles.chartCardTitle}>
                {selectedChartType === 'generation' && 'Generation Trends'}
                {selectedChartType === 'consumption' && 'Consumption Patterns'}
                {selectedChartType === 'comparison' && 'Generation vs Consumption'}
                {selectedChartType === 'netExport' && 'Net Export Over Time'}
              </Text>
              <View style={styles.chartLegend}>
                {selectedChartType === 'comparison' ? (
                  <>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                      <Text style={styles.legendText}>Gen</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                      <Text style={styles.legendText}>Con</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={[styles.legendDot, {
                      backgroundColor: selectedChartType === 'generation' ? '#10b981' :
                                       selectedChartType === 'consumption' ? '#ef4444' : '#3b82f6'
                    }]} />
                    <Text style={styles.legendText}>kW</Text>
                  </>
                )}
              </View>
            </View>

            {/* Chart Content */}
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              {selectedChartType === 'generation' && (
                <LineChart
                  data={{
                    labels: chartData.labels,
                    datasets: [{
                      data: chartData.generation.length > 0 ? chartData.generation : [0],
                      color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                      strokeWidth: 2,
                    }],
                  }}
                  width={Math.max(width - 48, chartData.generation.length * 8)}
                  height={220}
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 2,
                    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                    propsForDots: { r: '4', strokeWidth: '2', stroke: '#10b981' },
                    propsForBackgroundLines: {
                      strokeDasharray: '',
                      stroke: '#e5e7eb',
                      strokeWidth: 1,
                    },
                  }}
                  bezier
                  style={styles.chart}
                  withDots={true}
                  withShadow={false}
                />
              )}
              {selectedChartType === 'consumption' && (
                <LineChart
                  data={{
                    labels: chartData.labels,
                    datasets: [{
                      data: chartData.consumption && chartData.consumption.length > 0 ? chartData.consumption : [0],
                      color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                      strokeWidth: 2,
                    }],
                  }}
                  width={Math.max(width - 48, (chartData.consumption?.length || 1) * 8)}
                  height={220}
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 2,
                    color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                    propsForDots: { r: '4', strokeWidth: '2', stroke: '#ef4444' },
                    propsForBackgroundLines: {
                      strokeDasharray: '',
                      stroke: '#e5e7eb',
                      strokeWidth: 1,
                    },
                  }}
                  bezier
                  style={styles.chart}
                  withDots={true}
                  withShadow={false}
                />
              )}
              {selectedChartType === 'comparison' && (
                <LineChart
                  data={{
                    labels: chartData.labels,
                    datasets: [
                      {
                        data: chartData.generation && chartData.generation.length > 0 ? chartData.generation : [0],
                        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                        strokeWidth: 2,
                      },
                      {
                        data: chartData.consumption && chartData.consumption.length > 0 ? chartData.consumption : [0],
                        color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                        strokeWidth: 2,
                      },
                    ],
                  }}
                  width={Math.max(width - 48, (chartData.generation?.length || 1) * 8)}
                  height={220}
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 2,
                    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                    propsForDots: { r: '4', strokeWidth: '2', stroke: '#10b981' },
                    propsForBackgroundLines: {
                      strokeDasharray: '',
                      stroke: '#e5e7eb',
                      strokeWidth: 1,
                    },
                  }}
                  bezier
                  style={styles.chart}
                  withDots={true}
                  withShadow={false}
                />
              )}
              {selectedChartType === 'netExport' && (
                <LineChart
                  data={{
                    labels: chartData.labels,
                    datasets: [{
                      data: chartData.netExport && chartData.netExport.length > 0 ? chartData.netExport : [0],
                      color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                      strokeWidth: 2,
                    }],
                  }}
                  width={Math.max(width - 48, (chartData.netExport?.length || 1) * 8)}
                  height={220}
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 2,
                    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                    propsForDots: { r: '4', strokeWidth: '2', stroke: '#3b82f6' },
                    propsForBackgroundLines: {
                      strokeDasharray: '',
                      stroke: '#e5e7eb',
                      strokeWidth: 1,
                    },
                  }}
                  bezier
                  style={styles.chart}
                  withDots={true}
                  withShadow={false}
                />
              )}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.noDataContainer}>
            <MaterialCommunityIcons name="chart-line-variant" size={48} color="#d1d5db" />
            <Text style={styles.noDataText}>No chart data available</Text>
            <Text style={styles.noDataSubtext}>Register a meter to start collecting energy data</Text>
          </View>
        )}
        </View>
      )}

      {/* Recent Transactions */}
      <View style={styles.transactionsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitleNew}>Recent Transactions</Text>
          {filteredTransactions.length > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('History')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          )}
        </View>
        {transactionsLoading ? (
          <View style={styles.transactionsLoadingContainer}>
            <ActivityIndicator size="small" color="#10b981" />
            <Text style={styles.transactionsLoadingText}>Loading transactions...</Text>
          </View>
        ) : filteredTransactions.length === 0 ? (
          <View style={styles.emptyTransactionContainer}>
            <MaterialCommunityIcons name="receipt" size={48} color="#d1d5db" />
            <Text style={styles.emptyTransactionText}>No transactions yet</Text>
            <Text style={styles.emptyTransactionSubtext}>
              Your completed trades will appear here
            </Text>
          </View>
        ) : (
          filteredTransactions.map((transaction) => {
            const isSale = transaction.tradeType === 'sell' || transaction.type === 'energy_sale';
            const txDate = transaction.timestamp || transaction.createdAt || new Date();
            
            return (
              <View key={transaction.id} style={styles.transactionItem}>
                <View style={styles.transactionLeft}>
                  <View style={[styles.transactionIcon, { backgroundColor: isSale ? '#dbeafe' : '#e0f2fe' }]}>
                    <MaterialCommunityIcons
                      name={isSale ? 'arrow-up' : 'arrow-down'}
                      size={18}
                      color={isSale ? '#3b82f6' : '#0ea5e9'}
                    />
                  </View>
                  <View style={styles.transactionDetails}>
                    <View style={styles.transactionHeaderRow}>
                      <Text style={styles.transactionType}>
                        {isSale ? 'Sale' : 'Purchase'}
                      </Text>
                      {selectedSiteId !== 'all' && selectedSite && (
                        <View style={styles.siteBadge}>
                          <Text style={styles.siteBadgeText}>{selectedSite.name.split(' - ')[0]}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.transactionDate}>{formatDate(txDate)}</Text>
                    {transaction.counterPartyName && (
                      <Text style={styles.transactionCounterParty}>
                        {isSale ? 'To' : 'From'}: {transaction.counterPartyName}
                      </Text>
                    )}
                    {transaction.energyAmount && (
                      <Text style={styles.transactionEnergy}>
                        {transaction.energyAmount} kWh @ ₹{transaction.pricePerUnit || 0}/kWh
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.transactionRight}>
                  <Text style={[styles.transactionAmount, { color: isSale ? '#3b82f6' : '#0ea5e9' }]}>
                    {isSale ? '+' : '-'}{formatCurrency(transaction.amount || 0)}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: transaction.status === 'completed' ? '#dbeafe' : '#e0f2fe' }]}>
                    <Text style={[styles.statusBadgeText, { color: transaction.status === 'completed' ? '#1e40af' : '#0369a1' }]}>
                      {transaction.status === 'completed' ? 'Completed' : transaction.status}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Monthly Summary - Different for Buyer vs Seller */}
      {isBuyer && buyerAnalytics ? (
        /* Buyer: Show Monthly Consumption Summary */
        <View style={styles.monthlySummarySection}>
          <Text style={styles.sectionTitleNew}>Monthly Summary</Text>
          <View style={styles.summaryCardNew}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryRowLeft}>
                <MaterialCommunityIcons name="flash" size={18} color="#6b7280" />
                <Text style={styles.summaryLabel}>Total Consumption</Text>
              </View>
              <Text style={styles.summaryValue}>{buyerAnalytics.totalConsumption.toFixed(2)} kWh</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <View style={styles.summaryRowLeft}>
                <MaterialCommunityIcons name="currency-inr" size={18} color="#6b7280" />
                <Text style={styles.summaryLabel}>Avg. Daily Cost</Text>
              </View>
              <Text style={styles.summaryValue}>{formatCurrency(buyerAnalytics.avgDailyCost)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <View style={styles.summaryRowLeft}>
                <MaterialCommunityIcons name="cart" size={18} color="#6b7280" />
                <Text style={styles.summaryLabel}>P2P Energy Purchased</Text>
              </View>
              <Text style={styles.summaryValue}>{buyerAnalytics.totalPurchased.toFixed(2)} kWh</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <View style={styles.summaryRowLeft}>
                <MaterialCommunityIcons name="leaf" size={18} color="#10b981" />
                <Text style={styles.summaryLabel}>Carbon Saved</Text>
              </View>
              <Text style={[styles.summaryValue, { color: '#10b981' }]}>
                {buyerAnalytics.emissionsSaved.toFixed(1)} kg CO2
              </Text>
            </View>
          </View>
        </View>
      ) : analytics && !isBuyer ? (
        /* Seller: Show Trading Summary */
        <View style={styles.monthlySummarySection}>
          <Text style={styles.sectionTitleNew}>Monthly Summary</Text>
          <View style={styles.summaryCardNew}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryRowLeft}>
                <MaterialCommunityIcons name="clock-outline" size={18} color="#6b7280" />
                <Text style={styles.summaryLabel}>Generation Time</Text>
              </View>
              <Text style={styles.summaryValue}>{monthlySummary.generationTime}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <View style={styles.summaryRowLeft}>
                <MaterialCommunityIcons name="currency-inr" size={18} color="#6b7280" />
                <Text style={styles.summaryLabel}>Avg. Daily Revenue</Text>
              </View>
              <Text style={styles.summaryValue}>{monthlySummary.avgDailyRevenue}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <View style={styles.summaryRowLeft}>
                <MaterialCommunityIcons name="chart-line" size={18} color="#6b7280" />
                <Text style={styles.summaryLabel}>Peak Trading Hours</Text>
              </View>
              <Text style={styles.summaryValue}>{monthlySummary.peakTradingHours}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <View style={styles.summaryRowLeft}>
                <MaterialCommunityIcons name="trending-up" size={18} color="#10b981" />
                <Text style={styles.summaryLabel}>Net Revenue</Text>
              </View>
              <Text style={[styles.summaryValue, { color: monthlySummary.netRevenue >= 0 ? '#10b981' : '#ef4444' }]}>
                {formatCurrency(monthlySummary.netRevenue)}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

          {/* Empty Space */}
          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf3',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  headerChipText: {
    marginLeft: 6,
    color: '#065f46',
    fontWeight: '700',
    fontSize: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#d1fae5',
  },
  statsContainer: {
    paddingHorizontal: 12,
    marginTop: -20,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statChange: {
    fontSize: 12,
    color: '#10b981',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  viewAllText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  transactionsLoadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionsLoadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#6b7280',
  },
  transactionItem: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionType: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  transactionStatus: {
    fontSize: 11,
    color: '#9ca3af',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ef4444',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  siteBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  siteBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4f46e5',
  },
  transactionCounterParty: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  transactionEnergy: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyTransactionContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTransactionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyTransactionSubtext: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
  summaryRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    marginTop: 7,
    paddingHorizontal: 16,
  },
  siteInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0fdf4',
  },
  siteInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 12,
  },
  siteInfoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  siteInfoDetails: {
    gap: 12,
  },
  siteInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  siteInfoLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  siteInfoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 5,
    marginBottom: 22,
    gap: 8,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  timeRangeButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  timeRangeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  timeRangeTextActive: {
    color: '#ffffff',
  },
  energyStatsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  energyStatCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  energyStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  energyStatValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  allChartsContainer: {
    marginTop: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  noDataSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  chartWrapper: {
    marginBottom: 8,
  },
  chartHint: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#6b7280',
  },
  noDataContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginTop: 12,
  },
  noDataText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
  },
  // New styles for redesigned UI
  gradientBackground: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  headerSimple: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  headerTitleNew: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  headerSubtitleNew: {
    fontSize: 15,
    color: '#64748b',
  },
  energyMetricsSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitleNew: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
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
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  metricUnit: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '400',
  },
  chartsSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  chartCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  transactionsSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  monthlySummarySection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  summaryCardNew: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  chartTypeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  chartTypeButton: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 6,
  },
  chartTypeButtonActive: {
    backgroundColor: '#3b82f6',
  },
  chartTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  chartTypeTextActive: {
    color: '#ffffff',
  },
  // New styles for redesigned stats section
  loadingContainerNew: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 40,
    marginHorizontal: 16,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingTextNew: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#64748b',
  },
  errorContainerNew: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 40,
    marginHorizontal: 16,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorTextNew: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  errorSubtextNew: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  retryButtonNew: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonGradientNew: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    gap: 8,
  },
  retryButtonTextNew: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  analyticsStatsSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  efficiencyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  efficiencyBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainerNew: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 40,
    marginHorizontal: 16,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTextNew: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptySubtextNew: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default AnalyticsScreen;
