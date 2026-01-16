import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { TradingBotConfig } from '@/types';
import { MIN_SELL_PRICE, MAX_SELL_PRICE, DEFAULT_RESERVE_POWER } from '@/utils/constants';
import { useTheme } from '@/contexts';
import { getThemedColors } from '@/utils/themedStyles';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types';

type TradingBotScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'TradingBot'
>;

interface Props {
  navigation: TradingBotScreenNavigationProp;
  config?: TradingBotConfig;
  onSave?: (config: TradingBotConfig) => void;
}

export default function TradingBotScreen({ navigation, config, onSave }: Props) {
  const { isDark } = useTheme();
  const colors = getThemedColors(isDark);

  const [enabled, setEnabled] = useState(config?.enabled || false);
  const [reservePower, setReservePower] = useState(
    config?.reservePower || DEFAULT_RESERVE_POWER
  );
  const [minSellPrice, setMinSellPrice] = useState(
    config?.minSellPrice || MIN_SELL_PRICE
  );
  const [priority, setPriority] = useState<'neighbors' | 'grid' | 'both'>(
    config?.priority || 'both'
  );

  const handleSave = () => {
    if (minSellPrice < MIN_SELL_PRICE || minSellPrice > MAX_SELL_PRICE) {
      Alert.alert('Invalid Price', `Price must be between ₹${MIN_SELL_PRICE} and ₹${MAX_SELL_PRICE}`);
      return;
    }

    if (reservePower < 0 || reservePower > 100) {
      Alert.alert('Invalid Reserve', 'Reserve power must be between 0% and 100%');
      return;
    }

    const newConfig: TradingBotConfig = {
      userId: config?.userId || 'current_user_id',
      enabled,
      reservePower,
      minSellPrice,
      priority,
      updatedAt: new Date(),
    };

    if (onSave) {
      onSave(newConfig);
    }
    Alert.alert('Success', 'Trading bot configuration saved', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  const priorityOptions = [
    { value: 'neighbors' as const, label: 'Neighbors', icon: 'home-group' },
    { value: 'grid' as const, label: 'Grid', icon: 'transmission-tower' },
    { value: 'both' as const, label: 'Both', icon: 'swap-horizontal' },
  ];

  return (
    <LinearGradient
      colors={isDark ? ['#1f2937', '#111827', '#0f172a'] : ['#e0f2fe', '#f0f9ff', '#ffffff']}
      style={styles.gradientBackground}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: isDark ? colors.cardElevated : '#ffffff' }]}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#3b82f6" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Trading Bot</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Auto-pilot trading rules</Text>
          </View>
          <View style={[styles.robotIconContainer, { backgroundColor: isDark ? '#1e3a5f' : '#dbeafe' }]}>
            <MaterialCommunityIcons name="robot" size={24} color="#3b82f6" />
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Enable/Disable Card */}
          <View style={[styles.sectionCard, { backgroundColor: isDark ? colors.card : '#ffffff' }]}>
            <View style={styles.switchRow}>
              <View style={[styles.switchIconContainer, { backgroundColor: enabled ? (isDark ? '#1e3a5f' : '#dbeafe') : (isDark ? colors.backgroundSecondary : '#f1f5f9') }]}>
                <MaterialCommunityIcons
                  name={enabled ? "robot" : "robot-off"}
                  size={22}
                  color={enabled ? "#3b82f6" : colors.textMuted}
                />
              </View>
              <View style={styles.switchLabelContainer}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>Enable Auto-Selling</Text>
                <Text style={[styles.switchHint, { color: colors.textSecondary }]}>
                  Automatically sell excess energy
                </Text>
              </View>
              <Switch
                value={enabled}
                onValueChange={setEnabled}
                trackColor={{ false: isDark ? '#374151' : '#d1d5db', true: '#3b82f6' }}
                thumbColor="#ffffff"
              />
            </View>
          </View>

          {enabled && (
            <>
              {/* Reserve Power Card */}
              <View style={[styles.sectionCard, { backgroundColor: isDark ? colors.card : '#ffffff' }]}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIconContainer, { backgroundColor: isDark ? '#1e3a5f' : '#dbeafe' }]}>
                    <MaterialCommunityIcons name="battery-charging" size={20} color="#3b82f6" />
                  </View>
                  <View style={styles.sectionHeaderText}>
                    <Text style={[styles.label, { color: colors.text }]}>Reserve Power</Text>
                    <Text style={[styles.hint, { color: colors.textSecondary }]}>
                      Keep this % for home use
                    </Text>
                  </View>
                </View>

                <View style={styles.sliderContainer}>
                  <Text style={[styles.sliderValue, { color: '#3b82f6' }]}>{reservePower}%</Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={100}
                    value={reservePower}
                    onValueChange={(value) => setReservePower(Math.round(value))}
                    minimumTrackTintColor="#3b82f6"
                    maximumTrackTintColor={isDark ? '#374151' : '#e5e7eb'}
                    thumbTintColor="#3b82f6"
                  />
                  <View style={styles.sliderLabels}>
                    <Text style={[styles.sliderLabel, { color: colors.textMuted }]}>0%</Text>
                    <Text style={[styles.sliderLabel, { color: colors.textMuted }]}>100%</Text>
                  </View>
                </View>

                <View style={[styles.inputContainer, { backgroundColor: isDark ? colors.backgroundSecondary : '#f8fafc', borderColor: isDark ? colors.border : '#e2e8f0' }]}>
                  <MaterialCommunityIcons name="percent" size={18} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={reservePower.toString()}
                    onChangeText={(text) => {
                      const value = parseInt(text, 10);
                      if (!isNaN(value) && value >= 0 && value <= 100) {
                        setReservePower(value);
                      }
                    }}
                    keyboardType="numeric"
                    placeholder="40"
                    placeholderTextColor={colors.inputPlaceholder}
                  />
                </View>
              </View>

              {/* Minimum Sell Price Card */}
              <View style={[styles.sectionCard, { backgroundColor: isDark ? colors.card : '#ffffff' }]}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIconContainer, { backgroundColor: isDark ? '#1e3a5f' : '#dbeafe' }]}>
                    <MaterialCommunityIcons name="currency-inr" size={20} color="#3b82f6" />
                  </View>
                  <View style={styles.sectionHeaderText}>
                    <Text style={[styles.label, { color: colors.text }]}>Minimum Sell Price</Text>
                    <Text style={[styles.hint, { color: colors.textSecondary }]}>
                      Only sell above this price
                    </Text>
                  </View>
                </View>

                <View style={[styles.priceInputContainer, { backgroundColor: isDark ? colors.backgroundSecondary : '#f8fafc', borderColor: isDark ? colors.border : '#e2e8f0' }]}>
                  <Text style={[styles.currencySymbol, { color: '#3b82f6' }]}>₹</Text>
                  <TextInput
                    style={[styles.priceInput, { color: colors.text }]}
                    value={minSellPrice.toString()}
                    onChangeText={(text) => {
                      const value = parseFloat(text);
                      if (!isNaN(value)) {
                        setMinSellPrice(value);
                      }
                    }}
                    keyboardType="decimal-pad"
                    placeholder="8.00"
                    placeholderTextColor={colors.inputPlaceholder}
                  />
                  <View style={[styles.unitBadge, { backgroundColor: isDark ? colors.border : '#e2e8f0' }]}>
                    <Text style={[styles.unitText, { color: colors.textSecondary }]}>per unit</Text>
                  </View>
                </View>

                <View style={styles.priceRange}>
                  <Text style={[styles.priceRangeText, { color: colors.textMuted }]}>
                    Range: ₹{MIN_SELL_PRICE} - ₹{MAX_SELL_PRICE}
                  </Text>
                </View>
              </View>

              {/* Priority Card */}
              <View style={[styles.sectionCard, { backgroundColor: isDark ? colors.card : '#ffffff' }]}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIconContainer, { backgroundColor: isDark ? '#1e3a5f' : '#dbeafe' }]}>
                    <MaterialCommunityIcons name="sort" size={20} color="#3b82f6" />
                  </View>
                  <View style={styles.sectionHeaderText}>
                    <Text style={[styles.label, { color: colors.text }]}>Selling Priority</Text>
                    <Text style={[styles.hint, { color: colors.textSecondary }]}>
                      Where to sell first
                    </Text>
                  </View>
                </View>

                <View style={styles.priorityOptions}>
                  {priorityOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.priorityOption,
                        {
                          backgroundColor: priority === option.value
                            ? (isDark ? '#1e3a5f' : '#dbeafe')
                            : (isDark ? colors.backgroundSecondary : '#f8fafc'),
                          borderColor: priority === option.value
                            ? '#3b82f6'
                            : (isDark ? colors.border : '#e2e8f0'),
                        },
                      ]}
                      onPress={() => setPriority(option.value)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.priorityIconContainer,
                        { backgroundColor: priority === option.value ? '#3b82f6' : (isDark ? colors.card : '#ffffff') }
                      ]}>
                        <MaterialCommunityIcons
                          name={option.icon as any}
                          size={20}
                          color={priority === option.value ? '#ffffff' : colors.textMuted}
                        />
                      </View>
                      <Text
                        style={[
                          styles.priorityOptionText,
                          { color: priority === option.value ? '#3b82f6' : colors.textSecondary },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}

          {/* Save Button */}
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              style={styles.saveButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
              <Text style={styles.saveButtonText}>Save Configuration</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: isDark ? colors.card : '#ffffff', borderColor: isDark ? colors.border : '#e2e8f0' }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  headerContent: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  robotIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  // Section Card
  sectionCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionHeaderText: {
    flex: 1,
  },
  // Switch Row
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 12,
  },
  switchLabel: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  switchHint: {
    fontSize: 13,
    lineHeight: 18,
  },
  // Labels
  label: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
  // Slider
  sliderContainer: {
    marginBottom: 16,
  },
  sliderValue: {
    fontSize: 36,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 4,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  sliderLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  // Price Input
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '700',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
  },
  unitBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  unitText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priceRange: {
    marginTop: 12,
    alignItems: 'center',
  },
  priceRangeText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  // Priority Options
  priorityOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    gap: 10,
  },
  priorityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityOptionText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Save Button
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 12,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Cancel Button
  cancelButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginBottom: 20,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
