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
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#ef4444', '#dc2626']}
        style={styles.gradientHeader}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Society Registration</Text>
            <Text style={styles.headerSubtitle}>Upload and extract details</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Upload Section */}
          <View style={styles.uploadSection}>
            <View style={styles.uploadIconContainer}>
              <MaterialCommunityIcons name="office-building" size={64} color="#ef4444" />
            </View>
            <Text style={styles.uploadTitle}>Upload Society Registration</Text>
            <Text style={styles.uploadSubtitle}>
              Take a clear photo or select from gallery. Ensure all text is visible.
            </Text>

            {imageUri && isProcessing && (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color="#ef4444" />
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
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#ef4444', '#dc2626']}
                style={styles.uploadButtonGradient}
              >
                <Ionicons name="camera" size={24} color="#ffffff" />
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
            <View style={styles.formSection}>
              <Text style={styles.formHelperText}>Please verify your society registration details</Text>

              {/* Society Name */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Society Name *</Text>
                <TextInput
                  style={styles.input}
                  value={extractedData.societyName}
                  onChangeText={(text) => setExtractedData({ ...extractedData, societyName: text.toUpperCase() })}
                  placeholder="Enter society name"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="characters"
                  maxLength={200}
                />
              </View>

              {/* Registration Number */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Registration Number *</Text>
                <TextInput
                  style={styles.input}
                  value={extractedData.registrationNumber}
                  onChangeText={(text) => setExtractedData({ ...extractedData, registrationNumber: formatRegistrationNumber(text) })}
                  placeholder="Enter registration number"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="characters"
                  maxLength={30}
                />
              </View>

              {/* Date of Registration */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Date of Registration</Text>
                <TextInput
                  style={styles.input}
                  value={extractedData.dateOfRegistration}
                  onChangeText={(text) => {
                    const formatted = formatDate(text);
                    setExtractedData({ ...extractedData, dateOfRegistration: formatted });
                  }}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>

              {/* Type of Society */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Type of Society</Text>
                <TextInput
                  style={styles.input}
                  value={extractedData.typeOfSociety}
                  onChangeText={(text) => setExtractedData({ ...extractedData, typeOfSociety: text.toUpperCase() })}
                  placeholder="e.g., Co-operative Housing Society"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="characters"
                  maxLength={100}
                />
              </View>

              {/* Registered Address */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Registered Address</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  value={extractedData.registeredAddress}
                  onChangeText={(text) => setExtractedData({ ...extractedData, registeredAddress: text })}
                  placeholder="Enter complete registered address"
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                  maxLength={300}
                  textAlignVertical="top"
                />
              </View>

              {/* Registering Authority */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Registering Authority</Text>
                <TextInput
                  style={styles.input}
                  value={extractedData.registeringAuthority}
                  onChangeText={(text) => setExtractedData({ ...extractedData, registeringAuthority: text.toUpperCase() })}
                  placeholder="e.g., Registrar of Co-operative Societies"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="characters"
                  maxLength={100}
                />
              </View>

              {/* State */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>State</Text>
                <TextInput
                  style={styles.input}
                  value={extractedData.state}
                  onChangeText={(text) => setExtractedData({ ...extractedData, state: text.toUpperCase() })}
                  placeholder="Enter state"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="characters"
                  maxLength={50}
                />
              </View>

              {/* Confirmation Checkbox */}
              <View style={styles.checkboxContainer}>
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
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={isConfirmed ? ['#ef4444', '#dc2626'] : ['#9ca3af', '#6b7280']}
                  style={styles.submitButtonGradient}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit for Verification</Text>
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
                <Text style={styles.retakeButtonText}>Scan Another Image</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fef2f2',
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
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fecaca',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  uploadSection: {
    alignItems: 'center',
  },
  uploadIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  uploadTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  processingContainer: {
    alignItems: 'center',
    marginVertical: 24,
    padding: 24,
  },
  processingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  imagePreviewContainer: {
    width: '100%',
    maxHeight: 300,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: '#f3f4f6',
  },
  imagePreview: {
    width: '100%',
    height: 300,
  },
  uploadButton: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  uploadButtonGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  formSection: {
    marginTop: 32,
  },
  formHelperText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inputMultiline: {
    minHeight: 80,
    paddingTop: 12,
  },
  inputHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  checkboxContainer: {
    marginBottom: 24,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxBoxChecked: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    shadowOpacity: 0.1,
    elevation: 2,
  },
  submitButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  retakeButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  retakeButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  manualEntryButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  manualEntryButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
});
