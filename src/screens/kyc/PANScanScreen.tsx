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

type PANScanScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PANScan'>;

interface Props {
  navigation: PANScanScreenNavigationProp;
}

interface ExtractedPANData {
  fullName: string;
  panNumber: string;
  dateOfBirth: string;
  fatherName: string;
}

export default function PANScanScreen({ navigation }: Props) {
  const { submitDocument, isSubmitting, canUseOCR, getDocumentStatus } = useKYCStore();
  const { user } = useAuthStore();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedPANData>({
    fullName: '',
    panNumber: '',
    dateOfBirth: '',
    fatherName: '',
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
    const ocrAllowed = canUseOCR('pan');
    const docStatus = getDocumentStatus('pan');

    if (!ocrAllowed) {
      console.log('[PANScan] OCR not allowed, status:', docStatus);
      if (docStatus === 'verified') {
        Alert.alert(
          'Document Verified',
          'Your PAN card has already been verified. No re-upload needed.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else if (docStatus === 'pending') {
        Alert.alert(
          'Document Pending',
          'Your PAN card is currently being reviewed. Please wait for verification.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    }
  }, [canUseOCR, getDocumentStatus, navigation]);

  /**
   * Format DOB with slashes: DD/MM/YYYY
   */
  const formatDOB = (text: string): string => {
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
   * Format PAN number: uppercase, alphanumeric only
   */
  const formatPAN = (text: string): string => {
    // Remove non-alphanumeric characters and convert to uppercase
    return text.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10);
  };

  /**
   * STRICT PAN data extraction - ONLY fill if explicitly detected
   * DO NOT guess, infer, or fabricate any data
   */
  const extractPANData = (ocrText: string): ExtractedPANData => {
    // Initialize with empty data - fields remain empty unless explicitly detected
    const data: ExtractedPANData = {
      fullName: '',
      panNumber: '',
      dateOfBirth: '',
      fatherName: '',
    };

    const lines = ocrText.split('\n');

    // ============================================
    // A. PAN NUMBER - STRICT DETECTION ONLY
    // ============================================
    // PAN format: 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F)
    const panRegex = /[A-Z]{5}[0-9]{4}[A-Z]/gi;

    // Priority 1: Find PAN on its own line
    for (const line of lines) {
      const trimmedLine = line.trim().toUpperCase();
      const panMatch = trimmedLine.match(/^([A-Z]{5}[0-9]{4}[A-Z])$/);
      if (panMatch) {
        data.panNumber = panMatch[1];
        break;
      }
    }

    // Priority 2: Find PAN anywhere in text
    if (!data.panNumber) {
      const allMatches = ocrText.toUpperCase().match(panRegex);
      if (allMatches && allMatches.length > 0) {
        // Use the first valid PAN found
        data.panNumber = allMatches[0].toUpperCase();
      }
    }

    // Priority 3: Find PAN with label
    if (!data.panNumber) {
      const panWithLabel = ocrText.toUpperCase().match(/(?:PAN|PERMANENT ACCOUNT NUMBER)\s*:?\s*([A-Z]{5}[0-9]{4}[A-Z])/i);
      if (panWithLabel && panWithLabel[1]) {
        data.panNumber = panWithLabel[1].toUpperCase();
      }
    }

    if (__DEV__ && data.panNumber) {
      console.log('✅ PAN number detected:', data.panNumber);
    }

    // ============================================
    // B. FULL NAME - STRICT DETECTION ONLY
    // ============================================
    // List of text to EXCLUDE from name extraction
    const excludePatterns = [
      /INCOME TAX DEPARTMENT/i,
      /GOVT\.?\s*OF\s*INDIA/i,
      /GOVERNMENT OF INDIA/i,
      /PERMANENT ACCOUNT NUMBER/i,
      /आयकर विभाग/,
      /भारत सरकार/,
      /स्थायी खाता संख्या/,
      /SIGNATURE/i,
      /^PAN$/i,
      /^CARD$/i,
      /^(Male|Female|M|F)$/i,
    ];

    const shouldExclude = (text: string): boolean => {
      const trimmedText = text.trim();
      return excludePatterns.some(pattern => pattern.test(trimmedText));
    };

    // Pattern 1: Look for "Name" label (English or Hindi)
    const nameWithLabel = ocrText.match(/(?:Name|नाम|NAME)\s*[:\s]\s*([A-Za-z\s]{3,50}?)(?:\n|$)/i);
    if (nameWithLabel && nameWithLabel[1]) {
      let name = nameWithLabel[1].trim();
      if (name.length >= 3 && !shouldExclude(name) && /[A-Za-z]/.test(name)) {
        data.fullName = name.toUpperCase();
      }
    }

    // Pattern 2: Find name after specific PAN card text
    if (!data.fullName) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Check if this line contains "Permanent Account Number" or similar
        if (/Permanent Account Number|PERMANENT ACCOUNT NUMBER|स्थायी खाता संख्या/i.test(line)) {
          // Look at next few lines for name
          for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
            const nextLine = lines[j].trim();

            // Skip empty, date, PAN number lines
            if (!nextLine) continue;
            if (/\d{2}[-\/]\d{2}[-\/]\d{4}/.test(nextLine)) continue;
            if (/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(nextLine.toUpperCase())) continue;
            if (shouldExclude(nextLine)) continue;

            // Match name: 2-4 words, each 2+ characters
            const namePattern = /^([A-Za-z]{2,}(?:\s+[A-Za-z]{2,}){0,3})$/;
            const match = nextLine.match(namePattern);
            if (match && match[1] && match[1].length >= 3) {
              data.fullName = match[1].trim().toUpperCase();
              if (__DEV__) {
                console.log('✅ Name found via Pattern 2:', data.fullName);
              }
              break;
            }
          }
          if (data.fullName) break;
        }
      }
    }

    // Pattern 3: All-caps name on its own line (fallback)
    if (!data.fullName) {
      for (let i = 2; i < Math.min(lines.length, 15); i++) {
        const trimmedLine = lines[i].trim();

        if (!trimmedLine) continue;
        if (shouldExclude(trimmedLine)) continue;
        if (/^\d+$/.test(trimmedLine)) continue;
        if (/\d{2}[-\/]\d{2}[-\/]\d{4}/.test(trimmedLine)) continue;
        if (/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(trimmedLine.toUpperCase())) continue;

        // Match name pattern: 1-4 words, each 2+ characters
        const namePattern = /^([A-Z]{2,}(?:\s+[A-Z]{2,}){0,3})$/;
        const match = trimmedLine.match(namePattern);
        if (match && match[1] && match[1].length >= 3) {
          data.fullName = match[1].trim();
          if (__DEV__) {
            console.log('✅ Name found via Pattern 3:', data.fullName);
          }
          break;
        }
      }
    }

    // ============================================
    // C. FATHER'S NAME - STRICT DETECTION ONLY
    // ============================================
    // Pattern 1: Look for "Father's Name" label
    const fatherWithLabel = ocrText.match(/(?:Father(?:'s)?\s*Name|पिता का नाम)\s*[:\s]\s*([A-Za-z\s]{3,50}?)(?:\n|$)/i);
    if (fatherWithLabel && fatherWithLabel[1]) {
      let fatherName = fatherWithLabel[1].trim();
      if (fatherName.length >= 3 && !shouldExclude(fatherName) && /[A-Za-z]/.test(fatherName)) {
        data.fatherName = fatherName.toUpperCase();
        if (__DEV__) {
          console.log('✅ Father name found:', data.fatherName);
        }
      }
    }

    // Pattern 2: Line after the cardholder name (on PAN cards, father's name usually follows)
    if (!data.fatherName && data.fullName) {
      const nameIndex = lines.findIndex(line =>
        line.trim().toUpperCase() === data.fullName ||
        line.trim().toUpperCase().includes(data.fullName)
      );

      if (nameIndex !== -1 && nameIndex < lines.length - 1) {
        for (let j = nameIndex + 1; j < Math.min(nameIndex + 3, lines.length); j++) {
          const nextLine = lines[j].trim();

          if (!nextLine) continue;
          if (/\d{2}[-\/]\d{2}[-\/]\d{4}/.test(nextLine)) continue;
          if (/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(nextLine.toUpperCase())) continue;
          if (shouldExclude(nextLine)) continue;

          // Match name pattern
          const namePattern = /^([A-Z]{2,}(?:\s+[A-Z]{2,}){0,3})$/;
          const match = nextLine.toUpperCase().match(namePattern);
          if (match && match[1] && match[1].length >= 3 && match[1] !== data.fullName) {
            data.fatherName = match[1].trim();
            if (__DEV__) {
              console.log('✅ Father name found via Pattern 2:', data.fatherName);
            }
            break;
          }
        }
      }
    }

    // ============================================
    // D. DATE OF BIRTH - STRICT DETECTION ONLY
    // ============================================
    // Pattern 1: Date with "DOB" or "Date of Birth" label
    const dobWithLabel = ocrText.match(/(?:DOB|Date of Birth|जन्म तिथि|Birth)\s*[:\s]\s*(\d{2})[-\/](\d{2})[-\/](\d{4})\b/i);
    if (dobWithLabel) {
      const day = dobWithLabel[1];
      const month = dobWithLabel[2];
      const year = dobWithLabel[3];
      // Strict validation
      if (parseInt(day) >= 1 && parseInt(day) <= 31 &&
        parseInt(month) >= 1 && parseInt(month) <= 12 &&
        parseInt(year) >= 1900 && parseInt(year) <= 2099) {
        data.dateOfBirth = `${day}/${month}/${year}`;
        if (__DEV__) {
          console.log('✅ DOB found via Pattern 1:', data.dateOfBirth);
        }
      }
    }

    // Pattern 2: Date on its own line
    if (!data.dateOfBirth) {
      for (const line of lines.slice(2, 15)) {
        const trimmedLine = line.trim();
        const dateMatch = trimmedLine.match(/^(\d{2})[-\/](\d{2})[-\/](\d{4})$/);
        if (dateMatch) {
          const day = dateMatch[1];
          const month = dateMatch[2];
          const year = dateMatch[3];
          // Strict validation
          if (parseInt(day) >= 1 && parseInt(day) <= 31 &&
            parseInt(month) >= 1 && parseInt(month) <= 12 &&
            parseInt(year) >= 1900 && parseInt(year) <= 2099) {
            data.dateOfBirth = `${day}/${month}/${year}`;
            if (__DEV__) {
              console.log('✅ DOB found via Pattern 2:', data.dateOfBirth);
            }
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
      console.log('[PANScan] Expo Go detected - using manual entry mode');
      setExtractedData({
        fullName: '',
        panNumber: '',
        dateOfBirth: '',
        fatherName: '',
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
        Alert.alert('Permission Required', 'Please grant media library permissions to upload PAN image.');
        return;
      }

      // Show image picker options
      Alert.alert(
        'Select PAN Card Image',
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
    const emptyData: ExtractedPANData = {
      fullName: '',
      panNumber: '',
      dateOfBirth: '',
      fatherName: '',
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
            console.log('🗑️ PAN image file deleted (security)');
          }
        }
      } catch (deleteError) {
        if (__DEV__) {
          console.warn('⚠️ Could not delete PAN image file:', deleteError);
        }
      }
    };

    try {
      if (__DEV__) {
        console.log('📸 Processing PAN image for OCR...');
      }

      // Try to perform OCR
      let ocrResult;
      try {
        ocrResult = await ocrService.recognizeText(uri);

        if (__DEV__) {
          console.log('✅ PAN OCR Success! Text extracted (length:', ocrResult.text.length, 'chars)');
        }
      } catch (ocrError: unknown) {
        // CRITICAL: Delete image before showing error
        await deleteImage();

        if (__DEV__) {
          console.error('❌ PAN OCR Error:', ocrError instanceof Error ? ocrError.name : 'Unknown');
        }

        // Handle Expo Go detection - silently fall back to manual entry
        if (ocrError instanceof ExpoGoDetectedError || getErrorMessage(ocrError) === 'EXPO_GO_DETECTED') {
          console.log('[PANScan] Expo Go detected during OCR - using manual entry');
          setExtractedData(emptyData);
          setShowForm(true);
          setIsManualEntry(true);
          setIsProcessing(false);
          return;
        }

        // Handle OCR not available error - silently fall back to manual entry
        if (ocrError instanceof OCRNotAvailableError) {
          console.log('[PANScan] OCR not available - using manual entry');
          setExtractedData(emptyData);
          setShowForm(true);
          setIsManualEntry(true);
          setIsProcessing(false);
          return;
        }

        // Handle generic OCR errors - silently fall back to manual entry
        console.log('[PANScan] OCR processing error - using manual entry');
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
        console.log('✅ PAN OCR Success! Text extracted (length:', ocrText.length, 'chars)');
      }

      const extracted = extractPANData(ocrText);

      // Validate PAN number format
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
      if (extracted.panNumber && !panRegex.test(extracted.panNumber)) {
        extracted.panNumber = '';
        if (__DEV__) {
          console.warn('⚠️ Invalid PAN format detected, clearing');
        }
      }

      if (__DEV__) {
        console.log('📊 PAN Extraction Results:', {
          name: extracted.fullName ? 'Found' : 'Not detected',
          pan: extracted.panNumber ? 'Found' : 'Not detected',
          dob: extracted.dateOfBirth ? 'Found' : 'Not detected',
          fatherName: extracted.fatherName ? 'Found' : 'Not detected',
        });
      }

      // ============================================
      // STEP 3: FORM BINDING
      // ============================================
      setExtractedData(extracted);
      setShowForm(true);

      // Determine if manual entry based on whether PAN number was found
      const hasPANNumber = extracted.panNumber && panRegex.test(extracted.panNumber);
      setIsManualEntry(!hasPANNumber);

      // ============================================
      // STEP 4: IMAGE DELETION (SECURITY)
      // ============================================
      await deleteImage();

      if (__DEV__) {
        console.log('✅ PAN Form displayed with extracted data');
      }

      // Show success message
      setTimeout(() => {
        const extractedFields = [];
        if (extracted.fullName) extractedFields.push('Name');
        if (extracted.panNumber) extractedFields.push('PAN Number');
        if (extracted.dateOfBirth) extractedFields.push('Date of Birth');
        if (extracted.fatherName) extractedFields.push("Father's Name");

        const summary = extractedFields.length > 0
          ? `Extracted: ${extractedFields.join(', ')}`
          : 'No data extracted. Please enter details manually.';

        Alert.alert(
          'OCR Complete ✅',
          `${summary}\nPAN: ${extracted.panNumber || 'Not found'}\n\nPlease verify and edit if needed.`,
          [{ text: 'OK' }]
        );
      }, 500);

    } catch (error: unknown) {
      // CRITICAL: Always delete image on error
      await deleteImage();

      if (__DEV__) {
        console.error('❌ Unexpected error in PAN processImage:', error);
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
      Alert.alert('Confirmation Required', 'Please confirm that the PAN details are correct.');
      return;
    }

    // Validate PAN number format
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
    if (!extractedData.panNumber || !panRegex.test(extractedData.panNumber)) {
      Alert.alert('Invalid PAN Number', 'Please ensure a valid PAN number is entered (e.g., ABCDE1234F).');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not found. Please sign in again.');
      return;
    }

    try {
      setIsProcessing(true);

      // Submit to KYC store (handles both DB submission and local state update)
      await submitDocument(user.id, 'pan', {
        documentNumber: extractedData.panNumber,
        name: extractedData.fullName || undefined,
        dateOfBirth: extractedData.dateOfBirth || undefined,
      });

      Alert.alert(
        'Success',
        'Your PAN details have been submitted for verification. You will be notified once verification is complete.',
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
        `Failed to submit PAN data: ${getErrorMessage(error) || 'Unknown error'}. Please try again.`
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
            <Text style={styles.headerTitle}>Scan PAN Card</Text>
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
          {/* Upload Card */}
          <View style={styles.uploadCard}>
            <View style={styles.uploadIconContainer}>
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                style={styles.uploadIconGradient}
              >
                <MaterialCommunityIcons name="card-account-details-outline" size={36} color="#ffffff" />
              </LinearGradient>
            </View>
            <Text style={styles.uploadTitle}>Upload PAN Card Image</Text>
            <Text style={styles.uploadSubtitle}>
              Take a clear photo or select from gallery.{'\n'}Ensure all text is visible.
            </Text>

            {imageUri && isProcessing && (
              <View style={styles.processingContainer}>
                <View style={styles.processingCard}>
                  <ActivityIndicator size="large" color="#3b82f6" />
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
                colors={['#3b82f6', '#2563eb']}
                style={styles.uploadButtonGradient}
              >
                <Ionicons name="camera" size={22} color="#ffffff" />
                <Text style={styles.uploadButtonText}>
                  {imageUri ? 'Upload Another Image' : 'Upload PAN Card Image'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Manual Entry Option */}
            {!showForm && (
              <TouchableOpacity
                style={styles.manualEntryButton}
                onPress={() => {
                  setExtractedData({
                    fullName: '',
                    panNumber: '',
                    dateOfBirth: '',
                    fatherName: '',
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
                  <Ionicons name="document-text-outline" size={20} color="#3b82f6" />
                </View>
                <Text style={styles.formTitle}>PAN Details</Text>
              </View>
              <Text style={styles.formHelperText}>Please verify and confirm your PAN details</Text>

              {/* Full Name */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={extractedData.fullName}
                    onChangeText={(text) => setExtractedData({ ...extractedData, fullName: text.toUpperCase() })}
                    placeholder="Enter full name"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="characters"
                    maxLength={100}
                  />
                </View>
              </View>

              {/* PAN Number */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>PAN Number</Text>
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="card-account-details-outline" size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={extractedData.panNumber}
                    onChangeText={(text) => setExtractedData({ ...extractedData, panNumber: formatPAN(text) })}
                    placeholder="e.g., ABCDE1234F"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="characters"
                    maxLength={10}
                  />
                </View>
                <Text style={styles.inputHint}>Format: 5 letters + 4 digits + 1 letter</Text>
              </View>

              {/* Date of Birth */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Date of Birth</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="calendar-outline" size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={extractedData.dateOfBirth}
                    onChangeText={(text) => {
                      const formatted = formatDOB(text);
                      setExtractedData({ ...extractedData, dateOfBirth: formatted });
                    }}
                    placeholder="DD/MM/YYYY"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>
              </View>

              {/* Father's Name (Optional) */}
              <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>Father's Name</Text>
                  <Text style={styles.optionalBadge}>Optional</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={extractedData.fatherName}
                    onChangeText={(text) => setExtractedData({ ...extractedData, fatherName: text.toUpperCase() })}
                    placeholder="Enter father's name"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="characters"
                    maxLength={100}
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
                  I confirm the above PAN details are correct
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
                  colors={isConfirmed ? ['#3b82f6', '#2563eb'] : ['#94a3b8', '#64748b']}
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
                    fullName: '',
                    panNumber: '',
                    dateOfBirth: '',
                    fatherName: '',
                  });
                  setIsConfirmed(false);
                  setIsManualEntry(false);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={18} color="#3b82f6" style={{ marginRight: 6 }} />
                <Text style={styles.retakeButtonText}>Scan Another Image</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="information-circle-outline" size={20} color="#3b82f6" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Why we need your PAN?</Text>
              <Text style={styles.infoText}>
                PAN verification is required for secure P2P energy trading and financial transactions as per regulatory compliance.
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
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
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
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  processingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
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
    shadowColor: '#3b82f6',
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
    color: '#3b82f6',
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
    backgroundColor: '#dbeafe',
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
  optionalBadge: {
    fontSize: 11,
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    fontWeight: '500',
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
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
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
    shadowColor: '#3b82f6',
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
    color: '#3b82f6',
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
    backgroundColor: '#dbeafe',
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
