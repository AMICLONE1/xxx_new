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
  TextInput,
  useColorScheme,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types';
import { ocrService, ExpoGoDetectedError, OCRNotAvailableError } from '@/services/mlkit/ocrService';
import { useKYCStore, useAuthStore } from '@/store';
import { getErrorMessage } from '@/utils/errorUtils';
import { getThemedColors, ThemedColors } from '@/utils/themedStyles';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '@/contexts';

type GSTScanScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'GSTScan'>;

interface Props {
  navigation: GSTScanScreenNavigationProp;
}

interface ExtractedGSTData {
  gstin: string;
  legalName: string;
  tradeName: string;
  constitutionOfBusiness: string;
  dateOfRegistration: string;
  businessAddress: string;
  stateJurisdiction: string;
}

export default function GSTScanScreen({ navigation }: Props) {
  const colorScheme = useColorScheme();
  const { isDark } = useTheme();
  const colors = useMemo(() => getThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    console.log('[GSTScanScreen] Rendered. Color scheme:', colorScheme, 'isDark:', isDark);
  }, [colorScheme, isDark]);

  const { submitDocument, isSubmitting, canUseOCR, getDocumentStatus } = useKYCStore();
  const { user } = useAuthStore();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedGSTData>({
    gstin: '',
    legalName: '',
    tradeName: '',
    constitutionOfBusiness: '',
    dateOfRegistration: '',
    businessAddress: '',
    stateJurisdiction: '',
  });
  const [showForm, setShowForm] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [isExpoGo, setIsExpoGo] = useState(false);

  // Check OCR access and Expo Go status on mount
  useEffect(() => {
    const checkExpoGo = ocrService.isRunningInExpoGo();
    setIsExpoGo(checkExpoGo);
    if (checkExpoGo && __DEV__) {
      console.log('📱 Running in Expo Go - OCR disabled');
    }

    // Check if OCR can be used for this document
    const ocrAllowed = canUseOCR('gst');
    const docStatus = getDocumentStatus('gst');

    if (!ocrAllowed) {
      console.log('[GSTScan] OCR not allowed, status:', docStatus);
      if (docStatus === 'verified') {
        Alert.alert(
          'Document Verified',
          'Your GST certificate has already been verified. No re-upload needed.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else if (docStatus === 'pending') {
        Alert.alert(
          'Document Pending',
          'Your GST certificate is currently being reviewed. Please wait for verification.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    }
  }, [canUseOCR, getDocumentStatus, navigation]);

  /**
   * Format date with slashes: DD/MM/YYYY
   */
  const formatDate = (text: string): string => {
    const digitsOnly = text.replace(/\D/g, '');
    const limited = digitsOnly.slice(0, 8);

    if (limited.length <= 2) {
      return limited;
    } else if (limited.length <= 4) {
      return `${limited.slice(0, 2)}/${limited.slice(2)}`;
    } else {
      return `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
    }
  };

  /**
   * Format GSTIN: uppercase, alphanumeric only, 15 characters
   */
  const formatGSTIN = (text: string): string => {
    return text.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 15);
  };

  /**
   * GSTIN Regex Pattern
   * Format: 2 digits (state code) + 10 char PAN + 1 digit (entity) + Z + 1 alphanumeric (checksum)
   */
  const GSTIN_REGEX = /[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}/gi;

  /**
   * Indian States mapping for state code
   */
  const STATE_CODES: Record<string, string> = {
    '01': 'Jammu & Kashmir',
    '02': 'Himachal Pradesh',
    '03': 'Punjab',
    '04': 'Chandigarh',
    '05': 'Uttarakhand',
    '06': 'Haryana',
    '07': 'Delhi',
    '08': 'Rajasthan',
    '09': 'Uttar Pradesh',
    '10': 'Bihar',
    '11': 'Sikkim',
    '12': 'Arunachal Pradesh',
    '13': 'Nagaland',
    '14': 'Manipur',
    '15': 'Mizoram',
    '16': 'Tripura',
    '17': 'Meghalaya',
    '18': 'Assam',
    '19': 'West Bengal',
    '20': 'Jharkhand',
    '21': 'Odisha',
    '22': 'Chhattisgarh',
    '23': 'Madhya Pradesh',
    '24': 'Gujarat',
    '25': 'Daman & Diu',
    '26': 'Dadra & Nagar Haveli',
    '27': 'Maharashtra',
    '29': 'Karnataka',
    '30': 'Goa',
    '31': 'Lakshadweep',
    '32': 'Kerala',
    '33': 'Tamil Nadu',
    '34': 'Puducherry',
    '35': 'Andaman & Nicobar Islands',
    '36': 'Telangana',
    '37': 'Andhra Pradesh',
    '38': 'Ladakh',
  };

  /**
   * Extract GST data from OCR text
   */
  const extractGSTData = (ocrText: string): ExtractedGSTData => {
    const data: ExtractedGSTData = {
      gstin: '',
      legalName: '',
      tradeName: '',
      constitutionOfBusiness: '',
      dateOfRegistration: '',
      businessAddress: '',
      stateJurisdiction: '',
    };

    const lines = ocrText.split('\n');
    const upperText = ocrText.toUpperCase();

    // ============================================
    // A. GSTIN - STRICT DETECTION
    // ============================================
    const gstinMatches = ocrText.match(GSTIN_REGEX);
    if (gstinMatches && gstinMatches.length > 0) {
      data.gstin = gstinMatches[0].toUpperCase();

      // Extract state from GSTIN
      const stateCode = data.gstin.substring(0, 2);
      if (STATE_CODES[stateCode]) {
        data.stateJurisdiction = STATE_CODES[stateCode];
      }

      if (__DEV__) {
        console.log('✅ GSTIN detected:', data.gstin);
      }
    }

    // ============================================
    // B. LEGAL NAME OF BUSINESS
    // ============================================
    const legalNamePatterns = [
      /Legal Name(?:\s*of\s*Business)?[:\s]+([A-Za-z0-9\s&.,'-]+?)(?:\n|Trade|$)/i,
      /(?:Registered Name|Business Name)[:\s]+([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
    ];

    for (const pattern of legalNamePatterns) {
      const match = ocrText.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        if (name.length >= 3 && name.length <= 150) {
          data.legalName = name.toUpperCase();
          if (__DEV__) {
            console.log('✅ Legal Name detected:', data.legalName);
          }
          break;
        }
      }
    }

    // ============================================
    // C. TRADE NAME
    // ============================================
    const tradeNamePatterns = [
      /Trade Name[:\s]+([A-Za-z0-9\s&.,'-]+?)(?:\n|Constitution|$)/i,
      /(?:Trading As|DBA)[:\s]+([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
    ];

    for (const pattern of tradeNamePatterns) {
      const match = ocrText.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        if (name.length >= 2 && name.length <= 150) {
          data.tradeName = name.toUpperCase();
          if (__DEV__) {
            console.log('✅ Trade Name detected:', data.tradeName);
          }
          break;
        }
      }
    }

    // ============================================
    // D. CONSTITUTION OF BUSINESS
    // ============================================
    const constitutionTypes = [
      'PROPRIETORSHIP',
      'PARTNERSHIP',
      'PRIVATE LIMITED',
      'PVT LTD',
      'LIMITED LIABILITY PARTNERSHIP',
      'LLP',
      'PUBLIC LIMITED',
      'HINDU UNDIVIDED FAMILY',
      'HUF',
      'TRUST',
      'SOCIETY',
      'COOPERATIVE',
      'GOVERNMENT',
      'LOCAL AUTHORITY',
    ];

    const constitutionPattern = /Constitution(?:\s*of\s*Business)?[:\s]+([A-Za-z\s]+?)(?:\n|Date|$)/i;
    const constitutionMatch = ocrText.match(constitutionPattern);
    if (constitutionMatch && constitutionMatch[1]) {
      data.constitutionOfBusiness = constitutionMatch[1].trim().toUpperCase();
    } else {
      // Fallback: Search for known constitution types
      for (const type of constitutionTypes) {
        if (upperText.includes(type)) {
          data.constitutionOfBusiness = type;
          break;
        }
      }
    }

    if (__DEV__ && data.constitutionOfBusiness) {
      console.log('✅ Constitution detected:', data.constitutionOfBusiness);
    }

    // ============================================
    // E. DATE OF REGISTRATION
    // ============================================
    const datePatterns = [
      /(?:Date of Registration|Registration Date|Date of Issue)[:\s]+(\d{2})[-\/](\d{2})[-\/](\d{4})/i,
      /(?:Registered on|Effective from)[:\s]+(\d{2})[-\/](\d{2})[-\/](\d{4})/i,
    ];

    for (const pattern of datePatterns) {
      const match = ocrText.match(pattern);
      if (match) {
        const day = match[1];
        const month = match[2];
        const year = match[3];
        if (parseInt(day) >= 1 && parseInt(day) <= 31 &&
          parseInt(month) >= 1 && parseInt(month) <= 12 &&
          parseInt(year) >= 2000 && parseInt(year) <= 2099) {
          data.dateOfRegistration = `${day}/${month}/${year}`;
          if (__DEV__) {
            console.log('✅ Date of Registration detected:', data.dateOfRegistration);
          }
          break;
        }
      }
    }

    // Fallback: Find any date pattern
    if (!data.dateOfRegistration) {
      for (const line of lines) {
        const dateMatch = line.match(/(\d{2})[-\/](\d{2})[-\/](\d{4})/);
        if (dateMatch) {
          const day = dateMatch[1];
          const month = dateMatch[2];
          const year = dateMatch[3];
          if (parseInt(day) >= 1 && parseInt(day) <= 31 &&
            parseInt(month) >= 1 && parseInt(month) <= 12 &&
            parseInt(year) >= 2000 && parseInt(year) <= 2099) {
            data.dateOfRegistration = `${day}/${month}/${year}`;
            break;
          }
        }
      }
    }

    // ============================================
    // F. BUSINESS ADDRESS
    // ============================================
    const addressPatterns = [
      /(?:Principal Place of Business|Business Address|Registered Address)[:\s]+([A-Za-z0-9\s,.\-\/()]+?)(?:State|PIN|$)/i,
      /(?:Address)[:\s]+([A-Za-z0-9\s,.\-\/()]+?)(?:State|PIN|GSTIN|$)/i,
    ];

    for (const pattern of addressPatterns) {
      const match = ocrText.match(pattern);
      if (match && match[1]) {
        const address = match[1].trim();
        if (address.length >= 10 && address.length <= 300) {
          data.businessAddress = address;
          if (__DEV__) {
            console.log('✅ Address detected:', data.businessAddress);
          }
          break;
        }
      }
    }

    // ============================================
    // G. STATE / JURISDICTION (if not from GSTIN)
    // ============================================
    if (!data.stateJurisdiction) {
      const statePatterns = [
        /(?:State|Jurisdiction|State Code)[:\s]+([A-Za-z\s]+?)(?:\n|$)/i,
      ];

      for (const pattern of statePatterns) {
        const match = ocrText.match(pattern);
        if (match && match[1]) {
          const state = match[1].trim();
          if (state.length >= 2 && state.length <= 50) {
            data.stateJurisdiction = state.toUpperCase();
            break;
          }
        }
      }
    }

    return data;
  };

  /**
   * Handle image upload
   */
  const handleUploadImage = async () => {
    // Check if running in Expo Go - silently fall back to manual entry
    if (isExpoGo) {
      console.log('[GSTScan] Expo Go detected - using manual entry mode');
      setExtractedData({
        gstin: '',
        legalName: '',
        tradeName: '',
        constitutionOfBusiness: '',
        dateOfRegistration: '',
        businessAddress: '',
        stateJurisdiction: '',
      });
      setShowForm(true);
      setIsManualEntry(true);
      return;
    }

    await proceedWithUpload();
  };

  /**
   * Proceed with image upload after checks
   */
  const proceedWithUpload = async () => {
    try {
      const mediaLibraryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (mediaLibraryStatus.status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant media library permissions to upload GST certificate.');
        return;
      }

      Alert.alert(
        'Select GST Certificate',
        'Choose an option',
        [
          {
            text: 'Camera',
            onPress: async () => {
              try {
                const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
                if (cameraStatus.status !== 'granted') {
                  Alert.alert('Permission Required', 'Please grant camera permissions.');
                  return;
                }
                const result = await ImagePicker.launchCameraAsync({
                  mediaTypes: ['images'],
                  allowsEditing: true,
                  quality: 0.8,
                });

                if (!result.canceled && result.assets && result.assets[0]) {
                  await processImage(result.assets[0].uri);
                }
              } catch (error: unknown) {
                Alert.alert('Error', `Failed to open camera: ${getErrorMessage(error) || 'Unknown error'}`);
              }
            },
          },
          {
            text: 'Photo Library',
            onPress: async () => {
              try {
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ['images'],
                  allowsEditing: true,
                  quality: 0.8,
                });

                if (!result.canceled && result.assets && result.assets[0]) {
                  await processImage(result.assets[0].uri);
                }
              } catch (error: unknown) {
                Alert.alert('Error', `Failed to open photo library: ${getErrorMessage(error) || 'Unknown error'}`);
              }
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ],
        { cancelable: true }
      );
    } catch (error: unknown) {
      Alert.alert('Error', `Failed to open image picker: ${getErrorMessage(error) || 'Please try again.'}`);
    }
  };

  /**
   * Process image with OCR
   */
  const processImage = async (uri: string) => {
    const emptyData: ExtractedGSTData = {
      gstin: '',
      legalName: '',
      tradeName: '',
      constitutionOfBusiness: '',
      dateOfRegistration: '',
      businessAddress: '',
      stateJurisdiction: '',
    };

    // Reset state
    setExtractedData(emptyData);
    setShowForm(false);
    setIsConfirmed(false);
    setIsManualEntry(false);
    setImageUri(null);

    setIsProcessing(true);
    setImageUri(uri);

    // Delete image after processing (security requirement)
    const deleteImage = async () => {
      try {
        const fileUri = uri.startsWith('file://') ? uri : `file://${uri}`;
        const filePath = fileUri.replace('file://', '');
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(filePath, { idempotent: true });
          if (__DEV__) {
            console.log('🗑️ GST image file deleted (security)');
          }
        }
      } catch (deleteError) {
        if (__DEV__) {
          console.warn('⚠️ Could not delete GST image file:', deleteError);
        }
      }
    };

    try {
      if (__DEV__) {
        console.log('📸 Processing GST certificate for OCR...');
      }

      let ocrResult;
      try {
        ocrResult = await ocrService.recognizeText(uri);

        if (__DEV__) {
          console.log('✅ GST OCR Success! Text extracted (length:', ocrResult.text.length, 'chars)');
        }
      } catch (ocrError: unknown) {
        await deleteImage();

        if (__DEV__) {
          console.error('❌ GST OCR Error:', ocrError instanceof Error ? ocrError.name : 'Unknown');
        }

        // Handle Expo Go detection - silently fall back to manual entry
        if (ocrError instanceof ExpoGoDetectedError || getErrorMessage(ocrError) === 'EXPO_GO_DETECTED') {
          console.log('[GSTScan] Expo Go detected during OCR - using manual entry');
          setExtractedData(emptyData);
          setShowForm(true);
          setIsManualEntry(true);
          setIsProcessing(false);
          return;
        }

        // Handle OCR not available error - silently fall back to manual entry
        if (ocrError instanceof OCRNotAvailableError) {
          console.log('[GSTScan] OCR not available - using manual entry');
          setExtractedData(emptyData);
          setShowForm(true);
          setIsManualEntry(true);
          setIsProcessing(false);
          return;
        }

        // Handle generic OCR errors - silently fall back to manual entry
        console.log('[GSTScan] OCR processing error - using manual entry');
        setExtractedData(emptyData);
        setShowForm(true);
        setIsManualEntry(true);
        setIsProcessing(false);
        return;
      }

      const ocrText = ocrResult.text;
      const extracted = extractGSTData(ocrText);

      // Validate GSTIN format
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (extracted.gstin && !gstinRegex.test(extracted.gstin)) {
        extracted.gstin = '';
        if (__DEV__) {
          console.warn('⚠️ Invalid GSTIN format detected, clearing');
        }
      }

      if (__DEV__) {
        console.log('📊 GST Extraction Results:', {
          gstin: extracted.gstin ? 'Found' : 'Not detected',
          legalName: extracted.legalName ? 'Found' : 'Not detected',
          tradeName: extracted.tradeName ? 'Found' : 'Not detected',
          constitution: extracted.constitutionOfBusiness ? 'Found' : 'Not detected',
          date: extracted.dateOfRegistration ? 'Found' : 'Not detected',
          address: extracted.businessAddress ? 'Found' : 'Not detected',
          state: extracted.stateJurisdiction ? 'Found' : 'Not detected',
        });
      }

      setExtractedData(extracted);
      setShowForm(true);

      const hasGSTIN = extracted.gstin && gstinRegex.test(extracted.gstin);
      setIsManualEntry(!hasGSTIN);

      await deleteImage();

      if (__DEV__) {
        console.log('✅ GST Form displayed with extracted data');
      }

      setTimeout(() => {
        const extractedFields = [];
        if (extracted.gstin) extractedFields.push('GSTIN');
        if (extracted.legalName) extractedFields.push('Legal Name');
        if (extracted.tradeName) extractedFields.push('Trade Name');
        if (extracted.constitutionOfBusiness) extractedFields.push('Constitution');
        if (extracted.dateOfRegistration) extractedFields.push('Date');
        if (extracted.businessAddress) extractedFields.push('Address');
        if (extracted.stateJurisdiction) extractedFields.push('State');

        const summary = extractedFields.length > 0
          ? `Extracted: ${extractedFields.join(', ')}`
          : 'No data extracted. Please enter details manually.';

        Alert.alert(
          'OCR Complete ✅',
          `${summary}\nGSTIN: ${extracted.gstin || 'Not found'}\n\nPlease verify and edit if needed.`,
          [{ text: 'OK' }]
        );
      }, 500);

    } catch (error: unknown) {
      await deleteImage();

      if (__DEV__) {
        console.error('❌ Unexpected error in GST processImage:', error);
      }

      Alert.alert(
        'Processing Error',
        'An error occurred while processing the image. You can manually enter the details below.',
        [{ text: 'OK' }]
      );
      setExtractedData(emptyData);
      setShowForm(true);
      setIsManualEntry(true);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    if (!isConfirmed) {
      Alert.alert('Confirmation Required', 'Please confirm that the GST details are correct.');
      return;
    }

    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!extractedData.gstin || !gstinRegex.test(extractedData.gstin)) {
      Alert.alert('Invalid GSTIN', 'Please ensure a valid GSTIN is entered (15 characters).');
      return;
    }

    if (!extractedData.legalName || extractedData.legalName.length < 3) {
      Alert.alert('Required Field', 'Please enter the Legal Name of Business.');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not found. Please sign in again.');
      return;
    }

    try {
      setIsProcessing(true);

      // Submit to KYC store (handles both DB submission and local state update)
      await submitDocument(user.id, 'gst', {
        documentNumber: extractedData.gstin,
        name: extractedData.legalName,
        address: extractedData.businessAddress || undefined,
      });

      Alert.alert(
        'Success',
        'Your GST certificate details have been submitted for verification. You will be notified once verification is complete.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: unknown) {
      Alert.alert(
        'Error',
        `Failed to submit GST data: ${getErrorMessage(error) || 'Unknown error'}. Please try again.`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <LinearGradient
      colors={colors.backgroundGradient as [string, string, ...string[]]}
      style={styles.gradientBackground}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>GST Certificate</Text>
            <Text style={styles.headerSubtitle}>Upload and extract details</Text>
          </View>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Upload Card Section */}
            <View style={styles.uploadCard}>
              <View style={styles.uploadIconContainer}>
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.uploadIconGradient}
                >
                  <MaterialCommunityIcons name="file-certificate" size={48} color="#ffffff" />
                </LinearGradient>
              </View>
              <Text style={styles.uploadTitle}>Upload GST Certificate</Text>
              <Text style={styles.uploadSubtitle}>
                Take a clear photo or select from gallery. Ensure all text is visible.
              </Text>

              {imageUri && isProcessing && (
                <View style={styles.processingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.processingText}>Processing image with OCR...</Text>
                </View>
              )}

              {imageUri && !isProcessing && (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="contain" />
                </View>
              )}

              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handleUploadImage}
                disabled={isProcessing}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.uploadButtonGradient}
                >
                  <Ionicons name="camera" size={22} color="#ffffff" />
                  <Text style={styles.uploadButtonText}>
                    {imageUri ? 'Upload Another Image' : 'Upload GST Certificate'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {!showForm && (
                <TouchableOpacity
                  style={styles.manualEntryButton}
                  onPress={() => {
                    setExtractedData({
                      gstin: '',
                      legalName: '',
                      tradeName: '',
                      constitutionOfBusiness: '',
                      dateOfRegistration: '',
                      businessAddress: '',
                      stateJurisdiction: '',
                    });
                    setShowForm(true);
                    setIsManualEntry(true);
                    setImageUri(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.manualEntryButtonText}>Enter Details Manually</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Form Section */}
            {showForm && (
              <View style={styles.formCard}>
                <View style={styles.formHeaderRow}>
                  <View style={styles.formIconContainer}>
                    <Ionicons name="document-text" size={20} color={colors.primary} />
                  </View>
                  <Text style={styles.formSectionTitle}>GST Details</Text>
                </View>
                <Text style={styles.formHelperText}>Please verify your GST certificate details</Text>

                {/* GSTIN Input Card */}
                <View style={styles.inputCard}>
                  <View style={styles.inputLabelRow}>
                    <Ionicons name="barcode-outline" size={18} color={colors.primary} />
                    <Text style={styles.inputLabel}>GSTIN *</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    value={extractedData.gstin}
                    onChangeText={(text) => setExtractedData({ ...extractedData, gstin: formatGSTIN(text) })}
                    placeholder="Enter GSTIN (15 characters)"
                    placeholderTextColor={colors.inputPlaceholder} // Fixed
                    autoCapitalize="characters"
                    maxLength={15}
                  />
                  <Text style={styles.inputHint}>Format: 22AAAAA0000A1Z5</Text>
                </View>

                {/* Legal Name Input Card */}
                <View style={styles.inputCard}>
                  <View style={styles.inputLabelRow}>
                    <Ionicons name="business-outline" size={18} color={colors.primary} />
                    <Text style={styles.inputLabel}>Legal Name of Business *</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    value={extractedData.legalName}
                    onChangeText={(text) => setExtractedData({ ...extractedData, legalName: text.toUpperCase() })}
                    placeholder="Enter legal business name"
                    placeholderTextColor={colors.inputPlaceholder}
                    autoCapitalize="characters"
                    maxLength={150}
                  />
                </View>

                {/* Trade Name Input Card */}
                <View style={styles.inputCard}>
                  <View style={styles.inputLabelRow}>
                    <Ionicons name="storefront-outline" size={18} color={colors.primary} />
                    <Text style={styles.inputLabel}>Trade Name (Optional)</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    value={extractedData.tradeName}
                    onChangeText={(text) => setExtractedData({ ...extractedData, tradeName: text.toUpperCase() })}
                    placeholder="Enter trade name if different"
                    placeholderTextColor={colors.inputPlaceholder}
                    autoCapitalize="characters"
                    maxLength={150}
                  />
                </View>

                {/* Constitution of Business Input Card */}
                <View style={styles.inputCard}>
                  <View style={styles.inputLabelRow}>
                    <Ionicons name="briefcase-outline" size={18} color={colors.primary} />
                    <Text style={styles.inputLabel}>Constitution of Business</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    value={extractedData.constitutionOfBusiness}
                    onChangeText={(text) => setExtractedData({ ...extractedData, constitutionOfBusiness: text.toUpperCase() })}
                    placeholder="e.g., Proprietorship, Pvt Ltd, LLP"
                    placeholderTextColor={colors.inputPlaceholder}
                    autoCapitalize="characters"
                    maxLength={50}
                  />
                </View>

                {/* Date of Registration Input Card */}
                <View style={styles.inputCard}>
                  <View style={styles.inputLabelRow}>
                    <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                    <Text style={styles.inputLabel}>Date of Registration</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    value={extractedData.dateOfRegistration}
                    onChangeText={(text) => {
                      const formatted = formatDate(text);
                      setExtractedData({ ...extractedData, dateOfRegistration: formatted });
                    }}
                    placeholder="DD/MM/YYYY"
                    placeholderTextColor={colors.inputPlaceholder}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>

                {/* Business Address Input Card */}
                <View style={styles.inputCard}>
                  <View style={styles.inputLabelRow}>
                    <Ionicons name="location-outline" size={18} color={colors.primary} />
                    <Text style={styles.inputLabel}>Principal Place of Business</Text>
                  </View>
                  <TextInput
                    style={[styles.input, styles.inputMultiline]}
                    value={extractedData.businessAddress}
                    onChangeText={(text) => setExtractedData({ ...extractedData, businessAddress: text })}
                    placeholder="Enter complete business address"
                    placeholderTextColor={colors.inputPlaceholder}
                    multiline
                    numberOfLines={3}
                    maxLength={300}
                    textAlignVertical="top"
                  />
                </View>

                {/* State / Jurisdiction Input Card */}
                <View style={styles.inputCard}>
                  <View style={styles.inputLabelRow}>
                    <Ionicons name="map-outline" size={18} color={colors.primary} />
                    <Text style={styles.inputLabel}>State / Jurisdiction</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    value={extractedData.stateJurisdiction}
                    onChangeText={(text) => setExtractedData({ ...extractedData, stateJurisdiction: text.toUpperCase() })}
                    placeholder="Enter state"
                    placeholderTextColor={colors.inputPlaceholder}
                    autoCapitalize="characters"
                    maxLength={50}
                  />
                </View>

                {/* Confirmation Checkbox */}
                <View style={styles.confirmationCard}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => setIsConfirmed(!isConfirmed)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkboxBox, isConfirmed && styles.checkboxBoxChecked]}>
                      {isConfirmed && <Ionicons name="checkmark" size={16} color="#ffffff" />}
                    </View>
                    <Text style={styles.checkboxLabel}>
                      I confirm the above GST certificate details are correct
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.submitButton, !isConfirmed && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={!isConfirmed || isProcessing}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={isConfirmed ? [colors.primary, colors.primaryDark] : [colors.textMuted, colors.textSecondary]}
                    style={styles.submitButtonGradient}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name="shield-checkmark" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                        <Text style={styles.submitButtonText}>Submit for Verification</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Retake Button */}
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={() => {
                    setShowForm(false);
                    setImageUri(null);
                    setExtractedData({
                      gstin: '',
                      legalName: '',
                      tradeName: '',
                      constitutionOfBusiness: '',
                      dateOfRegistration: '',
                      businessAddress: '',
                      stateJurisdiction: '',
                    });
                    setIsConfirmed(false);
                    setIsManualEntry(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.retakeButtonText}>Scan Another Image</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
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
    backgroundColor: 'transparent',
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  // Upload Card
  uploadCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 20,
  },
  uploadIconContainer: {
    marginBottom: 20,
  },
  uploadIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  uploadTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  uploadSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  processingContainer: {
    alignItems: 'center',
    marginVertical: 20,
    padding: 20,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    width: '100%',
  },
  processingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.primaryDark,
    fontWeight: '500',
  },
  imagePreviewContainer: {
    width: '100%',
    maxHeight: 280,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 2,
    borderColor: colors.border,
  },
  imagePreview: {
    width: '100%',
    height: 280,
  },
  uploadButton: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  uploadButtonGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  uploadButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  manualEntryButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  manualEntryButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  // Form Card
  formCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  formIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  formSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  formHelperText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  // Input Card
  inputCard: {
    backgroundColor: colors.inputBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.inputText,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
  },
  inputMultiline: {
    minHeight: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
    marginLeft: 2,
  },
  // Confirmation Card
  confirmationCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  checkboxBoxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
    lineHeight: 20,
  },
  // Buttons
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonDisabled: {
    shadowOpacity: 0.1,
    elevation: 2,
  },
  submitButtonGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  retakeButton: {
    flexDirection: 'row',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  retakeButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});

