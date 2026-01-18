import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { getThemedColors, ThemedColors } from '@/utils/themedStyles';
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
  const styles = useMemo(() => createStyles(colors), [colors]);
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
      colors={colors.backgroundGradient as [string, string, ...string[]]}
      style={styles.gradientBackground}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <Text style={styles.headerSubtitle}>Update your information</Text>
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
            <View style={styles.profileCard}>
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
                  <View style={styles.avatarPlaceholder}>
                    <MaterialCommunityIcons name="account" size={48} color={colors.primary} />
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
              <Text style={styles.userName}>{user?.name?.trim() || 'User'}</Text>
              <Text style={styles.changePhotoText}>Tap photo to change</Text>
            </View>

            {/* Personal Information Card */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <Ionicons name="person" size={18} color={colors.primary} />
                </View>
                <Text style={styles.sectionTitle}>Personal Information</Text>
              </View>

              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={[
                  styles.inputContainer,
                  !!errors.name && { borderColor: colors.error }
                ]}>
                  <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your full name"
                    placeholderTextColor={colors.inputPlaceholder}
                    autoCapitalize="words"
                  />
                </View>
                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
              </View>

              {/* Email - Read-only */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={[
                  styles.inputContainer,
                  styles.readOnlyContainer,
                ]}>
                  <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                  <Text style={styles.readOnlyText} numberOfLines={1}>
                    {email || 'Not provided'}
                  </Text>
                  <View style={styles.lockedBadge}>
                    <Ionicons name="lock-closed" size={12} color={colors.textMuted} />
                  </View>
                </View>
                <Text style={styles.hintText}>
                  Email cannot be changed after signup
                </Text>
              </View>

              {/* Phone Number (Read-only) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <View style={[
                  styles.inputContainer,
                  styles.readOnlyContainer,
                ]}>
                  <Ionicons name="call-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                  <Text style={styles.readOnlyText} numberOfLines={1}>
                    {phoneNumber || 'Not provided'}
                  </Text>
                  <View style={styles.lockedBadge}>
                    <Ionicons name="lock-closed" size={12} color={colors.textMuted} />
                  </View>
                </View>
                <Text style={styles.hintText}>
                  Contact support to change phone number
                </Text>
              </View>
            </View>

            {/* Location Card */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <Ionicons name="location" size={18} color={colors.primary} />
                </View>
                <Text style={styles.sectionTitle}>Location</Text>
              </View>

              {/* Location Type Toggle */}
              <View style={styles.locationToggleRow}>
                <TouchableOpacity
                  style={[
                    styles.locationToggleButton,
                    locationType === 'gps' && styles.locationToggleButtonActive
                  ]}
                  onPress={handleGetCurrentLocation}
                  disabled={isLoadingLocation}
                  activeOpacity={0.7}
                >
                  {isLoadingLocation ? (
                    <ActivityIndicator size="small" color={locationType === 'gps' ? '#ffffff' : colors.primary} />
                  ) : (
                    <Ionicons
                      name="navigate"
                      size={18}
                      color={locationType === 'gps' ? '#ffffff' : colors.primary}
                    />
                  )}
                  <Text
                    style={[
                      styles.locationToggleText,
                      locationType === 'gps' && styles.locationToggleTextActive
                    ]}
                  >
                    Use GPS
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.locationToggleButton,
                    locationType === 'manual' && styles.locationToggleButtonActive
                  ]}
                  onPress={() => setLocationType('manual')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="create-outline"
                    size={18}
                    color={locationType === 'manual' ? '#ffffff' : colors.primary}
                  />
                  <Text
                    style={[
                      styles.locationToggleText,
                      locationType === 'manual' && styles.locationToggleTextActive
                    ]}
                  >
                    Manual
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Location Fields - 2 Column Grid */}
              <View style={styles.locationFieldsGrid}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.inputLabel}>City</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      value={city}
                      onChangeText={setCity}
                      placeholder="Enter city"
                      placeholderTextColor={colors.inputPlaceholder}
                      editable={locationType === 'manual'}
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.inputLabel}>State</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
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
                <Text style={styles.inputLabel}>Pincode</Text>
                <View style={[
                  styles.inputContainer,
                  !!errors.pincode && { borderColor: colors.error }
                ]}>
                  <Ionicons name="keypad-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={pincode}
                    onChangeText={setPincode}
                    placeholder="Enter 6-digit pincode"
                    placeholderTextColor={colors.inputPlaceholder}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={locationType === 'manual'}
                  />
                </View>
                {errors.pincode && <Text style={styles.errorText}>{errors.pincode}</Text>}
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
                colors={[colors.primary, colors.primaryDark]}
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
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const createStyles = (colors: ThemedColors) => StyleSheet.create({
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
    backgroundColor: colors.cardElevated,
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
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
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
    backgroundColor: colors.card,
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
    backgroundColor: colors.primaryLight,
  },
  cameraIconOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.card,
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
    color: colors.text,
  },
  changePhotoText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  // Section Card
  sectionCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    backgroundColor: colors.card,
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
    backgroundColor: colors.primaryLight,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
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
    color: colors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.border,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  readOnlyContainer: {
    opacity: 0.8,
  },
  readOnlyText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
    flex: 1,
  },
  lockedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.border,
  },
  hintText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
    marginLeft: 4,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
    marginLeft: 4,
  },
  // Location Styles
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
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.border,
  },
  locationToggleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  locationToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  locationToggleTextActive: {
    color: '#ffffff',
  },
  locationFieldsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  // Buttons
  saveButton: {
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0.1,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});

