import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Victory Native imports - may need adjustment based on actual package exports
// @ts-ignore - victory-native type definitions may be incomplete
import { VictoryChart, VictoryLine, VictoryAxis, VictoryArea } from 'victory-native';
import { useMeterStore } from '@/store';
import { EnergyData } from '@/types';
import { formatEnergy } from '@/utils/helpers';

type TimeRange = 'day' | 'week' | 'month';

export default function EnergyChartScreen() {
  const { energyData } = useMeterStore();
  const [timeRange, setTimeRange] = useState<TimeRange>('day');

  const filteredData = useMemo(() => {
    if (!energyData.length) return [];

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

    return energyData
      .filter((data) => data.timestamp >= filterDate)
      .map((data, index) => ({
        x: index,
        y: data.generation,
        timestamp: data.timestamp,
      }))
      .slice(-96); // Limit to last 96 data points (24 hours of 15-min intervals)
  }, [energyData, timeRange]);

  const maxGeneration = useMemo(() => {
    if (!filteredData.length) return 10;
    return Math.max(...filteredData.map((d) => d.y), 10);
  }, [filteredData]);

  const averageGeneration = useMemo(() => {
    if (!filteredData.length) return 0;
    const sum = filteredData.reduce((acc, d) => acc + d.y, 0);
    return sum / filteredData.length;
  }, [filteredData]);

  if (!energyData.length) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyContainer}>
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
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>Energy Generation</Text>

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

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Average</Text>
              <Text style={styles.statValue}>
                {formatEnergy(averageGeneration, 'kW')}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Peak</Text>
              <Text style={styles.statValue}>
                {formatEnergy(maxGeneration, 'kW')}
              </Text>
            </View>
          </View>

          {/* Chart */}
          <View style={styles.chartContainer}>
            <VictoryChart
              height={300}
              padding={{ left: 50, right: 20, top: 20, bottom: 40 }}
              domain={{ y: [0, maxGeneration * 1.1] }}
            >
              <VictoryAxis
                dependentAxis
                style={{
                  axis: { stroke: '#d1d5db' },
                  tickLabels: { fill: '#6b7280', fontSize: 12 },
                  grid: { stroke: '#e5e7eb', strokeDasharray: '4,4' },
                }}
                tickFormat={(t: number) => `${t}kW`}
              />
              <VictoryAxis
                style={{
                  axis: { stroke: '#d1d5db' },
                  tickLabels: { fill: '#6b7280', fontSize: 12 },
                }}
                tickFormat={(t: number) => {
                  if (filteredData[t]) {
                    const date = filteredData[t].timestamp;
                    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
                  }
                  return '';
                }}
              />
              <VictoryArea
                data={filteredData}
                style={{
                  data: {
                    fill: '#10b981',
                    fillOpacity: 0.3,
                    stroke: '#10b981',
                    strokeWidth: 2,
                  },
                }}
                interpolation="natural"
              />
              <VictoryLine
                data={filteredData}
                style={{
                  data: {
                    stroke: '#10b981',
                    strokeWidth: 2,
                  },
                }}
                interpolation="natural"
              />
            </VictoryChart>
          </View>

          {/* Comparison View */}
          <View style={styles.comparisonContainer}>
            <Text style={styles.comparisonTitle}>Generation vs Consumption</Text>
            <View style={styles.comparisonChart}>
              <VictoryChart
                height={200}
                padding={{ left: 50, right: 20, top: 20, bottom: 40 }}
              >
                <VictoryAxis
                  dependentAxis
                  style={{
                    axis: { stroke: '#d1d5db' },
                    tickLabels: { fill: '#6b7280', fontSize: 12 },
                  }}
                />
                <VictoryLine
                  data={filteredData.map((d, i) => {
                    const matchingData = energyData.find((ed) => ed.timestamp.getTime() === d.timestamp.getTime());
                    return {
                      x: i,
                      y: matchingData?.generation || 0,
                    };
                  })}
                  style={{
                    data: { stroke: '#10b981', strokeWidth: 2 },
                  }}
                />
                <VictoryLine
                  data={filteredData.map((d, i) => {
                    const matchingData = energyData.find((ed) => ed.timestamp.getTime() === d.timestamp.getTime());
                    return {
                      x: i,
                      y: -(matchingData?.consumption || 0),
                    };
                  })}
                  style={{
                    data: { stroke: '#ef4444', strokeWidth: 2 },
                  }}
                />
              </VictoryChart>
            </View>
          </View>
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
  rangeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  rangeButton: {
    flex: 1,
    paddingVertical: 8,
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
    fontWeight: '500',
    color: '#6b7280',
  },
  rangeButtonTextActive: {
    color: '#ffffff',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10b981',
  },
  chartContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  comparisonContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  comparisonTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  comparisonChart: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 8,
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
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

