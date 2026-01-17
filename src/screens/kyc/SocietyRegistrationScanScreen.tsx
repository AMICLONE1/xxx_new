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
  TextInput,
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
import * as FileSystem from 'expo-file-system/legacy';

type SocietyRegistrationScanScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SocietyRegistrationScan'>;

interface Props {
  navigation: SocietyRegistrationScanScreenNavigationProp;
}

interface ExtractedSocietyData {
  societyName: string;
  registrationNumber: string;
  dateOfRegistration: string;
  typeOfSociety: string;
  registeredAddress: string;
  registeringAuthority: string;
  state: string;
}

export default function SocietyRegistrationScanScreen({ navigation }: Props) {
  const { submitDocument, isSubmitting, canUseOCR, getDocumentStatus } = useKYCStore();
  const { user } = useAuthStore();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedSocietyData>({
    societyName: '',
    registrationNumber: '',
    dateOfRegistration: '',
    typeOfSociety: '',
    registeredAddress: '',
    registeringAuthority: '',
    state: '',
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
    const ocrAllowed = canUseOCR('society_registration');
    const docStatus = getDocumentStatus('society_registration');

    if (!ocrAllowed) {
      console.log('[SocietyRegistrationScan] OCR not allowed, status:', docStatus);
      if (docStatus === 'verified') {
        Alert.alert(
          'Document Verified',
          'Your society registration has already been verified. No re-upload needed.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else if (docStatus === 'pending') {
        Alert.alert(
          'Document Pending',
          'Your society registration is currently being reviewed. Please wait for verification.',
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
   * Format registration number: alphanumeric, uppercase
   */
  const formatRegistrationNumber = (text: string): string => {
    return text.replace(/[^A-Za-z0-9\-\/]/g, '').toUpperCase().slice(0, 30);
  };

  /**
   * Indian States list
   */
  const INDIAN_STATES = [
    'ANDHRA PRADESH', 'ARUNACHAL PRADESH', 'ASSAM', 'BIHAR', 'CHHATTISGARH',
    'GOA', 'GUJARAT', 'HARYANA', 'HIMACHAL PRADESH', 'JHARKHAND', 'KARNATAKA',
    'KERALA', 'MADHYA PRADESH', 'MAHARASHTRA', 'MANIPUR', 'MEGHALAYA', 'MIZORAM',
    'NAGALAND', 'ODISHA', 'PUNJAB', 'RAJASTHAN', 'SIKKIM', 'TAMIL NADU',
    'TELANGANA', 'TRIPURA', 'UTTAR PRADESH', 'UTTARAKHAND', 'WEST BENGAL',
    'DELHI', 'JAMMU AND KASHMIR', 'LADAKH', 'CHANDIGARH', 'PUDUCHERRY',
    'ANDAMAN AND NICOBAR', 'DADRA AND NAGAR HAVELI', 'DAMAN AND DIU', 'LAKSHADWEEP',
  ];

  /**
   * Society types
   */
  const SOCIETY_TYPES = [
    'CO-OPERATIVE HOUSING SOCIETY',
    'COOPERATIVE HOUSING SOCIETY',
    'APARTMENT OWNERS ASSOCIATION',
    'RESIDENT WELFARE ASSOCIATION',
    'RWA',
    'HOUSING SOCIETY',
    'WELFARE SOCIETY',
    'CONDOMINIUM ASSOCIATION',
    'FLAT OWNERS ASSOCIATION',
    'BUILDING ASSOCIATION',
  ];

  /**
   * Registering authorities
   */
  const REGISTERING_AUTHORITIES = [
    'REGISTRAR OF CO-OPERATIVE SOCIETIES',
    'REGISTRAR OF COOPERATIVE SOCIETIES',
    'REGISTRAR OF SOCIETIES',
    'REGISTRAR OF COMPANIES',
    'SUB-REGISTRAR',
    'DEPUTY REGISTRAR',
    'ASSISTANT REGISTRAR',
    'DISTRICT REGISTRAR',
  ];

  /**
   * Extract Society Registration data from OCR text
   */
  const extractSocietyData = (ocrText: string): ExtractedSocietyData => {
    const data: ExtractedSocietyData = {
      societyName: '',
      registrationNumber: '',
      dateOfRegistration: '',
      typeOfSociety: '',
      registeredAddress: '',
      registeringAuthority: '',
      state: '',
    };

    const lines = ocrText.split('\n');
    const upperText = ocrText.toUpperCase();

    // ============================================
    // A. SOCIETY NAME
    // ============================================
    const societyNamePatterns = [
      /(?:Society Name|Name of Society|Name of the Society)[:\s]+([A-Za-z0-9\s&.,'-]+?)(?:\n|Registration|$)/i,
      /(?:Name)[:\s]+([A-Za-z0-9\s&.,'-]+?(?:Society|Association|RWA|Welfare)[A-Za-z0-9\s&.,'-]*?)(?:\n|$)/i,
      /([A-Za-z0-9\s&.,'-]+?(?:Co-operative|Cooperative|Housing|Apartment|Resident|Welfare)\s*(?:Society|Association)[A-Za-z0-9\s&.,'-]*?)(?:\n|Registration|$)/i,
    ];

    for (const pattern of societyNamePatterns) {
      const match = ocrText.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        if (name.length >= 5 && name.length <= 200) {
          data.societyName = name.toUpperCase();
          if (__DEV__) {
            console.log('✅ Society Name detected:', data.societyName);
          }
          break;
        }
      }
    }

    // ============================================
    // B. REGISTRATION NUMBER
    // ============================================
    const regNumberPatterns = [
      /(?:Registration No|Reg\.?\s*No|Registration Number|Certificate No)[.:\s]+([A-Z0-9\-\/]+)/i,
      /(?:No|Number)[.:\s]+([A-Z]{2,5}[\-\/]?[0-9]{3,10}[\-\/]?[A-Z0-9]*)/i,
      /([A-Z]{2,5}[\-\/][0-9]{3,10}[\-\/][0-9]{4})/i,
    ];

    for (const pattern of regNumberPatterns) {
      const match = ocrText.match(pattern);
      if (match && match[1]) {
        const regNum = match[1].trim().toUpperCase();
        if (regNum.length >= 4 && regNum.length <= 30) {
          data.registrationNumber = regNum;
          if (__DEV__) {
            console.log('✅ Registration Number detected:', data.registrationNumber);
          }
          break;
        }
      }
    }

    // ============================================
    // C. DATE OF REGISTRATION
    // ============================================
    const datePatterns = [
      /(?:Date of Registration|Registration Date|Registered on|Date of Issue|Dated)[:\s]+(\d{2})[-\/](\d{2})[-\/](\d{4})/i,
      /(?:Registered|Dated)[:\s]+(\d{2})[-\/](\d{2})[-\/](\d{4})/i,
    ];

    for (const pattern of datePatterns) {
      const match = ocrText.match(pattern);
      if (match) {
        const day = match[1];
        const month = match[2];
        const year = match[3];
        if (parseInt(day) >= 1 && parseInt(day) <= 31 &&
          parseInt(month) >= 1 && parseInt(month) <= 12 &&
          parseInt(year) >= 1900 && parseInt(year) <= 2099) {
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
            parseInt(year) >= 1900 && parseInt(year) <= 2099) {
            data.dateOfRegistration = `${day}/${month}/${year}`;
            break;
          }
        }
      }
    }

    // ============================================
    // D. TYPE OF SOCIETY
    // ============================================
    const typePattern = /(?:Type of Society|Society Type|Type)[:\s]+([A-Za-z\s]+?)(?:\n|Registration|$)/i;
    const typeMatch = ocrText.match(typePattern);
    if (typeMatch && typeMatch[1]) {
      data.typeOfSociety = typeMatch[1].trim().toUpperCase();
    } else {
      // Fallback: Search for known society types in text
      for (const type of SOCIETY_TYPES) {
        if (upperText.includes(type)) {
          data.typeOfSociety = type;
          if (__DEV__) {
            console.log('✅ Type of Society detected:', data.typeOfSociety);
          }
          break;
        }
      }
    }

    // ============================================
    // E. REGISTERED ADDRESS
    // ============================================
    const addressPatterns = [
      /(?:Registered Address|Address|Registered Office|Office Address)[:\s]+([A-Za-z0-9\s,.\-\/()]+?)(?:State|PIN|Registrar|$)/i,
      /(?:Located at|Situated at)[:\s]+([A-Za-z0-9\s,.\-\/()]+?)(?:State|PIN|$)/i,
    ];

    for (const pattern of addressPatterns) {
      const match = ocrText.match(pattern);
      if (match && match[1]) {
        const address = match[1].trim();
        if (address.length >= 10 && address.length <= 300) {
          data.registeredAddress = address;
          if (__DEV__) {
            console.log('✅ Address detected:', data.registeredAddress);
          }
          break;
        }
      }
    }

    // ============================================
    // F. REGISTERING AUTHORITY
    // ============================================
    const authorityPattern = /(?:Registering Authority|Registered under|Issued by|Authority)[:\s]+([A-Za-z\s,]+?)(?:\n|Date|$)/i;
    const authorityMatch = ocrText.match(authorityPattern);
    if (authorityMatch && authorityMatch[1]) {
      data.registeringAuthority = authorityMatch[1].trim().toUpperCase();
    } else {
      // Fallback: Search for known authorities
      for (const authority of REGISTERING_AUTHORITIES) {
        if (upperText.includes(authority)) {
          data.registeringAuthority = authority;
          if (__DEV__) {
            console.log('✅ Registering Authority detected:', data.registeringAuthority);
          }
          break;
        }
      }
    }

    // ============================================
    // G. STATE
    // ============================================
    const statePattern = /(?:State|State of)[:\s]+([A-Za-z\s]+?)(?:\n|PIN|$)/i;
    const stateMatch = ocrText.match(statePattern);
    if (stateMatch && stateMatch[1]) {
      const state = stateMatch[1].trim().toUpperCase();
      if (INDIAN_STATES.includes(state)) {
        data.state = state;
      }
    }

    // Fallback: Search for known states in text
    if (!data.state) {
      for (const state of INDIAN_STATES) {
        if (upperText.includes(state)) {
          data.state = state;
          if (__DEV__) {
            console.log('✅ State detected:', data.state);
          }
          break;
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
      console.log('[SocietyRegistrationScan] Expo Go detected - using manual entry mode');
      setExtractedData({
        societyName: '',
        registrationNumber: '',
        dateOfRegistration: '',
        typeOfSociety: '',
        registeredAddress: '',
        registeringAuthority: '',
        state: '',
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
        Alert.alert('Permission Required', 'Please grant media library permissions to upload society registration certificate.');
        return;
      }

      Alert.alert(
        'Select Society Registration Certificate',
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
    const emptyData: ExtractedSocietyData = {
      societyName: '',
      registrationNumber: '',
      dateOfRegistration: '',
      typeOfSociety: '',
      registeredAddress: '',
      registeringAuthority: '',
      state: '',
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
            console.log('🗑️ Society registration image file deleted (security)');
          }
        }
      } catch (deleteError) {
        if (__DEV__) {
          console.warn('⚠️ Could not delete society registration image file:', deleteError);
        }
      }
    };

    try {
      if (__DEV__) {
        console.log('📸 Processing Society Registration for OCR...');
      }

      let ocrResult;
      try {
        ocrResult = await ocrService.recognizeText(uri);

        if (__DEV__) {
          console.log('✅ Society OCR Success! Text extracted (length:', ocrResult.text.length, 'chars)');
        }
      } catch (ocrError: unknown) {
        await deleteImage();

        if (__DEV__) {
          console.error('❌ Society OCR Error:', ocrError instanceof Error ? ocrError.name : 'Unknown');
        }

        // Handle Expo Go detection - silently fall back to manual entry
        if (ocrError instanceof ExpoGoDetectedError || getErrorMessage(ocrError) === 'EXPO_GO_DETECTED') {
          console.log('[SocietyRegistrationScan] Expo Go detected during OCR - using manual entry');
          setExtractedData(emptyData);
          setShowForm(true);
          setIsManualEntry(true);
          setIsProcessing(false);
          return;
        }

        // Handle OCR not available error - silently fall back to manual entry
        if (ocrError instanceof OCRNotAvailableError) {
          console.log('[SocietyRegistrationScan] OCR not available - using manual entry');
          setExtractedData(emptyData);
          setShowForm(true);
          setIsManualEntry(true);
          setIsProcessing(false);
          return;
        }

        // Handle generic OCR errors - silently fall back to manual entry
        console.log('[SocietyRegistrationScan] OCR processing error - using manual entry');
        setExtractedData(emptyData);
        setShowForm(true);
        setIsManualEntry(true);
        setIsProcessing(false);
        return;
      }

      const ocrText = ocrResult.text;
      const extracted = extractSocietyData(ocrText);

      if (__DEV__) {
        console.log('📊 Society Extraction Results:', {
          societyName: extracted.societyName ? 'Found' : 'Not detected',
          registrationNumber: extracted.registrationNumber ? 'Found' : 'Not detected',
          dateOfRegistration: extracted.dateOfRegistration ? 'Found' : 'Not detected',
          typeOfSociety: extracted.typeOfSociety ? 'Found' : 'Not detected',
          registeredAddress: extracted.registeredAddress ? 'Found' : 'Not detected',
          registeringAuthority: extracted.registeringAuthority ? 'Found' : 'Not detected',
          state: extracted.state ? 'Found' : 'Not detected',
        });
      }

      setExtractedData(extracted);
      setShowForm(true);

      // Consider manual entry if key fields not found
      const hasKeyData = extracted.societyName || extracted.registrationNumber;
      setIsManualEntry(!hasKeyData);

      await deleteImage();

      if (__DEV__) {
        console.log('✅ Society Form displayed with extracted data');
      }

      setTimeout(() => {
        const extractedFields = [];
        if (extracted.societyName) extractedFields.push('Society Name');
        if (extracted.registrationNumber) extractedFields.push('Registration No.');
        if (extracted.dateOfRegistration) extractedFields.push('Date');
        if (extracted.typeOfSociety) extractedFields.push('Type');
        if (extracted.registeredAddress) extractedFields.push('Address');
        if (extracted.registeringAuthority) extractedFields.push('Authority');
        if (extracted.state) extractedFields.push('State');

        const summary = extractedFields.length > 0
          ? `Extracted: ${extractedFields.join(', ')}`
          : 'No data extracted. Please enter details manually.';

        Alert.alert(
          'OCR Complete ✅',
          `${summary}\n\nPlease verify and edit if needed.`,
          [{ text: 'OK' }]
        );
      }, 500);

    } catch (error: unknown) {
      await deleteImage();

      if (__DEV__) {
        console.error('❌ Unexpected error in Society processImage:', error);
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
      Alert.alert('Confirmation Required', 'Please confirm that the society details are correct.');
      return;
    }

    if (!extractedData.societyName || extractedData.societyName.length < 3) {
      Alert.alert('Required Field', 'Please enter the Society Name.');
      return;
    }

    if (!extractedData.registrationNumber || extractedData.registrationNumber.length < 3) {
      Alert.alert('Required Field', 'Please enter the Registration Number.');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not found. Please sign in again.');
      return;
    }

    try {
      setIsProcessing(true);

      // Submit to KYC store (handles both DB submission and local state update)
      await submitDocument(user.id, 'society_registration', {
        documentNumber: extractedData.registrationNumber,
        name: extractedData.societyName,
        address: extractedData.registeredAddress || undefined,
      });

      Alert.alert(
        'Success',
        'Your society registration details have been submitted for verification. You will be notified once verification is complete.',
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
        `Failed to submit society data: ${getErrorMessage(error) || 'Unknown error'}. Please try again.`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <LinearGradient
      colors={['#e0f2fe', '#f0f9ff', '#ffffff']}
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
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Society Registration</Text>
            <Text style={styles.headerSubtitle}>Upload and extract details</Text>
          </View>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Upload Card Section */}
            <View style={styles.uploadCard}>
              <View style={styles.uploadIconContainer}>
                <LinearGradient
                  colors={['#0ea5e9', '#0284c7']}
                  style={styles.uploadIconGradient}
                >
                  <MaterialCommunityIcons name="office-building" size={48} color="#ffffff" />
                </LinearGradient>
              </View>
              <Text style={styles.uploadTitle}>Upload Society Registration</Text>
              <Text style={styles.uploadSubtitle}>
                Take a clear photo or select from gallery. Ensure all text is visible.
              </Text>

              {imageUri && isProcessing && (
                <View style={styles.processingContainer}>
                  <ActivityIndicator size="large" color="#0ea5e9" />
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
                  colors={['#0ea5e9', '#0284c7']}
                  style={styles.uploadButtonGradient}
                >
                  <Ionicons name="camera" size={22} color="#ffffff" />
                  <Text style={styles.uploadButtonText}>
                    {imageUri ? 'Upload Another Image' : 'Upload Society Registration'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {!showForm && (
                <TouchableOpacity
                  style={styles.manualEntryButton}
                  onPress={() => {
                    setExtractedData({
                      societyName: '',
                      registrationNumber: '',
                      dateOfRegistration: '',
                      typeOfSociety: '',
                      registeredAddress: '',
                      registeringAuthority: '',
                      state: '',
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
                    <Ionicons name="document-text" size={20} color="#0ea5e9" />
                  </View>
                  <Text style={styles.formSectionTitle}>Society Details</Text>
                </View>
                <Text style={styles.formHelperText}>Please verify your society registration details</Text>

                {/* Society Name Input Card */}
                <View style={styles.inputCard}>
                  <View style={styles.inputLabelRow}>
                    <Ionicons name="business-outline" size={18} color="#0ea5e9" />
                    <Text style={styles.inputLabel}>Society Name *</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    value={extractedData.societyName}
                    onChangeText={(text) => setExtractedData({ ...extractedData, societyName: text.toUpperCase() })}
                    placeholder="Enter society name"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="characters"
                    maxLength={200}
                  />
                </View>

                {/* Registration Number Input Card */}
                <View style={styles.inputCard}>
                  <View style={styles.inputLabelRow}>
                    <Ionicons name="barcode-outline" size={18} color="#0ea5e9" />
                    <Text style={styles.inputLabel}>Registration Number *</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    value={extractedData.registrationNumber}
                    onChangeText={(text) => setExtractedData({ ...extractedData, registrationNumber: formatRegistrationNumber(text) })}
                    placeholder="Enter registration number"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="characters"
                    maxLength={30}
                  />
                </View>

                {/* Date of Registration Input Card */}
                <View style={styles.inputCard}>
                  <View style={styles.inputLabelRow}>
                    <Ionicons name="calendar-outline" size={18} color="#0ea5e9" />
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
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>

                {/* Type of Society Input Card */}
                <View style={styles.inputCard}>
                  <View style={styles.inputLabelRow}>
                    <Ionicons name="home-outline" size={18} color="#0ea5e9" />
                    <Text style={styles.inputLabel}>Type of Society</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    value={extractedData.typeOfSociety}
                    onChangeText={(text) => setExtractedData({ ...extractedData, typeOfSociety: text.toUpperCase() })}
                    placeholder="e.g., Co-operative Housing Society"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="characters"
                    maxLength={100}
                  />
                </View>

                {/* Registered Address Input Card */}
                <View style={styles.inputCard}>
                  <View style={styles.inputLabelRow}>
                    <Ionicons name="location-outline" size={18} color="#0ea5e9" />
                    <Text style={styles.inputLabel}>Registered Address</Text>
                  </View>
                  <TextInput
                    style={[styles.input, styles.inputMultiline]}
                    value={extractedData.registeredAddress}
                    onChangeText={(text) => setExtractedData({ ...extractedData, registeredAddress: text })}
                    placeholder="Enter complete registered address"
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={3}
                    maxLength={300}
                    textAlignVertical="top"
                  />
                </View>

                {/* Registering Authority Input Card */}
                <View style={styles.inputCard}>
                  <View style={styles.inputLabelRow}>
                    <Ionicons name="shield-outline" size={18} color="#0ea5e9" />
                    <Text style={styles.inputLabel}>Registering Authority</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    value={extractedData.registeringAuthority}
                    onChangeText={(text) => setExtractedData({ ...extractedData, registeringAuthority: text.toUpperCase() })}
                    placeholder="e.g., Registrar of Co-operative Societies"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="characters"
                    maxLength={100}
                  />
                </View>

                {/* State Input Card */}
                <View style={styles.inputCard}>
                  <View style={styles.inputLabelRow}>
                    <Ionicons name="map-outline" size={18} color="#0ea5e9" />
                    <Text style={styles.inputLabel}>State</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    value={extractedData.state}
                    onChangeText={(text) => setExtractedData({ ...extractedData, state: text.toUpperCase() })}
                    placeholder="Enter state"
                    placeholderTextColor="#94a3b8"
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
                      I confirm the above society registration details are correct
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
                    colors={isConfirmed ? ['#0ea5e9', '#0284c7'] : ['#94a3b8', '#64748b']}
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
                      societyName: '',
                      registrationNumber: '',
                      dateOfRegistration: '',
                      typeOfSociety: '',
                      registeredAddress: '',
                      registeringAuthority: '',
                      state: '',
                    });
                    setIsConfirmed(false);
                    setIsManualEntry(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh" size={18} color="#0ea5e9" style={{ marginRight: 6 }} />
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

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
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
    color: '#1e293b',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
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
    backgroundColor: '#ffffff',
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
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  uploadTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  uploadSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  processingContainer: {
    alignItems: 'center',
    marginVertical: 20,
    padding: 20,
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    width: '100%',
  },
  processingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#0284c7',
    fontWeight: '500',
  },
  imagePreviewContainer: {
    width: '100%',
    maxHeight: 280,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#f0f9ff',
    borderWidth: 2,
    borderColor: '#e0f2fe',
  },
  imagePreview: {
    width: '100%',
    height: 280,
  },
  uploadButton: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    shadowColor: '#0ea5e9',
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
    color: '#0ea5e9',
    fontSize: 14,
    fontWeight: '600',
  },
  // Form Card
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#0ea5e9',
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
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  formSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  formHelperText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
  },
  // Input Card
  inputCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    color: '#334155',
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1e293b',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  inputMultiline: {
    minHeight: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 6,
    marginLeft: 2,
  },
  // Confirmation Card
  confirmationCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bae6fd',
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
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxBoxChecked: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#334155',
    flex: 1,
    lineHeight: 20,
  },
  // Buttons
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#0ea5e9',
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
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  retakeButtonText: {
    color: '#0ea5e9',
    fontSize: 15,
    fontWeight: '600',
  },
});

