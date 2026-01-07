import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ocrService, OCRResult } from '@/services/mlkit/ocrService';
import { getErrorMessage } from '@/utils/errorUtils';
import { KYC_DOCUMENT_TYPES } from '@/utils/constants';

type DocumentType = (typeof KYC_DOCUMENT_TYPES)[number];

interface Props {
  documentType: DocumentType;
  onScanComplete: (result: { text: string; extractedData: any }) => void;
  onCancel: () => void;
}

export default function DocumentScanScreen({
  documentType,
  onScanComplete,
  onCancel,
}: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to use the camera</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current || isScanning) return;

    setIsScanning(true);
    try {
      // Note: expo-camera doesn't have takePictureAsync in CameraView
      // This is a placeholder - actual implementation will use expo-camera's API
      Alert.alert(
        'Info',
        'Camera capture will be implemented with expo-camera API. For now, please use the image picker.'
      );
    } catch (error: unknown) {
      Alert.alert('Error', getErrorMessage(error) || 'Failed to capture image');
    } finally {
      setIsScanning(false);
    }
  };

  const handleImageProcess = async (imageUri: string) => {
    setIsScanning(true);
    try {
      const ocrResult = await ocrService.recognizeText(imageUri);
      
      let extractedData: any = {};
      
      switch (documentType) {
        case 'aadhaar':
          extractedData = {
            aadhaarNumber: ocrService.extractAadhaarNumber(ocrResult),
            name: ocrService.extractName(ocrResult),
          };
          break;
        case 'pan':
          extractedData = {
            panNumber: ocrService.extractPANNumber(ocrResult),
            name: ocrService.extractName(ocrResult),
          };
          break;
        case 'electricity_bill':
          extractedData = {
            consumerNumber: ocrService.extractConsumerNumber(ocrResult),
            discomName: ocrService.extractDISCOMName(ocrResult),
          };
          break;
      }

      onScanComplete({
        text: ocrResult.text,
        extractedData,
      });
    } catch (error: unknown) {
      Alert.alert('Error', getErrorMessage(error) || 'Failed to process document');
    } finally {
      setIsScanning(false);
    }
  };

  const getDocumentName = () => {
    const names: Record<DocumentType, string> = {
      aadhaar: 'Aadhaar Card',
      pan: 'PAN Card',
      electricity_bill: 'Electricity Bill',
      gst: 'GST Certificate',
      society_registration: 'Society Registration',
    };
    return names[documentType];
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          mode="picture"
        />
        {/* Overlay rendered outside CameraView with absolute positioning */}
        <View style={styles.overlay} pointerEvents="box-none">
          <View style={styles.header}>
            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Scan {getDocumentName()}</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.guideBox}>
            <View style={styles.guideFrame} />
            <Text style={styles.guideText}>
              Position the {getDocumentName()} within the frame
            </Text>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.captureButton, isScanning && styles.captureButtonDisabled]}
              onPress={handleCapture}
              disabled={isScanning}
            >
              {isScanning ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <View style={styles.captureButtonInner} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  guideBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  guideFrame: {
    width: '80%',
    aspectRatio: 1.6,
    borderWidth: 2,
    borderColor: '#10b981',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  guideText: {
    color: '#ffffff',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  footer: {
    padding: 32,
    alignItems: 'center',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10b981',
  },
  message: {
    fontSize: 16,
    color: '#111827',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

