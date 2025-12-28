import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types';
import { DISCOM_NAMES } from '@/utils/constants';
import { useMeterStore, useAuthStore } from '@/store';
import * as ImagePicker from 'expo-image-picker';
import { ocrService, ExpoGoDetectedError, OCRNotAvailableError } from '@/services/mlkit/ocrService';
import HardwareRequestScreen from './HardwareRequestScreen';
import { getBackgroundDataGenerator } from '@/services/mock/backgroundDataGenerator';
import { getMeterConfig } from '@/utils/meterConfig';
import { supabaseDatabaseService } from '@/services/supabase/databaseService';
import * as FileSystem from 'expo-file-system/legacy';

type MeterRegistrationScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'MeterRegistration'
>;
type MeterRegistrationScreenRouteProp = {
  params?: { isHardwareRequest?: boolean };
};

interface Props {
  navigation: MeterRegistrationScreenNavigationProp;
  route?: MeterRegistrationScreenRouteProp;
}

interface ExtractedBillData {
  discomName: string;
  consumerNumber: string;
  meterSerialId: string;
  billingPeriod: string;
  billDate: string;
  dueDate: string;
  unitsConsumed: string;
  billAmount: string;
  serviceAddress: string;
}

export default function MeterRegistrationScreen({ navigation, route }: Props) {
  // Check if this is a hardware request flow
  const isHardwareRequest = route?.params?.isHardwareRequest || false;
  const { setCurrentMeter, setMeters, meters } = useMeterStore();
  const { user } = useAuthStore();
  
  // Form state
  const [discomName, setDiscomName] = useState('');
  const [consumerNumber, setConsumerNumber] = useState('');
  const [meterSerialId, setMeterSerialId] = useState('');
  
  // Bill upload state
  const [billImageUri, setBillImageUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedBillData, setExtractedBillData] = useState<ExtractedBillData | null>(null);
  
  // Validation state
  const [consumerNumberError, setConsumerNumberError] = useState('');
  const [meterSerialIdError, setMeterSerialIdError] = useState('');
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscomPicker, setShowDiscomPicker] = useState(false);
  const [showHardwareRequest, setShowHardwareRequest] = useState(false);
  const [isExpoGo, setIsExpoGo] = useState(false);

  // Check if running in Expo Go on mount
  useEffect(() => {
    const checkExpoGo = ocrService.isRunningInExpoGo();
    setIsExpoGo(checkExpoGo);
    if (checkExpoGo && __DEV__) {
      console.log('📱 Running in Expo Go - OCR disabled');
    }
  }, []);

  if (isHardwareRequest || showHardwareRequest) {
    return <HardwareRequestScreen navigation={navigation} />;
  }

  // ============================================
  // VALIDATION FUNCTIONS
  // ============================================
  
  /**
   * Validate Consumer Number
   * - Numeric only
   * - Min 6, Max 12 digits
   */
  const validateConsumerNumber = (value: string): boolean => {
    if (!value) {
      setConsumerNumberError('');
      return false;
    }
    
    // Check if numeric only
    if (!/^\d+$/.test(value)) {
      setConsumerNumberError('Consumer number must contain only digits');
      return false;
    }
    
    // Check length
    if (value.length < 6) {
      setConsumerNumberError('Consumer number must be at least 6 digits');
      return false;
    }
    
    if (value.length > 12) {
      setConsumerNumberError('Consumer number cannot exceed 12 digits');
      return false;
    }
    
    setConsumerNumberError('');
    return true;
  };

  /**
   * Validate Meter Serial ID
   * - Alphanumeric only
   * - Min 5, Max 15 characters
   */
  const validateMeterSerialId = (value: string): boolean => {
    if (!value) {
      setMeterSerialIdError('');
      return false;
    }
    
    // Check if alphanumeric only
    if (!/^[A-Za-z0-9]+$/.test(value)) {
      setMeterSerialIdError('Meter ID must contain only letters and numbers');
      return false;
    }
    
    // Check length
    if (value.length < 5) {
      setMeterSerialIdError('Meter ID must be at least 5 characters');
      return false;
    }
    
    if (value.length > 15) {
      setMeterSerialIdError('Meter ID cannot exceed 15 characters');
      return false;
    }
    
    setMeterSerialIdError('');
    return true;
  };

  /**
   * Handle Consumer Number input
   */
  const handleConsumerNumberChange = (text: string) => {
    // Allow only digits and limit to 12
    const digitsOnly = text.replace(/\D/g, '').slice(0, 12);
    setConsumerNumber(digitsOnly);
    validateConsumerNumber(digitsOnly);
  };

  /**
   * Handle Meter Serial ID input
   */
  const handleMeterSerialIdChange = (text: string) => {
    // Allow only alphanumeric and auto-capitalize, limit to 15
    const alphanumeric = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 15);
    setMeterSerialId(alphanumeric);
    validateMeterSerialId(alphanumeric);
  };

  /**
   * Check if form is valid for submission
   */
  const isFormValid = (): boolean => {
    const hasDiscom = discomName !== '';
    const hasValidConsumer = consumerNumber.length >= 6 && consumerNumber.length <= 12 && /^\d+$/.test(consumerNumber);
    const hasValidMeter = meterSerialId.length >= 5 && meterSerialId.length <= 15 && /^[A-Za-z0-9]+$/.test(meterSerialId);
    const hasBill = billImageUri !== null || extractedBillData !== null;
    
    return hasDiscom && hasValidConsumer && hasValidMeter && hasBill;
  };

  // ============================================
  // BILL OCR EXTRACTION
  // ============================================
  
  /**
   * Extract bill data from OCR text
   */
  const extractBillData = (ocrText: string): ExtractedBillData => {
    const data: ExtractedBillData = {
      discomName: '',
      consumerNumber: '',
      meterSerialId: '',
      billingPeriod: '',
      billDate: '',
      dueDate: '',
      unitsConsumed: '',
      billAmount: '',
      serviceAddress: '',
    };

    // A. DISCOM Detection
    const discomPatterns = [
      { pattern: /MSEDCL|MAHARASHTRA STATE ELECTRICITY/i, name: 'MSEDCL' },
      { pattern: /TATA POWER/i, name: 'Tata Power' },
      { pattern: /ADANI ELECTRICITY/i, name: 'Adani Electricity' },
      { pattern: /BSES RAJDHANI/i, name: 'BSES Rajdhani' },
      { pattern: /BSES YAMUNA/i, name: 'BSES Yamuna' },
      { pattern: /NDPL|NORTH DELHI POWER/i, name: 'TPDDL' },
      { pattern: /TPDDL|TATA POWER DELHI/i, name: 'TPDDL' },
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

    // B. Consumer Number Detection
    const consumerPatterns = [
      /(?:CONSUMER\s*(?:NO|NUMBER|ID)|CA\s*(?:NO|NUMBER)|ACCOUNT\s*(?:NO|NUMBER)|K\s*(?:NO|NUMBER))[:\s]*([A-Z0-9]{6,12})/i,
      /(?:CONSUMER|CA|ACCOUNT|K)[\s:]*([0-9]{6,12})/i,
    ];

    for (const pattern of consumerPatterns) {
      const match = ocrText.match(pattern);
      if (match && match[1]) {
        const extracted = match[1].replace(/\D/g, '').slice(0, 12);
        if (extracted.length >= 6) {
          data.consumerNumber = extracted;
          break;
        }
      }
    }

    // C. Meter Number Detection
    const meterPatterns = [
      /(?:METER\s*(?:NO|NUMBER|SR\.?\s*NO)|METER\s*ID)[:\s]*([A-Z0-9]{5,15})/i,
      /(?:M\.?\s*NO|METER)[:\s]*([A-Z0-9]{5,15})/i,
    ];

    for (const pattern of meterPatterns) {
      const match = ocrText.match(pattern);
      if (match && match[1]) {
        const extracted = match[1].replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 15);
        if (extracted.length >= 5) {
          data.meterSerialId = extracted;
          break;
        }
      }
    }

    // D. Billing Period Detection
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

    // E. Bill Date Detection
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

    // F. Due Date Detection
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

    // G. Units Consumed Detection
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

    // H. Bill Amount Detection
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

    // I. Service Address Detection
    const addressPatterns = [
      /(?:SERVICE\s*ADDRESS|SUPPLY\s*ADDRESS|PREMISES\s*ADDRESS|ADDRESS)[:\s]*([A-Z0-9][A-Z0-9\s,\.\-\/]{10,150})/i,
    ];

    for (const pattern of addressPatterns) {
      const match = ocrText.match(pattern);
      if (match && match[1]) {
        const address = match[1].trim();
        if (!/(CONSUMER\s*NO|METER\s*NO|BILL\s*DATE)/i.test(address)) {
          data.serviceAddress = address;
          break;
        }
      }
    }

    if (__DEV__) {
      console.log('📊 Bill Extraction Results:', {
        discom: data.discomName ? 'Found' : 'Not detected',
        consumer: data.consumerNumber ? 'Found' : 'Not detected',
        meter: data.meterSerialId ? 'Found' : 'Not detected',
      });
    }

    return data;
  };

  // ============================================
  // BILL UPLOAD HANDLERS
  // ============================================
  
  /**
   * Delete bill image after processing (security)
   */
  const deleteImageFile = async (uri: string) => {
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

  /**
   * Process uploaded bill image with OCR
   */
  const processImage = async (uri: string) => {
    setIsProcessing(true);
    setBillImageUri(uri);

    try {
      if (__DEV__) {
        console.log('📸 Processing electricity bill image for OCR...');
      }

      // Try to perform OCR
      let ocrResult;
      try {
        ocrResult = await ocrService.recognizeText(uri);
        
        if (__DEV__) {
          console.log('✅ Bill OCR Success! Text extracted (length:', ocrResult.text.length, 'chars)');
        }
      } catch (ocrError: any) {
        // Delete image before showing error
        await deleteImageFile(uri);

        if (__DEV__) {
          console.error('❌ Bill OCR Error:', ocrError?.name || 'Unknown');
        }
        
        // Handle Expo Go detection
        if (ocrError instanceof ExpoGoDetectedError || ocrError?.message === 'EXPO_GO_DETECTED') {
          Alert.alert(
            'OCR Not Available',
            'Document scanning requires a development build or Cloud OCR API.\n\n' +
            'Please enter bill details manually.',
            [{ text: 'OK', style: 'default' }]
          );
          setIsProcessing(false);
          // Keep the bill as "uploaded" for manual entry
          setExtractedBillData({
            discomName: '',
            consumerNumber: '',
            meterSerialId: '',
            billingPeriod: '',
            billDate: '',
            dueDate: '',
            unitsConsumed: '',
            billAmount: '',
            serviceAddress: '',
          });
          return;
        }
        
        // Handle OCR not available error
        if (ocrError instanceof OCRNotAvailableError) {
          Alert.alert(
            'OCR Failed',
            'Could not read text from the image. Please enter details manually.',
            [{ text: 'OK', style: 'default' }]
          );
          setIsProcessing(false);
          setExtractedBillData({
            discomName: '',
            consumerNumber: '',
            meterSerialId: '',
            billingPeriod: '',
            billDate: '',
            dueDate: '',
            unitsConsumed: '',
            billAmount: '',
            serviceAddress: '',
          });
          return;
        }
        
        // Handle generic OCR errors
        Alert.alert(
          'Processing Error',
          'Could not process the image. Please enter details manually.',
          [{ text: 'OK', style: 'default' }]
        );
        setIsProcessing(false);
        setExtractedBillData({
          discomName: '',
          consumerNumber: '',
          meterSerialId: '',
          billingPeriod: '',
          billDate: '',
          dueDate: '',
          unitsConsumed: '',
          billAmount: '',
          serviceAddress: '',
        });
        return;
      }

      // Extract data from OCR text
      const ocrText = ocrResult.text;
      const extracted = extractBillData(ocrText);
      setExtractedBillData(extracted);

      // Auto-fill form fields if detected
      if (extracted.discomName && DISCOM_NAMES.includes(extracted.discomName)) {
        setDiscomName(extracted.discomName);
      }
      
      if (extracted.consumerNumber) {
        setConsumerNumber(extracted.consumerNumber);
        validateConsumerNumber(extracted.consumerNumber);
      }
      
      if (extracted.meterSerialId) {
        setMeterSerialId(extracted.meterSerialId);
        validateMeterSerialId(extracted.meterSerialId);
      }

      // Delete image after processing (security)
      await deleteImageFile(uri);

      // Show success message
      const fieldsFound = [
        extracted.discomName && 'DISCOM',
        extracted.consumerNumber && 'Consumer No',
        extracted.meterSerialId && 'Meter ID',
      ].filter(Boolean);

      if (fieldsFound.length > 0) {
        Alert.alert(
          'Bill Processed',
          `Extracted: ${fieldsFound.join(', ')}\n\nPlease verify and complete the remaining fields.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Bill Uploaded',
          'Could not extract details automatically. Please enter the information manually.',
          [{ text: 'OK' }]
        );
      }

    } catch (error: any) {
      await deleteImageFile(uri);
      Alert.alert('Error', error.message || 'Failed to process bill image');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle bill upload button press
   */
  const handleBillUpload = async () => {
    // If running in Expo Go and Cloud OCR is not available, show warning
    if (isExpoGo && !ocrService.isCloudOCRAvailable()) {
      Alert.alert(
        'OCR Not Available',
        'Document scanning requires a development build or Cloud OCR API.\n\n' +
        'You can still upload the bill and enter details manually.',
        [
          {
            text: 'Upload Anyway',
            onPress: () => proceedWithUpload(),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
      return;
    }
    
    await proceedWithUpload();
  };

  /**
   * Proceed with image upload
   */
  const proceedWithUpload = async () => {
    try {
      // Request media library permissions
      const mediaLibraryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (mediaLibraryStatus.status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant media library permissions to upload electricity bill.');
        return;
      }

      // Show image picker options
      Alert.alert(
        'Upload Electricity Bill',
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
   * Handle uploading another bill (reset)
   */
  const handleUploadAnother = () => {
    setBillImageUri(null);
    setExtractedBillData(null);
    handleBillUpload();
  };

  // ============================================
  // FORM SUBMISSION
  // ============================================
  
  const handleSubmit = async () => {
    // Validate all fields
    const isConsumerValid = validateConsumerNumber(consumerNumber);
    const isMeterValid = validateMeterSerialId(meterSerialId);

    if (!discomName) {
      Alert.alert('Validation Error', 'Please select a DISCOM');
      return;
    }

    if (!isConsumerValid || !isMeterValid) {
      Alert.alert('Validation Error', 'Please fix the errors in the form');
      return;
    }

    if (!billImageUri && !extractedBillData) {
      Alert.alert('Validation Error', 'Please upload your electricity bill');
      return;
    }

    setIsSubmitting(true);
    try {
      // Get current user ID
      if (!user?.id) {
        Alert.alert('Error', 'Please log in to register a meter');
        setIsSubmitting(false);
        return;
      }

      // Create meter in Supabase to get proper UUID
      const createdMeter = await supabaseDatabaseService.createMeter({
        userId: user.id,
        discomName,
        consumerNumber,
        meterSerialId,
        verificationStatus: 'verified', // Auto-verify in development
        address: extractedBillData?.serviceAddress || undefined,
      });

      // Update meter store
      setCurrentMeter(createdMeter);
      setMeters([createdMeter, ...meters]);

      // Start fake energy meter data generation
      const config = getMeterConfig();
      const generator = getBackgroundDataGenerator(createdMeter.id, config);
      
      // Generate some historical data (last 24 hours)
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      
      generator.generateHistoricalData(yesterday, now).catch((error) => {
        console.error('Failed to generate historical data:', error);
      });

      // Start real-time data generation
      generator.start();

      Alert.alert(
        'Meter Registered Successfully! 🎉',
        'Your meter has been registered and fake energy data generation has started. You can now view your energy dashboard.',
        [
          {
            text: 'Go to Dashboard',
            onPress: () => navigation.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            }),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to register meter');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  const hasBillUploaded = billImageUri !== null || extractedBillData !== null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Header with Back Button */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Register Your Smart Meter</Text>
              <Text style={styles.subtitle}>
                Connect your existing smart meter to start trading energy
              </Text>
            </View>
          </View>

          {/* Bill Preview Card (shown after upload) */}
          {hasBillUploaded && (
            <View style={styles.billPreviewCard}>
              <View style={styles.billPreviewContent}>
                <View style={styles.billIconContainer}>
                  <MaterialCommunityIcons name="file-document-check" size={40} color="#10b981" />
                </View>
                <View style={styles.billPreviewTextContainer}>
                  <Text style={styles.billPreviewTitle}>Electricity Bill Uploaded</Text>
                  <Text style={styles.billPreviewSubtitle}>
                    {extractedBillData?.consumerNumber 
                      ? `Consumer No: ${extractedBillData.consumerNumber}`
                      : 'Ready for verification'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.uploadAnotherButton}
                onPress={handleUploadAnother}
              >
                <Text style={styles.uploadAnotherText}>Upload Another Bill</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* DISCOM Picker */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>DISCOM Name *</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowDiscomPicker(!showDiscomPicker)}
            >
              <Text style={[styles.pickerText, !discomName && styles.placeholder]}>
                {discomName || 'Select DISCOM'}
              </Text>
              <Text style={styles.pickerArrow}>▼</Text>
            </TouchableOpacity>
            {showDiscomPicker && (
              <View style={styles.pickerOptions}>
                <ScrollView style={styles.pickerScrollView} nestedScrollEnabled>
                  {DISCOM_NAMES.map((discom) => (
                    <TouchableOpacity
                      key={discom}
                      style={styles.pickerOption}
                      onPress={() => {
                        setDiscomName(discom);
                        setShowDiscomPicker(false);
                      }}
                    >
                      <Text style={styles.pickerOptionText}>{discom}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Consumer Number Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Consumer Number *</Text>
            <TextInput
              style={[styles.input, consumerNumberError ? styles.inputError : null]}
              placeholder="Enter your consumer number"
              placeholderTextColor="#9ca3af"
              value={consumerNumber}
              onChangeText={handleConsumerNumberChange}
              keyboardType="numeric"
              maxLength={12}
            />
            {consumerNumberError ? (
              <Text style={styles.errorText}>{consumerNumberError}</Text>
            ) : (
              <Text style={styles.hintText}>6-12 digits</Text>
            )}
          </View>

          {/* Meter Serial ID Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Meter Serial ID *</Text>
            <TextInput
              style={[styles.input, meterSerialIdError ? styles.inputError : null]}
              placeholder="Enter meter serial ID"
              placeholderTextColor="#9ca3af"
              value={meterSerialId}
              onChangeText={handleMeterSerialIdChange}
              autoCapitalize="characters"
              maxLength={15}
            />
            {meterSerialIdError ? (
              <Text style={styles.errorText}>{meterSerialIdError}</Text>
            ) : (
              <Text style={styles.hintText}>5-15 alphanumeric characters</Text>
            )}
          </View>

          {/* Electricity Bill Upload */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Electricity Bill *</Text>
            {!hasBillUploaded ? (
              <TouchableOpacity 
                style={styles.uploadButton} 
                onPress={handleBillUpload}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <View style={styles.processingContainer}>
                    <ActivityIndicator color="#10b981" size="small" />
                    <Text style={styles.processingText}>Processing...</Text>
                  </View>
                ) : (
                  <Text style={styles.uploadButtonText}>
                    Upload Latest Electricity Bill
                  </Text>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.billUploadedContainer}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text style={styles.billUploadedText}>Bill uploaded successfully</Text>
              </View>
            )}
            {isExpoGo && !hasBillUploaded && (
              <Text style={styles.expoGoWarning}>
                ⚠️ OCR extraction requires a development build
              </Text>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton, 
              (!isFormValid() || isSubmitting) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!isFormValid() || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>Register Meter</Text>
            )}
          </TouchableOpacity>

          {/* Hardware Request Link */}
          <TouchableOpacity
            style={styles.hardwareRequestButton}
            onPress={() => setShowHardwareRequest(true)}
          >
            <Text style={styles.hardwareRequestText}>
              Don't have a Smart Meter? Request Installation
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
    marginTop: 4,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  billPreviewCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  billPreviewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  billIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  billPreviewTextContainer: {
    flex: 1,
  },
  billPreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 4,
  },
  billPreviewSubtitle: {
    fontSize: 14,
    color: '#15803d',
  },
  uploadAnotherButton: {
    alignSelf: 'flex-start',
  },
  uploadAnotherText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  hintText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
  },
  pickerText: {
    fontSize: 16,
    color: '#111827',
  },
  placeholder: {
    color: '#9ca3af',
  },
  pickerArrow: {
    fontSize: 12,
    color: '#6b7280',
  },
  pickerOptions: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    maxHeight: 200,
  },
  pickerScrollView: {
    maxHeight: 200,
  },
  pickerOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#111827',
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#10b981',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
  },
  uploadButtonText: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '600',
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  processingText: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '600',
    marginLeft: 8,
  },
  billUploadedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  billUploadedText: {
    fontSize: 14,
    color: '#15803d',
    marginLeft: 8,
    fontWeight: '500',
  },
  expoGoWarning: {
    fontSize: 12,
    color: '#f59e0b',
    marginTop: 8,
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  hardwareRequestButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  hardwareRequestText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
  },
});
