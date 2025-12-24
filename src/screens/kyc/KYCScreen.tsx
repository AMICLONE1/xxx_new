import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types';
import { useKYCStore } from '@/store';
import { KYC_DOCUMENT_TYPES } from '@/utils/constants';
import DocumentScanScreen from './DocumentScanScreen';
import LivenessCheckScreen from './LivenessCheckScreen';

type KYCScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'KYC'>;

interface Props {
  navigation: KYCScreenNavigationProp;
}

type DocumentType = (typeof KYC_DOCUMENT_TYPES)[number];

export default function KYCScreen({ navigation }: Props) {
  const { status, setKYCData, isVerified } = useKYCStore();
  const [selectedDocument, setSelectedDocument] = useState<DocumentType | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showLivenessCheck, setShowLivenessCheck] = useState(false);
  const [documentsScanned, setDocumentsScanned] = useState<string[]>([]);

  const handleDocumentSelect = (docType: DocumentType) => {
    setSelectedDocument(docType);
    setShowScanner(true);
  };

  const handleScanComplete = async (result: { text: string; extractedData: any }) => {
    setShowScanner(false);
    
    if (!selectedDocument) {
      Alert.alert('Error', 'No document selected');
      return;
    }
    
    setDocumentsScanned([...documentsScanned, selectedDocument]);
    
    // If identity document scanned, show liveness check
    if (selectedDocument === 'aadhaar' || selectedDocument === 'pan') {
      Alert.alert(
        'Document Scanned',
        'Now please complete the liveness check to verify your identity.',
        [
          {
            text: 'Continue',
            onPress: () => setShowLivenessCheck(true),
          },
        ]
      );
    } else {
      // TODO: Upload to backend and verify
      if (!selectedDocument) {
        Alert.alert('Error', 'No document selected');
        return;
      }
      
      setKYCData({
        userId: 'current_user_id',
        documentType: selectedDocument,
        documentNumber: result.extractedData?.consumerNumber,
        status: 'pending',
        submittedAt: new Date(),
      });
    }
  };

  const handleLivenessComplete = async (imageUri: string) => {
    try {
      setShowLivenessCheck(false);
      
      if (!imageUri) {
        Alert.alert('Error', 'Failed to capture image. Please try again.');
        return;
      }
      
      // TODO: Upload liveness check image to backend
      // For now, set status to pending
      const scannedDoc = documentsScanned.find((doc) => doc === 'aadhaar' || doc === 'pan');
      if (scannedDoc) {
        setKYCData({
          userId: 'current_user_id',
          documentType: scannedDoc as 'aadhaar' | 'pan',
          status: 'pending',
          submittedAt: new Date(),
        });
      }

      Alert.alert(
        'Verification Submitted',
        'Your identity verification has been submitted. You will be notified once verification is complete.'
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to complete liveness check. Please try again.');
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'verified':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      default:
        return '#f59e0b';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'verified':
        return 'Verified';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Pending Verification';
    }
  };

  if (showScanner && selectedDocument) {
    return (
      <DocumentScanScreen
        documentType={selectedDocument}
        onScanComplete={handleScanComplete}
        onCancel={() => setShowScanner(false)}
      />
    );
  }

  if (showLivenessCheck) {
    return (
      <LivenessCheckScreen
        onComplete={handleLivenessComplete}
        onCancel={() => setShowLivenessCheck(false)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>KYC Verification</Text>
          <Text style={styles.subtitle}>
            As per government regulations, we need to verify your identity before you can trade
            energy.
          </Text>

          {status !== 'pending' && (
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {getStatusText()}
              </Text>
            </View>
          )}

          {!isVerified() && (
            <>
              <Text style={styles.sectionTitle}>Identity Documents</Text>
              <TouchableOpacity
                style={styles.documentButton}
                onPress={() => handleDocumentSelect('aadhaar')}
              >
                <Text style={styles.documentButtonText}>Scan Aadhaar Card</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.documentButton}
                onPress={() => handleDocumentSelect('pan')}
              >
                <Text style={styles.documentButtonText}>Scan PAN Card</Text>
              </TouchableOpacity>

              <Text style={styles.sectionTitle}>Additional Documents</Text>
              <TouchableOpacity
                style={styles.documentButton}
                onPress={() => handleDocumentSelect('electricity_bill')}
              >
                <Text style={styles.documentButtonText}>Scan Electricity Bill</Text>
              </TouchableOpacity>

              <Text style={styles.sectionTitle}>Business Documents (Optional)</Text>
              <TouchableOpacity
                style={styles.documentButton}
                onPress={() => handleDocumentSelect('gst')}
              >
                <Text style={styles.documentButtonText}>Upload GST Certificate</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.documentButton}
                onPress={() => handleDocumentSelect('society_registration')}
              >
                <Text style={styles.documentButtonText}>
                  Upload Society Registration
                </Text>
              </TouchableOpacity>
            </>
          )}

          {isVerified() && (
            <View style={styles.verifiedContainer}>
              <Text style={styles.verifiedText}>✓ Your identity has been verified</Text>
              <Text style={styles.verifiedSubtext}>
                You can now participate in energy trading
              </Text>
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
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
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
    marginBottom: 24,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 24,
    marginBottom: 12,
  },
  documentButton: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  documentButtonText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  verifiedContainer: {
    backgroundColor: '#f0fdf4',
    padding: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  verifiedText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10b981',
    marginBottom: 8,
  },
  verifiedSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
