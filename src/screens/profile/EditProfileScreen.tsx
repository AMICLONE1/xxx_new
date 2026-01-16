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
            <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Profile</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Update your information</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Profile Picture Card */}
            <View style={[styles.profileCard, { backgroundColor: isDark ? colors.card : '#ffffff' }]}>
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
                  <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? '#1e3a5f' : '#dbeafe' }]}>
                    <MaterialCommunityIcons name="account" size={48} color="#3b82f6" />
                  </View>
                )}
                {isUploadingImage ? (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="small" color="#ffffff" />
                  </View>
                ) : (
                  <View style={styles.cameraIconOverlay}>
                    <Ionicons name="camera" size={16} color="#ffffff" />
                  </View>
                )}
              </TouchableOpacity>
              <Text style={[styles.userName, { color: colors.text }]}>{user?.name?.trim() || 'User'}</Text>
              <Text style={[styles.changePhotoText, { color: colors.textSecondary }]}>Tap photo to change</Text>
            </View>

            {/* Personal Information Card */}
            <View style={[styles.sectionCard, { backgroundColor: isDark ? colors.card : '#ffffff' }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconContainer, { backgroundColor: isDark ? '#1e3a5f' : '#dbeafe' }]}>
                  <Ionicons name="person" size={18} color="#3b82f6" />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal Information</Text>
              </View>

              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Full Name</Text>
                <View style={[
                  styles.inputContainer,
                  { backgroundColor: isDark ? colors.backgroundSecondary : '#f8fafc', borderColor: errors.name ? colors.error : (isDark ? colors.border : '#e2e8f0') }
                ]}>
                  <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your full name"
                    placeholderTextColor={colors.inputPlaceholder}
                    autoCapitalize="words"
                  />
                </View>
                {errors.name && <Text style={[styles.errorText, { color: colors.error }]}>{errors.name}</Text>}
              </View>

              {/* Email - Read-only */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email Address</Text>
                <View style={[
                  styles.inputContainer,
                  styles.readOnlyContainer,
                  { backgroundColor: isDark ? colors.backgroundSecondary : '#f1f5f9', borderColor: isDark ? colors.border : '#e2e8f0' }
                ]}>
                  <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                  <Text style={[styles.readOnlyText, { color: colors.textSecondary, flex: 1 }]} numberOfLines={1}>
                    {email || 'Not provided'}
                  </Text>
                  <View style={[styles.lockedBadge, { backgroundColor: isDark ? colors.border : '#e2e8f0' }]}>
                    <Ionicons name="lock-closed" size={12} color={colors.textMuted} />
                  </View>
                </View>
                <Text style={[styles.hintText, { color: colors.textMuted }]}>
                  Email cannot be changed after signup
                </Text>
              </View>

              {/* Phone Number (Read-only) */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Phone Number</Text>
                <View style={[
                  styles.inputContainer,
                  styles.readOnlyContainer,
                  { backgroundColor: isDark ? colors.backgroundSecondary : '#f1f5f9', borderColor: isDark ? colors.border : '#e2e8f0' }
                ]}>
                  <Ionicons name="call-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                  <Text style={[styles.readOnlyText, { color: colors.textSecondary, flex: 1 }]} numberOfLines={1}>
                    {phoneNumber || 'Not provided'}
                  </Text>
                  <View style={[styles.lockedBadge, { backgroundColor: isDark ? colors.border : '#e2e8f0' }]}>
                    <Ionicons name="lock-closed" size={12} color={colors.textMuted} />
                  </View>
                </View>
                <Text style={[styles.hintText, { color: colors.textMuted }]}>
                  Contact support to change phone number
                </Text>
              </View>
            </View>

            {/* Location Card */}
            <View style={[styles.sectionCard, { backgroundColor: isDark ? colors.card : '#ffffff' }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconContainer, { backgroundColor: isDark ? '#1e3a5f' : '#dbeafe' }]}>
                  <Ionicons name="location" size={18} color="#3b82f6" />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
              </View>

              {/* Location Type Toggle */}
              <View style={styles.locationToggleRow}>
                <TouchableOpacity
                  style={[
                    styles.locationToggleButton,
                    {
                      backgroundColor: locationType === 'gps' ? '#3b82f6' : (isDark ? colors.backgroundSecondary : '#f8fafc'),
                      borderColor: locationType === 'gps' ? '#3b82f6' : (isDark ? colors.border : '#e2e8f0'),
                    },
                  ]}
                  onPress={handleGetCurrentLocation}
                  disabled={isLoadingLocation}
                  activeOpacity={0.7}
                >
                  {isLoadingLocation ? (
                    <ActivityIndicator size="small" color={locationType === 'gps' ? '#ffffff' : '#3b82f6'} />
                  ) : (
                    <Ionicons
                      name="navigate"
                      size={18}
                      color={locationType === 'gps' ? '#ffffff' : '#3b82f6'}
                    />
                  )}
                  <Text
                    style={[
                      styles.locationToggleText,
                      { color: locationType === 'gps' ? '#ffffff' : colors.text },
                    ]}
                  >
                    Use GPS
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.locationToggleButton,
                    {
                      backgroundColor: locationType === 'manual' ? '#3b82f6' : (isDark ? colors.backgroundSecondary : '#f8fafc'),
                      borderColor: locationType === 'manual' ? '#3b82f6' : (isDark ? colors.border : '#e2e8f0'),
                    },
                  ]}
                  onPress={() => setLocationType('manual')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="create-outline"
                    size={18}
                    color={locationType === 'manual' ? '#ffffff' : '#3b82f6'}
                  />
                  <Text
                    style={[
                      styles.locationToggleText,
                      { color: locationType === 'manual' ? '#ffffff' : colors.text },
                    ]}
                  >
                    Manual
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Location Fields - 2 Column Grid */}
              <View style={styles.locationFieldsGrid}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>City</Text>
                  <View style={[
                    styles.inputContainer,
                    { backgroundColor: isDark ? colors.backgroundSecondary : '#f8fafc', borderColor: isDark ? colors.border : '#e2e8f0' }
                  ]}>
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      value={city}
                      onChangeText={setCity}
                      placeholder="Enter city"
                      placeholderTextColor={colors.inputPlaceholder}
                      editable={locationType === 'manual'}
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>State</Text>
                  <View style={[
                    styles.inputContainer,
                    { backgroundColor: isDark ? colors.backgroundSecondary : '#f8fafc', borderColor: isDark ? colors.border : '#e2e8f0' }
                  ]}>
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      value={state}
                      onChangeText={setState}
                      placeholder="Enter state"
                      placeholderTextColor={colors.inputPlaceholder}
                      editable={locationType === 'manual'}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Pincode</Text>
                <View style={[
                  styles.inputContainer,
                  {
                    backgroundColor: isDark ? colors.backgroundSecondary : '#f8fafc',
                    borderColor: errors.pincode ? colors.error : (isDark ? colors.border : '#e2e8f0')
                  }
                ]}>
                  <Ionicons name="keypad-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={pincode}
                    onChangeText={setPincode}
                    placeholder="Enter 6-digit pincode"
                    placeholderTextColor={colors.inputPlaceholder}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={locationType === 'manual'}
                  />
                </View>
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
                colors={['#3b82f6', '#2563eb']}
                style={[styles.saveButtonGradient, !canSave && { opacity: 0.5 }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
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

            {/* Cancel Button */}
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: isDark ? colors.card : '#ffffff', borderColor: isDark ? colors.border : '#e2e8f0' }]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  // Profile Card
  profileCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
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
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  changePhotoText: {
    fontSize: 13,
    fontWeight: '500',
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
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  // Input Styles
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
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
    fontSize: 15,
    fontWeight: '500',
  },
  readOnlyContainer: {
    opacity: 0.8,
  },
  readOnlyText: {
    fontSize: 15,
    fontWeight: '500',
  },
  lockedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  hintText: {
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
  // Location Toggle
  locationToggleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  locationToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
  },
  locationToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Location Fields Grid
  locationFieldsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  // Save Button
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    shadowColor: '#64748b',
    shadowOpacity: 0.15,
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
