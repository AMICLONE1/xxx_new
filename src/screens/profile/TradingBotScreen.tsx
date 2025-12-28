import React, { useState, useEffect } from 'react';
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
    { value: 'neighbors' as const, label: 'Neighbors First', icon: 'home-group' },
    { value: 'grid' as const, label: 'Grid First', icon: 'transmission-tower' },
    { value: 'both' as const, label: 'Both', icon: 'swap-horizontal' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#10b981', '#059669']}
        style={styles.gradientHeader}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Trading Bot (Auto-Pilot)</Text>
            <Text style={styles.headerSubtitle}>Set and forget rules for automated trading</Text>
          </View>
          <MaterialCommunityIcons name="robot" size={32} color="#ffffff" />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Enable/Disable */}
          <View style={styles.section}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabelContainer}>
                <Text style={styles.switchLabel}>Enable Auto-Selling</Text>
                <Text style={styles.switchHint}>
                  Automatically sell excess energy based on your rules
                </Text>
              </View>
              <Switch
                value={enabled}
                onValueChange={setEnabled}
                trackColor={{ false: '#d1d5db', true: '#10b981' }}
                thumbColor="#ffffff"
              />
            </View>
          </View>

          {enabled && (
            <>
              {/* Reserve Power */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="battery-charging" size={24} color="#10b981" />
                  <View style={styles.sectionHeaderText}>
                    <Text style={styles.label}>Reserve Power</Text>
                    <Text style={styles.hint}>
                      Keep this percentage of battery for your home use
                    </Text>
                  </View>
                </View>
                <View style={styles.sliderContainer}>
                  <Text style={styles.sliderValue}>{reservePower}%</Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={100}
                    value={reservePower}
                    onValueChange={setReservePower}
                    minimumTrackTintColor="#10b981"
                    maximumTrackTintColor="#e5e7eb"
                    thumbTintColor="#10b981"
                  />
                  <View style={styles.sliderLabels}>
                    <Text style={styles.sliderLabel}>0%</Text>
                    <Text style={styles.sliderLabel}>100%</Text>
                  </View>
                </View>
                <TextInput
                  style={styles.input}
                  value={reservePower.toString()}
                  onChangeText={(text) => {
                    const value = parseInt(text, 10);
                    if (!isNaN(value) && value >= 0 && value <= 100) {
                      setReservePower(value);
                    }
                  }}
                  keyboardType="numeric"
                  placeholder="40"
                />
              </View>

              {/* Minimum Sell Price */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="currency-inr" size={24} color="#10b981" />
                  <View style={styles.sectionHeaderText}>
                    <Text style={styles.label}>Minimum Sell Price</Text>
                    <Text style={styles.hint}>
                      Only sell if the market price is above this amount (₹/unit)
                    </Text>
                  </View>
                </View>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={minSellPrice.toString()}
                    onChangeText={(text) => {
                      const value = parseFloat(text);
                      if (!isNaN(value)) {
                        setMinSellPrice(value);
                      }
                    }}
                    keyboardType="decimal-pad"
                    placeholder="8.00"
                  />
                  <Text style={styles.unitText}>/unit</Text>
                </View>
              </View>

              {/* Priority */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="sort" size={24} color="#10b981" />
                  <View style={styles.sectionHeaderText}>
                    <Text style={styles.label}>Selling Priority</Text>
                    <Text style={styles.hint}>
                      Choose where to sell your excess energy first
                    </Text>
                  </View>
                </View>
                <View style={styles.priorityOptions}>
                  {priorityOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.priorityOption,
                        priority === option.value && styles.priorityOptionActive,
                      ]}
                      onPress={() => setPriority(option.value)}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons
                        name={option.icon as any}
                        size={24}
                        color={priority === option.value ? '#10b981' : '#6b7280'}
                      />
                      <Text
                        style={[
                          styles.priorityOptionText,
                          priority === option.value && styles.priorityOptionTextActive,
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

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.8}>
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.saveButtonGradient}
            >
              <MaterialCommunityIcons name="content-save" size={20} color="#ffffff" />
              <Text style={styles.saveButtonText}>Save Configuration</Text>
            </LinearGradient>
          </TouchableOpacity>
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
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#d1fae5',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  sectionHeaderText: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  switchHint: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  hint: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  sliderContainer: {
    marginBottom: 16,
  },
  sliderValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10b981',
    textAlign: 'center',
    marginBottom: 16,
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 8,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6b7280',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    paddingVertical: 12,
  },
  unitText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  priorityOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityOption: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    gap: 8,
  },
  priorityOptionActive: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  priorityOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
  },
  priorityOptionTextActive: {
    color: '#10b981',
    fontWeight: '600',
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#10b981',
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
});
