import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Share,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useMeterStore } from '@/store';
import { EnergyData, RootStackParamList } from '@/types';
import { formatEnergy } from '@/utils/helpers';
import { getErrorMessage } from '@/utils/errorUtils';

const screenWidth = Dimensions.get('window').width;

type EnergyChartScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EnergyChart'>;

type TimeRange = 'day' | 'week' | 'month';
type ChartType = 'generation' | 'consumption' | 'comparison' | 'netExport';

interface DataPoint {
  timestamp: Date;
  generation: number;
  consumption: number;
  netExport: number;
  index: number;
}

export default function EnergyChartScreen() {
  const navigation = useNavigation<EnergyChartScreenNavigationProp>();
  const { energyData, currentMeter } = useMeterStore();
  const [timeRange, setTimeRange] = useState<TimeRange>('day');
  const [selectedChartType, setSelectedChartType] = useState<ChartType>('generation');
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedDataPoint, setSelectedDataPoint] = useState<DataPoint | null>(null);
  const [showDataPointModal, setShowDataPointModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Filter and process data based on time range
  const filteredData = useMemo(() => {
    if (!energyData.length) {
      return {
        labels: [],
        datasets: [{
          data: [0],
          color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
          strokeWidth: 2,
        }],
        dataPoints: [] as DataPoint[],
      };
    }

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
      .filter((data) => data.timestamp >= filterDate)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .slice(-96);

    const dataPoints: DataPoint[] = filtered.map((data, index) => ({
      timestamp: data.timestamp,
      generation: data.generation,
      consumption: data.consumption,
      netExport: data.netExport,
      index,
    }));

    const labelInterval = timeRange === 'day' ? 8 : timeRange === 'week' ? 12 : 16;

    return {
      labels: dataPoints.map((dp, i) => {
        if (i % labelInterval === 0) {
          const date = dp.timestamp;
          if (timeRange === 'day') {
            return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
          } else {
            return `${date.getDate()}/${date.getMonth() + 1}`;
          }
        }
        return '';
      }),
      datasets: [{
        data: dataPoints.map((dp) => dp.generation),
        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
        strokeWidth: 2,
      }],
      dataPoints,
    };
  }, [energyData, timeRange]);

  // Statistics calculations
  const stats = useMemo(() => {
    const data = filteredData.dataPoints;
    if (!data.length) {
      return {
        avgGeneration: 0,
        maxGeneration: 0,
        minGeneration: 0,
        avgConsumption: 0,
        maxConsumption: 0,
        totalGenerated: 0,
        totalConsumed: 0,
        netExported: 0,
      };
    }

    const generations = data.map(d => d.generation);
    const consumptions = data.map(d => d.consumption);
    const netExports = data.map(d => d.netExport);

    return {
      avgGeneration: generations.reduce((a, b) => a + b, 0) / generations.length,
      maxGeneration: Math.max(...generations),
      minGeneration: Math.min(...generations),
      avgConsumption: consumptions.reduce((a, b) => a + b, 0) / consumptions.length,
      maxConsumption: Math.max(...consumptions),
      totalGenerated: generations.reduce((a, b) => a + b, 0) * 0.25,
      totalConsumed: consumptions.reduce((a, b) => a + b, 0) * 0.25,
      netExported: netExports.reduce((a, b) => a + b, 0) * 0.25,
    };
  }, [filteredData]);

  const handleDataPointClick = useCallback((dataPoint: DataPoint) => {
    setSelectedDataPoint(dataPoint);
    setShowDataPointModal(true);
  }, []);

  // Export data to CSV
  const exportToCSV = useCallback(async () => {
    if (!filteredData.dataPoints.length) {
      setExportMessage('No data available to export');
      return;
    }

    setIsExporting(true);
    setExportMessage('Preparing CSV...');
    setShowExportModal(false);

    try {
      const headers = 'Timestamp,Generation (kW),Consumption (kW),Net Export (kW)\n';
      const rows = filteredData.dataPoints.map(dp => {
        const timestamp = dp.timestamp.toISOString();
        return `${timestamp},${dp.generation.toFixed(2)},${dp.consumption.toFixed(2)},${dp.netExport.toFixed(2)}`;
      }).join('\n');

      const csvContent = headers + rows;

      const result = await Share.share({
        message: csvContent,
        title: `Energy Data - ${timeRange.toUpperCase()}`,
      });

      if (result.action === Share.sharedAction) {
        setExportMessage('CSV exported successfully!');
      }
    } catch (error: unknown) {
      setExportMessage(`Export failed: ${getErrorMessage(error) || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportMessage(''), 3000);
    }
  }, [filteredData, timeRange]);

  // Export to JSON
  const exportToJSON = useCallback(async () => {
    if (!filteredData.dataPoints.length) {
      setExportMessage('No data available to export');
      return;
    }

    setIsExporting(true);
    setExportMessage('Preparing JSON...');
    setShowExportModal(false);

    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        timeRange,
        meterId: currentMeter?.id || 'unknown',
        statistics: stats,
        data: filteredData.dataPoints.map(dp => ({
          timestamp: dp.timestamp.toISOString(),
          generation: dp.generation,
          consumption: dp.consumption,
          netExport: dp.netExport,
        })),
      };

      const jsonContent = JSON.stringify(exportData, null, 2);

      const result = await Share.share({
        message: jsonContent,
        title: `Energy Data JSON - ${timeRange.toUpperCase()}`,
      });

      if (result.action === Share.sharedAction) {
        setExportMessage('JSON exported successfully!');
      }
    } catch (error: unknown) {
      setExportMessage(`Export failed: ${getErrorMessage(error) || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportMessage(''), 3000);
    }
  }, [filteredData, timeRange, currentMeter, stats]);

  const formatTimestamp = (date: Date) => {
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  // Chart rendering based on selected type
  const renderChart = () => {
    const chartWidth = Math.max(screenWidth - 48, filteredData.dataPoints.length * 8);

    const baseChartConfig = {
      backgroundColor: '#ffffff',
      backgroundGradientFrom: '#ffffff',
      backgroundGradientTo: '#ffffff',
      decimalPlaces: 2,
      labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
      propsForBackgroundLines: {
        strokeDasharray: '',
        stroke: '#e5e7eb',
        strokeWidth: 1,
      },
    };

    switch (selectedChartType) {
      case 'generation':
        return (
          <LineChart
            data={{
              labels: filteredData.labels,
              datasets: [{
                data: filteredData.dataPoints.length ? filteredData.dataPoints.map(dp => dp.generation) : [0],
                color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                strokeWidth: 2,
              }],
            }}
            width={chartWidth}
            height={240}
            chartConfig={{
              ...baseChartConfig,
              color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
              propsForDots: { r: '4', strokeWidth: '2', stroke: '#10b981' },
            }}
            bezier
            style={styles.chart}
            withDots={true}
            withShadow={false}
            onDataPointClick={({ index }) => {
              if (filteredData.dataPoints[index]) {
                handleDataPointClick(filteredData.dataPoints[index]);
              }
            }}
          />
        );

      case 'consumption':
        return (
          <LineChart
            data={{
              labels: filteredData.labels,
              datasets: [{
                data: filteredData.dataPoints.length ? filteredData.dataPoints.map(dp => dp.consumption) : [0],
                color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                strokeWidth: 2,
              }],
            }}
            width={chartWidth}
            height={240}
            chartConfig={{
              ...baseChartConfig,
              color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
              propsForDots: { r: '4', strokeWidth: '2', stroke: '#ef4444' },
            }}
            bezier
            style={styles.chart}
            withDots={true}
            withShadow={false}
            onDataPointClick={({ index }) => {
              if (filteredData.dataPoints[index]) {
                handleDataPointClick(filteredData.dataPoints[index]);
              }
            }}
          />
        );

      case 'comparison':
        return (
          <LineChart
            data={{
              labels: filteredData.labels,
              datasets: [
                {
                  data: filteredData.dataPoints.length ? filteredData.dataPoints.map(dp => dp.generation) : [0],
                  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                  strokeWidth: 2,
                },
                {
                  data: filteredData.dataPoints.length ? filteredData.dataPoints.map(dp => dp.consumption) : [0],
                  color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                  strokeWidth: 2,
                },
              ],
            }}
            width={chartWidth}
            height={240}
            chartConfig={{
              ...baseChartConfig,
              color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
              propsForDots: { r: '3', strokeWidth: '1', stroke: '#10b981' },
            }}
            bezier
            style={styles.chart}
            withDots={false}
            withShadow={false}
          />
        );

      case 'netExport':
        return (
          <LineChart
            data={{
              labels: filteredData.labels,
              datasets: [{
                data: filteredData.dataPoints.length ? filteredData.dataPoints.map(dp => dp.netExport) : [0],
                color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                strokeWidth: 2,
              }],
            }}
            width={chartWidth}
            height={240}
            chartConfig={{
              ...baseChartConfig,
              color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
              propsForDots: { r: '4', strokeWidth: '2', stroke: '#3b82f6' },
            }}
            bezier
            style={styles.chart}
            withDots={true}
            withShadow={false}
            fromZero={false}
          />
        );
    }
  };

  // Render log item
  const renderLogItem = ({ item, index }: { item: DataPoint; index: number }) => (
    <TouchableOpacity
      style={styles.logItem}
      onPress={() => handleDataPointClick(item)}
    >
      <View style={styles.logItemHeader}>
        <Text style={styles.logItemIndex}>#{filteredData.dataPoints.length - index}</Text>
        <Text style={styles.logItemTime}>
          {formatTimestamp(item.timestamp)}
        </Text>
      </View>
      <View style={styles.logItemValues}>
        <View style={styles.logItemValue}>
          <View style={[styles.logValueIcon, { backgroundColor: '#dcfce7' }]}>
            <Ionicons name="flash" size={12} color="#10b981" />
          </View>
          <Text style={styles.logValueText}>{item.generation.toFixed(2)} kW</Text>
        </View>
        <View style={styles.logItemValue}>
          <View style={[styles.logValueIcon, { backgroundColor: '#fee2e2' }]}>
            <Ionicons name="flash-outline" size={12} color="#ef4444" />
          </View>
          <Text style={styles.logValueText}>{item.consumption.toFixed(2)} kW</Text>
        </View>
        <View style={styles.logItemValue}>
          <View style={[styles.logValueIcon, { backgroundColor: item.netExport >= 0 ? '#dbeafe' : '#fee2e2' }]}>
            <Ionicons
              name={item.netExport >= 0 ? 'arrow-up' : 'arrow-down'}
              size={12}
              color={item.netExport >= 0 ? '#3b82f6' : '#ef4444'}
            />
          </View>
          <Text style={[
            styles.logValueText,
            { color: item.netExport >= 0 ? '#3b82f6' : '#ef4444' }
          ]}>
            {Math.abs(item.netExport).toFixed(2)} kW
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (!energyData.length) {
    return (
      <LinearGradient
        colors={['#e0f2fe', '#f0f9ff', '#ffffff']}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <LinearGradient
                colors={['#e0f2fe', '#bae6fd']}
                style={styles.emptyIcon}
              >
                <MaterialCommunityIcons name="chart-line" size={64} color="#0ea5e9" />
              </LinearGradient>
            </View>
            <Text style={styles.emptyText}>No Energy Data Available</Text>
            <Text style={styles.emptySubtext}>
              Connect your meter to view energy{'\n'}generation charts and analytics
            </Text>
            <TouchableOpacity
              style={styles.backButtonLarge}
              onPress={() => navigation.goBack()}
            >
              <LinearGradient
                colors={['#0ea5e9', '#0284c7']}
                style={styles.backButtonGradient}
              >
                <Ionicons name="arrow-back" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.backButtonText}>Go Back</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#e0f2fe', '#f0f9ff', '#ffffff']}
      style={styles.gradientBackground}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="arrow-back" size={24} color="#1e293b" />
              </TouchableOpacity>
              <View>
                <Text style={styles.title}>Energy Charts</Text>
                <Text style={styles.subtitle}>Detailed Analytics</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setShowExportModal(true)}
                disabled={isExporting}
              >
                <Ionicons name="download-outline" size={20} color="#1e293b" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setShowLogModal(true)}
              >
                <Ionicons name="list-outline" size={20} color="#1e293b" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Time Range Selector */}
          <View style={styles.timeRangeContainer}>
            {(['day', 'week', 'month'] as TimeRange[]).map((range) => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.timeRangeButton,
                  timeRange === range && styles.timeRangeButtonActive,
                ]}
                onPress={() => setTimeRange(range)}
              >
                <Text
                  style={[
                    styles.timeRangeText,
                    timeRange === range && styles.timeRangeTextActive,
                  ]}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Key Metrics Section */}
          <View style={styles.metricsSection}>
            <Text style={styles.sectionTitle}>Key Metrics</Text>

            {/* Row 1: Avg Generation | Peak Generation */}
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

            {/* Row 2: Avg Consumption | Peak Consumption */}
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

          {/* Graphical Analysis Section */}
          <View style={styles.chartsSection}>
            <Text style={styles.sectionTitle}>Graphical Analysis</Text>

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
                  {selectedChartType === 'generation' && 'Generation Trends (kW)'}
                  {selectedChartType === 'consumption' && 'Consumption Patterns (kW)'}
                  {selectedChartType === 'comparison' && 'Generation vs Consumption'}
                  {selectedChartType === 'netExport' && 'Net Export Over Time (kW)'}
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
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, {
                        backgroundColor: selectedChartType === 'generation' ? '#10b981' :
                                         selectedChartType === 'consumption' ? '#ef4444' : '#3b82f6'
                      }]} />
                      <Text style={styles.legendText}>kW</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Chart hint */}
              <Text style={styles.chartHint}>
                {selectedChartType !== 'comparison' ? 'Tap on points to see details' : 'Scroll horizontally for more data'}
              </Text>

              {/* Chart Content */}
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                {renderChart()}
              </ScrollView>
            </View>
          </View>

          {/* Recent Data Log Preview */}
          <View style={styles.logPreviewSection}>
            <View style={styles.logPreviewHeader}>
              <Text style={styles.sectionTitle}>Recent Data Log</Text>
              <TouchableOpacity onPress={() => setShowLogModal(true)}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.logPreviewCard}>
              {filteredData.dataPoints.slice(-5).reverse().map((dp, index) => (
                <TouchableOpacity
                  key={dp.timestamp.getTime()}
                  style={[
                    styles.logPreviewItem,
                    index !== Math.min(4, filteredData.dataPoints.length - 1) && styles.logPreviewItemBorder
                  ]}
                  onPress={() => handleDataPointClick(dp)}
                >
                  <View style={styles.logPreviewTime}>
                    <Ionicons name="time-outline" size={14} color="#64748b" />
                    <Text style={styles.logPreviewTimeText}>
                      {dp.timestamp.toLocaleTimeString()}
                    </Text>
                  </View>
                  <View style={styles.logPreviewValues}>
                    <View style={styles.logPreviewValueItem}>
                      <View style={[styles.logPreviewDot, { backgroundColor: '#10b981' }]} />
                      <Text style={[styles.logPreviewValue, { color: '#10b981' }]}>
                        {dp.generation.toFixed(1)} kW
                      </Text>
                    </View>
                    <View style={styles.logPreviewValueItem}>
                      <View style={[styles.logPreviewDot, { backgroundColor: '#ef4444' }]} />
                      <Text style={[styles.logPreviewValue, { color: '#ef4444' }]}>
                        {dp.consumption.toFixed(1)} kW
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Bottom Spacing */}
          <View style={{ height: 32 }} />
        </ScrollView>

        {/* Data Log Modal */}
        <Modal
          visible={showLogModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowLogModal(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <LinearGradient
              colors={['#e0f2fe', '#f0f9ff', '#ffffff']}
              style={styles.modalGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Energy Data Log</Text>
                  <Text style={styles.modalSubtitle}>{filteredData.dataPoints.length} records</Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowLogModal(false)}
                >
                  <Ionicons name="close" size={24} color="#1e293b" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.exportButtonPrimary}
                  onPress={exportToCSV}
                  disabled={isExporting}
                >
                  <Ionicons name="document-text-outline" size={18} color="#ffffff" />
                  <Text style={styles.exportButtonPrimaryText}>Export CSV</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.exportButtonSecondary}
                  onPress={exportToJSON}
                  disabled={isExporting}
                >
                  <Ionicons name="code-slash-outline" size={18} color="#3b82f6" />
                  <Text style={styles.exportButtonSecondaryText}>Export JSON</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={[...filteredData.dataPoints].reverse()}
                renderItem={renderLogItem}
                keyExtractor={(item) => item.timestamp.getTime().toString()}
                contentContainerStyle={styles.logList}
                showsVerticalScrollIndicator={true}
              />
            </LinearGradient>
          </SafeAreaView>
        </Modal>

        {/* Data Point Detail Modal */}
        <Modal
          visible={showDataPointModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowDataPointModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowDataPointModal(false)}
          >
            <View style={styles.dataPointModalContent}>
              {selectedDataPoint && (
                <>
                  <View style={styles.dataPointModalHeader}>
                    <View style={styles.dataPointModalIconContainer}>
                      <Ionicons name="analytics" size={24} color="#3b82f6" />
                    </View>
                    <Text style={styles.dataPointModalTitle}>Data Point Details</Text>
                  </View>

                  <View style={styles.dataPointModalTime}>
                    <Ionicons name="time-outline" size={16} color="#64748b" />
                    <Text style={styles.dataPointModalTimeText}>
                      {formatTimestamp(selectedDataPoint.timestamp)}
                    </Text>
                  </View>

                  <View style={styles.dataPointModalValues}>
                    <View style={styles.dataPointModalValueRow}>
                      <View style={[styles.dataPointModalValueIcon, { backgroundColor: '#dcfce7' }]}>
                        <Ionicons name="flash" size={20} color="#10b981" />
                      </View>
                      <View style={styles.dataPointModalValueInfo}>
                        <Text style={styles.dataPointModalValueLabel}>Generation</Text>
                        <Text style={[styles.dataPointModalValueText, { color: '#10b981' }]}>
                          {selectedDataPoint.generation.toFixed(3)} kW
                        </Text>
                      </View>
                    </View>

                    <View style={styles.dataPointModalValueRow}>
                      <View style={[styles.dataPointModalValueIcon, { backgroundColor: '#fee2e2' }]}>
                        <Ionicons name="flash-outline" size={20} color="#ef4444" />
                      </View>
                      <View style={styles.dataPointModalValueInfo}>
                        <Text style={styles.dataPointModalValueLabel}>Consumption</Text>
                        <Text style={[styles.dataPointModalValueText, { color: '#ef4444' }]}>
                          {selectedDataPoint.consumption.toFixed(3)} kW
                        </Text>
                      </View>
                    </View>

                    <View style={styles.dataPointModalValueRow}>
                      <View style={[styles.dataPointModalValueIcon, { backgroundColor: selectedDataPoint.netExport >= 0 ? '#dbeafe' : '#fee2e2' }]}>
                        <Ionicons
                          name={selectedDataPoint.netExport >= 0 ? 'trending-up' : 'trending-down'}
                          size={20}
                          color={selectedDataPoint.netExport >= 0 ? '#3b82f6' : '#ef4444'}
                        />
                      </View>
                      <View style={styles.dataPointModalValueInfo}>
                        <Text style={styles.dataPointModalValueLabel}>
                          Net {selectedDataPoint.netExport >= 0 ? 'Export' : 'Import'}
                        </Text>
                        <Text style={[
                          styles.dataPointModalValueText,
                          { color: selectedDataPoint.netExport >= 0 ? '#3b82f6' : '#ef4444' }
                        ]}>
                          {Math.abs(selectedDataPoint.netExport).toFixed(3)} kW
                        </Text>
                      </View>
                    </View>

                    <View style={styles.dataPointModalValueRow}>
                      <View style={[styles.dataPointModalValueIcon, { backgroundColor: '#f3e8ff' }]}>
                        <Ionicons name="calculator-outline" size={20} color="#8b5cf6" />
                      </View>
                      <View style={styles.dataPointModalValueInfo}>
                        <Text style={styles.dataPointModalValueLabel}>Energy (15 min)</Text>
                        <Text style={[styles.dataPointModalValueText, { color: '#8b5cf6' }]}>
                          {(selectedDataPoint.generation * 0.25).toFixed(3)} kWh
                        </Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.dataPointModalCloseBtn}
                    onPress={() => setShowDataPointModal(false)}
                  >
                    <Text style={styles.dataPointModalCloseBtnText}>Close</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Export Modal */}
        <Modal
          visible={showExportModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowExportModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowExportModal(false)}
          >
            <View style={styles.exportModalContent}>
              <View style={styles.exportModalHeader}>
                <View style={styles.exportModalIconContainer}>
                  <MaterialCommunityIcons name="file-export" size={28} color="#3b82f6" />
                </View>
                <Text style={styles.exportModalTitle}>Export Energy Data</Text>
                <Text style={styles.exportModalSubtitle}>
                  {filteredData.dataPoints.length} data points for {timeRange}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.exportModalButton}
                onPress={exportToCSV}
                disabled={isExporting}
              >
                <View style={[styles.exportModalButtonIcon, { backgroundColor: '#dcfce7' }]}>
                  <Ionicons name="document-text-outline" size={24} color="#10b981" />
                </View>
                <View style={styles.exportButtonTextContainer}>
                  <Text style={styles.exportButtonTitle}>Export as CSV</Text>
                  <Text style={styles.exportButtonDesc}>Spreadsheet format</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.exportModalButton}
                onPress={exportToJSON}
                disabled={isExporting}
              >
                <View style={[styles.exportModalButtonIcon, { backgroundColor: '#dbeafe' }]}>
                  <Ionicons name="code-slash-outline" size={24} color="#3b82f6" />
                </View>
                <View style={styles.exportButtonTextContainer}>
                  <Text style={styles.exportButtonTitle}>Export as JSON</Text>
                  <Text style={styles.exportButtonDesc}>Data interchange format</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.exportCancelButton}
                onPress={() => setShowExportModal(false)}
              >
                <Text style={styles.exportCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Export Status Message */}
        {exportMessage ? (
          <View style={styles.exportMessageContainer}>
            {isExporting && <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />}
            <Text style={styles.exportMessageText}>{exportMessage}</Text>
          </View>
        ) : null}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  // Header Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 20,
    gap : 7
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 25,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 5,
  },
  actionButton: {
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
  // Time Range Selector
  timeRangeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  timeRangeButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  timeRangeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  timeRangeTextActive: {
    color: '#ffffff',
  },
  // Metrics Section
  metricsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
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
  // Charts Section
  chartsSection: {
    marginBottom: 24,
  },
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
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
  chartCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chartCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  chartLegend: {
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#64748b',
  },
  chartHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 12,
  },
  chart: {
    borderRadius: 12,
  },
  // Log Preview Section
  logPreviewSection: {
    marginBottom: 16,
  },
  logPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  logPreviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  logPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  logPreviewItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  logPreviewTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  logPreviewTimeText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  logPreviewValues: {
    flexDirection: 'row',
    gap: 12,
  },
  logPreviewValueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logPreviewDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  logPreviewValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalGradient: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  modalCloseButton: {
    width: 44,
    height: 44,
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
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  exportButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  exportButtonPrimaryText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  exportButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  exportButtonSecondaryText: {
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: 14,
  },
  logList: {
    padding: 16,
  },
  logItem: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  logItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logItemIndex: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '600',
  },
  logItemTime: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  logItemValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logItemValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logValueIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logValueText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  // Modal Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  // Data Point Modal
  dataPointModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  dataPointModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  dataPointModalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dataPointModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  dataPointModalTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  dataPointModalTimeText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  dataPointModalValues: {
    gap: 14,
    marginBottom: 24,
  },
  dataPointModalValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  dataPointModalValueIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dataPointModalValueInfo: {
    flex: 1,
  },
  dataPointModalValueLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
    fontWeight: '500',
  },
  dataPointModalValueText: {
    fontSize: 20,
    fontWeight: '700',
  },
  dataPointModalCloseBtn: {
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
  dataPointModalCloseBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  // Export Modal
  exportModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  exportModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  exportModalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  exportModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
    textAlign: 'center',
  },
  exportModalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  exportModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  exportModalButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportButtonTextContainer: {
    flex: 1,
    marginLeft: 14,
  },
  exportButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  exportButtonDesc: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  exportCancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  exportCancelButtonText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
  },
  // Export Message
  exportMessageContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  exportMessageText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  backButtonLarge: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  backButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
