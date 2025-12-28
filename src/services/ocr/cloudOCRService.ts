/**
 * Cloud-based OCR Service
 * Works in Expo Go using Google Cloud Vision API
 * This is a fallback for when native ML Kit is not available
 */

import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';

export interface CloudOCRResult {
  text: string;
  confidence: number;
  blocks: CloudTextBlock[];
}

export interface CloudTextBlock {
  text: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// API Configuration
// Note: For production, move this to a backend service for security
const GOOGLE_CLOUD_VISION_API_KEY = Constants.expoConfig?.extra?.googleCloudVisionApiKey || '';
const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

class CloudOCRService {
  private apiKey: string;

  constructor() {
    this.apiKey = GOOGLE_CLOUD_VISION_API_KEY;
  }

  /**
   * Check if cloud OCR is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 10;
  }

  /**
   * Set API key programmatically
   */
  setApiKey(key: string): void {
    this.apiKey = key;
  }

  /**
   * Convert image to base64
   */
  private async imageToBase64(imageUri: string): Promise<string> {
    try {
      // Handle different URI formats
      let uri = imageUri;
      if (!uri.startsWith('file://') && !uri.startsWith('http://') && !uri.startsWith('https://')) {
        uri = `file://${uri}`;
      }

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return base64;
    } catch (error: any) {
      if (__DEV__) {
        console.error('❌ Failed to read image:', error.message);
      }
      throw new Error(`Failed to read image: ${error.message}`);
    }
  }

  /**
   * Perform OCR using Google Cloud Vision API
   */
  async recognizeText(imageUri: string): Promise<CloudOCRResult> {
    if (!this.isConfigured()) {
      if (__DEV__) {
        console.warn('⚠️ Cloud OCR not configured - API key missing');
      }
      throw new Error('Cloud OCR not configured. Please set Google Cloud Vision API key.');
    }

    try {
      if (__DEV__) {
        console.log('☁️ Starting Cloud OCR...');
      }

      // Convert image to base64
      const base64Image = await this.imageToBase64(imageUri);

      // Prepare request body
      const requestBody = {
        requests: [
          {
            image: {
              content: base64Image,
            },
            features: [
              {
                type: 'TEXT_DETECTION',
                maxResults: 10,
              },
            ],
            imageContext: {
              languageHints: ['en', 'hi'], // English and Hindi for Indian documents
            },
          },
        ],
      };

      // Make API request
      const response = await fetch(`${VISION_API_URL}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `API request failed: ${response.status}`);
      }

      const data = await response.json();

      // Parse response
      const annotations = data.responses?.[0]?.textAnnotations;
      
      if (!annotations || annotations.length === 0) {
        if (__DEV__) {
          console.warn('⚠️ Cloud OCR: No text detected in image');
        }
        throw new Error('No text detected in image');
      }

      // First annotation contains the full text
      const fullText = annotations[0]?.description || '';
      
      // Remaining annotations are individual text blocks
      const blocks: CloudTextBlock[] = annotations.slice(1).map((annotation: any) => ({
        text: annotation.description || '',
        boundingBox: annotation.boundingPoly?.vertices?.[0] ? {
          x: annotation.boundingPoly.vertices[0].x || 0,
          y: annotation.boundingPoly.vertices[0].y || 0,
          width: (annotation.boundingPoly.vertices[2]?.x || 0) - (annotation.boundingPoly.vertices[0]?.x || 0),
          height: (annotation.boundingPoly.vertices[2]?.y || 0) - (annotation.boundingPoly.vertices[0]?.y || 0),
        } : undefined,
      }));

      if (__DEV__) {
        console.log('✅ Cloud OCR completed. Text length:', fullText.length);
      }

      return {
        text: fullText,
        confidence: 1.0,
        blocks,
      };
    } catch (error: any) {
      if (__DEV__) {
        console.error('❌ Cloud OCR Error:', error.message);
      }
      throw error;
    }
  }

  /**
   * Extract Aadhaar number from OCR result
   */
  extractAadhaarNumber(text: string): string | null {
    if (!text) return null;

    // Pattern 1: Space-separated (1234 5678 9012)
    const spacePattern = /\b(\d{4})\s+(\d{4})\s+(\d{4})\b/;
    const spaceMatch = text.match(spacePattern);
    if (spaceMatch) {
      return spaceMatch[0].replace(/\s/g, '');
    }

    // Pattern 2: Dash-separated (1234-5678-9012)
    const dashPattern = /\b(\d{4})-(\d{4})-(\d{4})\b/;
    const dashMatch = text.match(dashPattern);
    if (dashMatch) {
      return dashMatch[0].replace(/-/g, '');
    }

    // Pattern 3: Continuous (123456789012)
    const continuousPattern = /\b(\d{12})\b/;
    const continuousMatch = text.match(continuousPattern);
    if (continuousMatch) {
      return continuousMatch[1];
    }

    return null;
  }

  /**
   * Extract PAN number from OCR result
   */
  extractPANNumber(text: string): string | null {
    if (!text) return null;

    // PAN format: ABCDE1234F
    const panPattern = /\b[A-Z]{5}\d{4}[A-Z]\b/;
    const match = text.match(panPattern);
    return match ? match[0] : null;
  }

  /**
   * Extract consumer number from electricity bill
   */
  extractConsumerNumber(text: string): string | null {
    if (!text) return null;

    // Various patterns for consumer numbers
    const patterns = [
      /(?:consumer|ca|account|service)\s*(?:no|number|id)?\s*:?\s*(\d{8,15})/gi,
      /(?:cons\.?\s*no\.?|c\.?a\.?\s*no\.?)\s*:?\s*(\d{8,15})/gi,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const numberMatch = match[0].match(/\d{8,15}/);
        if (numberMatch) return numberMatch[0];
      }
    }

    return null;
  }

  /**
   * Extract DISCOM name from electricity bill
   */
  extractDISCOMName(text: string): string | null {
    if (!text) return null;

    const discomNames = [
      'MSEDCL', 'Maharashtra State Electricity',
      'TATA POWER', 'Tata Power',
      'ADANI', 'Adani Electricity',
      'BSES', 'BSES Rajdhani', 'BSES Yamuna',
      'TPDDL', 'Tata Power Delhi',
      'NDMC',
      'UPPCL', 'Uttar Pradesh Power',
      'DHBVN', 'UHBVN', // Haryana
      'PSPCL', // Punjab
      'BESCOM', 'CESC', 'MESCOM', // Karnataka
      'TANGEDCO', // Tamil Nadu
      'WBSEDCL', // West Bengal
    ];

    const upperText = text.toUpperCase();
    for (const discom of discomNames) {
      if (upperText.includes(discom.toUpperCase())) {
        return discom;
      }
    }

    return null;
  }
}

export const cloudOCRService = new CloudOCRService();
