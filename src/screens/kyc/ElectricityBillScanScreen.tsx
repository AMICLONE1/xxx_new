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
  Dimensions,
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

const { width } = Dimensions.get('window');

type ElectricityBillScanScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ElectricityBillScan'>;

interface Props {
  navigation: ElectricityBillScanScreenNavigationProp;
}

interface ExtractedBillData {
  consumerName: string;
  consumerNumber: string;
  meterNumber: string;
  discomName: string;
  billingPeriod: string;
  billDate: string;
  dueDate: string;
  unitsConsumed: string;
  billAmount: string;
  serviceAddress: string;
}

export default function ElectricityBillScanScreen({ navigation }: Props) {
  const { submitDocument, isSubmitting, canUseOCR, getDocumentStatus } = useKYCStore();
  const { user } = useAuthStore();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedBillData>({
    consumerName: '',
    consumerNumber: '',
    meterNumber: '',
    discomName: '',
    billingPeriod: '',
    billDate: '',
    dueDate: '',
    unitsConsumed: '',
    billAmount: '',
    serviceAddress: '',
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
    const ocrAllowed = canUseOCR('electricity_bill');
    const docStatus = getDocumentStatus('electricity_bill');

    if (!ocrAllowed) {
      console.log('[ElectricityBillScan] OCR not allowed, status:', docStatus);
      if (docStatus === 'verified') {
        Alert.alert(
          'Document Verified',
          'Your electricity bill has already been verified. No re-upload needed.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else if (docStatus === 'pending') {
        Alert.alert(
          'Document Pending',
          'Your electricity bill is currently being reviewed. Please wait for verification.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    }
  }, [canUseOCR, getDocumentStatus, navigation]);

  /**
   * Format date with slashes: DD/MM/YYYY
   */
  const formatDate = (text: string): string => {
    // Remove all non-digits
    const digitsOnly = text.replace(/\D/g, '');

    // Limit to 8 digits (DDMMYYYY)
    const limited = digitsOnly.slice(0, 8);

    // Add slashes automatically
    if (limited.length <= 2) {
      return limited;
    } else if (limited.length <= 4) {
      return `${limited.slice(0, 2)}/${limited.slice(2)}`;
    } else {
      return `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
    }
  };

  /**
   * Format numeric input (for units and amount)
   */
  const formatNumeric = (text: string): string => {
    // Remove all non-numeric characters except decimal point
    return text.replace(/[^0-9.]/g, '');
  };

  /**
   * STRICT Electricity Bill data extraction - ONLY fill if explicitly detected
   * DO NOT guess, infer, or fabricate any data
   */
  const extractBillData = (ocrText: string): ExtractedBillData => {
    // Initialize with empty data - fields remain empty unless explicitly detected
    const data: ExtractedBillData = {
      consumerName: '',
      consumerNumber: '',
      meterNumber: '',
      discomName: '',
      billingPeriod: '',
      billDate: '',
      dueDate: '',
      unitsConsumed: '',
      billAmount: '',
      serviceAddress: '',
    };

    const lines = ocrText.split('\n');
    const upperText = ocrText.toUpperCase();

    // ============================================
    // A. DISCOM / ELECTRICITY PROVIDER DETECTION
    // ============================================
    const discomPatterns = [
      { pattern: /MSEDCL|MAHARASHTRA STATE ELECTRICITY/i, name: 'MSEDCL' },
      { pattern: /TATA POWER/i, name: 'Tata Power' },
      { pattern: /ADANI ELECTRICITY/i, name: 'Adani Electricity' },
      { pattern: /BSES RAJDHANI/i, name: 'BSES Rajdhani' },
      { pattern: /BSES YAMUNA/i, name: 'BSES Yamuna' },
      { pattern: /NDPL|NORTH DELHI POWER/i, name: 'NDPL' },
      { pattern: /BESCOM|BANGALORE ELECTRICITY/i, name: 'BESCOM' },
      { pattern: /CESC/i, name: 'CESC' },
      { pattern: /PSPCL|PUNJAB STATE POWER/i, name: 'PSPCL' },
      { pattern: /UPPCL|UTTAR PRADESH POWER/i, name: 'UPPCL' },
      { pattern: /DHBVN|DAKSHIN HARYANA/i, name: 'DHBVN' },
      { pattern: /UHBVN|UTTAR HARYANA/i, name: 'UHBVN' },
      { pattern: /KSEB|KERALA STATE ELECTRICITY/i, name: 'KSEB' },
      { pattern: /TANGEDCO|TAMIL NADU GENERATION/i, name: 'TANGEDCO' },
      { pattern: /APSPDCL|ANDHRA PRADESH/i, name: 'APSPDCL' },
      { pattern: /TSSPDCL|TELANGANA/i, name: 'TSSPDCL' },
      { pattern: /WBSEDCL|WEST BENGAL/i, name: 'WBSEDCL' },
      { pattern: /GETCO|GUJARAT ENERGY/i, name: 'GETCO' },
      { pattern: /MGVCL|MADHYA GUJARAT/i, name: 'MGVCL' },
      { pattern: /PGVCL|PASCHIM GUJARAT/i, name: 'PGVCL' },
      { pattern: /DGVCL|DAKSHIN GUJARAT/i, name: 'DGVCL' },
      { pattern: /UGVCL|UTTAR GUJARAT/i, name: 'UGVCL' },
      { pattern: /JVVNL|JAIPUR VIDYUT/i, name: 'JVVNL' },
      { pattern: /AVVNL|AJMER VIDYUT/i, name: 'AVVNL' },
      { pattern: /JDVVNL|JODHPUR VIDYUT/i, name: 'JDVVNL' },
    ];

    for (const discom of discomPatterns) {
      if (discom.pattern.test(ocrText)) {
        data.discomName = discom.name;
        break;
      }
    }

    // ============================================
    // B. CONSUMER NUMBER / ACCOUNT NUMBER DETECTION
    // ============================================
    // Look for patterns like "Consumer No", "Account No", "CA No", "K No"
    const consumerPatterns = [
      /(?:CONSUMER\s*(?:NO|NUMBER|ID)|CA\s*(?:NO|NUMBER)|ACCOUNT\s*(?:NO|NUMBER)|K\s*(?:NO|NUMBER))[:\s]*([A-Z0-9]{6,20})/i,
      /(?:CONSUMER|CA|ACCOUNT|K)[\s:]*([0-9]{8,15})/i,
    ];

    for (const pattern of consumerPatterns) {
      const match = ocrText.match(pattern);
      if (match && match[1]) {
        data.consumerNumber = match[1].trim();
        break;
      }
    }

    // ============================================
    // C. METER NUMBER DETECTION
    // ============================================
    const meterPatterns = [
      /(?:METER\s*(?:NO|NUMBER|SR\.?\s*NO)|METER\s*ID)[:\s]*([A-Z0-9]{6,20})/i,
      /(?:M\.?\s*NO|METER)[:\s]*([0-9]{8,15})/i,
    ];

    for (const pattern of meterPatterns) {
      const match = ocrText.match(pattern);
      if (match && match[1]) {
        data.meterNumber = match[1].trim();
        break;
      }
    }

    // ============================================
    // D. CONSUMER NAME DETECTION
    // ============================================
    const namePatterns = [
      /(?:CONSUMER\s*NAME|NAME\s*OF\s*CONSUMER|NAME)[:\s]*([A-Z][A-Z\s\.]{2,50})/i,
      /(?:ACCOUNT\s*HOLDER|CUSTOMER\s*NAME)[:\s]*([A-Z][A-Z\s\.]{2,50})/i,
    ];

    for (const pattern of namePatterns) {
      const match = ocrText.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        // Filter out common non-name text
        if (!/(ADDRESS|METER|BILL|DATE|AMOUNT|UNIT)/i.test(name)) {
          data.consumerName = name;
          break;
        }
      }
    }

    // ============================================
    // E. BILLING PERIOD DETECTION
    // ============================================
    const billingPatterns = [
      /(?:BILLING\s*PERIOD|BILL\s*PERIOD|PERIOD)[:\s]*([A-Z]{3,9}\s*\d{2,4}\s*[-–TO]*\s*[A-Z]{3,9}\s*\d{2,4})/i,
      /(?:FROM|PERIOD)[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})\s*(?:TO|[-–])\s*(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})/i,
    ];

    for (const pattern of billingPatterns) {
      const match = ocrText.match(pattern);
      if (match) {
        if (match[2]) {
          data.billingPeriod = `${match[1]} - ${match[2]}`;
        } else if (match[1]) {
          data.billingPeriod = match[1].trim();
        }
        break;
      }
    }

    // ============================================
    // F. BILL DATE DETECTION
    // ============================================
    const billDatePatterns = [
      /(?:BILL\s*DATE|BILLING\s*DATE|DATE\s*OF\s*BILL)[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})/i,
      /(?:ISSUE\s*DATE|DATED)[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})/i,
    ];

    for (const pattern of billDatePatterns) {
      const match = ocrText.match(pattern);
      if (match && match[1]) {
        data.billDate = match[1].replace(/-/g, '/');
        break;
      }
    }

    // ============================================
    // G. DUE DATE DETECTION
    // ============================================
    const dueDatePatterns = [
      /(?:DUE\s*DATE|PAYMENT\s*DUE|LAST\s*DATE)[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})/i,
      /(?:PAY\s*BY|PAY\s*BEFORE)[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})/i,
    ];

    for (const pattern of dueDatePatterns) {
      const match = ocrText.match(pattern);
      if (match && match[1]) {
        data.dueDate = match[1].replace(/-/g, '/');
        break;
      }
    }

    // ============================================
    // H. UNITS CONSUMED DETECTION
    // ============================================
    const unitsPatterns = [
      /(?:UNITS?\s*CONSUMED|CONSUMPTION|TOTAL\s*UNITS?|KWH\s*CONSUMED)[:\s]*(\d+(?:\.\d+)?)\s*(?:KWH|UNITS?)?/i,
      /(\d+(?:\.\d+)?)\s*(?:KWH|UNITS)\s*(?:CONSUMED|CONSUMPTION)/i,
    ];

    for (const pattern of unitsPatterns) {
      const match = ocrText.match(pattern);
      if (match && match[1]) {
        data.unitsConsumed = match[1];
        break;
      }
    }

    // ============================================
    // I. BILL AMOUNT DETECTION
    // ============================================
    const amountPatterns = [
      /(?:TOTAL\s*AMOUNT|AMOUNT\s*PAYABLE|NET\s*AMOUNT|CURRENT\s*BILL\s*AMOUNT|AMOUNT\s*DUE)[:\s]*(?:RS\.?|₹|INR)?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /(?:RS\.?|₹|INR)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:TOTAL|PAYABLE|DUE)/i,
      /(?:BILL\s*AMOUNT)[:\s]*(?:RS\.?|₹|INR)?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
    ];

    for (const pattern of amountPatterns) {
      const match = ocrText.match(pattern);
      if (match && match[1]) {
        data.billAmount = match[1].replace(/,/g, '');
        break;
      }
    }

    // ============================================
    // J. SERVICE ADDRESS DETECTION
    // ============================================
    const addressPatterns = [
      /(?:SERVICE\s*ADDRESS|SUPPLY\s*ADDRESS|PREMISES\s*ADDRESS|ADDRESS)[:\s]*([A-Z0-9][A-Z0-9\s,\.\-\/]{10,150})/i,
    ];

    for (const pattern of addressPatterns) {
      const match = ocrText.match(pattern);
      if (match && match[1]) {
        const address = match[1].trim();
        // Filter out non-address text
        if (!/(CONSUMER\s*NO|METER\s*NO|BILL\s*DATE)/i.test(address)) {
          data.serviceAddress = address;
          break;
        }
      }
    }

    // Log extraction results in dev mode
    if (__DEV__) {
      console.log('📊 Bill Extraction Results:', {
        discom: data.discomName ? 'Found' : 'Not detected',
        consumer: data.consumerNumber ? 'Found' : 'Not detected',
        meter: data.meterNumber ? 'Found' : 'Not detected',
        name: data.consumerName ? 'Found' : 'Not detected',
        period: data.billingPeriod ? 'Found' : 'Not detected',
        billDate: data.billDate ? 'Found' : 'Not detected',
        dueDate: data.dueDate ? 'Found' : 'Not detected',
        units: data.unitsConsumed ? 'Found' : 'Not detected',
        amount: data.billAmount ? 'Found' : 'Not detected',
        address: data.serviceAddress ? 'Found' : 'Not detected',
      });
    }

    return data;
  };

  /**
   * Handle image upload button press
   */
  const handleUploadImage = async () => {
    // Check if running in Expo Go - silently fall back to manual entry
    if (isExpoGo) {
      console.log('[ElectricityBillScan] Expo Go detected - using manual entry mode');
      setExtractedData({
        consumerName: '',
        consumerNumber: '',
        meterNumber: '',
        discomName: '',
        billingPeriod: '',
        billDate: '',
        dueDate: '',
        unitsConsumed: '',
        billAmount: '',
        serviceAddress: '',
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
      // Request media library permissions first
      const mediaLibraryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (mediaLibraryStatus.status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant media library permissions to upload electricity bill image.');
        return;
      }

      // Show image picker options
      Alert.alert(
        'Select Electricity Bill Image',
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
    // ============================================
    // STEP 1: HARD RESET (MANDATORY)
    // ============================================
    const emptyData: ExtractedBillData = {
      consumerName: '',
      consumerNumber: '',
      meterNumber: '',
      discomName: '',
      billingPeriod: '',
      billDate: '',
      dueDate: '',
      unitsConsumed: '',
      billAmount: '',
      serviceAddress: '',
    };

    // Reset ALL state variables
    setExtractedData(emptyData);
    setShowForm(false);
    setIsConfirmed(false);
    setIsManualEntry(false);
    setImageUri(null);

    // Now start processing with fresh state
    setIsProcessing(true);
    setImageUri(uri);

    // CRITICAL: Delete image after processing (security requirement)
    const deleteImage = async () => {
      try {
        const fileUri = uri.startsWith('file://') ? uri : `file://${uri}`;
        const filePath = fileUri.replace('file://', '');
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(filePath, { idempotent: true });
          if (__DEV__) {
            console.log('🗑️ Bill image file deleted (security)');
          }
        }
      } catch (deleteError) {
        if (__DEV__) {
          console.warn('⚠️ Could not delete bill image file:', deleteError);
        }
      }
    };

    try {
      if (__DEV__) {
        console.log('📸 Processing electricity bill image for OCR...');
      }

      // Try to perform OCR
      let ocrResult;
      try {
        ocrResult = await ocrService.recognizeText(uri);

        if (__DEV__) {
          console.log('✅ Bill OCR completed! Text extracted (length:', ocrResult.text.length, 'chars)');
        }
      } catch (ocrError: unknown) {
        // CRITICAL: Delete image before showing error
        await deleteImage();

        if (__DEV__) {
          console.error('❌ Bill OCR Error:', ocrError instanceof Error ? ocrError.name : 'Unknown');
        }

        // Any OCR error - silently fall back to manual entry
        console.log('[ElectricityBillScan] OCR unavailable - using manual entry');
        setExtractedData(emptyData);
        setShowForm(true);
        setIsManualEntry(true);
        setIsProcessing(false);
        return;
      }

      // ============================================
      // STEP 2: DATA EXTRACTION (STRICT)
      // ============================================
      const ocrText = ocrResult.text;

      if (__DEV__) {
        if (ocrText.length > 0) {
          console.log('✅ OCR text extracted (length:', ocrText.length, 'chars)');
        } else {
          console.log('ℹ️ No OCR text detected - using manual entry mode');
        }
      }

      const extracted = extractBillData(ocrText);

      if (__DEV__) {
        console.log('📊 Bill Extraction Complete');
      }

      // ============================================
      // STEP 3: FORM BINDING
      // ============================================
      setExtractedData(extracted);
      setShowForm(true);

      // Determine if manual entry based on whether key fields were found
      const hasKeyFields = extracted.consumerNumber || extracted.meterNumber;
      setIsManualEntry(!hasKeyFields);

      // ============================================
      // STEP 4: IMAGE DELETION (SECURITY)
      // ============================================
      await deleteImage();

      if (__DEV__) {
        console.log('✅ Bill Form displayed with extracted data');
      }

      // Show success message
      setTimeout(() => {
        const extractedFields = [];
        if (extracted.consumerName) extractedFields.push('Consumer Name');
        if (extracted.consumerNumber) extractedFields.push('Consumer Number');
        if (extracted.meterNumber) extractedFields.push('Meter Number');
        if (extracted.discomName) extractedFields.push('DISCOM');
        if (extracted.billingPeriod) extractedFields.push('Billing Period');
        if (extracted.billDate) extractedFields.push('Bill Date');
        if (extracted.dueDate) extractedFields.push('Due Date');
        if (extracted.unitsConsumed) extractedFields.push('Units');
        if (extracted.billAmount) extractedFields.push('Amount');
        if (extracted.serviceAddress) extractedFields.push('Address');

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
      // CRITICAL: Always delete image on error
      await deleteImage();

      if (__DEV__) {
        console.error('❌ Unexpected error in Bill processImage:', error);
      }

      Alert.alert(
        'Processing Error',
        'An unexpected error occurred. Please try again or enter details manually.',
        [{ text: 'Enter Manually', style: 'default' }]
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
      Alert.alert('Confirmation Required', 'Please confirm that the electricity bill details are correct.');
      return;
    }

    // Validate at least consumer number or meter number is present
    if (!extractedData.consumerNumber && !extractedData.meterNumber) {
      Alert.alert('Required Fields', 'Please enter at least Consumer Number or Meter Number.');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not found. Please sign in again.');
      return;
    }

    try {
      setIsProcessing(true);

      // Submit to KYC store (handles both DB submission and local state update)
      await submitDocument(user.id, 'electricity_bill', {
        documentNumber: extractedData.consumerNumber || extractedData.meterNumber,
        name: extractedData.consumerName || undefined,
        address: extractedData.serviceAddress || undefined,
      });

      Alert.alert(
        'Success',
        'Your electricity bill details have been submitted for verification. You will be notified once verification is complete.',
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
        `Failed to submit bill data: ${getErrorMessage(error) || 'Unknown error'}. Please try again.`
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
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Scan Electricity Bill</Text>
            <Text style={styles.headerSubtitle}>Upload and extract details</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>KYC</Text>
            </View>
          </View>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Expo Go Warning Banner */}
          {isExpoGo && (
            <View style={styles.expoGoWarning}>
              <Ionicons name="information-circle" size={20} color="#0369a1" />
              <Text style={styles.expoGoWarningText}>
                Auto text extraction unavailable. You can upload an image or enter details manually.
              </Text>
            </View>
          )}

          {/* Upload Card */}
          <View style={styles.uploadCard}>
            <View style={styles.uploadIconContainer}>
              <LinearGradient
                colors={['#0ea5e9', '#0284c7']}
                style={styles.uploadIconGradient}
              >
                <MaterialCommunityIcons name="file-document-outline" size={36} color="#ffffff" />
              </LinearGradient>
            </View>
            <Text style={styles.uploadTitle}>Upload Electricity Bill</Text>
            <Text style={styles.uploadSubtitle}>
              Take a clear photo or select from gallery.{'\n'}Ensure all text is visible.
            </Text>

            {imageUri && isProcessing && (
              <View style={styles.processingContainer}>
                <View style={styles.processingCard}>
                  <ActivityIndicator size="large" color="#0ea5e9" />
                  <Text style={styles.processingText}>Processing image with OCR...</Text>
                </View>
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
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#0ea5e9', '#0284c7']}
                style={styles.uploadButtonGradient}
              >
                <Ionicons name="camera" size={22} color="#ffffff" />
                <Text style={styles.uploadButtonText}>
                  {imageUri ? 'Upload Another Image' : 'Upload Electricity Bill'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Manual Entry Option */}
            {!showForm && (
              <TouchableOpacity
                style={styles.manualEntryButton}
                onPress={() => {
                  setExtractedData({
                    consumerName: '',
                    consumerNumber: '',
                    meterNumber: '',
                    discomName: '',
                    billingPeriod: '',
                    billDate: '',
                    dueDate: '',
                    unitsConsumed: '',
                    billAmount: '',
                    serviceAddress: '',
                  });
                  setShowForm(true);
                  setIsManualEntry(true);
                  setImageUri(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.manualEntryButtonText}>or Enter Details Manually</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Form Section - Appears below upload button after OCR */}
          {showForm && (
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <View style={styles.formIconContainer}>
                  <Ionicons name="document-text-outline" size={20} color="#0ea5e9" />
                </View>
                <Text style={styles.formTitle}>Bill Details</Text>
              </View>
              <Text style={styles.formHelperText}>Please verify and confirm your electricity bill details</Text>

              {/* Consumer Name */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Consumer Name</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={extractedData.consumerName}
                    onChangeText={(text) => setExtractedData({ ...extractedData, consumerName: text.toUpperCase() })}
                    placeholder="Enter consumer name"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="characters"
                    maxLength={100}
                  />
                </View>
              </View>

              {/* Consumer Number */}
              <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>Consumer / Account Number</Text>
                  <Text style={styles.requiredBadge}>Required</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="identifier" size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={extractedData.consumerNumber}
                    onChangeText={(text) => setExtractedData({ ...extractedData, consumerNumber: text.toUpperCase() })}
                    placeholder="Enter consumer number"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="characters"
                    maxLength={20}
                  />
                </View>
              </View>

              {/* Meter Number */}
              <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>Meter Number</Text>
                  <Text style={styles.requiredBadge}>Required</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="meter-electric-outline" size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={extractedData.meterNumber}
                    onChangeText={(text) => setExtractedData({ ...extractedData, meterNumber: text.toUpperCase() })}
                    placeholder="Enter meter number"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="characters"
                    maxLength={20}
                  />
                </View>
                <Text style={styles.inputHint}>At least one of Consumer Number or Meter Number is required</Text>
              </View>

              {/* DISCOM / Electricity Provider */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Electricity Provider (DISCOM)</Text>
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="office-building-outline" size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={extractedData.discomName}
                    onChangeText={(text) => setExtractedData({ ...extractedData, discomName: text })}
                    placeholder="e.g., MSEDCL, Tata Power, Adani"
                    placeholderTextColor="#94a3b8"
                    maxLength={50}
                  />
                </View>
              </View>

              {/* Two Column Row: Bill Date & Due Date */}
              <View style={styles.twoColumnRow}>
                <View style={styles.halfInputContainer}>
                  <Text style={styles.inputLabel}>Bill Date</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="calendar-outline" size={18} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={extractedData.billDate}
                      onChangeText={(text) => {
                        const formatted = formatDate(text);
                        setExtractedData({ ...extractedData, billDate: formatted });
                      }}
                      placeholder="DD/MM/YYYY"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      maxLength={10}
                    />
                  </View>
                </View>
                <View style={styles.halfInputContainer}>
                  <Text style={styles.inputLabel}>Due Date</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="calendar-outline" size={18} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={extractedData.dueDate}
                      onChangeText={(text) => {
                        const formatted = formatDate(text);
                        setExtractedData({ ...extractedData, dueDate: formatted });
                      }}
                      placeholder="DD/MM/YYYY"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      maxLength={10}
                    />
                  </View>
                </View>
              </View>

              {/* Billing Period */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Billing Period</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="time-outline" size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={extractedData.billingPeriod}
                    onChangeText={(text) => setExtractedData({ ...extractedData, billingPeriod: text })}
                    placeholder="e.g., Jan 2024 - Feb 2024"
                    placeholderTextColor="#94a3b8"
                    maxLength={50}
                  />
                </View>
              </View>

              {/* Two Column Row: Units & Amount */}
              <View style={styles.twoColumnRow}>
                <View style={styles.halfInputContainer}>
                  <Text style={styles.inputLabel}>Units (kWh)</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialCommunityIcons name="lightning-bolt-outline" size={18} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={extractedData.unitsConsumed}
                      onChangeText={(text) => {
                        const formatted = formatNumeric(text);
                        setExtractedData({ ...extractedData, unitsConsumed: formatted });
                      }}
                      placeholder="Units"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      maxLength={10}
                    />
                  </View>
                </View>
                <View style={styles.halfInputContainer}>
                  <Text style={styles.inputLabel}>Bill Amount (₹)</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialCommunityIcons name="currency-inr" size={18} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={extractedData.billAmount}
                      onChangeText={(text) => {
                        const formatted = formatNumeric(text);
                        setExtractedData({ ...extractedData, billAmount: formatted });
                      }}
                      placeholder="Amount"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      maxLength={15}
                    />
                  </View>
                </View>
              </View>

              {/* Service Address */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Service Address</Text>
                <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                  <Ionicons name="location-outline" size={18} color="#64748b" style={[styles.inputIcon, { alignSelf: 'flex-start', marginTop: 16 }]} />
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={extractedData.serviceAddress}
                    onChangeText={(text) => setExtractedData({ ...extractedData, serviceAddress: text })}
                    placeholder="Enter service address"
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={3}
                    maxLength={200}
                    textAlignVertical="top"
                  />
                </View>
              </View>

              {/* Confirmation Checkbox */}
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setIsConfirmed(!isConfirmed)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkboxBox, isConfirmed && styles.checkboxBoxChecked]}>
                  {isConfirmed && <Ionicons name="checkmark" size={16} color="#ffffff" />}
                </View>
                <Text style={styles.checkboxLabel}>
                  I confirm the above electricity bill details are correct
                </Text>
              </TouchableOpacity>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, !isConfirmed && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={!isConfirmed || isProcessing}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={isConfirmed ? ['#0ea5e9', '#0284c7'] : ['#94a3b8', '#64748b']}
                  style={styles.submitButtonGradient}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="shield-checkmark-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
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
                    consumerName: '',
                    consumerNumber: '',
                    meterNumber: '',
                    discomName: '',
                    billingPeriod: '',
                    billDate: '',
                    dueDate: '',
                    unitsConsumed: '',
                    billAmount: '',
                    serviceAddress: '',
                  });
                  setIsConfirmed(false);
                  setIsManualEntry(false);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={18} color="#0ea5e9" style={{ marginRight: 6 }} />
                <Text style={styles.retakeButtonText}>Scan Another Image</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="information-circle-outline" size={20} color="#0ea5e9" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Why we need your electricity bill?</Text>
              <Text style={styles.infoText}>
                Your electricity bill verifies your address and meter connection for secure P2P energy trading on the platform.
              </Text>
            </View>
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
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
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
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  headerRight: {
    marginLeft: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0ea5e9',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0ea5e9',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  expoGoWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  expoGoWarningText: {
    flex: 1,
    fontSize: 13,
    color: '#0369a1',
    lineHeight: 18,
    fontWeight: '500',
  },
  uploadCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  uploadIconContainer: {
    marginBottom: 20,
  },
  uploadIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  processingContainer: {
    width: '100%',
    marginBottom: 20,
  },
  processingCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  processingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#0369a1',
    fontWeight: '500',
  },
  imagePreviewContainer: {
    width: '100%',
    maxHeight: 240,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  imagePreview: {
    width: '100%',
    height: 240,
  },
  uploadButton: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
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
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  formHeader: {
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
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  formHelperText: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 20,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 18,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  requiredBadge: {
    fontSize: 11,
    color: '#0369a1',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
  },
  inputIcon: {
    marginLeft: 16,
  },
  input: {
    flex: 1,
    padding: 16,
    paddingLeft: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  inputHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 6,
    marginLeft: 4,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 16,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  halfInputContainer: {
    flex: 1,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
    gap: 12,
  },
  checkboxBox: {
    width: 26,
    height: 26,
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
    color: '#374151',
    flex: 1,
    fontWeight: '500',
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
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
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retakeButtonText: {
    color: '#0ea5e9',
    fontSize: 15,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 14,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 19,
  },
});
