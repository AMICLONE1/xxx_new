import TextRecognition from '@react-native-ml-kit/text-recognition';

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
   * Extract text from image using ML Kit
   */
  async recognizeText(imageUri: string): Promise<OCRResult> {
    try {
      const result = await TextRecognition.recognize(imageUri);
      
      return {
        text: result.text,
        blocks: result.blocks.map((block: any) => ({
          text: block.text,
          boundingBox: {
            x: block.frame.x,
            y: block.frame.y,
            width: block.frame.width,
            height: block.frame.height,
          },
        })),
      };
    } catch (error) {
      throw new Error(`OCR failed: ${error}`);
    }
  }

  /**
   * Extract Aadhaar number from OCR result
   */
  extractAadhaarNumber(ocrResult: OCRResult): string | null {
    // Aadhaar number pattern: 4 digits - 4 digits - 4 digits
    const aadhaarPattern = /\b\d{4}\s*-?\s*\d{4}\s*-?\s*\d{4}\b/g;
    const matches = ocrResult.text.match(aadhaarPattern);
    
    if (matches && matches.length > 0) {
      // Return the first match, cleaned
      return matches[0].replace(/\s+/g, '').replace(/-/g, '');
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

