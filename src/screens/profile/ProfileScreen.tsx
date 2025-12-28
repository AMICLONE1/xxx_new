import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types';
import { useAuthStore, useMeterStore } from '@/store';
import { supabaseStorageService } from '@/services/supabase/storageService';
import { supabaseAuthService } from '@/services/supabase/authService';

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

interface Props {
  navigation: ProfileScreenNavigationProp;
}

export default function ProfileScreen({ navigation }: Props) {
  const { logout, user, setUser } = useAuthStore();
  const { currentMeter, removeMeter } = useMeterStore();
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
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
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete meter. Please try again.');
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
    } catch (error: any) {
      if (__DEV__) {
        console.error('Error picking image:', error);
      }
      Alert.alert('Error', 'Failed to open image picker. Please try again.');
    }
  };

  const uploadProfileImage = async (imageUri: string) => {
    if (!user?.id) return;

    setIsUploadingImage(true);
    try {
      if (__DEV__) {
        console.log('📤 Uploading profile image...');
      }

      // Upload image to Supabase storage
      const imageUrl = await supabaseStorageService.uploadProfileImageFromUri(user.id, imageUri);

      if (__DEV__) {
        console.log('✅ Image uploaded:', imageUrl);
      }

      // Update user profile with new image URL
      const response = await supabaseAuthService.updateProfile({
        profilePictureUrl: imageUrl,
      });

      if (response.success && response.data) {
        // Update user in store
        setUser(response.data);
        Alert.alert('Success', 'Profile picture updated successfully!');
      } else {
        throw new Error(response.error || 'Failed to update profile');
      }
    } catch (error: any) {
      if (__DEV__) {
        console.error('❌ Error uploading profile image:', error);
      }
      Alert.alert('Error', error.message || 'Failed to upload profile picture. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const menuItems = [
    {
      id: 'tradingBot',
      title: 'Trading Bot Settings',
      subtitle: 'Configure auto-selling rules',
      icon: <MaterialCommunityIcons name="robot" size={24} color="#10b981" />,
      onPress: () => navigation.navigate('TradingBot'),
    },
    {
      id: 'kyc',
      title: 'KYC Verification',
      subtitle: 'Verify your identity',
      icon: <MaterialCommunityIcons name="shield-check" size={24} color="#10b981" />,
      onPress: () => navigation.navigate('KYC'),
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
    <SafeAreaView style={styles.container} edges={['top']}>
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
            <View style={styles.userCard}>
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
                  <View style={styles.userAvatar}>
                    <MaterialCommunityIcons name="account" size={48} color="#10b981" />
                  </View>
                )}
                {isUploadingImage ? (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="small" color="#10b981" />
                  </View>
                ) : (
                  <View style={styles.cameraIconOverlay}>
                    <Ionicons name="camera" size={20} color="#ffffff" />
                  </View>
                )}
              </TouchableOpacity>
              <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                  {user.name?.trim() || 'User'}
                </Text>
                <View style={styles.userDetailRow}>
                  <Ionicons name="mail" size={16} color="#6b7280" />
                  <Text style={styles.userDetail}>{user.email}</Text>
                </View>
                {user.phoneNumber && (
                  <View style={styles.userDetailRow}>
                    <Ionicons name="call" size={16} color="#6b7280" />
                    <Text style={styles.userDetail}>{user.phoneNumber}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Current Meter Info */}
          {currentMeter && (
            <View style={styles.meterCard}>
              <View style={styles.meterHeader}>
                <View style={styles.meterIconContainer}>
                  <MaterialCommunityIcons name="meter-electric" size={24} color="#10b981" />
                </View>
                <View style={styles.meterInfo}>
                  <Text style={styles.meterTitle}>Current Meter</Text>
                  <Text style={styles.meterSerial}>{currentMeter.meterSerialId}</Text>
                  <Text style={styles.meterDiscom}>{currentMeter.discomName}</Text>
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
            <Text style={styles.sectionTitle}>Settings</Text>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.menuIconContainer}>
                  {item.icon}
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuItemText}>{item.title}</Text>
                  <Text style={styles.menuItemSubtext}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
            ))}
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
});
