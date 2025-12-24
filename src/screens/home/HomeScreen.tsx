import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types';
import { useMeterStore, useTradingStore, useWalletStore } from '@/store';
import { formatEnergy, formatCurrency, calculateCarbonSaved } from '@/utils/helpers';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

export default function HomeScreen({ navigation }: Props) {
  const { currentMeter, energyData } = useMeterStore();
  const { activeOrders } = useTradingStore();
  const { wallet } = useWalletStore();
  const [currentGeneration, setCurrentGeneration] = useState(0);
  const [dailyYield, setDailyYield] = useState(0);

  useEffect(() => {
    // Calculate current generation and daily yield from energy data
    if (energyData.length > 0) {
      const latest = energyData[0];
      setCurrentGeneration(latest.generation);
      
      // Calculate daily yield (sum of generation for today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayData = energyData.filter(
        (data) => data.timestamp >= today && data.generation > 0
      );
      const totalYield = todayData.reduce((sum, data) => sum + data.generation, 0);
      setDailyYield(totalYield);
    }
  }, [energyData]);

  const carbonSaved = calculateCarbonSaved(dailyYield);

  if (!currentMeter) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Meter Connected</Text>
          <Text style={styles.emptySubtitle}>
            Please register your smart meter to view energy data
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>Energy Cockpit</Text>

          {/* Current Generation */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Current Generation</Text>
            <Text style={styles.cardValue}>{formatEnergy(currentGeneration, 'kW')}</Text>
          </View>

          {/* Daily Yield */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Daily Yield</Text>
            <Text style={styles.cardValue}>{formatEnergy(dailyYield, 'kWh')}</Text>
          </View>

          {/* Carbon Saved */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Carbon Saved Today</Text>
            <Text style={styles.cardValue}>{carbonSaved.toFixed(2)} kg CO₂</Text>
          </View>

          {/* Wallet Balance */}
          {wallet && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Wallet Balance</Text>
              <View style={styles.balanceRow}>
                <View>
                  <Text style={styles.balanceLabel}>Energy</Text>
                  <Text style={styles.balanceValue}>
                    {formatEnergy(wallet.energyBalance, 'kWh')}
                  </Text>
                </View>
                <View>
                  <Text style={styles.balanceLabel}>Cash</Text>
                  <Text style={styles.balanceValue}>{formatCurrency(wallet.cashBalance)}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Active Orders */}
          {activeOrders.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Active Orders</Text>
              {activeOrders.map((order) => (
                <View key={order.id} style={styles.orderItem}>
                  <Text style={styles.orderText}>
                    {formatEnergy(order.energyAmount, 'kWh')} @ {formatCurrency(order.pricePerUnit)}
                    /unit
                  </Text>
                  <Text style={styles.orderStatus}>{order.status}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('EnergyChart')}
            >
              <Text style={styles.actionButtonText}>View Charts</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('TradingBot')}
            >
              <Text style={styles.actionButtonText}>Trading Bot</Text>
            </TouchableOpacity>
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
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10b981',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  balanceLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  orderText: {
    fontSize: 14,
    color: '#111827',
  },
  orderStatus: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
