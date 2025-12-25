import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { useMeterStore } from '@/store';
import { EnergyData } from '@/types';
import { formatEnergy } from '@/utils/helpers';

const screenWidth = Dimensions.get('window').width;

type TimeRange = 'day' | 'week' | 'month';

export default function EnergyChartScreen() {
  const { energyData } = useMeterStore();
  const [timeRange, setTimeRange] = useState<TimeRange>('day');

  const filteredData = useMemo(() => {
    if (!energyData.length) {
      return {
        labels: [],
        datasets: [{
          data: [],
          color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
          strokeWidth: 2,
        }],
        timestamps: [],
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
      .slice(-96); // Limit to last 96 data points (24 hours of 15-min intervals)
    
    return {
      labels: filtered.map((data) => {
        const date = data.timestamp;
        return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
      }).filter((_, i) => i % 8 === 0), // Show every 8th label
      datasets: [{
        data: filtered.map((data) => data.generation),
        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
        strokeWidth: 2,
      }],
      timestamps: filtered.map((data) => data.timestamp),
    };
  }, [energyData, timeRange]);

  const maxGeneration = useMemo(() => {
    if (!filteredData.datasets[0]?.data.length) return 10;
    return Math.max(...filteredData.datasets[0].data, 10);
  }, [filteredData]);

  const averageGeneration = useMemo(() => {
    if (!filteredData.datasets[0]?.data.length) return 0;
    const sum = filteredData.datasets[0].data.reduce((acc: number, d: number) => acc + d, 0);
    return sum / filteredData.datasets[0].data.length;
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
            <LineChart
              data={filteredData}
              width={screenWidth - 80}
              height={300}
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
                  r: '4',
                  strokeWidth: '2',
                  stroke: '#10b981',
                },
              }}
              bezier
              style={{
                marginVertical: 8,
                borderRadius: 16,
              }}
              withInnerLines={true}
              withOuterLines={true}
              withVerticalLines={true}
              withHorizontalLines={true}
              withDots={true}
              withShadow={false}
            />
          </View>

          {/* Comparison View */}
          <View style={styles.comparisonContainer}>
            <Text style={styles.comparisonTitle}>Generation vs Consumption</Text>
            <View style={styles.comparisonChart}>
              <LineChart
                data={{
                  labels: filteredData.labels,
                  datasets: [
                    {
                      data: filteredData.timestamps.map((ts: Date) => {
                        const matchingData = energyData.find((ed) => ed.timestamp.getTime() === ts.getTime());
                        return matchingData?.generation || 0;
                      }),
                      color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                      strokeWidth: 2,
                    },
                    {
                      data: filteredData.timestamps.map((ts: Date) => {
                        const matchingData = energyData.find((ed) => ed.timestamp.getTime() === ts.getTime());
                        return matchingData?.consumption || 0;
                      }),
                      color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                      strokeWidth: 2,
                    },
                  ],
                }}
                width={screenWidth - 80}
                height={200}
                chartConfig={{
                  backgroundColor: '#f9fafb',
                  backgroundGradientFrom: '#f9fafb',
                  backgroundGradientTo: '#f9fafb',
                  decimalPlaces: 2,
                  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                }}
                bezier
                style={{
                  marginVertical: 8,
                  borderRadius: 16,
                }}
                withInnerLines={true}
                withOuterLines={true}
                withDots={false}
              />
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

