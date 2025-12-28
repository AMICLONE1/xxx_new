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
import { useKYCStore } from '@/store';
import * as FileSystem from 'expo-file-system/legacy';

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
  const { setKYCData } = useKYCStore();
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

  // Check if running in Expo Go on mount
  useEffect(() => {
    const checkExpoGo = ocrService.isRunningInExpoGo();
    setIsExpoGo(checkExpoGo);
    if (checkExpoGo && __DEV__) {
      console.log('📱 Running in Expo Go - OCR disabled');
    }
  }, []);

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
    // Check if running in Expo Go and Cloud OCR is not available
    if (isExpoGo && !ocrService.isCloudOCRAvailable()) {
      Alert.alert(
        'OCR Not Available',
        'Document scanning requires a development build or Cloud OCR API.\n\n' +
        'You can upload an image or enter details manually.',
        [
          {
            text: 'Upload Anyway',
            onPress: () => proceedWithUpload(),
          },
          {
            text: 'Enter Manually',
            onPress: () => {
              setExtractedData({
                fullName: '',
                panNumber: '',
                dateOfBirth: '',
                fatherName: '',
              });
              setShowForm(true);
              setIsManualEntry(true);
            },
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
      } catch (ocrError: any) {
        // CRITICAL: Delete image before showing error
        await deleteImage();

        if (__DEV__) {
          console.error('❌ PAN OCR Error:', ocrError?.name || 'Unknown');
        }
        
        // Handle Expo Go detection
        if (ocrError instanceof ExpoGoDetectedError || ocrError?.message === 'EXPO_GO_DETECTED') {
          Alert.alert(
            'OCR Not Available',
            'Document scanning requires either:\n\n' +
            '• A development build (npx expo run:android)\n' +
            '• Cloud OCR API key configured in app.json\n\n' +
            'You can manually enter your PAN details below.',
            [{ text: 'Enter Manually', style: 'default' }]
          );
          setExtractedData(emptyData);
          setShowForm(true);
          setIsManualEntry(true);
          setIsProcessing(false);
          return;
        }
        
        // Handle OCR not available error
        if (ocrError instanceof OCRNotAvailableError) {
          Alert.alert(
            'OCR Failed',
            'Could not read text from the image. The image may be unclear or OCR is not available.\n\n' +
            'Please manually enter your PAN details below.',
            [{ text: 'Enter Manually', style: 'default' }]
          );
          setExtractedData(emptyData);
          setShowForm(true);
          setIsManualEntry(true);
          setIsProcessing(false);
          return;
        }
        
        // Handle generic OCR errors
        Alert.alert(
          'Processing Error',
          'Could not process the image. Please try again or enter details manually.',
          [{ text: 'Enter Manually', style: 'default' }]
        );
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
      
    } catch (error: any) {
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

    try {
      setIsProcessing(true);

      // Set local KYC status = PENDING (NO Supabase calls as per requirements)
      setKYCData({
        userId: 'current_user_id',
        documentType: 'pan',
        documentNumber: extractedData.panNumber,
        name: extractedData.fullName || undefined,
        dateOfBirth: extractedData.dateOfBirth || undefined,
        status: 'pending',
        submittedAt: new Date(),
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
    } catch (error: any) {
      Alert.alert(
        'Error',
        `Failed to submit PAN data: ${error.message || 'Unknown error'}. Please try again.`
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
            <Text style={styles.headerTitle}>Scan PAN Card</Text>
            <Text style={styles.headerSubtitle}>Upload and extract details</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Upload Section - Always visible */}
          <View style={styles.uploadSection}>
            <View style={styles.uploadIconContainer}>
              <MaterialCommunityIcons name="card-account-details-outline" size={64} color="#10b981" />
            </View>
            <Text style={styles.uploadTitle}>Upload PAN Card Image</Text>
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
                <Text style={styles.manualEntryButtonText}>Enter Details Manually</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Form Section - Appears below upload button after OCR */}
          {showForm && (
            <View style={styles.formSection}>
              <Text style={styles.formHelperText}>Please verify your PAN details</Text>

              {/* Full Name */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={extractedData.fullName}
                  onChangeText={(text) => setExtractedData({ ...extractedData, fullName: text.toUpperCase() })}
                  placeholder="Enter full name"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="characters"
                  maxLength={100}
                />
              </View>

              {/* PAN Number */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>PAN Number</Text>
                <TextInput
                  style={styles.input}
                  value={extractedData.panNumber}
                  onChangeText={(text) => setExtractedData({ ...extractedData, panNumber: formatPAN(text) })}
                  placeholder="Enter PAN (e.g., ABCDE1234F)"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="characters"
                  maxLength={10}
                />
                <Text style={styles.inputHint}>Format: 5 letters + 4 digits + 1 letter</Text>
              </View>

              {/* Date of Birth */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Date of Birth</Text>
                <TextInput
                  style={styles.input}
                  value={extractedData.dateOfBirth}
                  onChangeText={(text) => {
                    const formatted = formatDOB(text);
                    setExtractedData({ ...extractedData, dateOfBirth: formatted });
                  }}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>

              {/* Father's Name (Optional) */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Father's Name (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={extractedData.fatherName}
                  onChangeText={(text) => setExtractedData({ ...extractedData, fatherName: text.toUpperCase() })}
                  placeholder="Enter father's name"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="characters"
                  maxLength={100}
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
                    I confirm the above PAN details are correct
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
