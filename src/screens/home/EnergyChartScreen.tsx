import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  Share,
  Dimensions,
  InteractionManager,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useMeterStore } from '@/store';
import { EnergyData, RootStackParamList } from '@/types';
import { formatEnergy } from '@/utils/helpers';
import * as FileSystem from 'expo-file-system';

const screenWidth = Dimensions.get('window').width;

type EnergyChartScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EnergyChart'>;

type TimeRange = 'day' | 'week' | 'month';

interface DataPoint {
  timestamp: Date;
  generation: number;
  consumption: number;
  netExport: number;
  index: number;
}

interface TooltipData {
  visible: boolean;
  x: number;
  y: number;
  dataPoint: DataPoint | null;
}

export default function EnergyChartScreen() {
  const navigation = useNavigation<EnergyChartScreenNavigationProp>();
  const { energyData, currentMeter } = useMeterStore();
  const [timeRange, setTimeRange] = useState<TimeRange>('day');
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedDataPoint, setSelectedDataPoint] = useState<DataPoint | null>(null);
  const [showDataPointModal, setShowDataPointModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const isMountedRef = useRef(true);

  // Track component mount state
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

    // Generate labels based on time range
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
      totalGenerated: generations.reduce((a, b) => a + b, 0) * 0.25, // 15-min intervals to kWh
      totalConsumed: consumptions.reduce((a, b) => a + b, 0) * 0.25,
      netExported: netExports.reduce((a, b) => a + b, 0) * 0.25,
    };
  }, [filteredData]);

  // Handle chart point press
  const handleDataPointClick = useCallback((dataPoint: DataPoint) => {
    setSelectedDataPoint(dataPoint);
    setShowDataPointModal(true);
  }, []);

  // Safe alert helper
  const safeAlert = useCallback((title: string, message: string) => {
    if (isMountedRef.current) {
      InteractionManager.runAfterInteractions(() => {
        Alert.alert(title, message);
      });
    }
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
      // Create CSV content
      const headers = 'Timestamp,Generation (kW),Consumption (kW),Net Export (kW)\n';
      const rows = filteredData.dataPoints.map(dp => {
        const timestamp = dp.timestamp.toISOString();
        return `${timestamp},${dp.generation.toFixed(2)},${dp.consumption.toFixed(2)},${dp.netExport.toFixed(2)}`;
      }).join('\n');

      const csvContent = headers + rows;

      // Save to file
      const fileName = `energy_data_${timeRange}_${Date.now()}.csv`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(filePath, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Share the data using built-in Share API
      const result = await Share.share({
        message: csvContent,
        title: `Energy Data - ${timeRange.toUpperCase()}`,
      });
      
      if (result.action === Share.sharedAction) {
        setExportMessage('CSV exported successfully!');
      }
    } catch (error: any) {
      setExportMessage(`Export failed: ${error.message || 'Unknown error'}`);
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

      const fileName = `energy_data_${timeRange}_${Date.now()}.json`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(filePath, jsonContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Share the data using built-in Share API
      const result = await Share.share({
        message: jsonContent,
        title: `Energy Data JSON - ${timeRange.toUpperCase()}`,
      });
      
      if (result.action === Share.sharedAction) {
        setExportMessage('JSON exported successfully!');
      }
    } catch (error: any) {
      setExportMessage(`Export failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportMessage(''), 3000);
    }
  }, [filteredData, timeRange, currentMeter, stats]);

  // Show export options - use modal instead of Alert
  const showExportOptions = useCallback(() => {
    setShowExportModal(true);
  }, []);

  // Format timestamp for display
  const formatTimestamp = (date: Date) => {
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
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
          <Ionicons name="flash" size={14} color="#10b981" />
          <Text style={styles.logValueText}>{item.generation.toFixed(2)} kW</Text>
        </View>
        <View style={styles.logItemValue}>
          <Ionicons name="flash-outline" size={14} color="#ef4444" />
          <Text style={styles.logValueText}>{item.consumption.toFixed(2)} kW</Text>
        </View>
        <View style={styles.logItemValue}>
          <Ionicons 
            name={item.netExport >= 0 ? 'arrow-up' : 'arrow-down'} 
            size={14} 
            color={item.netExport >= 0 ? '#10b981' : '#ef4444'} 
          />
          <Text style={[
            styles.logValueText,
            { color: item.netExport >= 0 ? '#10b981' : '#ef4444' }
          ]}>
            {Math.abs(item.netExport).toFixed(2)} kW
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (!energyData.length) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="chart-line" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>No energy data available</Text>
          <Text style={styles.emptySubtext}>
            Connect your meter to view energy generation charts
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.title}>Energy Charts</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={showExportOptions}
                disabled={isExporting}
              >
                <Ionicons name="download-outline" size={20} color="#10b981" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => setShowLogModal(true)}
              >
                <Ionicons name="list-outline" size={20} color="#10b981" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Time Range Selector */}
          <View style={styles.rangeSelector}>
            {(['day', 'week', 'month'] as TimeRange[]).map((range) => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.rangeButton,
                  timeRange === range && styles.rangeButtonActive,
                ]}
                onPress={() => setTimeRange(range)}
              >
                <Text
                  style={[
                    styles.rangeButtonText,
                    timeRange === range && styles.rangeButtonTextActive,
                  ]}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Statistics Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, styles.statCardGreen]}>
                <Text style={styles.statLabel}>Avg Generation</Text>
                <Text style={[styles.statValue, styles.statValueGreen]}>
                  {stats.avgGeneration.toFixed(2)} kW
                </Text>
              </View>
              <View style={[styles.statCard, styles.statCardGreen]}>
                <Text style={styles.statLabel}>Peak Generation</Text>
                <Text style={[styles.statValue, styles.statValueGreen]}>
                  {stats.maxGeneration.toFixed(2)} kW
                </Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, styles.statCardRed]}>
                <Text style={styles.statLabel}>Avg Consumption</Text>
                <Text style={[styles.statValue, styles.statValueRed]}>
                  {stats.avgConsumption.toFixed(2)} kW
                </Text>
              </View>
              <View style={[styles.statCard, styles.statCardRed]}>
                <Text style={styles.statLabel}>Peak Consumption</Text>
                <Text style={[styles.statValue, styles.statValueRed]}>
                  {stats.maxConsumption.toFixed(2)} kW
                </Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Total Generated</Text>
                <Text style={[styles.statValue, styles.statValueGreen]}>
                  {stats.totalGenerated.toFixed(2)} kWh
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Net Export</Text>
                <Text style={[
                  styles.statValue,
                  stats.netExported >= 0 ? styles.statValueGreen : styles.statValueRed
                ]}>
                  {stats.netExported >= 0 ? '+' : ''}{stats.netExported.toFixed(2)} kWh
                </Text>
              </View>
            </View>
          </View>

          {/* Generation Chart */}
          <View style={styles.chartSection}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Generation (kW)</Text>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                <Text style={styles.legendText}>Generation</Text>
              </View>
            </View>
            <Text style={styles.chartHint}>Tap on points to see details</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={true}
              style={styles.chartScroll}
            >
              <View style={styles.chartWrapper}>
                <LineChart
                  data={filteredData}
                  width={Math.max(screenWidth - 48, filteredData.dataPoints.length * 8)}
                  height={280}
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 2,
                    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                    style: {
                      borderRadius: 16,
                    },
                    propsForDots: {
                      r: '5',
                      strokeWidth: '2',
                      stroke: '#10b981',
                    },
                    propsForBackgroundLines: {
                      strokeDasharray: '',
                      stroke: '#e5e7eb',
                      strokeWidth: 1,
                    },
                  }}
                  bezier
                  style={styles.chart}
                  withInnerLines={true}
                  withOuterLines={true}
                  withVerticalLines={true}
                  withHorizontalLines={true}
                  withDots={true}
                  withShadow={false}
                  onDataPointClick={({ index }) => {
                    if (filteredData.dataPoints[index]) {
                      handleDataPointClick(filteredData.dataPoints[index]);
                    }
                  }}
                  getDotColor={(dataPoint, index) => {
                    // Highlight selected point
                    if (selectedDataPoint && selectedDataPoint.index === index) {
                      return '#059669';
                    }
                    return '#10b981';
                  }}
                />
              </View>
            </ScrollView>
          </View>

          {/* Consumption Chart */}
          <View style={styles.chartSection}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Consumption (kW)</Text>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                <Text style={styles.legendText}>Consumption</Text>
              </View>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={true}
              style={styles.chartScroll}
            >
              <View style={styles.chartWrapper}>
                <LineChart
                  data={{
                    labels: filteredData.labels,
                    datasets: [{
                      data: filteredData.dataPoints.length ? 
                        filteredData.dataPoints.map(dp => dp.consumption) : [0],
                      color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                      strokeWidth: 2,
                    }],
                  }}
                  width={Math.max(screenWidth - 48, filteredData.dataPoints.length * 8)}
                  height={220}
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 2,
                    color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                    propsForDots: {
                      r: '4',
                      strokeWidth: '2',
                      stroke: '#ef4444',
                    },
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
                  onDataPointClick={({ index }) => {
                    if (filteredData.dataPoints[index]) {
                      handleDataPointClick(filteredData.dataPoints[index]);
                    }
                  }}
                />
              </View>
            </ScrollView>
          </View>

          {/* Generation vs Consumption Comparison */}
          <View style={styles.chartSection}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Generation vs Consumption</Text>
              <View style={styles.legendContainer}>
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
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={true}
              style={styles.chartScroll}
            >
              <View style={styles.chartWrapper}>
                <LineChart
                  data={{
                    labels: filteredData.labels,
                    datasets: [
                      {
                        data: filteredData.dataPoints.length ?
                          filteredData.dataPoints.map(dp => dp.generation) : [0],
                        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                        strokeWidth: 2,
                      },
                      {
                        data: filteredData.dataPoints.length ?
                          filteredData.dataPoints.map(dp => dp.consumption) : [0],
                        color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                        strokeWidth: 2,
                      },
                    ],
                  }}
                  width={Math.max(screenWidth - 48, filteredData.dataPoints.length * 8)}
                  height={250}
                  chartConfig={{
                    backgroundColor: '#f0fdf4',
                    backgroundGradientFrom: '#f0fdf4',
                    backgroundGradientTo: '#fef2f2',
                    decimalPlaces: 2,
                    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                    propsForBackgroundLines: {
                      strokeDasharray: '',
                      stroke: '#d1d5db',
                      strokeWidth: 1,
                    },
                  }}
                  bezier
                  style={styles.chart}
                  withDots={false}
                  withShadow={false}
                />
              </View>
            </ScrollView>
          </View>

          {/* Net Export Chart */}
          <View style={styles.chartSection}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Net Export (kW)</Text>
              <Text style={styles.chartSubtitle}>Positive = Export, Negative = Import</Text>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={true}
              style={styles.chartScroll}
            >
              <View style={styles.chartWrapper}>
                <LineChart
                  data={{
                    labels: filteredData.labels,
                    datasets: [{
                      data: filteredData.dataPoints.length ?
                        filteredData.dataPoints.map(dp => dp.netExport) : [0],
                      color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                      strokeWidth: 2,
                    }],
                  }}
                  width={Math.max(screenWidth - 48, filteredData.dataPoints.length * 8)}
                  height={200}
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 2,
                    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                    propsForDots: {
                      r: '3',
                      strokeWidth: '1',
                      stroke: '#3b82f6',
                    },
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
                  fromZero={false}
                />
              </View>
            </ScrollView>
          </View>

          {/* Recent Data Log Preview */}
          <View style={styles.logPreviewSection}>
            <View style={styles.logPreviewHeader}>
              <Text style={styles.logPreviewTitle}>Recent Data Log</Text>
              <TouchableOpacity onPress={() => setShowLogModal(true)}>
                <Text style={styles.viewAllText}>View All →</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.logPreviewList}>
              {filteredData.dataPoints.slice(-5).reverse().map((dp, index) => (
                <TouchableOpacity 
                  key={dp.timestamp.getTime()}
                  style={styles.logPreviewItem}
                  onPress={() => handleDataPointClick(dp)}
                >
                  <Text style={styles.logPreviewTime}>
                    {dp.timestamp.toLocaleTimeString()}
                  </Text>
                  <Text style={styles.logPreviewGen}>
                    ⚡ {dp.generation.toFixed(1)} kW
                  </Text>
                  <Text style={styles.logPreviewCon}>
                    🔌 {dp.consumption.toFixed(1)} kW
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Data Log Modal */}
      <Modal
        visible={showLogModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLogModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Energy Data Log</Text>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowLogModal(false)}
            >
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.exportButton}
              onPress={exportToCSV}
              disabled={isExporting}
            >
              <Ionicons name="document-text-outline" size={18} color="#ffffff" />
              <Text style={styles.exportButtonText}>Export CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.exportButton, styles.exportButtonSecondary]}
              onPress={exportToJSON}
              disabled={isExporting}
            >
              <Ionicons name="code-slash-outline" size={18} color="#10b981" />
              <Text style={styles.exportButtonTextSecondary}>Export JSON</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.logStats}>
            <Text style={styles.logStatsText}>
              {filteredData.dataPoints.length} records • {timeRange} view
            </Text>
          </View>

          <FlatList
            data={[...filteredData.dataPoints].reverse()}
            renderItem={renderLogItem}
            keyExtractor={(item) => item.timestamp.getTime().toString()}
            contentContainerStyle={styles.logList}
            showsVerticalScrollIndicator={true}
          />
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
          style={styles.dataPointModalOverlay}
          activeOpacity={1}
          onPress={() => setShowDataPointModal(false)}
        >
          <View style={styles.dataPointModalContent}>
            {selectedDataPoint && (
              <>
                <View style={styles.dataPointModalHeader}>
                  <Ionicons name="analytics" size={24} color="#10b981" />
                  <Text style={styles.dataPointModalTitle}>Data Point Details</Text>
                </View>
                
                <View style={styles.dataPointModalTime}>
                  <Ionicons name="time-outline" size={16} color="#6b7280" />
                  <Text style={styles.dataPointModalTimeText}>
                    {formatTimestamp(selectedDataPoint.timestamp)}
                  </Text>
                </View>

                <View style={styles.dataPointModalValues}>
                  <View style={styles.dataPointModalValueRow}>
                    <View style={styles.dataPointModalValueIcon}>
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
                    <View style={styles.dataPointModalValueIcon}>
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
                    <View style={styles.dataPointModalValueIcon}>
                      <Ionicons 
                        name={selectedDataPoint.netExport >= 0 ? 'trending-up' : 'trending-down'} 
                        size={20} 
                        color={selectedDataPoint.netExport >= 0 ? '#10b981' : '#ef4444'} 
                      />
                    </View>
                    <View style={styles.dataPointModalValueInfo}>
                      <Text style={styles.dataPointModalValueLabel}>
                        Net {selectedDataPoint.netExport >= 0 ? 'Export' : 'Import'}
                      </Text>
                      <Text style={[
                        styles.dataPointModalValueText, 
                        { color: selectedDataPoint.netExport >= 0 ? '#10b981' : '#ef4444' }
                      ]}>
                        {Math.abs(selectedDataPoint.netExport).toFixed(3)} kW
                      </Text>
                    </View>
                  </View>

                  <View style={styles.dataPointModalValueRow}>
                    <View style={styles.dataPointModalValueIcon}>
                      <Ionicons name="calculator-outline" size={20} color="#3b82f6" />
                    </View>
                    <View style={styles.dataPointModalValueInfo}>
                      <Text style={styles.dataPointModalValueLabel}>Energy (15 min)</Text>
                      <Text style={[styles.dataPointModalValueText, { color: '#3b82f6' }]}>
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
            <Text style={styles.exportModalTitle}>Export Energy Data</Text>
            <Text style={styles.exportModalSubtitle}>
              {filteredData.dataPoints.length} data points for {timeRange}
            </Text>
            
            <TouchableOpacity 
              style={styles.exportButton}
              onPress={exportToCSV}
              disabled={isExporting}
            >
              <Ionicons name="document-text-outline" size={24} color="#10b981" />
              <View style={styles.exportButtonTextContainer}>
                <Text style={styles.exportButtonTitle}>Export as CSV</Text>
                <Text style={styles.exportButtonDesc}>Spreadsheet format</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.exportButton}
              onPress={exportToJSON}
              disabled={isExporting}
            >
              <Ionicons name="code-slash-outline" size={24} color="#3b82f6" />
              <View style={styles.exportButtonTextContainer}>
                <Text style={styles.exportButtonTitle}>Export as JSON</Text>
                <Text style={styles.exportButtonDesc}>Data format</Text>
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
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  rangeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  rangeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  rangeButtonActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  rangeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  rangeButtonTextActive: {
    color: '#ffffff',
  },
  statsContainer: {
    gap: 8,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statCardGreen: {
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  statCardRed: {
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  statValueGreen: {
    color: '#10b981',
  },
  statValueRed: {
    color: '#ef4444',
  },
  chartSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  chartSubtitle: {
    fontSize: 11,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  chartHint: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  legendContainer: {
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
    color: '#6b7280',
  },
  chartScroll: {
    marginHorizontal: -8,
  },
  chartWrapper: {
    paddingHorizontal: 8,
  },
  chart: {
    borderRadius: 12,
  },
  logPreviewSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  logPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logPreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  viewAllText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
  },
  logPreviewList: {
    gap: 8,
  },
  logPreviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  logPreviewTime: {
    fontSize: 12,
    color: '#6b7280',
    flex: 1,
  },
  logPreviewGen: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
    marginHorizontal: 8,
  },
  logPreviewCon: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  exportButtonSecondary: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  exportButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  exportButtonTextSecondary: {
    color: '#10b981',
    fontWeight: '600',
    fontSize: 14,
  },
  logStats: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  logStatsText: {
    fontSize: 12,
    color: '#6b7280',
  },
  logList: {
    padding: 16,
  },
  logItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  logItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logItemIndex: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  logItemTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  logItemValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logItemValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logValueText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
  },
  // Data Point Modal
  dataPointModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dataPointModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  dataPointModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  dataPointModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  dataPointModalTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  dataPointModalTimeText: {
    fontSize: 13,
    color: '#6b7280',
  },
  dataPointModalValues: {
    gap: 12,
    marginBottom: 20,
  },
  dataPointModalValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dataPointModalValueIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dataPointModalValueInfo: {
    flex: 1,
  },
  dataPointModalValueLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  dataPointModalValueText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dataPointModalCloseBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  dataPointModalCloseBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  // Export Modal Styles
  exportModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  exportModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  exportModalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  exportButtonTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  exportButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  exportButtonDesc: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  exportCancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  exportCancelButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  exportMessageContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  exportMessageText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});

