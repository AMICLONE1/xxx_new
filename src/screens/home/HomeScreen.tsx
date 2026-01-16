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

// Helper function to get greeting based on time of day
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return 'Good Morning';
  } else if (hour >= 12 && hour < 17) {
    return 'Good Afternoon';
  } else if (hour >= 17 && hour < 21) {
    return 'Good Evening';
  } else {
    return 'Good Night';
  }
};

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
  const [greeting, setGreeting] = useState(getGreeting());

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

  // Update greeting based on time of day
  useEffect(() => {
    setGreeting(getGreeting());
    // Update greeting every minute to handle time boundary changes
    const interval = setInterval(() => {
      setGreeting(getGreeting());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

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
      <LinearGradient
        colors={['#e0f2fe', '#f0f9ff', '#ffffff']}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <SafeAreaView style={styles.containerTransparent} edges={['top']}>
          <View style={styles.headerContainer}>
            <View style={styles.headerTop}>
              <View style={styles.logoContainer}>
                <MaterialCommunityIcons name="lightning-bolt" size={28} color="#0ea5e9" />
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.headerIconButton}>
                  <Ionicons name="notifications-outline" size={24} color="#1e293b" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.profileButton}>
                  <Ionicons name="person-outline" size={18} color="#1e293b" />
                  <Text style={styles.profileButtonText}>Profile</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <LinearGradient
                colors={['#e0f2fe', '#bae6fd']}
                style={styles.emptyIcon}
              >
                <MaterialCommunityIcons name="lightning-bolt" size={64} color="#0ea5e9" />
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
                colors={['#0ea5e9', '#0284c7']}
                style={styles.registerButtonGradient}
              >
                <Ionicons name="add-circle-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.registerButtonText}>Register Smart Meter</Text>
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
      <SafeAreaView style={styles.containerTransparent} edges={['top']}>
        {/* Header with Greeting and Notification */}
        <View style={styles.headerContainer}>
          <View style={styles.greetingSection}>
            <Text style={styles.greetingText}>{greeting},</Text>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color="#1e293b" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Hero Card - Today's Generation */}
          <View style={styles.heroCardNew}>
            <View style={styles.heroCardContent}>
              <View style={styles.heroCardLeft}>
                <Text style={styles.heroCardTitle}>TODAY'S GENERATION</Text>
                <Text style={styles.heroCardValueNew}>{formatEnergy(dailyYield, 'kWh')}</Text>
                <View style={styles.peakEfficiencyBadge}>
                  <Ionicons name="trending-up" size={12} color="#3b82f6" />
                  <Text style={styles.peakEfficiencyText}>Peak Efficiency</Text>
                </View>
              </View>
              <View style={styles.heroCardRight}>
                <View style={styles.circularProgressContainer}>
                  <View style={styles.circularProgress}>
                    <View style={styles.circularProgressInner}>
                      <Text style={styles.circularProgressText}>+72%</Text>
                      <Text style={styles.circularProgressLabel}>Surplus</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsRowNew}>
            <TouchableOpacity
              style={styles.actionButtonNew}
              onPress={navigateToMarketplace}
              activeOpacity={0.9}
            >
              <View style={[styles.actionButtonIconContainer, { backgroundColor: 'rgba(25, 137, 242, 1)' }]}>
                <MaterialCommunityIcons name="car-electric" size={24} color="#7dd3fc" />
              </View>
              <Text style={styles.actionButtonLabel}>Charge EV</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButtonNew}
              onPress={() => {
                setIsSelling(!isSelling);
                navigateToTradingBot();
              }}
              activeOpacity={0.9}
            >
              <View style={[styles.actionButtonIconContainer, { backgroundColor: 'rgba(25, 137, 242, 1)' }]}>
                <MaterialCommunityIcons name="currency-usd" size={24} color="#93c5fd" />
              </View>
              <Text style={styles.actionButtonLabel}>Sell Surplus</Text>
            </TouchableOpacity>
          </View>

          {/* Live Energy Flow Section */}
          <View style={styles.liveEnergySection}>
            <View style={styles.liveEnergySectionHeader}>
              <Text style={styles.liveEnergySectionTitle}>Live Energy Flow</Text>
              <View style={styles.realTimeBadge}>
                <Text style={styles.realTimeBadgeText}>Real-time</Text>
              </View>
            </View>
            <View style={[styles.energyFlowContainerCompact, { backgroundColor: colors.card }]}>
              <View style={styles.energyFlowDiagramCompact}>
                {visibleEnergyNodes.map((nodeId, index) => {
                  const config = ENERGY_NODE_CONFIGS[nodeId];
                  const isLastNode = index === visibleEnergyNodes.length - 1;
                  const nodeOpacity = nodeAnimations[nodeId];

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

                      {!isLastNode && (
                        <Ionicons
                          name="arrow-forward"
                          size={16}
                          color="#0ea5e9"
                          style={styles.flowArrowCompact}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Stats Grid - 2x2 */}
          <View style={styles.statsGrid}>
            {/* Current Power */}
            <View style={styles.statCardSmallNew}>
              <View style={[styles.statIconCircleSmall, { backgroundColor: '#e0f2fe' }]}>
                <MaterialCommunityIcons name="lightning-bolt" size={18} color="#0ea5e9" />
              </View>
              <Text style={styles.statLabelSmall}>Current Power</Text>
              <Text style={styles.statValueSmall}>{formatEnergy(currentGeneration, 'kW')}</Text>
            </View>

            {/* Carbon Saved */}
            <View style={styles.statCardSmallNew}>
              <View style={[styles.statIconCircleSmall, { backgroundColor: '#dbeafe' }]}>
                <MaterialCommunityIcons name="leaf" size={18} color="#3b82f6" />
              </View>
              <Text style={styles.statLabelSmall}>Carbon Saved</Text>
              <Text style={styles.statValueSmall}>{carbonSaved.toFixed(1)} kg</Text>
            </View>

            {/* Market Price */}
            <View style={styles.statCardFullWidth}>
              <View style={[styles.statIconCircleSmall, { backgroundColor: '#dbeafe', marginBottom: 0 }]}>
                <MaterialCommunityIcons name="chart-line" size={18} color="#3b82f6" />
              </View>

              <View style={styles.marketPriceContent}>
                <Text style={[styles.statLabelSmall, { marginBottom: 4 }]}>Market Price</Text>
                <Text style={styles.statValueSmall}>
                  {formatCurrency(currentPrice)} <Text style={styles.statUnitSmall}>/ kWh</Text>
                </Text>
              </View>

              <View style={styles.marketPriceTrendContainer}>
                <View style={styles.marketPriceTrendRow}>
                  <Ionicons name="trending-up" size={14} color="#0ea5e9" />
                  <Text style={[styles.statTrendTextLarge, { color: '#0ea5e9' }]}>+2.4%</Text>
                </View>
                <Text style={styles.statSubtextSmall}>vs yesterday</Text>
              </View>
            </View>
          </View>

          {/* Secondary Actions */}
          <View style={styles.secondaryActionsRowNew}>
            <TouchableOpacity
              style={styles.secondaryActionButtonNew}
              onPress={navigateToWallet}
              activeOpacity={0.8}
            >
              <View style={styles.secondaryActionIconContainer}>
                <Ionicons name="card-outline" size={20} color="#1e293b" />
              </View>
              <Text style={styles.secondaryActionLabel}>Withdraw Cash</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryActionButtonNew}
              onPress={navigateToEnergyChart}
              activeOpacity={0.8}
            >
              <View style={styles.secondaryActionIconContainer}>
                <MaterialCommunityIcons name="chart-bar" size={20} color="#1e293b" />
              </View>
              <Text style={styles.secondaryActionLabel}>View Charts</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4',
  },
  gradientBackground: {
    flex: 1,
  },
  containerTransparent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingSection: {
    flex: 1,
  },
  greetingText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '400',
    marginBottom: 4,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  profileButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  mainCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  mainCardLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 8,
  },
  mainCardValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  mainCardValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  mainCardArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniChartContainer: {
    height: 100,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 16,
  },
  chartBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  chartBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#16a34a',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  highlightsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  highlightCard: {
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
  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  highlightLabel: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500',
  },
  highlightLabelGreen: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  highlightValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 2,
  },
  highlightChange: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '500',
    marginBottom: 8,
  },
  highlightChangeGreen: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '500',
    marginBottom: 8,
  },
  highlightSubtext: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
  },
  quickActionsGrid: {
    gap: 12,
    marginBottom: 24,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  quickActionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  quickActionIconOrange: {
    backgroundColor: '#ffedd5',
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  quickActionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
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
  // ============================================
  // NEW REDESIGNED UI STYLES
  // ============================================
  heroCardNew: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  heroCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroCardLeft: {
    flex: 1,
  },
  heroCardTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  heroCardValueNew: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  peakEfficiencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  peakEfficiencyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3b82f6',
  },
  heroCardRight: {
    marginLeft: 16,
  },
  circularProgressContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularProgress: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: '#3b82f6',
    borderTopColor: '#e0f2fe',
    borderRightColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '-45deg' }],
  },
  circularProgressInner: {
    transform: [{ rotate: '45deg' }],
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularProgressText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  circularProgressLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  actionButtonsRowNew: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButtonNew: {
    flex: 1,
    backgroundColor: '#1766e4ff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButtonSell: {
    backgroundColor: '#1766e4ff',
  },
  actionButtonIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    // backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  liveEnergySection: {
    marginBottom: 20,
  },
  liveEnergySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveEnergySectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  realTimeBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  realTimeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3b82f6',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCardSmallNew: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    // shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    minHeight: 120,
  },
  statCardFullWidth: {
    width: width - 40,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  marketPriceContent: {
    flex: 1,
    justifyContent: 'center',
  },
  marketPriceTrendContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  marketPriceTrendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  statIconCircleSmall: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabelSmall: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 6,
  },
  statValueSmall: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  statUnitSmall: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '400',
  },
  statTrendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statTrendText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10b981',
  },
  statTrendTextLarge: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10b981',
  },
  statSubtextSmall: {
    fontSize: 10,
    color: '#94a3b8',
  },
  secondaryActionsRowNew: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  secondaryActionButtonNew: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  secondaryActionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  secondaryActionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  // ============================================
  // OLD CARD STYLES (kept for compatibility)
  // ============================================
  energyCardsContainer: {
    marginBottom: 20,
  },
  heroCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  heroCardGradient: {
    padding: 24,
  },
  heroCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroCardIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  heroCardBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10b981',
  },
  heroCardLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    marginBottom: 8,
  },
  heroCardValue: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: -1,
    marginBottom: 16,
  },
  heroCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroCardSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCardModern: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  statCardModernHeader: {
    marginBottom: 14,
  },
  statIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statCardModernValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  statCardModernLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 10,
  },
  statCardModernIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statCardModernStatus: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  marketPriceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    height: 82,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  marketPriceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  marketPriceInfo: {
    gap: 2,
  },
  marketPriceLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  marketPriceValue: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  marketPriceTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  marketPriceTrendText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  // ============================================
  // WALLET CARD MODERN STYLES
  // ============================================
  walletCardModern: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  walletCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  walletTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  walletCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  walletBalancesModern: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletBalanceItemModern: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  walletBalanceIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletBalanceInfoModern: {
    flex: 1,
  },
  walletBalanceLabelModern: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
    marginBottom: 2,
  },
  walletBalanceValueModern: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  walletBalanceDividerModern: {
    width: 1,
    height: 40,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 12,
  },
  // ============================================
  // ORDERS CARD MODERN STYLES
  // ============================================
  ordersCardModern: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  ordersHeaderModern: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  ordersTitleModern: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginLeft: 12,
  },
  ordersCountBadgeModern: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  ordersCountModern: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  orderItemModern: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  orderInfoModern: {
    flex: 1,
  },
  orderEnergyModern: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  orderPriceModern: {
    fontSize: 12,
    color: '#64748b',
  },
  orderStatusBadgeModern: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  orderStatusTextModern: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  // ============================================
  // ACTION BUTTONS MODERN STYLES
  // ============================================
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButtonModern: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButtonGradientModern: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonTextModern: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryActionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  secondaryActionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  secondaryActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryActionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
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
  statCard: {
    width: width - 40,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  statCardSmall: {
    width: (width - 52) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
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
    color: '#bae6fd',
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
    color: '#bae6fd',
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
