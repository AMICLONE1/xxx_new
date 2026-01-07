import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types';
import { useMeterStore, useTradingStore, useWalletStore, useAuthStore } from '@/store';
import { formatEnergy, formatCurrency, calculateCarbonSaved } from '@/utils/helpers';
import { useTheme } from '@/contexts';
import { getThemedColors } from '@/utils/themedStyles';

const { width } = Dimensions.get('window');

// ============================================
// ENERGY FLOW TYPES
// ============================================

type EnergyNodeType = 'solar' | 'home' | 'battery' | 'grid';

interface EnergyNodeConfig {
  id: EnergyNodeType;
  label: string;
  icon: string;
  iconFamily: 'MaterialCommunityIcons' | 'Ionicons';
  gradientColors: [string, string];
  getStatusText: (context: EnergyFlowContext) => string;
}

interface EnergyFlowContext {
  currentGeneration: number;
  isSelling: boolean;
  batteryLevel?: number;
  isCharging?: boolean;
}

// ============================================
// ENERGY NODE CONFIGURATIONS
// ============================================

const ENERGY_NODE_CONFIGS: Record<EnergyNodeType, EnergyNodeConfig> = {
  solar: {
    id: 'solar',
    label: 'Solar',
    icon: 'solar-power',
    iconFamily: 'MaterialCommunityIcons',
    gradientColors: ['#fbbf24', '#f59e0b'],
    getStatusText: (ctx) => ctx.currentGeneration > 0 ? formatEnergy(ctx.currentGeneration, 'kW') : 'Idle',
  },
  home: {
    id: 'home',
    label: 'Home',
    icon: 'home',
    iconFamily: 'Ionicons',
    gradientColors: ['#3b82f6', '#2563eb'],
    getStatusText: () => 'Consuming',
  },
  battery: {
    id: 'battery',
    label: 'Battery',
    icon: 'battery-charging',
    iconFamily: 'MaterialCommunityIcons',
    gradientColors: ['#8b5cf6', '#7c3aed'],
    getStatusText: (ctx) => ctx.isCharging ? 'Charging' : 'Stored',
  },
  grid: {
    id: 'grid',
    label: 'Grid',
    icon: 'transmission-tower',
    iconFamily: 'MaterialCommunityIcons',
    gradientColors: ['#10b981', '#059669'],
    getStatusText: (ctx) => ctx.isSelling ? 'Exporting' : 'Connected',
  },
};

// Flow order for rendering
const ENERGY_FLOW_ORDER: EnergyNodeType[] = ['solar', 'home', 'battery', 'grid'];

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

export default function HomeScreen({ navigation }: Props) {
  const { isDark } = useTheme();
  const colors = getThemedColors(isDark);
  const { currentMeter, energyData } = useMeterStore();
  const { activeOrders } = useTradingStore();
  const { wallet } = useWalletStore();
  const { user } = useAuthStore();
  const [currentGeneration, setCurrentGeneration] = useState(0);
  const [dailyYield, setDailyYield] = useState(0);
  const [isSelling, setIsSelling] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(6.50);
  
  // Memoized navigation handlers to prevent unnecessary re-renders
  const navigateToMeterRegistration = useCallback(() => navigation.navigate('MeterRegistration'), [navigation]);
  const navigateToMarketplace = useCallback(() => navigation.navigate('Marketplace'), [navigation]);
  const navigateToTradingBot = useCallback(() => navigation.navigate('TradingBot'), [navigation]);
  const navigateToWallet = useCallback(() => navigation.navigate('Wallet'), [navigation]);
  const navigateToEnergyChart = useCallback(() => navigation.navigate('EnergyChart'), [navigation]);

  // Animation values for energy flow
  const flowAnimation = React.useRef(new Animated.Value(0)).current;

  // ============================================
  // DYNAMIC ENERGY NODES
  // ============================================
  
  // Determine which energy nodes to show based on user's assets
  const visibleEnergyNodes = useMemo(() => {
    // Default to showing all nodes if user data not available (for demo/dev)
    const hasSolar = user?.hasSolar ?? true;
    const hasBattery = user?.hasBattery ?? true;
    const hasGrid = user?.hasGrid ?? true;

    const nodeVisibility: Record<EnergyNodeType, boolean> = {
      solar: hasSolar,
      home: true, // Home is ALWAYS present
      battery: hasBattery,
      grid: hasGrid,
    };

    return ENERGY_FLOW_ORDER.filter((nodeId) => nodeVisibility[nodeId]);
  }, [user?.hasSolar, user?.hasBattery, user?.hasGrid]);

  // Animation opacities for each node type
  const nodeAnimations = useMemo(() => ({
    solar: flowAnimation.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.3, 1, 0.3],
    }),
    home: flowAnimation.interpolate({
      inputRange: [0, 0.3, 0.7, 1],
      outputRange: [0.3, 1, 0.5, 0.3],
    }),
    battery: flowAnimation.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.3, 0.8, 0.3],
    }),
    grid: flowAnimation.interpolate({
      inputRange: [0, 0.7, 1],
      outputRange: [0.3, 1, 0.3],
    }),
  }), [flowAnimation]);

  // Context for status text
  const energyFlowContext: EnergyFlowContext = useMemo(() => ({
    currentGeneration,
    isSelling,
    batteryLevel: 75, // TODO: Get from real data
    isCharging: currentGeneration > 0,
  }), [currentGeneration, isSelling]);

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

    // Animate energy flow
    Animated.loop(
      Animated.sequence([
        Animated.timing(flowAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(flowAnimation, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [energyData, flowAnimation]);

  const carbonSaved = calculateCarbonSaved(dailyYield);

  if (!currentMeter) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient
          colors={['#10b981', '#059669', '#047857']}
          style={styles.gradientHeader}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>PowerNetPro</Text>
              <Text style={styles.headerSubtitle}>Democratizing Energy</Text>
            </View>
            <Ionicons name="flash" size={32} color="#ffffff" />
          </View>
        </LinearGradient>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <LinearGradient
              colors={['#ecfdf5', '#d1fae5']}
              style={styles.emptyIcon}
            >
              <MaterialCommunityIcons name="lightning-bolt" size={64} color="#10b981" />
            </LinearGradient>
          </View>
          <Text style={styles.emptyTitle}>No Meter Connected</Text>
          <Text style={styles.emptySubtitle}>
            Connect your smart meter to start tracking energy generation{'\n'}and participate in P2P energy trading
          </Text>
          <TouchableOpacity
            style={styles.registerButton}
            onPress={navigateToMeterRegistration}
          >
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.registerButtonGradient}
            >
              <Ionicons name="add-circle-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.registerButtonText}>Register Smart Meter</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <LinearGradient
        colors={['#10b981', '#059669', '#047857']}
        style={styles.gradientHeader}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Energy Cockpit</Text>
            <Text style={styles.headerSubtitle}>Real-time Energy Dashboard</Text>
          </View>
          <View style={styles.statusIndicator}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Live</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Live Market Price Ticker */}
      <View style={[styles.tickerContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.tickerContent}>
          <Ionicons name="pulse" size={16} color={colors.primary} />
          <Text style={[styles.tickerLabel, { color: colors.textSecondary }]}>Current Sell Price:</Text>
          <Text style={[styles.tickerPrice, { color: colors.text }]}>₹{currentPrice.toFixed(2)}/unit</Text>
          <View style={[styles.tickerChange, { backgroundColor: colors.successBackground }]}>
            <Ionicons name="arrow-up" size={12} color={colors.success} />
            <Text style={[styles.tickerChangeText, { color: colors.success }]}>+0.25</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Main Stats Grid */}
        <View style={styles.statsGrid}>
          {/* Daily Yield - Large Card */}
          <View style={[styles.statCard, styles.primaryCard]}>
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.statCardGradient}
            >
              <View style={styles.statCardHeader}>
                <MaterialCommunityIcons name="chart-line" size={28} color="#ffffff" />
                <Text style={styles.statCardLabel}>Daily Yield</Text>
              </View>
              <Text style={styles.statCardValue}>{formatEnergy(dailyYield, 'kWh')}</Text>
              <Text style={styles.statCardUnit}>Today's Generation</Text>
            </LinearGradient>
          </View>

          {/* Current Generation */}
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={styles.statCardContent}>
              <MaterialCommunityIcons name="lightning-bolt" size={24} color={colors.primary} />
              <Text style={[styles.statCardLabelSmall, { color: colors.textSecondary }]}>Current</Text>
              <Text style={[styles.statCardValueSmall, { color: colors.text }]}>{formatEnergy(currentGeneration, 'kW')}</Text>
              <Text style={[styles.statCardUnitSmall, { color: colors.textMuted }]}>Real-time Power</Text>
            </View>
          </View>

          {/* Carbon Saved */}
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={styles.statCardContent}>
              <MaterialCommunityIcons name="leaf" size={24} color={colors.primary} />
              <Text style={[styles.statCardLabelSmall, { color: colors.textSecondary }]}>Carbon Saved</Text>
              <Text style={[styles.statCardValueSmall, { color: colors.text }]}>{carbonSaved.toFixed(1)} kg</Text>
              <Text style={[styles.statCardUnitSmall, { color: colors.textMuted }]}>CO₂ Today</Text>
            </View>
          </View>
        </View>

        {/* Wallet Balance */}
        {wallet && (
          <View style={[styles.walletCard, { backgroundColor: colors.card }]}>
            <View style={styles.walletHeader}>
              <View style={styles.walletHeaderLeft}>
                <MaterialCommunityIcons name="wallet" size={24} color={colors.primary} />
                <Text style={[styles.walletTitle, { color: colors.text }]}>Wallet Balance</Text>
              </View>
              <TouchableOpacity onPress={navigateToWallet}>
                <Text style={[styles.walletLink, { color: colors.primary }]}>View Details</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.walletBalances}>
              <View style={styles.walletBalanceItem}>
                <LinearGradient
                  colors={isDark ? ['#064e3b', '#065f46'] : ['#ecfdf5', '#d1fae5']}
                  style={styles.walletBalanceIcon}
                >
                  <MaterialCommunityIcons name="lightning-bolt" size={24} color={colors.primary} />
                </LinearGradient>
                <View style={styles.walletBalanceInfo}>
                  <Text style={[styles.walletBalanceLabel, { color: colors.textSecondary }]}>Energy</Text>
                  <Text style={[styles.walletBalanceValue, { color: colors.text }]}>
                    {formatEnergy(wallet.energyBalance, 'kWh')}
                  </Text>
                </View>
              </View>
              <View style={[styles.walletDivider, { backgroundColor: colors.border }]} />
              <View style={styles.walletBalanceItem}>
                <LinearGradient
                  colors={isDark ? ['#451a03', '#78350f'] : ['#fef3c7', '#fde68a']}
                  style={styles.walletBalanceIcon}
                >
                  <MaterialCommunityIcons name="currency-inr" size={24} color="#f59e0b" />
                </LinearGradient>
                <View style={styles.walletBalanceInfo}>
                  <Text style={[styles.walletBalanceLabel, { color: colors.textSecondary }]}>Cash</Text>
                  <Text style={[styles.walletBalanceValue, { color: colors.text }]}>
                    {formatCurrency(wallet.cashBalance)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Active Orders */}
        {activeOrders.length > 0 && (
          <View style={[styles.ordersCard, { backgroundColor: colors.card }]}>
            <View style={styles.ordersHeader}>
              <View style={styles.ordersHeaderLeft}>
                <MaterialCommunityIcons name="package-variant" size={24} color={colors.primary} />
                <Text style={[styles.ordersTitle, { color: colors.text }]}>Active Orders</Text>
              </View>
              <View style={[styles.ordersCountBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.ordersCount, { color: colors.primary }]}>{activeOrders.length}</Text>
              </View>
            </View>
            {activeOrders.map((order) => (
              <View key={order.id} style={[styles.orderItem, { borderTopColor: colors.border }]}>
                <View style={styles.orderInfo}>
                  <Text style={[styles.orderEnergy, { color: colors.text }]}>
                    {formatEnergy(order.energyAmount, 'kWh')}
                  </Text>
                  <Text style={[styles.orderPrice, { color: colors.textSecondary }]}>
                    @ {formatCurrency(order.pricePerUnit)}/unit
                  </Text>
                </View>
                <View style={[
                  styles.orderStatusBadge,
                  order.status === 'pending' && styles.orderStatusPending,
                  order.status === 'confirmed' && styles.orderStatusConfirmed,
                  order.status === 'in_progress' && styles.orderStatusIn_progress,
                  order.status === 'completed' && styles.orderStatusCompleted,
                  order.status === 'cancelled' && styles.orderStatusCancelled,
                ]}>
                  <Text style={styles.orderStatusText}>{order.status}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Quick Actions - TRD Requirements */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonEV]}
            onPress={navigateToMarketplace}
          >
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              style={styles.actionButtonGradient}
            >
              <MaterialCommunityIcons name="car-electric" size={24} color="#ffffff" />
              <Text style={styles.actionButtonText}>Charge EV Now</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSell]}
            onPress={() => {
              setIsSelling(!isSelling);
              navigateToTradingBot();
            }}
          >
            <LinearGradient
              colors={isSelling ? ['#ef4444', '#dc2626'] : ['#10b981', '#059669']}
              style={styles.actionButtonGradient}
            >
              <MaterialCommunityIcons 
                name={isSelling ? 'pause-circle' : 'play-circle'} 
                size={24} 
                color="#ffffff" 
              />
              <Text style={styles.actionButtonText}>
                {isSelling ? 'Pause Selling' : 'Start Selling'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.withdrawButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={navigateToWallet}
        >
          <Ionicons name="cash-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.withdrawButtonText, { color: colors.text }]}>Withdraw Cash</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        {/* View Charts Button */}
        <TouchableOpacity
          style={[styles.chartButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={navigateToEnergyChart}
        >
          <MaterialCommunityIcons name="chart-timeline-variant" size={24} color={colors.primary} />
          <Text style={[styles.chartButtonText, { color: colors.text }]}>View Detailed Charts</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Energy Flow Visualization - Dynamic Version */}
        <View style={[styles.energyFlowContainerCompact, { backgroundColor: colors.card }]}>
          <View style={styles.energyFlowHeader}>
            <MaterialCommunityIcons name="transit-connection-variant" size={20} color={colors.primary} />
            <Text style={[styles.energyFlowTitleCompact, { color: colors.text }]}>Energy Flow</Text>
          </View>
          <View style={styles.energyFlowDiagramCompact}>
            {visibleEnergyNodes.map((nodeId, index) => {
              const config = ENERGY_NODE_CONFIGS[nodeId];
              const isLastNode = index === visibleEnergyNodes.length - 1;
              const nodeOpacity = nodeAnimations[nodeId];

              // Render icon based on icon family
              const renderIcon = () => {
                if (config.iconFamily === 'MaterialCommunityIcons') {
                  return (
                    <MaterialCommunityIcons
                      name={config.icon as any}
                      size={20}
                      color="#ffffff"
                    />
                  );
                }
                return (
                  <Ionicons
                    name={config.icon as any}
                    size={20}
                    color="#ffffff"
                  />
                );
              };

              return (
                <React.Fragment key={nodeId}>
                  {/* Energy Node */}
                  <View style={styles.flowNodeCompact}>
                    <Animated.View style={[styles.flowIconContainerCompact, { opacity: nodeOpacity }]}>
                      <LinearGradient
                        colors={config.gradientColors}
                        style={styles.flowIconGradientCompact}
                      >
                        {renderIcon()}
                      </LinearGradient>
                    </Animated.View>
                    <Text style={styles.flowLabelCompact}>{config.label}</Text>
                    <Text style={styles.flowValueCompact}>
                      {config.getStatusText(energyFlowContext)}
                    </Text>
                  </View>

                  {/* Arrow between nodes (not after last node) */}
                  {!isLastNode && (
                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color="#10b981"
                      style={styles.flowArrowCompact}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </View>
      </ScrollView>
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
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#d1fae5',
    fontWeight: '500',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34d399',
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  tickerContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickerLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 8,
    marginRight: 8,
  },
  tickerPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
    marginRight: 12,
  },
  tickerChange: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tickerChangeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  energyFlowContainerCompact: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  energyFlowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  energyFlowTitleCompact: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  energyFlowDiagramCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  flowNodeCompact: {
    alignItems: 'center',
    flex: 1,
    minWidth: 60,
  },
  flowIconContainerCompact: {
    marginBottom: 6,
  },
  flowIconGradientCompact: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  flowLabelCompact: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  flowValueCompact: {
    fontSize: 9,
    color: '#6b7280',
  },
  flowArrowCompact: {
    paddingHorizontal: 2,
    marginHorizontal: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: (width - 52) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryCard: {
    width: width - 40,
    marginBottom: 12,
  },
  statCardGradient: {
    padding: 20,
  },
  statCardContent: {
    padding: 16,
    alignItems: 'center',
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statCardLabel: {
    fontSize: 13,
    color: '#d1fae5',
    fontWeight: '500',
    marginLeft: 8,
  },
  statCardLabelSmall: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 4,
  },
  statCardValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  statCardValueSmall: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  statCardUnit: {
    fontSize: 12,
    color: '#d1fae5',
    fontWeight: '500',
  },
  statCardUnitSmall: {
    fontSize: 10,
    color: '#9ca3af',
  },
  walletCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  walletHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 8,
  },
  walletLink: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  walletBalances: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletBalanceItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletBalanceIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  walletBalanceInfo: {
    flex: 1,
  },
  walletBalanceLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  walletBalanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  walletDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 16,
  },
  ordersCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  ordersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  ordersHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ordersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 8,
  },
  ordersCountBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  ordersCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  orderInfo: {
    flex: 1,
  },
  orderEnergy: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  orderPrice: {
    fontSize: 12,
    color: '#6b7280',
  },
  orderStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  orderStatusPending: {
    backgroundColor: '#fef3c7',
  },
  orderStatusConfirmed: {
    backgroundColor: '#dbeafe',
  },
  orderStatusIn_progress: {
    backgroundColor: '#e0e7ff',
  },
  orderStatusCompleted: {
    backgroundColor: '#d1fae5',
  },
  orderStatusCancelled: {
    backgroundColor: '#fee2e2',
  },
  orderStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
    textTransform: 'capitalize',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButtonEV: {
    flex: 1,
  },
  actionButtonSell: {
    flex: 1,
  },
  actionButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  withdrawButton: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  withdrawButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  chartButton: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  chartButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 12,
    flex: 1,
  },
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
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  registerButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  registerButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
