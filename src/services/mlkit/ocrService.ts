import TextRecognition from '@react-native-ml-kit/text-recognition';
import Constants from 'expo-constants';
import { cloudOCRService } from '../ocr/cloudOCRService';

export interface OCRResult {
  text: string;
  blocks: TextBlock[];
}

export interface TextBlock {
  text: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Custom error types for better handling
export class OCRNotAvailableError extends Error {
  constructor(message: string = 'OCR_NOT_AVAILABLE') {
    super(message);
    this.name = 'OCRNotAvailableError';
  }
}

export class ExpoGoDetectedError extends Error {
  constructor() {
    super('EXPO_GO_DETECTED');
    this.name = 'ExpoGoDetectedError';
  }
}

class OCRService {
  /**
   * Check if running in Expo Go (not a development build)
   * CRITICAL: This determines if OCR can work
   */
  isRunningInExpoGo(): boolean {
    try {
      // Method 1: Check executionEnvironment
      const executionEnvironment = Constants.executionEnvironment;
      if (executionEnvironment === 'storeClient') {
        return true; // Running in Expo Go
      }
      
      // Method 2: Check appOwnership (legacy but still works)
      const appOwnership = Constants.appOwnership;
      if (appOwnership === 'expo') {
        return true;
      }
      
      // Method 3: Check if it's a standalone/bare app
      if (executionEnvironment === 'standalone' || executionEnvironment === 'bare') {
        return false; // Development build or production
      }
      
      // Default: assume Expo Go if we can't determine (safer)
      return true;
    } catch {
      return true; // Assume Expo Go on error (safer)
    }
  }

  /**
   * Check if ML Kit native module is functional
   */
  private testMLKitFunctionality(): boolean {
    try {
      if (typeof TextRecognition === 'undefined' || !TextRecognition) {
        return false;
      }
      return typeof TextRecognition.recognize === 'function';
    } catch {
      return false;
    }
  }

  /**
   * Check if OCR is available (either native or cloud)
   */
  async isOCRAvailable(): Promise<boolean> {
    // Native ML Kit available
    if (!this.isRunningInExpoGo() && this.testMLKitFunctionality()) {
      return true;
    }
    // Cloud OCR available
    if (cloudOCRService.isConfigured()) {
      return true;
    }
    return false;
  }

  /**
   * Check if cloud OCR is available (for Expo Go)
   */
  isCloudOCRAvailable(): boolean {
    return cloudOCRService.isConfigured();
  }

  /**
   * Extract text from image using ML Kit or Cloud OCR fallback
   * Uses Cloud OCR in Expo Go if configured, otherwise throws error
   */
  async recognizeText(imageUri: string): Promise<OCRResult> {
    // STEP 1: Check if running in Expo Go
    if (this.isRunningInExpoGo()) {
      // Try Cloud OCR as fallback
      if (cloudOCRService.isConfigured()) {
        if (__DEV__) {
          console.log('☁️ Using Cloud OCR (Expo Go detected)...');
        }
        try {
          const cloudResult = await cloudOCRService.recognizeText(imageUri);
          return {
            text: cloudResult.text,
            blocks: cloudResult.blocks.map(block => ({
              text: block.text,
              boundingBox: block.boundingBox || { x: 0, y: 0, width: 0, height: 0 },
            })),
          };
        } catch (cloudError: any) {
          if (__DEV__) {
            console.error('❌ Cloud OCR failed:', cloudError.message);
          }
          throw new OCRNotAvailableError(`Cloud OCR failed: ${cloudError.message}`);
        }
      }
      
      // No fallback available
      if (__DEV__) {
        console.warn('📱 Running in Expo Go - OCR requires development build or Cloud API');
      }
      throw new ExpoGoDetectedError();
    }

    // STEP 2: Verify ML Kit is available
    if (!this.testMLKitFunctionality()) {
      // Try Cloud OCR as fallback
      if (cloudOCRService.isConfigured()) {
        if (__DEV__) {
          console.log('☁️ Using Cloud OCR (ML Kit not available)...');
        }
        try {
          const cloudResult = await cloudOCRService.recognizeText(imageUri);
          return {
            text: cloudResult.text,
            blocks: cloudResult.blocks.map(block => ({
              text: block.text,
              boundingBox: block.boundingBox || { x: 0, y: 0, width: 0, height: 0 },
            })),
          };
        } catch (cloudError: any) {
          if (__DEV__) {
            console.error('❌ Cloud OCR failed:', cloudError.message);
          }
          throw new OCRNotAvailableError(`Cloud OCR failed: ${cloudError.message}`);
        }
      }
      
      if (__DEV__) {
        console.warn('⚠️ ML Kit module not available');
      }
      throw new OCRNotAvailableError('ML Kit module not available');
    }

    // STEP 3: Attempt native ML Kit OCR
    try {
      let processedUri = imageUri;
      if (!imageUri.startsWith('file://') && !imageUri.startsWith('http://') && !imageUri.startsWith('https://')) {
        processedUri = `file://${imageUri}`;
      }

      if (__DEV__) {
        console.log('🔍 Starting native OCR...');
      }

      const result = await TextRecognition.recognize(processedUri);
      
      if (!result || !result.text || result.text.trim().length === 0) {
        if (__DEV__) {
          console.warn('⚠️ OCR returned empty result');
        }
        throw new OCRNotAvailableError('OCR returned empty result - image may be unclear');
      }

      if (__DEV__) {
        console.log('✅ OCR completed. Text length:', result.text.length);
        // NEVER log OCR text (contains sensitive PII data)
      }
      
      return {
        text: result.text,
        blocks: (result.blocks || []).map((block: any) => ({
          text: block.text || '',
          boundingBox: {
            x: block.frame?.x || 0,
            y: block.frame?.y || 0,
            width: block.frame?.width || 0,
            height: block.frame?.height || 0,
          },
        })),
      };
    } catch (error: any) {
      // Re-throw our custom errors
      if (error instanceof ExpoGoDetectedError || error instanceof OCRNotAvailableError) {
        throw error;
      }

      // Check if error indicates Expo Go / module not linked
      const errorMessage = error?.message || '';
      const isNotLinkedError = 
        errorMessage.includes("doesn't seem to be linked") ||
        errorMessage.includes('not linked') ||
        errorMessage.includes('Make sure:') ||
        error?.code === 'MODULE_NOT_FOUND';

      if (isNotLinkedError) {
        if (__DEV__) {
          console.error('❌ ML Kit not linked - app requires development build');
        }
        throw new ExpoGoDetectedError();
      }

      // Other OCR errors - throw without fallback
      if (__DEV__) {
        console.error('❌ OCR Error:', errorMessage);
      }
      throw new OCRNotAvailableError(`OCR failed: ${errorMessage}`);
    }
  }

  /**
   * Extract Aadhaar number from OCR result
   * Returns null if not found - NEVER returns fake data
   */
  extractAadhaarNumber(ocrResult: OCRResult): string | null {
    if (!ocrResult || !ocrResult.text) {
      return null;
    }

    const lines = ocrResult.text.split('\n');
    
    // Priority 1: Look for Aadhaar number on its own line
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip lines with labels
      if (/VID|Aadhaar|Number|नंबर/i.test(trimmedLine) && !/^\d/.test(trimmedLine)) {
        continue;
      }
      
      const aadhaarLinePatterns = [
        /^(\d{4})\s+(\d{4})\s+(\d{4})$/, // "1234 5678 9012"
        /^(\d{4})-(\d{4})-(\d{4})$/,     // "1234-5678-9012"
        /^(\d{12})$/,                     // "123456789012"
      ];
      
      for (const pattern of aadhaarLinePatterns) {
        const match = trimmedLine.match(pattern);
        if (match) {
          const digits = match[0].replace(/\D/g, '');
          if (digits.length === 12) {
            return digits;
          }
        }
      }
    }
    
    // Priority 2: Find with separators anywhere
    const strictPattern = /\b(\d{4})[\s-](\d{4})[\s-](\d{4})\b/;
    const match = ocrResult.text.match(strictPattern);
    if (match) {
      const digits = match[0].replace(/\D/g, '');
      if (digits.length === 12) {
        return digits;
      }
    }
    
    return null;
  }

  /**
   * Extract PAN number from OCR result
   */
  extractPANNumber(ocrResult: OCRResult): string | null {
    if (!ocrResult || !ocrResult.text) {
      return null;
    }

    const panPattern = /\b[A-Z]{5}\d{4}[A-Z]{1}\b/g;
    const matches = ocrResult.text.match(panPattern);
    
    if (matches && matches.length > 0) {
      return matches[0];
    }
    
    return null;
  }

  /**
   * Extract name from OCR result (for Aadhaar/PAN)
   */
  extractName(ocrResult: OCRResult): string | null {
    if (!ocrResult || !ocrResult.text) {
      return null;
    }

    const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
    const matches = ocrResult.text.match(namePattern);
    
    if (matches && matches.length > 0) {
      return matches.reduce((longest, current) =>
        current.length > longest.length ? current : longest
      );
    }
    
    return null;
  }

  /**
   * Extract consumer number from electricity bill
   */
  extractConsumerNumber(ocrResult: OCRResult): string | null {
    if (!ocrResult || !ocrResult.text) {
      return null;
    }

    const consumerPattern = /(?:consumer|ca|account)\s*(?:no|number)?\s*:?\s*(\d{8,12})/gi;
    const matches = ocrResult.text.match(consumerPattern);
    
    if (matches && matches.length > 0) {
      const numberMatch = matches[0].match(/\d{8,12}/);
      return numberMatch ? numberMatch[0] : null;
    }
    
    return null;
  }

  /**
   * Extract DISCOM name from electricity bill
   */
  extractDISCOMName(ocrResult: OCRResult): string | null {
    if (!ocrResult || !ocrResult.text) {
      return null;
    }

    const discomNames = [
      'MSEDCL',
      'Tata Power',
      'Adani Electricity',
      'BSES',
      'TPDDL',
      'NDMC',
    ];
    
    const upperText = ocrResult.text.toUpperCase();
    
    for (const discom of discomNames) {
      if (upperText.includes(discom.toUpperCase())) {
        return discom;
      }
    }
    
    return null;
  }
}

export const ocrService = new OCRService();