import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types';
import { locationService } from '@/services/locationService';
import { meterService } from '@/services/api/meterService';
import { getErrorMessage } from '@/utils/errorUtils';
import { useTheme } from '@/contexts';
import { getThemedColors } from '@/utils/themedStyles';

type HardwareRequestScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'MeterRegistration'
>;

interface Props {
  navigation: HardwareRequestScreenNavigationProp;
}

export default function HardwareRequestScreen({ navigation }: Props) {
  const { isDark } = useTheme();
  const colors = getThemedColors(isDark);

  const [address, setAddress] = useState('');
  const [apartmentNumber, setApartmentNumber] = useState('');
  const [loadCapacity, setLoadCapacity] = useState(5); // kW
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const handleGetLocation = async () => {
    setIsGettingLocation(true);
    try {
      console.log('[HardwareRequest] Getting location...');
      const cachedLocation = await locationService.getCurrentLocation();

      if (!cachedLocation) {
        Alert.alert(
          'Location Unavailable',
          'Could not get your location. Please enter your address manually.'
        );
        return;
      }

      console.log('[HardwareRequest] Got location:', cachedLocation.latitude, cachedLocation.longitude);

      if (cachedLocation.address) {
        const fullAddress = [
          cachedLocation.address.city,
          cachedLocation.address.pincode,
          cachedLocation.address.state,
        ]
          .filter(Boolean)
          .join(', ');
        setAddress(fullAddress);
      } else {
        Alert.alert(
          'Address Not Found',
          'Could not determine your address. Please enter it manually.'
        );
      }
    } catch (error: unknown) {
      console.error('[HardwareRequest] Location error:', error);
      Alert.alert('Error', getErrorMessage(error) || 'Failed to get location');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleSubmit = async () => {
    if (!address.trim()) {
      Alert.alert('Validation Error', 'Please enter your address');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await meterService.requestHardwareInstallation({
        address: `${address}, ${apartmentNumber}`.trim(),
        loadCapacity,
      });

      if (response.success && response.data) {
        Alert.alert(
          'Request Submitted ✅',
          `Your hardware installation request has been submitted successfully.\n\nRequest ID: ${response.data.requestId}\n\nOur team will contact you within 24 hours.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        // Fallback to mock in development
        if (__DEV__) {
          Alert.alert(
            'Request Submitted (Mock)',
            'Your hardware installation request has been submitted. A technician will contact you within 2-3 business days.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        } else {
          throw new Error(response.error || 'Failed to submit request');
        }
      }
    } catch (error: unknown) {
      Alert.alert('Error', getErrorMessage(error) || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = address.trim().length > 0;

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
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#3b82f6" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Hardware Request</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Request meter installation</Text>
          </View>
          <View style={[styles.headerIconContainer, { backgroundColor: isDark ? '#1e3a5f' : '#dbeafe' }]}>
            <MaterialCommunityIcons name="chip" size={24} color="#3b82f6" />
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Address Card */}
          <View style={[styles.sectionCard, { backgroundColor: isDark ? colors.card : '#ffffff' }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: isDark ? '#1e3a5f' : '#dbeafe' }]}>
                <Ionicons name="location" size={20} color="#3b82f6" />
              </View>
              <View style={styles.sectionHeaderText}>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>Installation Address</Text>
                <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>Where should we install the meter?</Text>
              </View>
            </View>

            <View style={styles.addressRow}>
              <View style={[
                styles.addressInputContainer,
                { backgroundColor: isDark ? colors.backgroundSecondary : '#f8fafc', borderColor: isDark ? colors.border : '#e2e8f0' }
              ]}>
                <TextInput
                  style={[styles.addressInput, { color: colors.text }]}
                  placeholder="Enter your complete address"
                  placeholderTextColor={colors.inputPlaceholder}
                  value={address}
                  onChangeText={setAddress}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
              <TouchableOpacity
                style={[styles.locationButton, { backgroundColor: isDark ? '#1e3a5f' : '#dbeafe' }]}
                onPress={handleGetLocation}
                disabled={isGettingLocation}
                activeOpacity={0.7}
              >
                {isGettingLocation ? (
                  <ActivityIndicator size="small" color="#3b82f6" />
                ) : (
                  <Ionicons name="navigate" size={22} color="#3b82f6" />
                )}
              </TouchableOpacity>
            </View>
            <Text style={[styles.locationHint, { color: colors.textMuted }]}>
              Tap the location button to auto-fill your address
            </Text>
          </View>

          {/* Apartment/Unit Card */}
          <View style={[styles.sectionCard, { backgroundColor: isDark ? colors.card : '#ffffff' }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: isDark ? '#1e3a5f' : '#dbeafe' }]}>
                <MaterialCommunityIcons name="door" size={20} color="#3b82f6" />
              </View>
              <View style={styles.sectionHeaderText}>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>Apartment/Unit Number</Text>
                <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>Optional - if applicable</Text>
              </View>
            </View>

            <View style={[
              styles.inputContainer,
              { backgroundColor: isDark ? colors.backgroundSecondary : '#f8fafc', borderColor: isDark ? colors.border : '#e2e8f0' }
            ]}>
              <MaterialCommunityIcons name="home-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="e.g., Apt 4B, Unit 12"
                placeholderTextColor={colors.inputPlaceholder}
                value={apartmentNumber}
                onChangeText={setApartmentNumber}
              />
            </View>
          </View>

          {/* Load Capacity Card */}
          <View style={[styles.sectionCard, { backgroundColor: isDark ? colors.card : '#ffffff' }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: isDark ? '#1e3a5f' : '#dbeafe' }]}>
                <MaterialCommunityIcons name="lightning-bolt" size={20} color="#3b82f6" />
              </View>
              <View style={styles.sectionHeaderText}>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>Load Capacity</Text>
                <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>Expected maximum power usage</Text>
              </View>
            </View>

            <View style={styles.sliderContainer}>
              <Text style={[styles.sliderValue, { color: '#3b82f6' }]}>{loadCapacity} kW</Text>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={10}
                step={1}
                value={loadCapacity}
                onValueChange={setLoadCapacity}
                minimumTrackTintColor="#3b82f6"
                maximumTrackTintColor={isDark ? '#374151' : '#e5e7eb'}
                thumbTintColor="#3b82f6"
              />
              <View style={styles.sliderLabels}>
                <Text style={[styles.sliderLabel, { color: colors.textMuted }]}>1 kW</Text>
                <Text style={[styles.sliderLabel, { color: colors.textMuted }]}>10 kW</Text>
              </View>
            </View>

            <View style={styles.capacityInfo}>
              <View style={[styles.capacityInfoItem, { backgroundColor: isDark ? colors.backgroundSecondary : '#f8fafc' }]}>
                <Text style={[styles.capacityInfoLabel, { color: colors.textSecondary }]}>Small Home</Text>
                <Text style={[styles.capacityInfoValue, { color: colors.text }]}>1-3 kW</Text>
              </View>
              <View style={[styles.capacityInfoItem, { backgroundColor: isDark ? colors.backgroundSecondary : '#f8fafc' }]}>
                <Text style={[styles.capacityInfoLabel, { color: colors.textSecondary }]}>Medium Home</Text>
                <Text style={[styles.capacityInfoValue, { color: colors.text }]}>4-6 kW</Text>
              </View>
              <View style={[styles.capacityInfoItem, { backgroundColor: isDark ? colors.backgroundSecondary : '#f8fafc' }]}>
                <Text style={[styles.capacityInfoLabel, { color: colors.textSecondary }]}>Large Home</Text>
                <Text style={[styles.capacityInfoValue, { color: colors.text }]}>7-10 kW</Text>
              </View>
            </View>
          </View>

          {/* Info Card */}
          <View style={[styles.infoCard, { backgroundColor: isDark ? '#1e3a5f' : '#dbeafe' }]}>
            <View style={styles.infoHeader}>
              <View style={[styles.infoIconContainer, { backgroundColor: '#3b82f6' }]}>
                <Ionicons name="information" size={20} color="#ffffff" />
              </View>
              <Text style={[styles.infoTitle, { color: isDark ? '#ffffff' : '#1e40af' }]}>What's Next?</Text>
            </View>
            <View style={styles.infoSteps}>
              {[
                { step: '1', text: 'Our team will review your request' },
                { step: '2', text: 'A technician will be assigned within 2-3 days' },
                { step: '3', text: 'Installation scheduled at your convenience' },
                { step: '4', text: 'Start trading energy!' },
              ].map((item, index) => (
                <View key={index} style={styles.infoStep}>
                  <View style={[styles.stepNumber, { backgroundColor: isDark ? '#3b82f6' : '#3b82f6' }]}>
                    <Text style={styles.stepNumberText}>{item.step}</Text>
                  </View>
                  <Text style={[styles.infoText, { color: isDark ? '#93c5fd' : '#1e40af' }]}>{item.text}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, (!isFormValid || isSubmitting) && { opacity: 0.5 }]}
            onPress={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              style={styles.submitButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#ffffff" />
                  <Text style={styles.submitButtonText}>Submit Request</Text>
                </>
              )}
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
  headerIconContainer: {
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
    marginBottom: 16,
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
  sectionLabel: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 13,
    lineHeight: 18,
  },
  // Address Input
  addressRow: {
    flexDirection: 'row',
    gap: 10,
  },
  addressInputContainer: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
    minHeight: 80,
  },
  addressInput: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  locationButton: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationHint: {
    fontSize: 12,
    marginTop: 10,
    fontStyle: 'italic',
  },
  // Input Container
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
  // Capacity Info
  capacityInfo: {
    flexDirection: 'row',
    gap: 8,
  },
  capacityInfoItem: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  capacityInfoLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  capacityInfoValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  // Info Card
  infoCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  infoSteps: {
    gap: 12,
  },
  infoStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  infoText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  // Submit Button
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonText: {
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
