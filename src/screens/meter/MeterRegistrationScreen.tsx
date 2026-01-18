import React, { useState, useEffect, useMemo } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
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
import { MeterManagement } from '@/components/meter/MeterManagement';
import { getErrorMessage } from '@/utils/errorUtils';
import { useTheme } from '@/contexts';
import { getThemedColors, ThemedColors } from '@/utils/themedStyles';

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
  const { isDark } = useTheme();
  const colors = getThemedColors(isDark);
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Check if this is a hardware request flow
  const isHardwareRequest = route?.params?.isHardwareRequest || false;
  const { setCurrentMeter, setMeters, meters, removeMeter } = useMeterStore();
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
  const [showManagement, setShowManagement] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);

  // Check if running in Expo Go on mount and if we should show management view
  useEffect(() => {
    const checkExpoGo = ocrService.isRunningInExpoGo();
    setIsExpoGo(checkExpoGo);
    if (checkExpoGo && __DEV__) {
      console.log('📱 Running in Expo Go - OCR disabled');
    }

    // Show management view if user already has meters
    if (meters.length > 0 && !showRegistrationForm) {
      setShowManagement(true);
    }
  }, [meters.length, showRegistrationForm]);

  // If user has meters and not explicitly adding new one, show management view
  if (showManagement && meters.length > 0 && !showRegistrationForm) {
    return (
      <LinearGradient
        colors={colors.backgroundGradient as [string, string, ...string[]]}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color={colors.primary} />
            </TouchableOpacity>

            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Meter Management</Text>
              <Text style={styles.headerSubtitle}>Manage your smart meters</Text>
            </View>
            <View style={styles.headerIconContainer}>
              <MaterialCommunityIcons name="meter-electric" size={24} color={colors.primary} />
            </View>
          </View>
          <MeterManagement
            meters={meters}
            onAddMeter={() => {
              setShowRegistrationForm(true);
              setShowManagement(false);
            }}
            onToggleMeter={(meterId, enabled) => {
              console.log(`Toggle meter ${meterId}: ${enabled ? 'ON' : 'OFF'}`);
              if (!enabled) {
                Alert.alert(
                  'Meter Turned Off',
                  'Data collection has been paused for this meter.'
                );
              }
            }}
            onDisableMeter={async (meterId) => {
              if (!user?.id) return;
              await removeMeter(meterId, user.id);
              Alert.alert('Success', 'Meter has been disabled and removed.');
            }}
            onViewDetails={(meter) => {
              Alert.alert(
                'Meter Details',
                `DISCOM: ${meter.discomName}\n` +
                `Consumer Number: ${meter.consumerNumber}\n` +
                `Serial ID: ${meter.id}\n` +
                `Address: ${meter.address || 'Not available'}`,
                [{ text: 'OK' }]
              );
            }}
          />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (isHardwareRequest || showHardwareRequest) {
    return <HardwareRequestScreen navigation={navigation} />;
  }

  // ============================================
  // VALIDATION FUNCTIONS
  // ============================================

  const validateConsumerNumber = (value: string): boolean => {
    if (!value) {
      setConsumerNumberError('');
      return false;
    }

    if (!/^\d+$/.test(value)) {
      setConsumerNumberError('Consumer number must contain only digits');
      return false;
    }

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

  const validateMeterSerialId = (value: string): boolean => {
    if (!value) {
      setMeterSerialIdError('');
      return false;
    }

    if (!/^[A-Za-z0-9]+$/.test(value)) {
      setMeterSerialIdError('Meter ID must contain only letters and numbers');
      return false;
    }

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

  const handleConsumerNumberChange = (text: string) => {
    const digitsOnly = text.replace(/\D/g, '').slice(0, 12);
    setConsumerNumber(digitsOnly);
    validateConsumerNumber(digitsOnly);
  };

  const handleMeterSerialIdChange = (text: string) => {
    const alphanumeric = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 15);
    setMeterSerialId(alphanumeric);
    validateMeterSerialId(alphanumeric);
  };

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

  const processImage = async (uri: string) => {
    setIsProcessing(true);
    setBillImageUri(uri);

    try {
      if (__DEV__) {
        console.log('📸 Processing electricity bill image for OCR...');
      }

      let ocrResult;
      try {
        ocrResult = await ocrService.recognizeText(uri);

        if (__DEV__) {
          console.log('✅ Bill OCR Success! Text extracted (length:', ocrResult.text.length, 'chars)');
        }
      } catch (ocrError: unknown) {
        await deleteImageFile(uri);

        if (__DEV__) {
          console.error('❌ Bill OCR Error:', ocrError instanceof Error ? ocrError.name : 'Unknown');
        }

        if (ocrError instanceof ExpoGoDetectedError || (ocrError instanceof Error && ocrError.message === 'EXPO_GO_DETECTED')) {
          console.log('[MeterRegistration] Expo Go detected during OCR - using manual entry');
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

        if (ocrError instanceof OCRNotAvailableError) {
          console.log('[MeterRegistration] OCR not available - using manual entry');
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

      const ocrText = ocrResult.text;
      const extracted = extractBillData(ocrText);
      setExtractedBillData(extracted);

      if (extracted.discomName && (DISCOM_NAMES as readonly string[]).includes(extracted.discomName)) {
        setDiscomName(extracted.discomName as typeof DISCOM_NAMES[number]);
      }

      if (extracted.consumerNumber) {
        setConsumerNumber(extracted.consumerNumber);
        validateConsumerNumber(extracted.consumerNumber);
      }

      if (extracted.meterSerialId) {
        setMeterSerialId(extracted.meterSerialId);
        validateMeterSerialId(extracted.meterSerialId);
      }

      await deleteImageFile(uri);

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

    } catch (error: unknown) {
      await deleteImageFile(uri);
      Alert.alert('Error', getErrorMessage(error) || 'Failed to process bill image');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBillUpload = async () => {
    if (isExpoGo) {
      console.log('[MeterRegistration] Expo Go detected - OCR will fall back to manual entry');
    }

    await proceedWithUpload();
  };

  const proceedWithUpload = async () => {
    try {
      const mediaLibraryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (mediaLibraryStatus.status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant media library permissions to upload electricity bill.');
        return;
      }

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

  const handleUploadAnother = () => {
    setBillImageUri(null);
    setExtractedBillData(null);
    handleBillUpload();
  };

  // ============================================
  // FORM SUBMISSION
  // ============================================

  const handleSubmit = async () => {
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
      if (!user?.id) {
        Alert.alert('Error', 'Please log in to register a meter');
        setIsSubmitting(false);
        return;
      }

      const createdMeter = await supabaseDatabaseService.createMeter({
        userId: user.id,
        discomName,
        consumerNumber,
        meterSerialId,
        verificationStatus: 'verified',
        address: extractedBillData?.serviceAddress || undefined,
      });

      setCurrentMeter(createdMeter);
      setMeters([createdMeter, ...meters]);

      const config = getMeterConfig();
      const generator = getBackgroundDataGenerator(createdMeter.id, config);

      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      generator.generateHistoricalData(yesterday, now).catch((error) => {
        console.error('Failed to generate historical data:', error);
      });

      generator.start();

      Alert.alert(
        'Meter Registered Successfully! 🎉',
        'Your meter has been registered and fake energy data generation has started. You can now view your energy dashboard.',
        [
          {
            text: 'Add Another Meter',
            onPress: () => {
              setDiscomName('');
              setConsumerNumber('');
              setMeterSerialId('');
              setBillImageUri(null);
              setExtractedBillData(null);
              setShowRegistrationForm(true);
              setShowManagement(false);
            },
          },
          {
            text: 'View My Meters',
            onPress: () => {
              setShowRegistrationForm(false);
              setShowManagement(true);
            },
          },
          {
            text: 'Go to Dashboard',
            onPress: () => navigation.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            }),
          },
        ]
      );
    } catch (error: unknown) {
      Alert.alert('Error', getErrorMessage(error) || 'Failed to register meter');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  const hasBillUploaded = billImageUri !== null || extractedBillData !== null;

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
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Register Meter</Text>
            <Text style={styles.headerSubtitle}>Connect your smart meter</Text>
          </View>
          <View style={styles.headerIconContainer}>
            <MaterialCommunityIcons name="meter-electric" size={24} color={colors.primary} />
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Bill Preview Card */}
          {hasBillUploaded && (
            <View style={[styles.sectionCard, styles.successCard]}>
              <View style={styles.billPreviewContent}>
                <View style={styles.billIconContainer}>
                  <MaterialCommunityIcons name="file-document-check" size={28} color="#ffffff" />
                </View>
                <View style={styles.billPreviewTextContainer}>
                  <Text style={styles.billPreviewTitle}>Bill Uploaded</Text>
                  <Text style={styles.billPreviewSubtitle}>
                    {extractedBillData?.consumerNumber
                      ? `Consumer: ${extractedBillData.consumerNumber}`
                      : 'Ready for verification'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.uploadAnotherButton}
                onPress={handleUploadAnother}
              >
                <Ionicons name="refresh" size={16} color={colors.primary} />
                <Text style={styles.uploadAnotherText}>Change Bill</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* DISCOM Selection Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <MaterialCommunityIcons name="office-building" size={20} color={colors.primary} />
              </View>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionLabel}>DISCOM Name</Text>
                <Text style={styles.sectionHint}>Select your electricity provider</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowDiscomPicker(!showDiscomPicker)}
            >
              <Text style={[styles.pickerText, { color: discomName ? colors.text : colors.textMuted }]}>
                {discomName || 'Select DISCOM'}
              </Text>
              <Ionicons name={showDiscomPicker ? "chevron-up" : "chevron-down"} size={20} color={colors.textMuted} />
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

          {/* Consumer Number Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Ionicons name="person" size={20} color={colors.primary} />
              </View>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionLabel}>Consumer Number</Text>
                <Text style={styles.sectionHint}>6-12 digit number from your bill</Text>
              </View>
            </View>

            <View style={[
              styles.inputContainer,
              consumerNumberError ? { borderColor: colors.error } : null
            ]}>
              <Ionicons name="keypad-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter consumer number"
                placeholderTextColor={colors.inputPlaceholder}
                value={consumerNumber}
                onChangeText={handleConsumerNumberChange}
                keyboardType="numeric"
                maxLength={12}
              />
            </View>
            {consumerNumberError ? (
              <Text style={styles.errorText}>{consumerNumberError}</Text>
            ) : null}
          </View>

          {/* Meter Serial ID Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <MaterialCommunityIcons name="meter-electric-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionLabel}>Meter Serial ID</Text>
                <Text style={styles.sectionHint}>5-15 alphanumeric characters</Text>
              </View>
            </View>

            <View style={[
              styles.inputContainer,
              meterSerialIdError ? { borderColor: colors.error } : null
            ]}>
              <MaterialCommunityIcons name="barcode" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter meter serial ID"
                placeholderTextColor={colors.inputPlaceholder}
                value={meterSerialId}
                onChangeText={handleMeterSerialIdChange}
                autoCapitalize="characters"
                maxLength={15}
              />
            </View>
            {meterSerialIdError ? (
              <Text style={styles.errorText}>{meterSerialIdError}</Text>
            ) : null}
          </View>

          {/* Bill Upload Card */}
          {!hasBillUploaded && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <Ionicons name="document-text" size={20} color={colors.primary} />
                </View>
                <View style={styles.sectionHeaderText}>
                  <Text style={styles.sectionLabel}>Electricity Bill</Text>
                  <Text style={styles.sectionHint}>Upload your latest bill for verification</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handleBillUpload}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <View style={styles.processingContainer}>
                    <ActivityIndicator color={colors.primary} size="small" />
                    <Text style={styles.processingText}>Processing...</Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.uploadIconContainer}>
                      <Ionicons name="cloud-upload" size={24} color="#ffffff" />
                    </View>
                    <Text style={styles.uploadButtonText}>
                      Upload Electricity Bill
                    </Text>
                    <Text style={styles.uploadButtonHint}>
                      Tap to scan or select from gallery
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              {isExpoGo && (
                <View style={styles.warningBadge}>
                  <Ionicons name="warning" size={14} color={colors.warning} />
                  <Text style={styles.warningText}>
                    OCR requires a development build
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, (!isFormValid() || isSubmitting) && { opacity: 0.5 }]}
            onPress={handleSubmit}
            disabled={!isFormValid() || isSubmitting}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.submitButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                  <Text style={styles.submitButtonText}>Register Meter</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Hardware Request Link */}
          <TouchableOpacity
            style={styles.hardwareRequestButton}
            onPress={() => setShowHardwareRequest(true)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="chip" size={20} color={colors.primary} />
            <Text style={styles.hardwareRequestText}>
              Don't have a Smart Meter? Request Installation
            </Text>
          </TouchableOpacity>
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
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
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
  successCard: {
    borderWidth: 0,
    backgroundColor: colors.successBackground,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: colors.primaryLight,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
    color: colors.text,
  },
  sectionHint: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  // Bill Preview
  billPreviewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  billIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: colors.primary,
  },
  billPreviewTextContainer: {
    flex: 1,
  },
  billPreviewTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
    color: colors.textInverse, // Or based on primary if background is light
  },
  billPreviewSubtitle: {
    fontSize: 14,
    color: colors.primaryLight,
  },
  uploadAnotherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    backgroundColor: colors.card,
  },
  uploadAnotherText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  // Picker
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.border,
  },
  pickerText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text, // Dynamic handled in component
  },
  pickerOptions: {
    marginTop: 8,
    borderWidth: 1.5,
    borderRadius: 14,
    maxHeight: 200,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  pickerScrollView: {
    maxHeight: 200,
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.border, // Dynamic handled in component
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  errorText: {
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
    color: colors.error,
  },
  // Upload Button
  uploadButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  uploadIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: colors.primary,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: colors.primary,
  },
  uploadButtonHint: {
    fontSize: 13,
    color: colors.textMuted,
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  processingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    backgroundColor: colors.warningBackground,
  },
  warningText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.warning,
  },
  // Submit Button
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Hardware Request Button
  hardwareRequestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1.5,
    marginBottom: 20,
    gap: 8,
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  hardwareRequestText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
