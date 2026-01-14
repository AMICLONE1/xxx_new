import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
          <Text style={styles.headerTitleNew}>Energy Analytics</Text>
          <Text style={styles.headerSubtitleNew}>Your Trading Performance</Text>
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

      {/* Key Metrics Section */}
      {chartData.generation && chartData.generation.length > 0 && chartData.labels[0] !== 'No Data' && (
        <View style={styles.energyMetricsSection}>
          <Text style={styles.sectionTitleNew}>Key Metrics</Text>

          {/* Row 1: Average Generation | Peak Generation */}
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: '#dcfce7' }]}>
                <MaterialCommunityIcons name="solar-power" size={18} color="#10b981" />
              </View>
              <Text style={styles.metricLabel}>AVG GENERATION</Text>
              <Text style={styles.metricValue}>
                {stats.avgGeneration.toFixed(2)} <Text style={styles.metricUnit}>kW</Text>
              </Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: '#dcfce7' }]}>
                <MaterialCommunityIcons name="lightning-bolt" size={18} color="#10b981" />
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
              <View style={[styles.metricIcon, { backgroundColor: '#dcfce7' }]}>
                <MaterialCommunityIcons name="chart-bar" size={18} color="#10b981" />
              </View>
              <Text style={styles.metricLabel}>TOTAL GENERATED</Text>
              <Text style={styles.metricValue}>
                {stats.totalGenerated.toFixed(2)} <Text style={styles.metricUnit}>kWh</Text>
              </Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: stats.netExported >= 0 ? '#dcfce7' : '#fee2e2' }]}>
                <MaterialCommunityIcons name="swap-horizontal" size={18} color={stats.netExported >= 0 ? '#10b981' : '#ef4444'} />
              </View>
              <Text style={styles.metricLabel}>NET EXPORT</Text>
              <Text style={[styles.metricValue, { color: stats.netExported >= 0 ? '#10b981' : '#ef4444' }]}>
                {stats.netExported >= 0 ? '+' : ''}{stats.netExported.toFixed(2)} <Text style={styles.metricUnit}>kWh</Text>
              </Text>
            </View>
          </View>
        </View>
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

      {/* Stats Cards in 2x2 Grid */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#ef4444" />
          <Text style={styles.errorText}>Error Loading Analytics</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadAnalytics()}
          >
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.retryButtonGradient}
            >
              <MaterialCommunityIcons name="refresh" size={20} color="#ffffff" />
              <Text style={styles.retryButtonText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : analytics ? (
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            {/* Energy Generated */}
            <View style={[styles.statCard, { flex: 1, marginRight: 6 }]}>
              <View style={styles.statIconContainer}>
                <MaterialCommunityIcons name="lightning-bolt" size={24} color="#10b981" />
              </View>
              <Text style={styles.statLabel}>Energy Generated</Text>
              <Text style={styles.statValue}>{formatEnergy(analytics.energyGenerated)}</Text>
              <Text style={styles.statChange}>
                {analytics.trends.generation.startsWith('+') ? '↑' : '↓'} {analytics.trends.generation} this month
              </Text>
            </View>

            {/* Total Revenue */}
            <View style={[styles.statCard, { flex: 1, marginLeft: 6 }]}>
              <View style={styles.statIconContainer}>
                <MaterialCommunityIcons name="currency-inr" size={24} color="#f59e0b" />
              </View>
              <Text style={styles.statLabel}>Total Revenue</Text>
              <Text style={styles.statValue}>{formatCurrency(analytics.totalRevenue)}</Text>
              <Text style={styles.statChange}>
                {analytics.trends.revenue.startsWith('+') ? '↑' : '↓'} {analytics.trends.revenue} this month
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            {/* Active Trades */}
            <View style={[styles.statCard, { flex: 1, marginRight: 6 }]}>
              <View style={styles.statIconContainer}>
                <MaterialCommunityIcons name="trending-up" size={24} color="#3b82f6" />
              </View>
              <Text style={styles.statLabel}>Active Trades</Text>
              <Text style={styles.statValue}>{analytics.activeTrades}</Text>
              <Text style={styles.statChange}>{analytics.completedTrades} completed</Text>
            </View>

            {/* Efficiency Rating */}
            <View style={[styles.statCard, { flex: 1, marginLeft: 6 }]}>
              <View style={styles.statIconContainer}>
                <MaterialCommunityIcons name="star" size={24} color="#ec4899" />
              </View>
              <Text style={styles.statLabel}>Efficiency</Text>
              <Text style={styles.statValue}>{analytics.efficiency.toFixed(1)}%</Text>
              <Text style={styles.statChange}>
                {analytics.efficiency >= 90 ? 'Excellent' : analytics.efficiency >= 70 ? 'Good' : 'Fair'}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="chart-line" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>No analytics data available</Text>
          <Text style={styles.emptySubtext}>
            {sites.length === 0 
              ? 'Register a meter to view analytics'
              : 'Analytics data will appear here once available'}
          </Text>
        </View>
      )}

      {/* Graphical Analysis Section */}
      <View style={styles.chartsSection}>
        <Text style={styles.sectionTitleNew}>Graphical Analysis</Text>

        {chartData.generation && chartData.generation.length > 0 && chartData.labels[0] !== 'No Data' ? (
          <>
            {/* 1. Generation Trends */}
            <View style={styles.chartCard}>
              <View style={styles.chartCardHeader}>
                <Text style={styles.chartCardTitle}>Generation Trends</Text>
                <View style={styles.chartLegend}>
                  <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                  <Text style={styles.legendText}>kW</Text>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
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
              </ScrollView>
            </View>

            {/* 2. Consumption Patterns */}
            <View style={styles.chartCard}>
              <View style={styles.chartCardHeader}>
                <Text style={styles.chartCardTitle}>Consumption Patterns</Text>
                <View style={styles.chartLegend}>
                  <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                  <Text style={styles.legendText}>kW</Text>
                </View>
              </View>
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

            {/* 3. Generation vs Consumption */}
            <View style={styles.chartCard}>
              <View style={styles.chartCardHeader}>
                <Text style={styles.chartCardTitle}>Generation vs Consumption</Text>
                <View style={styles.chartLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                    <Text style={styles.legendText}>Gen</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                    <Text style={styles.legendText}>Con</Text>
                  </View>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
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
              </ScrollView>
            </View>

            {/* 4. Net Export Over Time */}
            <View style={styles.chartCard}>
              <View style={styles.chartCardHeader}>
                <Text style={styles.chartCardTitle}>Net Export Over Time</Text>
                <View style={styles.chartLegend}>
                  <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
                  <Text style={styles.legendText}>kW</Text>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
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
              </ScrollView>
            </View>
          </>
        ) : (
          <View style={styles.noDataContainer}>
            <MaterialCommunityIcons name="chart-line-variant" size={48} color="#d1d5db" />
            <Text style={styles.noDataText}>No chart data available</Text>
            <Text style={styles.noDataSubtext}>Register a meter to start collecting energy data</Text>
          </View>
        )}
      </View>

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
                  <View style={[styles.transactionIcon, { backgroundColor: isSale ? '#d1fae5' : '#fef3c7' }]}>
                    <MaterialCommunityIcons 
                      name={isSale ? 'arrow-up' : 'arrow-down'} 
                      size={18} 
                      color={isSale ? '#10b981' : '#f59e0b'} 
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
                  <Text style={[styles.transactionAmount, { color: isSale ? '#10b981' : '#ef4444' }]}>
                    {isSale ? '+' : '-'}{formatCurrency(transaction.amount || 0)}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: transaction.status === 'completed' ? '#d1fae5' : '#fef3c7' }]}>
                    <Text style={[styles.statusBadgeText, { color: transaction.status === 'completed' ? '#065f46' : '#92400e' }]}>
                      {transaction.status === 'completed' ? 'Completed' : transaction.status}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Monthly Summary */}
      {analytics && (
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
      )}

      {/* Empty Space */}
      <View style={{ height: 20 }} />
      </ScrollView>
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
    color: '#10b981',
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
    marginBottom: 24,
    marginTop: 16,
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
    marginTop: 16,
    marginBottom: 16,
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
    backgroundColor: '#10b981',
    borderColor: '#10b981',
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
  headerSimple: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  headerTitleNew: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  headerSubtitleNew: {
    fontSize: 14,
    color: '#64748b',
  },
  energyMetricsSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitleNew: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
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
});

export default AnalyticsScreen;
