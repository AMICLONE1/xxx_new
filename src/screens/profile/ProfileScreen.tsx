import React, { useState, useEffect } from 'react';
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
import { useAuthStore, useMeterStore, useKYCStore, useThemeStore } from '@/store';
import type { ThemeMode } from '@/store';
import { supabaseStorageService } from '@/services/supabase/storageService';
import { supabaseAuthService } from '@/services/supabase/authService';
import { useTheme } from '@/contexts';
import { getThemedColors } from '@/utils/themedStyles';
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

// KYC Status configurations
const KYC_STATUS_CONFIG = {
  pending: {
    badge: 'Pending',
    badgeColor: '#f59e0b',
    badgeBg: '#fef3c7',
    description: 'Your KYC verification is pending review.',
    icon: 'time-outline',
  },
  verified: {
    badge: 'Verified',
    badgeColor: '#10b981',
    badgeBg: '#d1fae5',
    description: 'Your identity has been successfully verified.',
    icon: 'checkmark-circle',
  },
  rejected: {
    badge: 'Rejected',
    badgeColor: '#ef4444',
    badgeBg: '#fee2e2',
    description: 'Your KYC was rejected. Please re-submit documents.',
    icon: 'close-circle',
  },
  'not-started': {
    badge: 'Not Started',
    badgeColor: '#6b7280',
    badgeBg: '#f3f4f6',
    description: 'Complete KYC to unlock all features.',
    icon: 'alert-circle-outline',
  },
};

export default function ProfileScreen({ navigation }: Props) {
  const { isDark } = useTheme();
  const colors = getThemedColors(isDark);
  const { logout, user, setUser } = useAuthStore();
  const { currentMeter, removeMeter } = useMeterStore();
  const { overallStatus: kycStatus } = useKYCStore();
  const { themeMode, setThemeMode, restoreTheme } = useThemeStore();
  
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);

  // Restore theme on mount
  useEffect(() => {
    restoreTheme();
  }, []);

  // Get KYC display status
  const getKYCDisplayStatus = () => {
    if (!user) return 'not-started';
    return user.kycStatus || 'pending';
  };

  const kycDisplayStatus = getKYCDisplayStatus();
  const kycConfig = KYC_STATUS_CONFIG[kycDisplayStatus as keyof typeof KYC_STATUS_CONFIG] || KYC_STATUS_CONFIG['not-started'];

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

  const handleDeleteMeter = () => {
    if (!currentMeter || !user?.id) {
      Alert.alert('Error', 'No meter to delete');
      return;
    }

    Alert.alert(
      'Delete Meter',
      `Are you sure you want to delete meter "${currentMeter.meterSerialId}"?\n\nThis will stop all data generation and cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMeter(currentMeter.id, user.id);
              Alert.alert('Success', 'Meter deleted successfully');
            } catch (error: unknown) {
              Alert.alert('Error', getErrorMessage(error) || 'Failed to delete meter. Please try again.');
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
        console.error('❌ Upload error:', getErrorMessage(error));
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

  const getAppVersion = () => {
    return Constants.expoConfig?.version || '1.0.0';
  };

  const menuItems = [
    {
      id: 'editProfile',
      title: 'Edit Profile',
      subtitle: 'Update your personal information',
      icon: <MaterialCommunityIcons name="account-edit" size={24} color="#10b981" />,
      onPress: () => navigation.navigate('EditProfile'),
    },
    {
      id: 'history',
      title: 'Transaction History',
      subtitle: 'View all your trades and analytics',
      icon: <MaterialCommunityIcons name="history" size={24} color="#10b981" />,
      onPress: () => navigation.navigate('History'),
    },
    {
      id: 'tradingBot',
      title: 'Trading Bot Settings',
      subtitle: 'Configure auto-selling rules',
      icon: <MaterialCommunityIcons name="robot" size={24} color="#10b981" />,
      onPress: () => navigation.navigate('TradingBot'),
    },
    {
      id: 'theme',
      title: 'Theme Preference',
      subtitle: THEME_OPTIONS.find(t => t.value === themeMode)?.label || 'System Default',
      icon: <Ionicons name={themeMode === 'dark' ? 'moon' : themeMode === 'light' ? 'sunny' : 'phone-portrait-outline'} size={24} color="#10b981" />,
      onPress: () => setShowThemeModal(true),
    },
    {
      id: 'meter',
      title: 'Meter Settings',
      subtitle: 'Manage your smart meter',
      icon: <MaterialCommunityIcons name="meter-electric" size={24} color="#10b981" />,
      onPress: () => navigation.navigate('MeterRegistration'),
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <LinearGradient
        colors={['#10b981', '#059669']}
        style={styles.gradientHeader}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Profile</Text>
            <Text style={styles.headerSubtitle}>Manage your account settings</Text>
          </View>
          <MaterialCommunityIcons name="account-circle" size={32} color="#ffffff" />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* User Info Card */}
          {user && (
            <View style={[styles.userCard, { backgroundColor: colors.card }]}>
              <TouchableOpacity
                style={styles.userAvatarContainer}
                onPress={handlePickImage}
                disabled={isUploadingImage}
                activeOpacity={0.7}
              >
                {user.profilePictureUrl ? (
                  <Image
                    source={{ uri: user.profilePictureUrl }}
                    style={styles.userAvatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.userAvatar, { backgroundColor: colors.primaryLight }]}>
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
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                  {user.name?.trim() || 'User'}
                </Text>
                <View style={styles.userDetailRow}>
                  <Ionicons name="mail" size={16} color={colors.textSecondary} />
                  <Text style={[styles.userDetail, { color: colors.textSecondary }]}>{user.email}</Text>
                </View>
                {user.phoneNumber && (
                  <View style={styles.userDetailRow}>
                    <Ionicons name="call" size={16} color={colors.textSecondary} />
                    <Text style={[styles.userDetail, { color: colors.textSecondary }]}>{user.phoneNumber}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* KYC Status Card */}
          <TouchableOpacity
            style={[styles.kycCard, { backgroundColor: colors.card }]}
            onPress={() => navigation.navigate('KYC')}
            activeOpacity={0.7}
          >
            <View style={styles.kycHeader}>
              <View style={[styles.kycIconContainer, { backgroundColor: colors.primaryLight }]}>
                <MaterialCommunityIcons name="shield-check" size={24} color={colors.primary} />
              </View>
              <View style={styles.kycInfo}>
                <View style={styles.kycTitleRow}>
                  <Text style={[styles.kycTitle, { color: colors.text }]}>KYC Verification</Text>
                  <View style={[styles.kycBadge, { backgroundColor: kycConfig.badgeBg }]}>
                    <Ionicons name={kycConfig.icon as any} size={12} color={kycConfig.badgeColor} />
                    <Text style={[styles.kycBadgeText, { color: kycConfig.badgeColor }]}>
                      {kycConfig.badge}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.kycDescription, { color: colors.textSecondary }]}>{kycConfig.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          {/* Current Meter Info */}
          {currentMeter && (
            <View style={[styles.meterCard, { backgroundColor: colors.card }]}>
              <View style={styles.meterHeader}>
                <View style={[styles.meterIconContainer, { backgroundColor: colors.primaryLight }]}>
                  <MaterialCommunityIcons name="meter-electric" size={24} color={colors.primary} />
                </View>
                <View style={styles.meterInfo}>
                  <Text style={[styles.meterTitle, { color: colors.text }]}>Linked Meter</Text>
                  <Text style={[styles.meterSerial, { color: colors.textSecondary }]}>{currentMeter.meterSerialId}</Text>
                  <Text style={[styles.meterDiscom, { color: colors.textMuted }]}>{currentMeter.discomName}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.deleteMeterButton}
                onPress={handleDeleteMeter}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="delete-outline" size={20} color="#ef4444" />
                <Text style={styles.deleteMeterText}>Delete Meter</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Menu Items */}
          <View style={styles.menuSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.menuItem, { backgroundColor: colors.card }]}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: colors.primaryLight }]}>
                  {item.icon}
                </View>
                <View style={styles.menuContent}>
                  <Text style={[styles.menuItemText, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.menuItemSubtext, { color: colors.textSecondary }]}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Account Info Section */}
          <View style={styles.menuSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
            
            {/* App Version */}
            <View style={[styles.infoItem, { backgroundColor: colors.card }]}>
              <View style={[styles.menuIconContainer, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="information-circle" size={24} color={colors.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuItemText, { color: colors.text }]}>App Version</Text>
                <Text style={[styles.menuItemSubtext, { color: colors.textSecondary }]}>v{getAppVersion()}</Text>
              </View>
            </View>
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#ef4444', '#dc2626']}
              style={styles.logoutButtonGradient}
            >
              <Ionicons name="log-out-outline" size={20} color="#ffffff" />
              <Text style={styles.logoutText}>Logout</Text>
            </LinearGradient>
          </TouchableOpacity>
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
          <View style={[styles.modalContent, { backgroundColor: colors.modalBackground }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Theme Preference</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Choose your preferred appearance</Text>
            
            {THEME_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.themeOption,
                  { backgroundColor: colors.backgroundSecondary },
                  themeMode === option.value && [styles.themeOptionActive, { borderColor: colors.primary }],
                ]}
                onPress={() => handleThemeChange(option.value)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.themeIconContainer,
                  { backgroundColor: colors.primaryLight },
                  themeMode === option.value && [styles.themeIconContainerActive, { backgroundColor: colors.primary }],
                ]}>
                  <Ionicons
                    name={option.icon as any}
                    size={24}
                    color={themeMode === option.value ? '#ffffff' : colors.primary}
                  />
                </View>
                <Text style={[
                  styles.themeOptionText,
                  { color: colors.text },
                  themeMode === option.value && styles.themeOptionTextActive,
                ]}>
                  {option.label}
                </Text>
                {themeMode === option.value && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowThemeModal(false)}
            >
              <Text style={[styles.modalCloseText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  userAvatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#ecfdf5',
    alignSelf: 'flex-start',
  },
  userAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  cameraIconOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    zIndex: 1,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  userDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  userDetail: {
    fontSize: 14,
    color: '#6b7280',
  },
  menuSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  menuItemSubtext: {
    fontSize: 12,
    color: '#6b7280',
  },
  logoutButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 40,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoutButtonGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  meterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  meterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  meterIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  meterInfo: {
    flex: 1,
  },
  meterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  meterSerial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  meterDiscom: {
    fontSize: 14,
    color: '#6b7280',
  },
  deleteMeterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    gap: 8,
  },
  deleteMeterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  // KYC Card styles
  kycCard: {
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
  kycHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  kycIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  kycInfo: {
    flex: 1,
  },
  kycTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  kycTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  kycBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  kycBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  kycDescription: {
    fontSize: 12,
    color: '#6b7280',
  },
  // Info item style
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeOptionActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  themeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  themeIconContainerActive: {
    backgroundColor: '#10b981',
  },
  themeOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  themeOptionTextActive: {
    color: '#111827',
  },
  modalCloseButton: {
    marginTop: 12,
    padding: 14,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
});
