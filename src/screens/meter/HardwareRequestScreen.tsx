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
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types';
import * as Location from 'expo-location';
import { meterService } from '@/services/api/meterService';

type HardwareRequestScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'MeterRegistration'
>;

interface Props {
  navigation: HardwareRequestScreenNavigationProp;
}

export default function HardwareRequestScreen({ navigation }: Props) {
  const [address, setAddress] = useState('');
  const [apartmentNumber, setApartmentNumber] = useState('');
  const [loadCapacity, setLoadCapacity] = useState(5); // kW
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const handleGetLocation = async () => {
    setIsGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to auto-fill your address'
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverseGeocode.length > 0) {
        const addr = reverseGeocode[0];
        const fullAddress = [
          addr.street,
          addr.streetNumber,
          addr.district,
          addr.city,
          addr.postalCode,
          addr.region,
          addr.country,
        ]
          .filter(Boolean)
          .join(', ');
        setAddress(fullAddress);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to get location');
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
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Header with Back Button */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Request Smart Meter Installation</Text>
              <Text style={styles.subtitle}>
                Get a PowerNetPro-compatible Smart Meter installed at your location
              </Text>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Address *</Text>
            <View style={styles.locationRow}>
              <TextInput
                style={[styles.input, styles.addressInput]}
                placeholder="Enter your complete address"
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={3}
              />
              <TouchableOpacity
                style={styles.locationButton}
                onPress={handleGetLocation}
                disabled={isGettingLocation}
              >
                {isGettingLocation ? (
                  <ActivityIndicator size="small" color="#10b981" />
                ) : (
                  <Text style={styles.locationButtonText}>📍</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Apartment/Unit Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Optional"
              value={apartmentNumber}
              onChangeText={setApartmentNumber}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Load Capacity: {loadCapacity} kW</Text>
            <Text style={styles.hint}>
              Select your expected maximum load capacity
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={10}
              step={1}
              value={loadCapacity}
              onValueChange={setLoadCapacity}
              minimumTrackTintColor="#10b981"
              maximumTrackTintColor="#e5e7eb"
              thumbTintColor="#10b981"
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>1 kW</Text>
              <Text style={styles.sliderLabel}>10 kW</Text>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>What's Next?</Text>
            <Text style={styles.infoText}>
              1. Our team will review your request{'\n'}
              2. A technician will be assigned within 2-3 business days{'\n'}
              3. Installation will be scheduled at your convenience{'\n'}
              4. Once installed, you can start trading energy!
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Request</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
    marginTop: 4,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  addressInput: {
    flex: 1,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  locationButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  locationButtonText: {
    fontSize: 24,
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
  infoBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

