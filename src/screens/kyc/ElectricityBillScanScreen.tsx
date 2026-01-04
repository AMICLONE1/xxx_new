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
import * as FileSystem from 'expo-file-system/legacy';

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
              } catch (error: any) {
                Alert.alert('Error', `Failed to open camera: ${error.message || 'Unknown error'}`);
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
              } catch (error: any) {
                Alert.alert('Error', `Failed to open photo library: ${error.message || 'Unknown error'}`);
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
    } catch (error: any) {
      Alert.alert('Error', `Failed to open image picker: ${error.message || 'Please try again.'}`);
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
      } catch (ocrError: any) {
        // CRITICAL: Delete image before showing error
        await deleteImage();

        if (__DEV__) {
          console.error('❌ Bill OCR Error:', ocrError?.name || 'Unknown');
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
      
    } catch (error: any) {
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
    } catch (error: any) {
      Alert.alert(
        'Error',
        `Failed to submit bill data: ${error.message || 'Unknown error'}. Please try again.`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#10b981', '#059669']}
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
            <Text style={styles.headerTitle}>Scan Electricity Bill</Text>
            <Text style={styles.headerSubtitle}>Upload and extract details</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Expo Go Warning Banner */}
          {isExpoGo && (
            <View style={styles.expoGoWarning}>
              <Ionicons name="information-circle" size={20} color="#92400e" />
              <Text style={styles.expoGoWarningText}>
                Auto text extraction unavailable. You can upload an image or enter details manually.
              </Text>
            </View>
          )}

          {/* Upload Section - Always visible */}
          <View style={styles.uploadSection}>
            <View style={styles.uploadIconContainer}>
              <MaterialCommunityIcons name="file-document" size={64} color="#10b981" />
            </View>
            <Text style={styles.uploadTitle}>Upload Electricity Bill Image</Text>
            <Text style={styles.uploadSubtitle}>
              Take a clear photo or select from gallery. Ensure all text is visible.
            </Text>

            {imageUri && isProcessing && (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color="#10b981" />
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
                colors={['#10b981', '#059669']}
                style={styles.uploadButtonGradient}
              >
                <Ionicons name="camera" size={24} color="#ffffff" />
                <Text style={styles.uploadButtonText}>
                  {imageUri ? 'Upload Another Image' : 'Upload Electricity Bill Image'}
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
                <Text style={styles.manualEntryButtonText}>Enter Details Manually</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Form Section - Appears below upload button after OCR */}
          {showForm && (
            <View style={styles.formSection}>
              <Text style={styles.formHelperText}>Please verify your electricity bill details</Text>

              {/* Consumer Name */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Consumer Name</Text>
                <TextInput
                  style={styles.input}
                  value={extractedData.consumerName}
                  onChangeText={(text) => setExtractedData({ ...extractedData, consumerName: text.toUpperCase() })}
                  placeholder="Enter consumer name"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="characters"
                  maxLength={100}
                />
              </View>

              {/* Consumer Number */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Consumer / Account Number *</Text>
                <TextInput
                  style={styles.input}
                  value={extractedData.consumerNumber}
                  onChangeText={(text) => setExtractedData({ ...extractedData, consumerNumber: text.toUpperCase() })}
                  placeholder="Enter consumer number"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="characters"
                  maxLength={20}
                />
              </View>

              {/* Meter Number */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Meter Number *</Text>
                <TextInput
                  style={styles.input}
                  value={extractedData.meterNumber}
                  onChangeText={(text) => setExtractedData({ ...extractedData, meterNumber: text.toUpperCase() })}
                  placeholder="Enter meter number"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="characters"
                  maxLength={20}
                />
                <Text style={styles.inputHint}>* At least one of Consumer Number or Meter Number is required</Text>
              </View>

              {/* DISCOM / Electricity Provider */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Electricity Provider (DISCOM)</Text>
                <TextInput
                  style={styles.input}
                  value={extractedData.discomName}
                  onChangeText={(text) => setExtractedData({ ...extractedData, discomName: text })}
                  placeholder="e.g., MSEDCL, Tata Power, Adani"
                  placeholderTextColor="#9ca3af"
                  maxLength={50}
                />
              </View>

              {/* Billing Period */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Billing Period</Text>
                <TextInput
                  style={styles.input}
                  value={extractedData.billingPeriod}
                  onChangeText={(text) => setExtractedData({ ...extractedData, billingPeriod: text })}
                  placeholder="e.g., Jan 2024 - Feb 2024"
                  placeholderTextColor="#9ca3af"
                  maxLength={50}
                />
              </View>

              {/* Bill Date */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Bill Date</Text>
                <TextInput
                  style={styles.input}
                  value={extractedData.billDate}
                  onChangeText={(text) => {
                    const formatted = formatDate(text);
                    setExtractedData({ ...extractedData, billDate: formatted });
                  }}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>

              {/* Due Date */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Due Date</Text>
                <TextInput
                  style={styles.input}
                  value={extractedData.dueDate}
                  onChangeText={(text) => {
                    const formatted = formatDate(text);
                    setExtractedData({ ...extractedData, dueDate: formatted });
                  }}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>

              {/* Units Consumed */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Units Consumed (kWh)</Text>
                <TextInput
                  style={styles.input}
                  value={extractedData.unitsConsumed}
                  onChangeText={(text) => {
                    const formatted = formatNumeric(text);
                    setExtractedData({ ...extractedData, unitsConsumed: formatted });
                  }}
                  placeholder="Enter units consumed"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>

              {/* Bill Amount */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Bill Amount (₹)</Text>
                <TextInput
                  style={styles.input}
                  value={extractedData.billAmount}
                  onChangeText={(text) => {
                    const formatted = formatNumeric(text);
                    setExtractedData({ ...extractedData, billAmount: formatted });
                  }}
                  placeholder="Enter bill amount"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  maxLength={15}
                />
              </View>

              {/* Service Address */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Service Address</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={extractedData.serviceAddress}
                  onChangeText={(text) => setExtractedData({ ...extractedData, serviceAddress: text })}
                  placeholder="Enter service address"
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                  maxLength={200}
                  textAlignVertical="top"
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
                    I confirm the above electricity bill details are correct
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
                  colors={isConfirmed ? ['#10b981', '#059669'] : ['#9ca3af', '#6b7280']}
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
    color: '#d1fae5',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  expoGoWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  expoGoWarningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
  uploadSection: {
    alignItems: 'center',
  },
  uploadIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ecfdf5',
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
    shadowColor: '#10b981',
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
  inputHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 16,
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
    backgroundColor: '#10b981',
    borderColor: '#10b981',
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
    shadowColor: '#10b981',
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
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
  },
  manualEntryButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  manualEntryButtonText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
});
