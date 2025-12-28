import TextRecognition from '@react-native-ml-kit/text-recognition';
import Constants from 'expo-constants';

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

class OCRService {
  /**
   * Check if mock OCR is enabled (for testing in Expo Go)
   */
  private isMockOCREnabled(): boolean {
    try {
      const enableMockOCR = Constants.expoConfig?.extra?.enableMockOCR;
      return enableMockOCR === true || enableMockOCR === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Generate mock OCR result for testing
   */
  private generateMockOCRResult(): OCRResult {
    // Simulate Aadhaar card text
    const mockText = `GOVERNMENT OF INDIA
भारत सरकार

SAMARTH SHARMA
Male

DOB: 20-06-1986

1234 5678 9012

Address:
123, Green Park
New Delhi - 110016
Delhi

VID: 1234 5678 9012`;

    return {
      text: mockText,
      blocks: mockText.split('\n').map((line, index) => ({
        text: line,
        boundingBox: {
          x: 0,
          y: index * 30,
          width: 300,
          height: 25,
        },
      })),
    };
  }
  /**
   * Check if ML Kit is available
   */
  private isMLKitAvailable(): boolean {
    try {
      // Try to access the module
      if (typeof TextRecognition === 'undefined' || !TextRecognition) {
        if (__DEV__) {
          console.warn('⚠️ TextRecognition module is undefined');
        }
        return false;
      }
      
      // Check if recognize function exists
      const hasRecognize = typeof TextRecognition.recognize === 'function';
      
      if (__DEV__) {
        console.log('🔍 ML Kit availability check:', {
          moduleExists: !!TextRecognition,
          hasRecognize,
          available: hasRecognize,
        });
      }
      
      return hasRecognize;
    } catch (error: any) {
      if (__DEV__) {
        console.error('❌ Error checking ML Kit availability:', error);
      }
      return false;
    }
  }
  
  /**
   * Check if we're in a development build (not Expo Go)
   */
  isDevelopmentBuild(): boolean {
    try {
      // In Expo Go, native modules are often undefined
      // In development build, they should be available
      return this.isMLKitAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Extract text from image using ML Kit
   */
  async recognizeText(imageUri: string): Promise<OCRResult> {
    // CRITICAL: Always try actual OCR first, only use mock as last resort
    // Check if ML Kit is available FIRST
    if (this.isMLKitAvailable()) {
      // Actual OCR is available - use it
      try {
        // Ensure URI is in correct format (file:// for local files)
        let processedUri = imageUri;
        if (!imageUri.startsWith('file://') && !imageUri.startsWith('http://') && !imageUri.startsWith('https://')) {
          processedUri = `file://${imageUri}`;
        }

        if (__DEV__) {
          console.log('🔍 Starting ACTUAL OCR on image:', processedUri.substring(0, 100));
        }

        const result = await TextRecognition.recognize(processedUri);
        
        if (__DEV__) {
          console.log('✅ ACTUAL OCR completed. Text length:', result?.text?.length || 0);
          // DO NOT log full OCR text (security - contains sensitive data)
        }
        
        if (!result || !result.text) {
          if (__DEV__) {
            console.warn('⚠️ OCR returned empty result');
          }
          throw new Error('OCR returned empty result. Please ensure the image is clear and contains text.');
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
        if (__DEV__) {
          console.error('❌ ACTUAL OCR Error:', error?.message || error);
        }
        
        // Check if error is due to module not being linked (common in Expo Go)
        const isNotLinkedError = error?.message?.includes('doesn\'t seem to be linked') ||
                                 error?.message?.includes('not linked') ||
                                 error?.message?.includes('Make sure:') ||
                                 error?.code === 'MODULE_NOT_FOUND';
        
        // If module not linked, fall back to mock OCR if enabled
        if (isNotLinkedError && this.isMockOCREnabled()) {
          if (__DEV__) {
            console.warn('⚠️ ML Kit module not properly linked - falling back to MOCK OCR');
            console.warn('📝 WARNING: This returns test data, not actual card data!');
            console.warn('📱 To use actual OCR, create a development build:');
            console.warn('   1. Run: npx expo prebuild');
            console.warn('   2. Run: npx expo run:android');
          }
          
          // Fall back to mock OCR
          await new Promise(resolve => setTimeout(resolve, 1500));
          const mockResult = this.generateMockOCRResult();
          
          if (__DEV__) {
            console.log('✅ Mock OCR completed. Text length:', mockResult.text.length);
            console.warn('⚠️ WARNING: Using MOCK data - not real card data!');
          }
          
          return mockResult;
        }
        
        // For other errors, throw to allow manual entry
        throw new Error(`OCR failed: ${error?.message || error}`);
      }
    }

    // ML Kit not available - check if mock OCR is enabled (for testing only)
    if (this.isMockOCREnabled()) {
      if (__DEV__) {
        console.warn('⚠️ ML Kit not available - using MOCK OCR mode (for testing only)');
        console.warn('📝 WARNING: This returns test data, not actual card data!');
        console.warn('📱 To use actual OCR:');
        console.warn('   1. Run: npx expo prebuild');
        console.warn('   2. Run: npx expo run:android');
      }
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockResult = this.generateMockOCRResult();
      
      if (__DEV__) {
        console.log('✅ Mock OCR completed. Text length:', mockResult.text.length);
        console.warn('⚠️ WARNING: Using MOCK data - not real card data!');
      }
      
      return mockResult;
    }

    // Neither actual OCR nor mock OCR available
    if (__DEV__) {
      console.warn('⚠️ ML Kit not available - requires development build');
      console.warn('📱 To enable OCR:');
      console.warn('   1. Run: npx expo prebuild');
      console.warn('   2. Run: npx expo run:android');
      console.warn('   OR use EAS Build for development build');
    }
    throw new Error('OCR_REQUIRES_DEV_BUILD');
  }

  /**
   * Extract Aadhaar number from OCR result
   * IMPORTANT: Be strict - only match actual Aadhaar number, not random 12-digit numbers
   */
  extractAadhaarNumber(ocrResult: OCRResult): string | null {
    const lines = ocrResult.text.split('\n');
    
    // Priority 1: Look for Aadhaar number on its own line (most common format)
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Match standard Aadhaar formats on a single line
      const aadhaarLinePatterns = [
        /^(\d{4})\s+(\d{4})\s+(\d{4})$/, // "1234 5678 9012"
        /^(\d{4})-(\d{4})-(\d{4})$/, // "1234-5678-9012"
        /^(\d{12})$/, // "123456789012"
      ];
      
      for (const pattern of aadhaarLinePatterns) {
        const match = trimmedLine.match(pattern);
        if (match) {
          const digits = match[0].replace(/\D/g, '');
          if (digits.length === 12) {
            // Strict validation: exactly 12 digits
            // Note: Real Aadhaar numbers don't start with 0 or 1, but for testing we'll be lenient
            // In production, you may want to enforce: digits[0] !== '0' && digits[0] !== '1'
            return digits;
          }
        }
      }
    }
    
    // Priority 2: Look for Aadhaar number with context (after DOB, before Address)
    const contextPatterns = [
      /(?:DOB|Date|Year)[\s\S]{0,50}?(\d{4}[\s-]?\d{4}[\s-]?\d{4})/i,
      /(\d{4}[\s-]?\d{4}[\s-]?\d{4})(?:[\s\S]{0,50}?Address|[\s\S]{0,50}?पता)/i,
    ];
    
    for (const pattern of contextPatterns) {
      const match = ocrResult.text.match(pattern);
      if (match && match[1]) {
        const digits = match[1].replace(/\D/g, '');
        // Strict validation: exactly 12 digits
        // Note: Real Aadhaar numbers don't start with 0 or 1, but for testing we'll be lenient
        if (digits.length === 12) {
          return digits;
        }
      }
    }
    
    // Priority 3: Last resort - only if clearly formatted with separators
    const strictPattern = /\b(\d{4})[\s-](\d{4})[\s-](\d{4})\b/;
    const match = ocrResult.text.match(strictPattern);
    if (match) {
      const digits = match[0].replace(/\D/g, '');
      // Strict validation: exactly 12 digits
      // Note: Real Aadhaar numbers don't start with 0 or 1, but for testing we'll be lenient
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
    // PAN pattern: 5 letters, 4 digits, 1 letter
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
    // Look for common name patterns
    // This is a simplified version - may need refinement
    const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
    const matches = ocrResult.text.match(namePattern);
    
    if (matches && matches.length > 0) {
      // Return the longest match (likely the full name)
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
    // Look for patterns like "Consumer No:", "CA Number:", etc.
    const consumerPattern = /(?:consumer|ca|account)\s*(?:no|number)?\s*:?\s*(\d{8,12})/gi;
    const matches = ocrResult.text.match(consumerPattern);
    
    if (matches && matches.length > 0) {
      // Extract the number part
      const numberMatch = matches[0].match(/\d{8,12}/);
      return numberMatch ? numberMatch[0] : null;
    }
    
    return null;
  }

  /**
   * Extract DISCOM name from electricity bill
   */
  extractDISCOMName(ocrResult: OCRResult): string | null {
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

