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

type AadhaarScanScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AadhaarScan'>;

interface Props {
  navigation: AadhaarScanScreenNavigationProp;
}

interface ExtractedData {
  fullName: string;
  aadhaarNumber: string;
  dateOfBirth: string;
  address: string;
}

export default function AadhaarScanScreen({ navigation }: Props) {
  const { submitDocument, isSubmitting, canUseOCR, getDocumentStatus, getDocument } = useKYCStore();
  const { user } = useAuthStore();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [backImageUri, setBackImageUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessingBack, setIsProcessingBack] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData>({
    fullName: '',
    aadhaarNumber: '',
    dateOfBirth: '',
    address: '',
  });
  const [showForm, setShowForm] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false); // Track if entered manually
  const [needsBackSide, setNeedsBackSide] = useState(false); // Track if back side is needed
  const [isExpoGo, setIsExpoGo] = useState(false); // Track if running in Expo Go

  // Check OCR access and Expo Go status on mount
  useEffect(() => {
    const checkExpoGo = ocrService.isRunningInExpoGo();
    setIsExpoGo(checkExpoGo);
    if (checkExpoGo && __DEV__) {
      console.log('📱 Running in Expo Go - OCR disabled');
    }
    
    // Check if OCR can be used for this document
    const ocrAllowed = canUseOCR('aadhaar');
    const docStatus = getDocumentStatus('aadhaar');
    
    if (!ocrAllowed) {
      console.log('[AadhaarScan] OCR not allowed, status:', docStatus);
      if (docStatus === 'verified') {
        Alert.alert(
          'Document Verified',
          'Your Aadhaar card has already been verified. No re-upload needed.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else if (docStatus === 'pending') {
        Alert.alert(
          'Document Pending',
          'Your Aadhaar card is currently being reviewed. Please wait for verification.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    }
  }, [canUseOCR, getDocumentStatus, navigation]);

  /**
   * Mask Aadhaar number: XXXX-XXXX-1234
   * CRITICAL: Only mask if valid 12-digit number exists
   * Returns empty string if input is invalid
   */
  const maskAadhaarNumber = (aadhaar: string): string => {
    // CRITICAL: Return empty string if not valid
    if (!aadhaar || aadhaar.length !== 12) {
      return '';
    }
    const last4 = aadhaar.slice(-4);
    return `XXXX-XXXX-${last4}`;
  };

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
   * STRICT Aadhaar data extraction - ONLY fill if explicitly detected
   * DO NOT guess, infer, or fabricate any data
   */
  const extractAadhaarData = (ocrText: string): ExtractedData => {
    // Initialize with empty data - fields remain empty unless explicitly detected
    const data: ExtractedData = {
      fullName: '',
      aadhaarNumber: '',
      dateOfBirth: '',
      address: '',
    };

    // ============================================
    // A. AADHAAR NUMBER - STRICT DETECTION ONLY
    // ============================================
    // Detect ONLY if a continuous 12-digit numeric sequence exists
    // Must be on its own line OR with clear context (DOB/Address nearby)
    const lines = ocrText.split('\n');
    
    // STEP 3: AADHAAR NUMBER DETECTION (REAL-WORLD FIX)
    // Aadhaar numbers in OCR can be:
    // - "8364 5789 2230" (on one line)
    // - Split across multiple lines: "8364" on one line, "5789" on next, "2230" on next
    // - "836457892230" (no spaces)
    
    // Strategy: Find ALL 4-digit groups and join consecutive ones
    
    // Priority 1: Try exact match on single line first (most reliable)
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip lines with labels
      if (/VID|Aadhaar|Number|नंबर/i.test(trimmedLine) && !/^\d/.test(trimmedLine)) {
        continue;
      }
      
      // Match exact formats on single line
      const exactPatterns = [
        /^(\d{4})\s+(\d{4})\s+(\d{4})$/, // "8364 5789 2230"
        /^(\d{4})-(\d{4})-(\d{4})$/, // "8364-5789-2230"
        /^(\d{12})$/, // "836457892230"
      ];
      
      for (const pattern of exactPatterns) {
        const match = trimmedLine.match(pattern);
        if (match) {
          const digits = match[0].replace(/\D/g, '');
          if (digits.length === 12) {
            data.aadhaarNumber = digits;
            break;
          }
        }
      }
      if (data.aadhaarNumber) break;
    }
    
    // Priority 2: Handle digits split across multiple lines
    // Look for consecutive lines with exactly 4 digits each
    if (!data.aadhaarNumber) {
      const digitGroups: string[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        const trimmedLine = lines[i].trim();
        
        // Match exactly 4 digits (may have spaces/dashes)
        const fourDigitMatch = trimmedLine.match(/^(\d{4})[\s-]*$/);
        if (fourDigitMatch) {
          digitGroups.push(fourDigitMatch[1]);
          
          // If we have 3 groups of 4 digits, join them
          if (digitGroups.length === 3) {
            const joined = digitGroups.join('');
            if (joined.length === 12) {
              data.aadhaarNumber = joined;
              break;
            }
          }
        } else {
          // Reset if we hit a non-4-digit line (not consecutive)
          if (digitGroups.length > 0 && digitGroups.length < 3) {
            digitGroups.length = 0;
          }
        }
      }
    }
    
    // Priority 3: Find 12 digits anywhere (with separators)
    if (!data.aadhaarNumber) {
      // Match pattern: 4 digits, separator, 4 digits, separator, 4 digits
      const pattern = /\b(\d{4})[\s-](\d{4})[\s-](\d{4})\b/;
      const match = ocrText.match(pattern);
      if (match) {
        const digits = (match[1] + match[2] + match[3]).replace(/\D/g, '');
        if (digits.length === 12) {
          data.aadhaarNumber = digits;
        }
      }
    }
    
    // Priority 4: Find any continuous 12-digit sequence (last resort)
    if (!data.aadhaarNumber) {
      // Look for any 12 consecutive digits in the entire text
      const allDigits = ocrText.replace(/\D/g, '');
      // Check if there's a 12-digit sequence (Aadhaar numbers don't start with 0 or 1)
      const aadhaarMatch = allDigits.match(/[2-9]\d{11}/);
      if (aadhaarMatch) {
        data.aadhaarNumber = aadhaarMatch[0];
        if (__DEV__) {
          console.log('✅ Aadhaar found via Priority 4 (12-digit sequence)');
        }
      }
    }
    
    // CRITICAL: If total digits !== 12, leave empty
    if (data.aadhaarNumber && data.aadhaarNumber.length !== 12) {
      data.aadhaarNumber = '';
    }

    // ============================================
    // B. FULL NAME - STRICT DETECTION ONLY
    // ============================================
    // Detect ONLY if a clear name string exists with explicit label or context
    // CRITICAL: Exclude "GOVERNMENT OF INDIA", "भारत सरकार", and other non-name text
    // DO NOT infer from random uppercase words
    
    // List of text to EXCLUDE from name extraction
    // CRITICAL: Use word boundaries to avoid false matches (e.g., "M" in "SAMARTH" or "F" in "SHARMA")
    const excludePatterns = [
      /GOVERNMENT OF INDIA/i,
      /भारत सरकार/,
      /GOVERNMENT/i,
      /OF INDIA/i,
      /UNIQUE IDENTIFICATION/i,
      /AUTHORITY OF INDIA/i,
      /UIDAI/i,
      /VID:/i,
      /DOB:/i,
      /Date of Birth/i,
      /जन्म तिथि/i,
      /^(Male|Female|M|F)$/i, // CRITICAL: Match whole word only, not partial matches
    ];
    
    // Helper function to check if text should be excluded
    // CRITICAL: Check if text matches any exclude pattern
    // For whole-word patterns (like /^(Male|Female|M|F)$/i), they already use ^ and $ so no need to test upperText separately
    const shouldExclude = (text: string): boolean => {
      // First check if it's a known excluded word/phrase
      const trimmedText = text.trim();
      return excludePatterns.some(pattern => {
        // Test both original and uppercase versions
        return pattern.test(trimmedText) || pattern.test(trimmedText.toUpperCase());
      });
    };
    
    // Helper function to clean name - remove excluded text
    const cleanName = (name: string): string => {
      let cleaned = name.trim();
      // Remove "GOVERNMENT OF INDIA" or "भारत सरकार" if present
      cleaned = cleaned.replace(/(?:GOVERNMENT OF INDIA|भारत सरकार|GOVERNMENT|OF INDIA)\s*/gi, '').trim();
      // Remove any remaining excluded patterns
      for (const pattern of excludePatterns) {
        cleaned = cleaned.replace(pattern, '').trim();
      }
      return cleaned;
    };
    
    // Pattern 1: Explicit "Name" label (English or Hindi)
    // Supports: Name, नाम, NAME (case insensitive)
    const nameWithLabel = ocrText.match(/(?:Name|नाम|NAME)\s*:?\s*([^\n]{2,40}?)(?:\s+(?:DOB|Date|Year|Male|Female|M|F|जन्म|Gender))/i);
    if (nameWithLabel && nameWithLabel[1]) {
      let name = nameWithLabel[1].trim();
      name = cleanName(name);
      // Validate: must be meaningful (3+ chars, contains letters, not excluded text)
      if (name.length >= 3 && !shouldExclude(name) && /[A-Za-z\u0900-\u097F]/.test(name) && !/^\d+$/.test(name)) {
        data.fullName = name;
      }
    }
    
    // Pattern 2: Name on line after "Government of India" or "भारत सरकार" and before DOB/Gender
    // CRITICAL: Must be on a SEPARATE line, not on the same line as government text
    if (!data.fullName) {
      // Find all lines and look for name after government text
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        
        // Check if this line contains government text
        if (/(?:Government of India|भारत सरकार)/i.test(line)) {
          if (__DEV__) {
            console.log('🔍 Found government text at line', i, ':', line);
          }
          // Look at next few lines for the name
          for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
            const nextLine = lines[j].trim();
            
            if (__DEV__) {
              console.log('🔍 Checking line', j, ':', nextLine);
            }
            
            // Skip empty lines, dates, numbers, gender markers
            if (!nextLine) {
              if (__DEV__) {
                console.log('⏭️ Skipping line', j, '- empty line');
              }
              continue;
            }
            if (/^\d+$/.test(nextLine)) {
              if (__DEV__) {
                console.log('⏭️ Skipping line', j, '- all digits');
              }
              continue;
            }
            if (/\d{2}[-\/]\d{2}[-\/]\d{4}/.test(nextLine)) {
              if (__DEV__) {
                console.log('⏭️ Skipping line', j, '- date pattern');
              }
              continue;
            }
            if (/^(Male|Female|M|F|DOB|Date|Year)$/i.test(nextLine)) {
              if (__DEV__) {
                console.log('⏭️ Skipping line', j, '- gender/date marker');
              }
              continue;
            }
            if (shouldExclude(nextLine)) {
              if (__DEV__) {
                console.log('⏭️ Skipping line', j, '- excluded by pattern:', nextLine);
              }
              continue;
            }
            
            // Match name pattern: 1-4 words, each 2+ characters (Latin or Devanagari)
            // CRITICAL: Allow mixed-case (A-Za-z) - OCR commonly returns mixed-case names
            // Allow single word names too (some names might be single word)
            const namePattern = /^([A-Za-z\u0900-\u097F]{2,}(?:\s+[A-Za-z\u0900-\u097F]{2,}){0,3})$/;
            const match = nextLine.match(namePattern);
            if (match && match[1]) {
              let name = match[1].trim();
              name = cleanName(name);
              // Final validation - must be meaningful name
              if (name.length >= 3 && !shouldExclude(name) && /[A-Za-z\u0900-\u097F]/.test(name)) {
                data.fullName = name;
                if (__DEV__) {
                  console.log('✅ Name found via Pattern 2:', name);
                }
                break;
              } else {
                if (__DEV__) {
                  console.log('❌ Name pattern matched but validation failed:', {
                    name,
                    length: name.length,
                    shouldExclude: shouldExclude(name),
                    hasLetters: /[A-Za-z\u0900-\u097F]/.test(name),
                  });
                }
              }
            } else {
              if (__DEV__) {
                console.log('❌ Name pattern did not match:', nextLine);
              }
            }
          }
          if (data.fullName) break;
        }
      }
    }
    
    // Pattern 3: All-caps name on its own line (fallback - improved detection)
    // Only if not found by previous patterns
    if (!data.fullName) {
      if (__DEV__) {
        console.log('🔍 Trying Pattern 3 - checking lines 2-10 for name');
      }
      // Check lines after government text (usually name is 2-4 lines after header)
      for (let i = 2; i < Math.min(lines.length, 10); i++) {
        const trimmedLine = lines[i].trim();
        
        if (__DEV__) {
          console.log('🔍 Pattern 3 - Line', i, ':', trimmedLine);
        }
        
        // Skip if excluded or clearly not a name
        if (!trimmedLine) {
          if (__DEV__) {
            console.log('⏭️ Pattern 3 - Skipping line', i, '- empty');
          }
          continue;
        }
        if (shouldExclude(trimmedLine)) {
          if (__DEV__) {
            console.log('⏭️ Pattern 3 - Skipping line', i, '- excluded by pattern:', trimmedLine);
          }
          continue;
        }
        if (/^\d+$/.test(trimmedLine)) {
          if (__DEV__) {
            console.log('⏭️ Pattern 3 - Skipping line', i, '- all digits');
          }
          continue;
        }
        if (/\d{2}[-\/]\d{2}[-\/]\d{4}/.test(trimmedLine)) {
          if (__DEV__) {
            console.log('⏭️ Pattern 3 - Skipping line', i, '- date pattern');
          }
          continue;
        }
        if (/^(Male|Female|M|F|DOB|Date|Year|Gender)$/i.test(trimmedLine)) {
          if (__DEV__) {
            console.log('⏭️ Pattern 3 - Skipping line', i, '- gender/date marker');
          }
          continue;
        }
        if (trimmedLine.length < 3) {
          if (__DEV__) {
            console.log('⏭️ Pattern 3 - Skipping line', i, '- too short');
          }
          continue;
        }
        
        // Match name pattern: 1-4 words, each 2+ characters (allow single word names)
        // CRITICAL: Allow mixed-case (A-Za-z) - OCR commonly returns mixed-case names like "Nikhil Kumar"
        const namePattern = /^([A-Za-z\u0900-\u097F]{2,}(?:\s+[A-Za-z\u0900-\u097F]{2,}){0,3})$/;
        const match = trimmedLine.match(namePattern);
        if (match && match[1]) {
          let name = match[1].trim();
          name = cleanName(name);
          // Final validation - must be meaningful name
          if (name.length >= 3 && !shouldExclude(name) && /[A-Za-z\u0900-\u097F]/.test(name)) {
            data.fullName = name;
            if (__DEV__) {
              console.log('✅ Name found via Pattern 3:', name);
            }
            break;
          } else {
            if (__DEV__) {
              console.log('❌ Pattern 3 - Name matched but validation failed:', {
                name,
                length: name.length,
                shouldExclude: shouldExclude(name),
                hasLetters: /[A-Za-z\u0900-\u097F]/.test(name),
              });
            }
          }
        } else {
          if (__DEV__) {
            console.log('❌ Pattern 3 - Name pattern did not match:', trimmedLine);
          }
        }
      }
    }
    
    // Final check - if still no name, log for debugging
    if (!data.fullName && __DEV__) {
      console.warn('⚠️ Name not detected after all patterns. OCR lines:', lines.slice(0, 10));
    }
    
    // If not found, leave empty - DO NOT infer from random words

    // STEP 4: DOB DETECTION (STRICT - NO REUSE OF OLD VALUES)
    // Detect ONLY if a valid date exists (DD/MM/YYYY or DD-MM-YYYY)
    // If NOT found: Leave DOB EMPTY
    
    // Pattern 1: Date with "DOB" or "Date of Birth" label
    const dobWithLabel = ocrText.match(/(?:DOB|Date of Birth|जन्म तिथि)\s*:?\s*(\d{2})[-\/](\d{2})[-\/](\d{4})\b/i);
    if (dobWithLabel) {
      const day = dobWithLabel[1];
      const month = dobWithLabel[2];
      const year = dobWithLabel[3];
      // Strict validation
      if (parseInt(day) >= 1 && parseInt(day) <= 31 &&
          parseInt(month) >= 1 && parseInt(month) <= 12 &&
          parseInt(year) >= 1900 && parseInt(year) <= 2099) {
        data.dateOfBirth = `${day}/${month}/${year}`;
      }
    }
    
    // Pattern 2: Date on its own line (DD-MM-YYYY or DD/MM/YYYY)
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
            break;
          }
        }
      }
    }
    
    // CRITICAL: If not found, leave empty - DO NOT reuse old values

    // STEP 5: ADDRESS DETECTION (IMPROVED - MORE FLEXIBLE)
    // Aadhaar address is typically on the BACK side but sometimes on front too
    // Look for address indicators and pincode
    
    // Indian address keywords - comprehensive list
    const addressKeywords = [
      // Street/Road indicators
      'street', 'road', 'lane', 'gali', 'marg', 'path', 'chowk', 'circle',
      // Area/Locality indicators
      'nagar', 'colony', 'village', 'mohalla', 'sector', 'block', 'ward', 'area', 'locality', 'vihar', 'enclave', 'park', 'garden', 'bagh', 'puram', 'pur', 'puri', 'garh', 'ganj', 'gunj', 'pet', 'peta', 'wadi', 'wada', 'gaon', 'khurd', 'kalan', 'khas',
      // Building indicators
      'house', 'flat', 'apartment', 'floor', 'building', 'tower', 'complex', 'society', 'plot', 'shop', 'office',
      // Administrative divisions
      'tehsil', 'taluka', 'mandal', 'district', 'dist', 'state', 'post', 'p.o', 'p.o.', 'ps', 'p.s', 'thana',
      // Common address prefixes
      's/o', 'c/o', 'd/o', 'w/o', 'h/no', 'h.no', 'house no', 'vill', 'tq', 'tal',
    ];
    
    // All Indian states and union territories
    const indianStates = [
      'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh', 'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka', 'kerala', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu', 'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal',
      'delhi', 'chandigarh', 'puducherry', 'ladakh', 'jammu', 'kashmir', 'andaman', 'nicobar', 'lakshadweep', 'dadra', 'nagar haveli', 'daman', 'diu',
      // Abbreviations
      'ap', 'ar', 'as', 'br', 'cg', 'ga', 'gj', 'hr', 'hp', 'jh', 'ka', 'kl', 'mp', 'mh', 'mn', 'ml', 'mz', 'nl', 'od', 'pb', 'rj', 'sk', 'tn', 'ts', 'tr', 'up', 'uk', 'wb', 'dl', 'ch', 'py', 'jk', 'an', 'ld', 'dn', 'dd',
    ];
    
    // Major Indian cities (top 100+)
    const indianCities = [
      'mumbai', 'delhi', 'bangalore', 'bengaluru', 'hyderabad', 'ahmedabad', 'chennai', 'kolkata', 'surat', 'pune', 'jaipur', 'lucknow', 'kanpur', 'nagpur', 'indore', 'thane', 'bhopal', 'visakhapatnam', 'vizag', 'patna', 'vadodara', 'ghaziabad', 'ludhiana', 'agra', 'nashik', 'faridabad', 'meerut', 'rajkot', 'varanasi', 'srinagar', 'aurangabad', 'dhanbad', 'amritsar', 'allahabad', 'prayagraj', 'ranchi', 'howrah', 'coimbatore', 'jabalpur', 'gwalior', 'vijayawada', 'jodhpur', 'madurai', 'raipur', 'kota', 'chandigarh', 'guwahati', 'solapur', 'hubli', 'mysore', 'mysuru', 'tiruchirappalli', 'trichy', 'bareilly', 'aligarh', 'tiruppur', 'moradabad', 'jalandhar', 'bhubaneswar', 'salem', 'warangal', 'guntur', 'bhiwandi', 'saharanpur', 'gorakhpur', 'bikaner', 'amravati', 'noida', 'jamshedpur', 'bhilai', 'cuttack', 'firozabad', 'kochi', 'cochin', 'nellore', 'bhavnagar', 'dehradun', 'durgapur', 'asansol', 'rourkela', 'nanded', 'kolhapur', 'ajmer', 'akola', 'gulbarga', 'jamnagar', 'ujjain', 'loni', 'siliguri', 'jhansi', 'ulhasnagar', 'jammu', 'sangli', 'mangalore', 'erode', 'belgaum', 'ambattur', 'tirunelveli', 'malegaon', 'gaya', 'udaipur', 'maheshtala', 'davanagere', 'kozhikode', 'calicut', 'thiruvananthapuram', 'trivandrum',
    ];
    
    // Helper function to check if text contains address indicators
    const hasAddressIndicator = (text: string): boolean => {
      const lowerText = text.toLowerCase();
      // Check for address keywords
      const hasKeyword = addressKeywords.some(keyword => lowerText.includes(keyword));
      // Check for state names
      const hasState = indianStates.some(state => lowerText.includes(state));
      // Check for city names
      const hasCity = indianCities.some(city => lowerText.includes(city));
      // Check for pincode
      const hasPincode = /\b\d{6}\b/.test(text);
      
      // Need at least 2 of these indicators
      const indicatorCount = [hasKeyword, hasState, hasCity, hasPincode].filter(Boolean).length;
      return indicatorCount >= 2;
    };
    
    // Helper function to clean address text
    const cleanAddress = (addr: string): string => {
      let cleaned = addr.trim();
      // Remove government/ID text
      cleaned = cleaned.replace(/(?:GOVERNMENT OF INDIA|भारत सरकार|GOVERNMENT|OF INDIA|VID|Aadhaar|UIDAI|Unique Identification)/gi, '').trim();
      // Remove multiple spaces
      cleaned = cleaned.replace(/\s+/g, ' ');
      // Remove leading/trailing punctuation
      cleaned = cleaned.replace(/^[,\s:]+|[,\s:]+$/g, '');
      return cleaned;
    };
    
    // Pattern 1: Explicit "Address" label with multi-line content
    const addressLabelPatterns = [
      /(?:Address|पता|ADDRESS|Address Line)[\s:]+([^\n]+(?:\n[^\n]+){0,5})/i,
      /(?:Address|पता)[\s:]*\n([^\n]+(?:\n[^\n]+){0,5})/i,
    ];
    
    for (const pattern of addressLabelPatterns) {
      if (data.address) break;
      const match = ocrText.match(pattern);
      if (match && match[1]) {
        let address = cleanAddress(match[1]);
        
        // Continue extracting until we hit a non-address line or max 5 lines
        const startIdx = ocrText.indexOf(match[1]);
        if (startIdx !== -1) {
          const remainingText = ocrText.slice(startIdx);
          const addressLines: string[] = [];
          const textLines = remainingText.split('\n');
          
          for (let i = 0; i < Math.min(textLines.length, 6); i++) {
            const line = textLines[i].trim();
            if (!line) continue;
            // Stop if we hit Aadhaar number or name patterns
            if (/^\d{4}\s*\d{4}\s*\d{4}$/.test(line)) break;
            if (/^(Male|Female|M|F|DOB|Date of Birth|जन्म)$/i.test(line)) break;
            addressLines.push(line);
          }
          
          address = cleanAddress(addressLines.join(' '));
        }
        
        // Validate address - at least 15 chars, has some address indicators
        if (address.length >= 15 && hasAddressIndicator(address)) {
          data.address = address;
          if (__DEV__) {
            console.log('✅ Address found via Pattern 1 (Address label):', address);
          }
        }
      }
    }
    
    // Pattern 2: S/O, C/O, D/O, W/O pattern (common in Indian addresses)
    if (!data.address) {
      const relationPatterns = [
        /(?:S\/O|C\/O|D\/O|W\/O|s\/o|c\/o|d\/o|w\/o)[\s:,]+([^\n]+(?:\n[^\n]+){0,5})/i,
      ];
      
      for (const pattern of relationPatterns) {
        const match = ocrText.match(pattern);
        if (match && match[1]) {
          // Get the full address block after S/O etc
          const startIdx = ocrText.indexOf(match[0]);
          if (startIdx !== -1) {
            const remainingText = ocrText.slice(startIdx);
            const addressLines: string[] = [];
            const textLines = remainingText.split('\n');
            
            for (let i = 0; i < Math.min(textLines.length, 6); i++) {
              const line = textLines[i].trim();
              if (!line) continue;
              // Stop if we hit Aadhaar number
              if (/^\d{4}\s*\d{4}\s*\d{4}$/.test(line)) break;
              if (/^(DOB|Date of Birth|जन्म|Gender)$/i.test(line)) break;
              addressLines.push(line);
            }
            
            let address = cleanAddress(addressLines.join(' '));
            
            // Validate
            if (address.length >= 15 && hasAddressIndicator(address)) {
              data.address = address;
              if (__DEV__) {
                console.log('✅ Address found via Pattern 2 (S/O pattern):', address);
              }
              break;
            }
          }
        }
      }
    }
    
    // Pattern 3: Look for pincode and extract surrounding text
    if (!data.address) {
      const pincodeMatch = ocrText.match(/\b(\d{6})\b/);
      if (pincodeMatch) {
        const pincodeIdx = ocrText.indexOf(pincodeMatch[0]);
        if (pincodeIdx !== -1) {
          // Get text before and after pincode (likely address)
          const beforePincode = ocrText.slice(Math.max(0, pincodeIdx - 200), pincodeIdx);
          const afterPincode = ocrText.slice(pincodeIdx, Math.min(ocrText.length, pincodeIdx + 50));
          
          // Find last meaningful break before pincode (name/DOB line)
          const beforeLines = beforePincode.split('\n').reverse();
          const addressLines: string[] = [];
          
          for (const line of beforeLines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            // Stop if we hit likely non-address content
            if (/^\d{2}[-\/]\d{2}[-\/]\d{4}$/.test(trimmed)) break; // DOB
            if (/^(Male|Female|M|F|DOB|जन्म|Gender)$/i.test(trimmed)) break;
            if (/^[A-Z\u0900-\u097F]{2,}(?:\s+[A-Z\u0900-\u097F]{2,}){1,3}$/.test(trimmed) && !hasAddressIndicator(trimmed)) break; // Name
            addressLines.unshift(trimmed);
            if (addressLines.length >= 5) break;
          }
          
          // Add pincode and any text after it
          const afterLines = afterPincode.split('\n');
          for (const line of afterLines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (/^\d{4}\s*\d{4}\s*\d{4}$/.test(trimmed)) break; // Aadhaar number
            addressLines.push(trimmed);
            if (addressLines.length >= 6) break;
          }
          
          let address = cleanAddress(addressLines.join(' '));
          
          if (address.length >= 15 && hasAddressIndicator(address)) {
            data.address = address;
            if (__DEV__) {
              console.log('✅ Address found via Pattern 3 (Pincode-based):', address);
            }
          }
        }
      }
    }
    
    // Pattern 4: Look for house number pattern (H.No, House No, etc)
    if (!data.address) {
      const houseNoMatch = ocrText.match(/(?:H\.?No\.?|House\s*No\.?|Flat\s*No\.?|Plot\s*No\.?)[\s:,]*([^\n]+(?:\n[^\n]+){0,5})/i);
      if (houseNoMatch && houseNoMatch[1]) {
        const startIdx = ocrText.indexOf(houseNoMatch[0]);
        if (startIdx !== -1) {
          const remainingText = ocrText.slice(startIdx);
          const addressLines: string[] = [];
          const textLines = remainingText.split('\n');
          
          for (let i = 0; i < Math.min(textLines.length, 6); i++) {
            const line = textLines[i].trim();
            if (!line) continue;
            if (/^\d{4}\s*\d{4}\s*\d{4}$/.test(line)) break;
            addressLines.push(line);
          }
          
          let address = cleanAddress(addressLines.join(' '));
          
          if (address.length >= 15) {
            data.address = address;
            if (__DEV__) {
              console.log('✅ Address found via Pattern 4 (House No):', address);
            }
          }
        }
      }
    }
    
    // Log if address not found
    if (!data.address && __DEV__) {
      console.warn('⚠️ Address not detected. May be on back side of Aadhaar. OCR text sample:', ocrText.slice(0, 500));
    }

    return data;
  };

  /**
   * Handle image upload
   */
  const handleUploadImage = async () => {
    // Check if running in Expo Go - silently fall back to manual entry
    if (isExpoGo) {
      console.log('[AadhaarScan] Expo Go detected - using manual entry mode');
      setExtractedData({
        fullName: '',
        aadhaarNumber: '',
        dateOfBirth: '',
        address: '',
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
        Alert.alert('Permission Required', 'Please grant media library permissions to upload Aadhaar image.');
        return;
      }

      // Show image picker options
      Alert.alert(
        'Select Aadhaar Image',
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
    // CRITICAL: Reset ALL Aadhaar-related state to EMPTY
    // This MUST happen BEFORE any OCR processing
    const emptyData: ExtractedData = {
      fullName: '',
      aadhaarNumber: '',
      dateOfBirth: '',
      address: '',
    };
    
    // Reset ALL state variables
    setExtractedData(emptyData);
    setShowForm(false);
    setIsConfirmed(false);
    setIsManualEntry(false);
    setNeedsBackSide(false);
    setBackImageUri(null);
    setIsProcessingBack(false);
    setImageUri(null); // Clear previous image URI
    
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
            console.log('🗑️ Image file deleted (security)');
          }
        }
      } catch (deleteError) {
        // Silently handle deletion errors
        if (__DEV__) {
          console.warn('⚠️ Could not delete image file:', deleteError);
        }
      }
    };

    try {
      if (__DEV__) {
        console.log('📸 Processing image for OCR...');
        // DO NOT log URI (contains user file path)
      }

      // Try to perform OCR
      let ocrResult;
      try {
        ocrResult = await ocrService.recognizeText(uri);
        
        if (__DEV__) {
          console.log('✅ OCR Success! Text extracted (length:', ocrResult.text.length, 'chars)');
          // NEVER log OCR text (contains sensitive PII data)
        }
      } catch (ocrError: unknown) {
        // CRITICAL: Delete image before showing error
        await deleteImage();

        if (__DEV__) {
          console.error('❌ OCR Error:', ocrError instanceof Error ? ocrError.name : 'Unknown');
        }
        
        // Handle Expo Go detection - silently fall back to manual entry
        if (ocrError instanceof ExpoGoDetectedError || getErrorMessage(ocrError) === 'EXPO_GO_DETECTED') {
          console.log('[AadhaarScan] Expo Go detected during OCR - using manual entry');
          setExtractedData(emptyData);
          setShowForm(true);
          setIsManualEntry(true);
          setIsProcessing(false);
          return;
        }
        
        // Handle OCR not available error - silently fall back to manual entry
        if (ocrError instanceof OCRNotAvailableError) {
          console.log('[AadhaarScan] OCR not available - using manual entry');
          setExtractedData(emptyData);
          setShowForm(true);
          setIsManualEntry(true);
          setIsProcessing(false);
          return;
        }
        
        // Handle generic OCR errors - silently fall back to manual entry
        console.log('[AadhaarScan] OCR processing error - using manual entry');
        setExtractedData(emptyData);
        setShowForm(true);
        setIsManualEntry(true);
        setIsProcessing(false);
        return;
      }

      // ============================================
      // STEP 2: OCR EXECUTION
      // ============================================
      // Store OCR text in local variable (NOT state)
      // DO NOT log OCR text (security requirement - contains sensitive data)
      const ocrText = ocrResult.text;
      
      if (__DEV__) {
        console.log('✅ OCR Success! Text extracted (length:', ocrText.length, 'chars)');
      }
      
      // ============================================
      // STEP 3: DATA EXTRACTION (STRICT)
      // ============================================
      // CRITICAL: Extract from CURRENT OCR text only
      // extractAadhaarData always starts with empty data object
      // NEVER reuse old values - extraction function is stateless
      const extracted = extractAadhaarData(ocrText);
      
      // CRITICAL: Do NOT use service extractor as fallback
      // Service extractor might have cached or incorrect values
      // ONLY use local extraction which is strict and fresh
      if (extracted.aadhaarNumber && extracted.aadhaarNumber.length === 12) {
        if (__DEV__) {
          console.log('✅ Aadhaar number extracted:', extracted.aadhaarNumber.substring(0, 4) + '****' + extracted.aadhaarNumber.substring(8));
        }
      } else {
        // Ensure it's empty if not found
        extracted.aadhaarNumber = '';
        if (__DEV__) {
          console.warn('⚠️ No Aadhaar number detected in OCR text');
        }
      }
      
      // CRITICAL: Do NOT use service extractor for name - it might include wrong text
      // Only use local extraction which has strict exclusion rules
      if (__DEV__) {
        if (extracted.fullName) {
          console.log('✅ Name extracted:', extracted.fullName);
        } else {
          console.warn('⚠️ No name detected in OCR text');
        }
      }
      
      // Log only extraction results (not OCR text) for debugging
      if (__DEV__) {
        console.log('📊 STRICT Extraction Results:', {
          name: extracted.fullName ? 'Found' : 'Not detected',
          aadhaar: extracted.aadhaarNumber ? 'Found (12 digits)' : 'Not detected',
          dob: extracted.dateOfBirth ? 'Found' : 'Not detected',
          address: extracted.address ? 'Found' : 'Not detected',
        });
      }

      // Address check (for logging only - we don't prompt for back side anymore)
      const hasAddress = extracted.address && extracted.address.trim().length >= 15;
      
      if (__DEV__) {
        console.log('📍 Address check:', {
          hasAddress,
          addressLength: extracted.address?.length || 0,
        });
      }
      
      // Final validation - ensure we have at least some data
      const hasData = extracted.fullName || extracted.aadhaarNumber || extracted.dateOfBirth;
      
      if (__DEV__) {
        console.log('📊 Final extracted data:', {
          name: extracted.fullName || 'Not found',
          aadhaar: extracted.aadhaarNumber ? 'Found (12 digits)' : 'Not found',
          dob: extracted.dateOfBirth || 'Not found',
          address: extracted.address ? 'Found' : 'Not found',
          hasAnyData: hasData,
        });
      }

      // ============================================
      // STEP 5: FORM BINDING (ATOMIC STATE UPDATE)
      // ============================================
      // CRITICAL: Set extracted data from CURRENT OCR scan only
      // This replaces ALL previous values - no old data persists
      // extracted object is guaranteed fresh (created from current ocrText)
      // CRITICAL: This must happen BEFORE image deletion to prevent race conditions
      setExtractedData(extracted);
      setNeedsBackSide(false);
      
      // CRITICAL: Always show form after OCR (even if some fields are missing)
      // Form inputs are bound to extractedData state - they will show current values
      setShowForm(true);
      
      // Determine if manual entry based on whether Aadhaar number was found
      const hasAadhaarNumber = extracted.aadhaarNumber && extracted.aadhaarNumber.length === 12;
      setIsManualEntry(!hasAadhaarNumber); // Manual entry only if Aadhaar number not found
      
      // Store final Aadhaar number for alert (from current extraction only)
      const finalAadhaarNumber = hasAadhaarNumber ? extracted.aadhaarNumber : '';
      
      // ============================================
      // STEP 6: IMAGE DELETION (SECURITY)
      // ============================================
      // CRITICAL: Always delete image after OCR
      await deleteImage();
      
      if (__DEV__) {
        console.log('✅ Form displayed with extracted data');
        // DO NOT log extracted values (contains PII)
      }
      
      // Show success message with extracted fields
      setTimeout(() => {
        const extractedFields = [];
        if (extracted.fullName) extractedFields.push('Name');
        if (finalAadhaarNumber) extractedFields.push('Aadhaar Number');
        if (extracted.dateOfBirth) extractedFields.push('Date of Birth');
        if (extracted.address) extractedFields.push('Address');
        
        const summary = extractedFields.length > 0 
          ? `Extracted: ${extractedFields.join(', ')}`
          : 'No data extracted. Please enter details manually.';
        
        const maskedAadhaar = finalAadhaarNumber ? maskAadhaarNumber(finalAadhaarNumber) : 'Not found';
        
        Alert.alert(
          'OCR Complete ✅',
          `${summary}\nAadhaar: ${maskedAadhaar}\n\nPlease verify and edit if needed.`,
          [{ text: 'OK' }]
        );
      }, 500);
      
    } catch (error: unknown) {
      // CRITICAL: Always delete image on error
      await deleteImage();

      if (__DEV__) {
        console.error('❌ Unexpected error in processImage:', error);
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
   * Process back side image for address extraction
   */
  const processBackImage = async (uri: string) => {
    setIsProcessingBack(true);
    setBackImageUri(uri);

    try {
      if (__DEV__) {
        console.log('📸 Processing BACK side image for address extraction:', uri.substring(0, 100));
      }

      // Perform OCR on back side
      let ocrResult;
      try {
        ocrResult = await ocrService.recognizeText(uri);
        
        // DO NOT log OCR text (security requirement)
        if (__DEV__) {
          console.log('✅ Back side OCR completed. Text extracted (length:', ocrResult.text.length, 'chars)');
        }
      } catch (ocrError: unknown) {
        if (__DEV__) {
          console.error('❌ Back side OCR Error:', getErrorMessage(ocrError) || ocrError);
        }
        Alert.alert(
          'OCR Failed',
          'Could not extract address from back side. You can enter it manually.',
          [{ text: 'OK' }]
        );
        setIsProcessingBack(false);
        return;
      }

      // Extract address from back side using STRICT detection
      const backExtracted = extractAadhaarData(ocrResult.text);
      
      // Strict validation: address must be 20+ characters (meaningful address)
      if (backExtracted.address && backExtracted.address.trim().length >= 20) {
        // STEP 6: Update address from back side (only address, keep other fields from front)
        // CRITICAL: Only update address, don't touch other fields
        setExtractedData(prev => ({
          fullName: prev.fullName, // Keep front side name
          aadhaarNumber: prev.aadhaarNumber, // Keep front side Aadhaar
          dateOfBirth: prev.dateOfBirth, // Keep front side DOB
          address: backExtracted.address, // Update with back side address
        }));
        
        setNeedsBackSide(false);
        
        Alert.alert(
          'Address Extracted',
          'Address has been extracted from the back side of your Aadhaar card.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Address Not Found',
          'Could not extract address from back side. Please enter it manually.',
          [{ text: 'OK' }]
        );
      }
      
      // Immediately delete the back side image file after OCR
      try {
        const fileUri = uri.startsWith('file://') ? uri : `file://${uri}`;
        const filePath = fileUri.replace('file://', '');
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(filePath, { idempotent: true });
          if (__DEV__) {
            console.log('🗑️ Back side image file deleted after OCR');
          }
        }
      } catch (deleteError) {
        // Silently handle deletion errors - not critical
        if (__DEV__) {
          console.warn('⚠️ Could not delete back side image file:', deleteError);
        }
      }
    } catch (error: unknown) {
      if (__DEV__) {
        console.error('❌ Error processing back side:', error);
      }
      Alert.alert(
        'Processing Error',
        'An error occurred while processing the back side image.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessingBack(false);
    }
  };

  /**
   * Handle back side image upload
   */
  const handleUploadBackImage = async () => {
    try {
      // Request media library permissions
      const mediaLibraryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (mediaLibraryStatus.status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant media library permissions.');
        return;
      }

      // Show image picker options
      Alert.alert(
        'Select Back Side of Aadhaar',
        'Upload the back side to extract address',
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
                  await processBackImage(result.assets[0].uri);
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
                  await processBackImage(result.assets[0].uri);
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
   * Handle form submission
   */
  const handleSubmit = async () => {
    if (!isConfirmed) {
      Alert.alert('Confirmation Required', 'Please confirm that the Aadhaar details are correct.');
      return;
    }

    if (!extractedData.aadhaarNumber || extractedData.aadhaarNumber.length !== 12) {
      Alert.alert('Invalid Aadhaar Number', 'Please ensure a valid 12-digit Aadhaar number is entered.');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not found. Please sign in again.');
      return;
    }

    try {
      setIsProcessing(true);

      // Submit to KYC store (handles both DB submission and local state update)
      await submitDocument(user.id, 'aadhaar', {
        documentNumber: extractedData.aadhaarNumber,
        name: extractedData.fullName || undefined,
        dateOfBirth: extractedData.dateOfBirth || undefined,
        address: extractedData.address || undefined,
      });

      Alert.alert(
        'Success',
        'Your Aadhaar details have been submitted for verification. You will be notified once verification is complete.',
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
        `Failed to submit KYC data: ${getErrorMessage(error) || 'Unknown error'}. Please try again.`
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
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color="#1e293b" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Aadhaar Card</Text>
            <Text style={styles.headerSubtitle}>Upload and verify details</Text>
          </View>
          <View style={styles.headerIconWrapper}>
            <MaterialCommunityIcons name="card-account-details" size={24} color="#0ea5e9" />
          </View>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Upload Card */}
          <View style={styles.uploadCard}>
            <View style={styles.uploadIconContainer}>
              <MaterialCommunityIcons name="card-account-details" size={48} color="#0ea5e9" />
            </View>
            <Text style={styles.uploadTitle}>Upload Aadhaar Image</Text>
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
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#0ea5e9', '#0284c7']}
                style={styles.uploadButtonGradient}
              >
                <Ionicons name="camera" size={22} color="#ffffff" />
                <Text style={styles.uploadButtonText}>
                  {imageUri ? 'Upload Another Image' : 'Upload Aadhaar Image'}
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
                    aadhaarNumber: '',
                    dateOfBirth: '',
                    address: '',
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
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>Verify Details</Text>
                <View style={styles.formBadge}>
                  <Text style={styles.formBadgeText}>Required</Text>
                </View>
              </View>

              {/* Full Name */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={extractedData.fullName}
                  onChangeText={(text) => setExtractedData({ ...extractedData, fullName: text })}
                  placeholder="Enter full name"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              {/* Aadhaar Number */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Aadhaar Number</Text>
                <TextInput
                  style={[styles.input, !isManualEntry && styles.readOnlyInput]}
                  value={
                    isManualEntry
                      ? extractedData.aadhaarNumber
                      : extractedData.aadhaarNumber && extractedData.aadhaarNumber.length === 12
                      ? maskAadhaarNumber(extractedData.aadhaarNumber)
                      : ''
                  }
                  editable={isManualEntry}
                  placeholder={isManualEntry ? "Enter 12-digit Aadhaar number" : "XXXX-XXXX-XXXX"}
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  maxLength={isManualEntry ? 12 : undefined}
                  onChangeText={(text) => {
                    const digitsOnly = text.replace(/\D/g, '');
                    if (digitsOnly.length <= 12) {
                      setExtractedData({ ...extractedData, aadhaarNumber: digitsOnly });
                    }
                  }}
                />
                <Text style={styles.inputHint}>
                  {isManualEntry ? 'Enter your 12-digit Aadhaar number' : 'Extracted from image (read-only)'}
                </Text>
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
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>

              {/* Address */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Address</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={extractedData.address}
                  onChangeText={(text) => setExtractedData({ ...extractedData, address: text })}
                  placeholder="Enter address"
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
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
                  I confirm the above Aadhaar details are correct
                </Text>
              </TouchableOpacity>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, !isConfirmed && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={!isConfirmed}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={isConfirmed ? ['#0ea5e9', '#0284c7'] : ['#94a3b8', '#64748b']}
                  style={styles.submitButtonGradient}
                >
                  <Text style={styles.submitButtonText}>Submit for Verification</Text>
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
                    aadhaarNumber: '',
                    dateOfBirth: '',
                    address: '',
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

          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="shield-checkmark" size={18} color="#64748b" />
            <Text style={styles.infoBannerText}>
              Your Aadhaar details are securely processed and encrypted. We never store your images.
            </Text>
          </View>

          <View style={styles.bottomSpacer} />
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
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  headerIconWrapper: {
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  // Upload Card
  uploadCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  uploadIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  uploadSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  processingContainer: {
    alignItems: 'center',
    marginVertical: 20,
    padding: 20,
  },
  processingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  imagePreviewContainer: {
    width: '100%',
    maxHeight: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#f1f5f9',
  },
  imagePreview: {
    width: '100%',
    height: 200,
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
  // Form Card
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  formBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  formBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3b82f6',
  },
  inputContainer: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  readOnlyInput: {
    backgroundColor: '#f1f5f9',
    color: '#64748b',
  },
  inputHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 6,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 16,
    textAlignVertical: 'top',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
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
    color: '#475569',
    flex: 1,
    lineHeight: 20,
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
    alignItems: 'center',
  },
  retakeButtonText: {
    color: '#0ea5e9',
    fontSize: 15,
    fontWeight: '600',
  },
  // Info Banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },
  bottomSpacer: {
    height: 32,
  },
});

