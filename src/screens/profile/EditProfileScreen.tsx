import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { locationService } from '@/services/locationService';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types';
import { useAuthStore, useProfileStore } from '@/store';
import { supabaseStorageService } from '@/services/supabase/storageService';
import { supabaseAuthService } from '@/services/supabase/authService';
import { UserLocation } from '@/store/profileStore';
import { useTheme } from '@/contexts';
import { getThemedColors } from '@/utils/themedStyles';
import { getErrorMessage } from '@/utils/errorUtils';

type EditProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EditProfile'>;

interface Props {
  navigation: EditProfileScreenNavigationProp;
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Indian states list
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
];

export default function EditProfileScreen({ navigation }: Props) {
  const { isDark } = useTheme();
  const colors = getThemedColors(isDark);
  const { user, setUser } = useAuthStore();
  const { draft, hasChanges, isSaving, setDraft, updateDraft, clearDraft, saveLocation, restoreLocation } = useProfileStore();
  
  // Form state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phoneNumber] = useState(user?.phoneNumber || '');
  const [profilePictureUrl, setProfilePictureUrl] = useState(user?.profilePictureUrl || '');
  
  // Location state
  const [locationType, setLocationType] = useState<'gps' | 'manual'>('manual');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  
  // Validation state
  const [errors, setErrors] = useState<{ name?: string; email?: string; pincode?: string }>({});
  
  // Image upload state
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Load saved location on mount
  useEffect(() => {
    const loadLocation = async () => {
      const savedLocation = await restoreLocation();
      if (savedLocation) {
        setLocationType(savedLocation.type);
        setCity(savedLocation.city || '');
        setState(savedLocation.state || '');
        setPincode(savedLocation.pincode || '');
      }
    };
    loadLocation();
  }, []);

  // Initialize draft on mount
  useEffect(() => {
    setDraft({
      name: user?.name || '',
      email: user?.email || '',
      phoneNumber: user?.phoneNumber || '',
      profilePictureUrl: user?.profilePictureUrl || '',
    });
    return () => clearDraft();
  }, []);

  // Check for changes (email is read-only, don't check)
  const checkChanges = useCallback(() => {
    const nameChanged = name !== (user?.name || '');
    const imageChanged = profilePictureUrl !== (user?.profilePictureUrl || '');
    return nameChanged || imageChanged;
  }, [name, profilePictureUrl, user]);

  // Validate form (email is read-only, no need to validate)
  const validateForm = useCallback(() => {
    const newErrors: { name?: string; pincode?: string } = {};
    
    if (!name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    
    if (pincode && !/^\d{6}$/.test(pincode)) {
      newErrors.pincode = 'Pincode must be 6 digits';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, pincode]);

  // Handle GPS location using cached locationService - gracefully falls back to manual if GPS fails
  const handleGetCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      console.log('[EditProfile] Getting GPS location...');
      const cachedLocation = await locationService.getCurrentLocation();
      
      if (!cachedLocation) {
        // GPS failed - silently switch to manual
        console.log('[EditProfile] No location available, switching to manual mode');
        setLocationType('manual');
        setIsLoadingLocation(false);
        return;
      }

      console.log('[EditProfile] Got location:', cachedLocation.latitude, cachedLocation.longitude);
      
      // Check if it's a default/fallback location
      if (cachedLocation.isDefault) {
        console.log('[EditProfile] Using default location (GPS unavailable)');
        Alert.alert(
          'GPS Unavailable',
          'GPS location services are not available. Using default location (Pune). You can update manually.',
          [{ text: 'OK' }]
        );
      }
      
      if (cachedLocation.address) {
        setCity(cachedLocation.address.city || '');
        setState(cachedLocation.address.state || '');
        setPincode(cachedLocation.address.pincode || '');
        setLocationType('gps');
        
        // Save location
        const locationData: UserLocation = {
          type: 'gps',
          city: cachedLocation.address.city || '',
          state: cachedLocation.address.state || '',
          pincode: cachedLocation.address.pincode || '',
          latitude: cachedLocation.latitude,
          longitude: cachedLocation.longitude,
        };
        await saveLocation(locationData);
        
        // Show success toast (non-blocking) - only for real GPS
        if (!cachedLocation.isDefault) {
          Alert.alert('Success', 'Location detected successfully!');
        }
      } else {
        // No address found - silently switch to manual
        console.log('[EditProfile] No address in cached location, switching to manual');
        setLocationType('manual');
      }
    } catch (error: unknown) {
      // GPS failed - silently switch to manual mode without blocking popup
      console.log('[EditProfile] GPS error, switching to manual mode:', getErrorMessage(error));
      setLocationType('manual');
      // No Alert.alert - just let user enter manually
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Handle manual location save
  const handleSaveManualLocation = async () => {
    const locationData: UserLocation = {
      type: 'manual',
      city,
      state,
      pincode,
    };
    await saveLocation(locationData);
  };

  // Handle image picker
  const handlePickImage = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload profile picture.');
        return;
      }

      Alert.alert(
        'Select Profile Picture',
        'Choose an option',
        [
          {
            text: 'Camera',
            onPress: async () => {
              const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
              if (cameraStatus.status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant camera permissions.');
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });

              if (!result.canceled && result.assets[0]) {
                await uploadProfileImage(result.assets[0].uri);
              }
            },
          },
          {
            text: 'Photo Library',
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });

              if (!result.canceled && result.assets[0]) {
                await uploadProfileImage(result.assets[0].uri);
              }
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } catch (error: unknown) {
      Alert.alert('Error', 'Failed to open image picker. Please try again.');
    }
  };

  const uploadProfileImage = async (imageUri: string) => {
    setIsUploadingImage(true);
    try {
      const imageUrl = await supabaseStorageService.uploadProfileImage(imageUri);
      setProfilePictureUrl(imageUrl);
      updateDraft({ profilePictureUrl: imageUrl });
    } catch (error: unknown) {
      Alert.alert('Upload Failed', getErrorMessage(error) || 'Failed to upload profile picture.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    try {
      // Save location if changed
      if (city || state || pincode) {
        await handleSaveManualLocation();
      }

      // Update profile via Supabase
      const response = await supabaseAuthService.updateProfile({
        name: name.trim(),
        profilePictureUrl,
      });

      if (response.success && response.data) {
        setUser(response.data);
        Alert.alert('Success', 'Profile updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        throw new Error(response.error || 'Failed to update profile');
      }
    } catch (error: unknown) {
      Alert.alert('Error', getErrorMessage(error) || 'Failed to save profile. Please try again.');
    }
  };

  const canSave = checkChanges() && !isSaving && !isUploadingImage;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
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
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <Text style={styles.headerSubtitle}>Update your information</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Profile Picture Section */}
            <View style={styles.avatarSection}>
              <TouchableOpacity
                style={styles.avatarContainer}
                onPress={handlePickImage}
                disabled={isUploadingImage}
                activeOpacity={0.7}
              >
                {profilePictureUrl ? (
                  <Image
                    source={{ uri: profilePictureUrl }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primaryLight }]}>
                    <MaterialCommunityIcons name="account" size={48} color={colors.primary} />
                  </View>
                )}
                {isUploadingImage ? (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : (
                  <View style={styles.cameraIconOverlay}>
                    <Ionicons name="camera" size={20} color="#ffffff" />
                  </View>
                )}
              </TouchableOpacity>
              <Text style={[styles.changePhotoText, { color: colors.textSecondary }]}>Tap to change photo</Text>
            </View>

            {/* Personal Information Section */}
            <View style={[styles.section, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal Information</Text>
              
              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Full Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText }, errors.name && styles.inputError]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your full name"
                  placeholderTextColor={colors.inputPlaceholder}
                  autoCapitalize="words"
                />
                {errors.name && <Text style={[styles.errorText, { color: colors.error }]}>{errors.name}</Text>}
              </View>

              {/* Email - Read-only after signup */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Email Address</Text>
                <View style={[styles.readOnlyInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                  <Text style={[styles.readOnlyText, { color: colors.textSecondary }]}>
                    {email || 'Not provided'}
                  </Text>
                  <Ionicons name="lock-closed" size={16} color={colors.textMuted} />
                </View>
                <Text style={[styles.hintText, { color: colors.textMuted }]}>
                  Email cannot be changed after signup
                </Text>
              </View>

              {/* Phone Number (Read-only) */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Phone Number</Text>
                <View style={[styles.readOnlyInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                  <Text style={[styles.readOnlyText, { color: colors.textSecondary }]}>
                    {phoneNumber || 'Not provided'}
                  </Text>
                  <Ionicons name="lock-closed" size={16} color={colors.textMuted} />
                </View>
                <Text style={[styles.hintText, { color: colors.textMuted }]}>
                  Change requires verification. Contact support.
                </Text>
              </View>
            </View>

            {/* Location Section */}
            <View style={[styles.section, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
              
              {/* Location Type Toggle */}
              <View style={styles.locationToggle}>
                <TouchableOpacity
                  style={[
                    styles.locationOption,
                    { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                    locationType === 'gps' && styles.locationOptionActive,
                  ]}
                  onPress={handleGetCurrentLocation}
                  disabled={isLoadingLocation}
                >
                  {isLoadingLocation ? (
                    <ActivityIndicator size="small" color={locationType === 'gps' ? '#ffffff' : colors.primary} />
                  ) : (
                    <Ionicons
                      name="location"
                      size={20}
                      color={locationType === 'gps' ? '#ffffff' : colors.primary}
                    />
                  )}
                  <Text
                    style={[
                      styles.locationOptionText,
                      { color: colors.text },
                      locationType === 'gps' && styles.locationOptionTextActive,
                    ]}
                  >
                    Use GPS
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.locationOption,
                    { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                    locationType === 'manual' && styles.locationOptionActive,
                  ]}
                  onPress={() => setLocationType('manual')}
                >
                  <Ionicons
                    name="create-outline"
                    size={20}
                    color={locationType === 'manual' ? '#ffffff' : colors.primary}
                  />
                  <Text
                    style={[
                      styles.locationOptionText,
                      { color: colors.text },
                      locationType === 'manual' && styles.locationOptionTextActive,
                    ]}
                  >
                    Enter Manually
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Location Fields */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>City</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText }]}
                  value={city}
                  onChangeText={setCity}
                  placeholder="Enter city"
                  placeholderTextColor={colors.inputPlaceholder}
                  editable={locationType === 'manual'}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>State</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText }]}
                  value={state}
                  onChangeText={setState}
                  placeholder="Enter state"
                  placeholderTextColor={colors.inputPlaceholder}
                  editable={locationType === 'manual'}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Pincode</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText }, errors.pincode && styles.inputError]}
                  value={pincode}
                  onChangeText={setPincode}
                  placeholder="Enter 6-digit pincode"
                  placeholderTextColor={colors.inputPlaceholder}
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={locationType === 'manual'}
                />
                {errors.pincode && <Text style={[styles.errorText, { color: colors.error }]}>{errors.pincode}</Text>}
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!canSave}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={canSave ? ['#10b981', '#059669'] : ['#9ca3af', '#6b7280']}
                style={styles.saveButtonGradient}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    alignItems: 'center',
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#d1fae5',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#ecfdf5',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  section: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  readOnlyInput: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readOnlyText: {
    fontSize: 16,
    color: '#6b7280',
  },
  hintText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    fontStyle: 'italic',
  },
  locationToggle: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  locationOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10b981',
    backgroundColor: '#ffffff',
    gap: 8,
  },
  locationOptionActive: {
    backgroundColor: '#10b981',
  },
  locationOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  locationOptionTextActive: {
    color: '#ffffff',
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 40,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    shadowColor: '#6b7280',
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
