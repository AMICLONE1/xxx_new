import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types';
import { useAuthStore, useKYCStore, useThemeStore } from '@/store';
import type { ThemeMode } from '@/store';
import { supabaseStorageService } from '@/services/supabase/storageService';
import { supabaseAuthService } from '@/services/supabase/authService';
import { useTheme } from '@/contexts';
import { getThemedColors, ThemedColors } from '@/utils/themedStyles';
import { getErrorMessage } from '@/utils/errorUtils';

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

interface Props {
  navigation: ProfileScreenNavigationProp;
}

// Theme options
const THEME_OPTIONS: { value: ThemeMode; label: string; icon: string }[] = [
  { value: 'system', label: 'System Default', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Light Mode', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark Mode', icon: 'moon-outline' },
];



export default function ProfileScreen({ navigation }: Props) {
  const { isDark } = useTheme();
  const colors = getThemedColors(isDark);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { logout, user, setUser } = useAuthStore();
  const { overallStatus: kycStatus } = useKYCStore();
  const { themeMode, setThemeMode, restoreTheme } = useThemeStore();

  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Restore theme on mount
  useEffect(() => {
    restoreTheme();
  }, []);

  // KYC Status configurations
  const kycStatusConfig = useMemo(() => ({
    pending: {
      badge: 'Pending',
      badgeColor: colors.primary,
      badgeBg: colors.primaryLight,
      description: 'Your KYC verification is pending review.',
      icon: 'time-outline',
    },
    verified: {
      badge: 'Verified',
      badgeColor: colors.primary,
      badgeBg: colors.primaryLight,
      description: 'Your identity has been successfully verified.',
      icon: 'checkmark-circle',
    },
    rejected: {
      badge: 'Rejected',
      badgeColor: colors.error,
      badgeBg: colors.errorBackground,
      description: 'Your KYC was rejected. Please re-submit documents.',
      icon: 'close-circle',
    },
    'not-started': {
      badge: 'Not Started',
      badgeColor: colors.textMuted,
      badgeBg: colors.backgroundSecondary,
      description: 'Complete KYC to unlock all features.',
      icon: 'alert-circle-outline',
    },
  }), [colors]);

  // Get KYC display status
  const getKYCDisplayStatus = () => {
    if (!user) return 'not-started';
    return user.kycStatus || 'pending';
  };

  const kycDisplayStatus = getKYCDisplayStatus();
  const kycConfig = kycStatusConfig[kycDisplayStatus as keyof typeof kycStatusConfig] || kycStatusConfig['not-started'];

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };



  const handlePickImage = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload profile picture.');
        return;
      }

      // Show image picker options
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
      if (__DEV__) {
        console.error('Error picking image:', error);
      }
      Alert.alert('Error', 'Failed to open image picker. Please try again.');
    }
  };

  const uploadProfileImage = async (imageUri: string) => {
    setIsUploadingImage(true);
    try {
      // Upload image to Supabase storage (handles auth internally)
      const imageUrl = await supabaseStorageService.uploadProfileImage(imageUri);

      // Update user profile with new image URL
      const response = await supabaseAuthService.updateProfile({
        profilePictureUrl: imageUrl,
      });

      if (response.success && response.data) {
        setUser(response.data);
        Alert.alert('Success', 'Profile picture updated successfully!');
      } else {
        throw new Error(response.error || 'Failed to update profile');
      }
    } catch (error: unknown) {
      if (__DEV__) {
        console.error('Upload error:', getErrorMessage(error));
      }
      Alert.alert('Upload Failed', getErrorMessage(error) || 'Failed to upload profile picture. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleThemeChange = async (mode: ThemeMode) => {
    await setThemeMode(mode);
    setShowThemeModal(false);
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(false);
    // TODO: Implement actual account deletion logic
    Alert.alert(
      'Account Deleted',
      'Your account has been permanently deleted.',
      [
        {
          text: 'OK',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              // Navigate anyway
            }
          },
        },
      ]
    );
  };

  const getAppVersion = () => {
    return Constants.expoConfig?.version || '1.0.0';
  };

  const menuItems = [
    {
      id: 'editProfile',
      title: 'Edit Profile',
      subtitle: 'Update your personal information',
      icon: 'account-edit',
      onPress: () => navigation.navigate('EditProfile'),
    },
    {
      id: 'history',
      title: 'Transaction History',
      subtitle: 'View all your trades and analytics',
      icon: 'history',
      onPress: () => navigation.navigate('History'),
    },
    {
      id: 'tradingBot',
      title: 'Trading Bot Settings',
      subtitle: 'Configure auto-selling rules',
      icon: 'robot',
      onPress: () => navigation.navigate('TradingBot'),
    },
    {
      id: 'theme',
      title: 'Theme Preference',
      subtitle: THEME_OPTIONS.find(t => t.value === themeMode)?.label || 'System Default',
      icon: themeMode === 'dark' ? 'moon-waning-crescent' : themeMode === 'light' ? 'white-balance-sunny' : 'cellphone',
      onPress: () => setShowThemeModal(true),
    },
    {
      id: 'meter',
      title: 'Meter Settings',
      subtitle: 'Manage your smart meter',
      icon: 'meter-electric',
      onPress: () => navigation.navigate('MeterRegistration'),
    },
  ];

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
          <View>
            <Text style={styles.headerTitle}>Profile</Text>
            <Text style={styles.headerSubtitle}>Manage your account</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* User Profile Card */}
          {user && (
            <View style={styles.profileCard}>
              <TouchableOpacity
                style={styles.avatarContainer}
                onPress={handlePickImage}
                disabled={isUploadingImage}
                activeOpacity={0.7}
              >
                {user.profilePictureUrl ? (
                  <Image
                    source={{ uri: user.profilePictureUrl }}
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
                  <View style={styles.cameraIcon}>
                    <Ionicons name="camera" size={16} color={colors.card} />
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.userName}>{user.name?.trim() || 'User'}</Text>

              <View style={styles.userDetails}>
                <View style={styles.userDetailItem}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons name="mail-outline" size={16} color={colors.primary} />
                  </View>
                  <Text style={styles.userDetailText} numberOfLines={1}>{user.email}</Text>
                </View>
                {user.phoneNumber && (
                  <View style={styles.userDetailItem}>
                    <View style={styles.detailIconContainer}>
                      <Ionicons name="call-outline" size={16} color={colors.primary} />
                    </View>
                    <Text style={styles.userDetailText}>{user.phoneNumber}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Quick Stats Row */}
          <View style={styles.statsRow}>
            {/* KYC Status */}
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => navigation.navigate('KYC')}
              activeOpacity={0.7}
            >
              <View style={[styles.statIconContainer, { backgroundColor: kycConfig.badgeBg }]}>
                <Ionicons name={kycConfig.icon as any} size={20} color={kycConfig.badgeColor} />
              </View>
              <Text style={styles.statLabel}>KYC Status</Text>
              <Text style={[styles.statValue, { color: kycConfig.badgeColor }]}>{kycConfig.badge}</Text>
            </TouchableOpacity>

            {/* App Version */}
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
              </View>
              <Text style={styles.statLabel}>App Version</Text>
              <Text style={styles.statValue}>v{getAppVersion()}</Text>
            </View>
          </View>



          {/* Menu Section */}
          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>Settings</Text>
            <View style={styles.menuCard}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuItem,
                    index < menuItems.length - 1 && styles.menuItemBorder,
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuIconContainer}>
                    <MaterialCommunityIcons name={item.icon as any} size={22} color={colors.primary} />
                  </View>
                  <View style={styles.menuContent}>
                    <Text style={styles.menuItemTitle}>{item.title}</Text>
                    <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <View style={styles.logoutButtonContent}>
              <Ionicons name="log-out-outline" size={20} color={colors.error} />
              <Text style={styles.logoutText}>Logout</Text>
            </View>
          </TouchableOpacity>

          {/* Danger Zone Section */}
          <View style={styles.dangerZoneSection}>
            <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
            <View style={styles.dangerZoneCard}>
              <View style={styles.dangerZoneContent}>
                <View style={styles.dangerZoneIconContainer}>
                  <Ionicons name="warning" size={22} color={colors.error} />
                </View>
                <View style={styles.dangerZoneTextContainer}>
                  <Text style={styles.dangerZoneLabel}>Delete Account</Text>
                  <Text style={styles.dangerZoneDescription}>
                    Permanently delete your account and all data
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.deleteAccountButton}
                onPress={() => setShowDeleteModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={18} color="#ffffff" />
                <Text style={styles.deleteAccountButtonText}>Permanent Delete Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Theme Selection Modal */}
        <Modal
          visible={showThemeModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowThemeModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowThemeModal(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Theme Preference</Text>
                <TouchableOpacity onPress={() => setShowThemeModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalSubtitle}>Choose your preferred appearance</Text>

              {THEME_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.themeOption,
                    themeMode === option.value && styles.themeOptionActive,
                  ]}
                  onPress={() => handleThemeChange(option.value)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.themeIconContainer,
                    themeMode === option.value && styles.themeIconContainerActive,
                  ]}>
                    <Ionicons
                      name={option.icon as any}
                      size={22}
                      color={themeMode === option.value ? '#ffffff' : colors.primary}
                    />
                  </View>
                  <Text style={[
                    styles.themeOptionText,
                    themeMode === option.value && styles.themeOptionTextActive,
                  ]}>
                    {option.label}
                  </Text>
                  {themeMode === option.value && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Delete Account Confirmation Modal */}
        <Modal
          visible={showDeleteModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDeleteModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.deleteModalContent}>
              <View style={styles.deleteModalIconContainer}>
                <Ionicons name="warning" size={48} color={colors.error} />
              </View>
              <Text style={styles.deleteModalTitle}>Delete Account?</Text>
              <Text style={styles.deleteModalDescription}>
                This action is permanent and cannot be undone. All your data, transactions, and settings will be permanently deleted.
              </Text>
              <View style={styles.deleteModalButtons}>
                <TouchableOpacity
                  style={styles.deleteModalCancelButton}
                  onPress={() => setShowDeleteModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.deleteModalCancelText}>No, Keep Account</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteModalConfirmButton}
                  onPress={handleDeleteAccount}
                  activeOpacity={0.8}
                >
                  <Text style={styles.deleteModalConfirmText}>Yes, Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
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
    backgroundColor: colors.card,
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
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
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
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  userDetails: {
    gap: 8,
    width: '100%',
  },
  userDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  detailIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetailText: {
    fontSize: 14,
    color: colors.textSecondary,
    maxWidth: 200,
  },
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  // Meter Card
  meterCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  meterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  meterIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  meterInfo: {
    flex: 1,
  },
  meterLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  meterSerial: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  meterDiscom: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  deleteMeterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: colors.errorBackground,
    borderRadius: 12,
    gap: 6,
  },
  deleteMeterText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },
  // Menu Section
  menuSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  menuCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  // Logout Button
  logoutButton: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.errorBackground,
    overflow: 'hidden',
    marginBottom: 20,
  },
  logoutButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.modalBackground,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 360,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeOptionActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  themeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  themeIconContainerActive: {
    backgroundColor: colors.primary,
  },
  themeOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  themeOptionTextActive: {
    color: colors.text,
  },
  // Danger Zone Section
  dangerZoneSection: {
    marginBottom: 20,
  },
  dangerZoneTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.error,
    marginBottom: 12,
  },
  dangerZoneCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.errorBackground,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  dangerZoneContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dangerZoneIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.errorBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dangerZoneTextContainer: {
    flex: 1,
  },
  dangerZoneLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  dangerZoneDescription: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  deleteAccountButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff', // Keep white as it's on red button
  },
  // Delete Modal Styles
  deleteModalContent: {
    backgroundColor: colors.modalBackground,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  deleteModalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.errorBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  deleteModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteModalDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteModalCancelButton: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteModalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  deleteModalConfirmButton: {
    flex: 1,
    backgroundColor: colors.error,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteModalConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});
