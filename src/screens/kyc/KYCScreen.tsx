import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '@/types';
import { useKYCStore, useAuthStore } from '@/store';
import type { KYCDocumentType, DocumentStatus } from '@/store';
import { KYC_DOCUMENT_TYPES } from '@/utils/constants';
import { getErrorMessage } from '@/utils/errorUtils';
import DocumentScanScreen from './DocumentScanScreen';
import LivenessCheckScreen from './LivenessCheckScreen';

type KYCScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'KYC'>;

interface Props {
  navigation: KYCScreenNavigationProp;
}

type DocumentType = (typeof KYC_DOCUMENT_TYPES)[number];

// Document configuration with icons, colors, and descriptions
const documentConfig: Record<DocumentType, { icon: string; color: string; description: string; title: string }> = {
  aadhaar: {
    icon: 'card-account-details',
    color: '#3b82f6',
    description: 'Government issued identity card',
    title: 'Aadhaar Card',
  },
  pan: {
    icon: 'card-account-details-outline',
    color: '#8b5cf6',
    description: 'Permanent Account Number card',
    title: 'PAN Card',
  },
  electricity_bill: {
    icon: 'file-document',
    color: '#10b981',
    description: 'Latest electricity bill',
    title: 'Electricity Bill',
  },
  gst: {
    icon: 'file-certificate',
    color: '#f59e0b',
    description: 'GST registration certificate',
    title: 'GST Certificate',
  },
  society_registration: {
    icon: 'office-building',
    color: '#ef4444',
    description: 'Society registration document',
    title: 'Society Registration',
  },
};

// Status badge configuration for per-document status
const statusConfig: Record<DocumentStatus, { label: string; color: string; bgColor: string; icon: string }> = {
  not_started: {
    label: 'Not Started',
    color: '#6b7280',
    bgColor: '#f3f4f6',
    icon: 'remove-circle-outline',
  },
  pending: {
    label: 'Pending',
    color: '#f59e0b',
    bgColor: '#fef3c7',
    icon: 'time-outline',
  },
  verified: {
    label: 'Verified',
    color: '#10b981',
    bgColor: '#d1fae5',
    icon: 'checkmark-circle',
  },
  rejected: {
    label: 'Rejected',
    color: '#ef4444',
    bgColor: '#fee2e2',
    icon: 'close-circle',
  },
};

// Overall status configuration
const overallStatusConfig: Record<string, { label: string; color: string; icon: string; message: string }> = {
  not_started: {
    label: 'Not Started',
    color: '#6b7280',
    icon: 'information-circle-outline',
    message: 'Start by uploading your identity documents',
  },
  pending: {
    label: 'Pending Review',
    color: '#f59e0b',
    icon: 'time-outline',
    message: 'Your documents are being reviewed',
  },
  verified: {
    label: 'Verified',
    color: '#10b981',
    icon: 'checkmark-circle',
    message: 'Your identity has been verified',
  },
  rejected: {
    label: 'Rejected',
    color: '#ef4444',
    icon: 'close-circle',
    message: 'Please resubmit your documents',
  },
  partial: {
    label: 'Partially Complete',
    color: '#3b82f6',
    icon: 'hourglass-outline',
    message: 'Some documents still need to be submitted',
  },
};

export default function KYCScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const { 
    overallStatus, 
    documentStatuses, 
    documents,
    isLoading, 
    fetchKYCDocuments, 
    getDocumentStatus,
    getDocument,
    isVerified,
    submitDocument,
  } = useKYCStore();
  
  const [selectedDocument, setSelectedDocument] = useState<DocumentType | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showLivenessCheck, setShowLivenessCheck] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch KYC documents on mount and when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchKYCDocuments(user.id);
      }
    }, [user?.id, fetchKYCDocuments])
  );

  const handleRefresh = useCallback(async () => {
    if (user?.id) {
      setRefreshing(true);
      await fetchKYCDocuments(user.id);
      setRefreshing(false);
    }
  }, [user?.id, fetchKYCDocuments]);

  const handleDocumentPress = (docType: DocumentType) => {
    const status = getDocumentStatus(docType as KYCDocumentType);
    const document = getDocument(docType as KYCDocumentType);
    
    // If document is verified, show details (read-only)
    if (status === 'verified' && document) {
      showDocumentDetails(docType, document);
      return;
    }
    
    // If pending, show status
    if (status === 'pending') {
      Alert.alert(
        'Document Pending',
        'This document is currently being reviewed. You will be notified once verification is complete.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // If rejected, allow re-submission
    if (status === 'rejected') {
      Alert.alert(
        'Document Rejected',
        'Your document was rejected. Would you like to re-submit?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Re-submit', onPress: () => navigateToScan(docType) },
        ]
      );
      return;
    }
    
    // Otherwise navigate to scan screen
    navigateToScan(docType);
  };

  const showDocumentDetails = (docType: DocumentType, document: any) => {
    const config = documentConfig[docType];
    const status = getDocumentStatus(docType as KYCDocumentType);
    const statusCfg = statusConfig[status];
    
    Alert.alert(
      config.title,
      `Status: ${statusCfg.label}\n${document.documentNumber ? `Document Number: ${document.documentNumber}\n` : ''}${document.name ? `Name: ${document.name}\n` : ''}${document.submittedAt ? `Submitted: ${new Date(document.submittedAt).toLocaleDateString()}` : ''}`,
      [{ text: 'OK' }]
    );
  };

  const navigateToScan = (docType: DocumentType) => {
    switch (docType) {
      case 'aadhaar':
        navigation.navigate('AadhaarScan');
        break;
      case 'pan':
        navigation.navigate('PANScan');
        break;
      case 'electricity_bill':
        navigation.navigate('ElectricityBillScan');
        break;
      case 'gst':
        navigation.navigate('GSTScan');
        break;
      case 'society_registration':
        navigation.navigate('SocietyRegistrationScan');
        break;
    }
  };

  const handleScanComplete = async (result: { text: string; extractedData: any }) => {
    setShowScanner(false);
    
    if (!selectedDocument || !user?.id) {
      Alert.alert('Error', 'No document selected or user not found');
      return;
    }
    
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
      try {
        await submitDocument(user.id, selectedDocument as KYCDocumentType, {
          documentNumber: result.extractedData?.consumerNumber,
          name: result.extractedData?.name,
          address: result.extractedData?.address,
        });
        
        Alert.alert(
          'Document Submitted',
          'Your document has been submitted for verification. You will be notified once it is reviewed.'
        );
      } catch (error: unknown) {
        Alert.alert('Error', getErrorMessage(error) || 'Failed to submit document');
      }
    }
  };

  const handleLivenessComplete = async (imageUri: string) => {
    try {
      setShowLivenessCheck(false);
      
      if (!imageUri || !user?.id || !selectedDocument) {
        Alert.alert('Error', 'Failed to capture image. Please try again.');
        return;
      }
      
      await submitDocument(user.id, selectedDocument as KYCDocumentType, {
        fileUrl: imageUri,
      });

      Alert.alert(
        'Verification Submitted',
        'Your identity verification has been submitted. You will be notified once verification is complete.'
      );
    } catch (error: unknown) {
      Alert.alert('Error', getErrorMessage(error) || 'Failed to complete liveness check. Please try again.');
    }
  };

  // Render document scanner or liveness check if active
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

  // Render document card with per-document status badge
  const renderDocumentCard = (
    docType: DocumentType,
    isOptional?: boolean
  ) => {
    const config = documentConfig[docType];
    const status = getDocumentStatus(docType as KYCDocumentType);
    const statusCfg = statusConfig[status];
    
    return (
      <TouchableOpacity
        key={docType}
        style={[styles.documentCard, isOptional && styles.documentCardOptional]}
        onPress={() => handleDocumentPress(docType)}
        activeOpacity={0.7}
      >
        <View style={styles.documentCardInner}>
          <View style={[styles.documentIconWrapper, { backgroundColor: config.color + '15' }]}>
            <MaterialCommunityIcons
              name={config.icon as any}
              size={24}
              color={config.color}
            />
          </View>
          <View style={styles.documentCardContent}>
            <Text style={styles.documentCardTitle}>{config.title}</Text>
            <Text style={styles.documentCardSubtitle}>{config.description}</Text>
          </View>
          
          {/* Per-document status badge */}
          <View style={[styles.docStatusBadge, { backgroundColor: statusCfg.bgColor }]}>
            <Ionicons name={statusCfg.icon as any} size={14} color={statusCfg.color} />
            <Text style={[styles.docStatusText, { color: statusCfg.color }]}>
              {statusCfg.label}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Get overall status config
  const currentOverallStatus = overallStatusConfig[overallStatus] || overallStatusConfig.not_started;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#10b981', '#059669']}
        style={styles.gradientHeader}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>KYC Verification</Text>
            <Text style={styles.headerSubtitle}>Verify your identity to start trading</Text>
          </View>
          <View style={styles.shieldIconWrapper}>
            <MaterialCommunityIcons name="shield-check" size={28} color="#ffffff" />
          </View>
        </View>
      </LinearGradient>

      {/* Loading State */}
      {isLoading && !refreshing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading KYC status...</Text>
        </View>
      )}

      {!isLoading && (
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#10b981']}
              tintColor="#10b981"
            />
          }
        >
          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={20} color="#6b7280" />
            <Text style={styles.infoBannerText}>
              As per government regulations, we need to verify your identity before you can trade energy.
            </Text>
          </View>

          {/* Overall Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: currentOverallStatus.color + '12', borderColor: currentOverallStatus.color + '30' }]}>
            <View style={[styles.statusIconWrapper, { backgroundColor: currentOverallStatus.color + '20' }]}>
              <Ionicons
                name={currentOverallStatus.icon as any}
                size={20}
                color={currentOverallStatus.color}
              />
            </View>
            <View style={styles.statusBadgeContent}>
              <Text style={[styles.statusText, { color: currentOverallStatus.color }]}>
                {currentOverallStatus.label}
              </Text>
              <Text style={styles.statusSubtext}>
                {currentOverallStatus.message}
              </Text>
            </View>
          </View>

          {/* Verified State */}
          {isVerified() && (
            <View style={styles.verifiedContainer}>
              <View style={styles.verifiedIconWrapper}>
                <MaterialCommunityIcons name="check-circle" size={56} color="#10b981" />
              </View>
              <Text style={styles.verifiedTitle}>Identity Verified</Text>
              <Text style={styles.verifiedSubtitle}>
                Your identity has been successfully verified. You can now participate in energy trading.
              </Text>
            </View>
          )}

          {!isVerified() && (
            <>
              {/* Section 1: Identity Documents */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleWrapper}>
                    <View style={styles.sectionBadge}>
                      <Text style={styles.sectionBadgeText}>Required</Text>
                    </View>
                    <Text style={styles.sectionTitle}>Identity Documents</Text>
                  </View>
                  <Text style={styles.sectionSubtitle}>
                    Upload a government-issued ID to verify your identity
                  </Text>
                </View>

                <View style={styles.cardsContainer}>
                  {renderDocumentCard('aadhaar')}
                  {renderDocumentCard('pan')}
                </View>
              </View>

              {/* Section 2: Additional Documents */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleWrapper}>
                    <View style={styles.sectionBadge}>
                      <Text style={styles.sectionBadgeText}>Required</Text>
                    </View>
                    <Text style={styles.sectionTitle}>Additional Documents</Text>
                  </View>
                  <Text style={styles.sectionSubtitle}>
                    Required for meter verification
                  </Text>
                </View>

                <View style={styles.cardsContainer}>
                  {renderDocumentCard('electricity_bill')}
                </View>
              </View>

              {/* Section 3: Business Documents (Optional) */}
              <View style={[styles.section, styles.sectionOptional]}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleWrapper}>
                    <View style={[styles.sectionBadge, styles.sectionBadgeOptional]}>
                      <Text style={[styles.sectionBadgeText, styles.sectionBadgeTextOptional]}>Optional</Text>
                    </View>
                    <Text style={[styles.sectionTitle, styles.sectionTitleOptional]}>Business Documents</Text>
                  </View>
                  <Text style={styles.sectionSubtitle}>
                    For societies and commercial users
                  </Text>
                </View>

                <View style={styles.cardsContainer}>
                  {renderDocumentCard('gst', true)}
                  {renderDocumentCard('society_registration', true)}
                </View>
              </View>
            </>
          )}

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  gradientHeader: {
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  shieldIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 10,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    gap: 12,
  },
  statusIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadgeContent: {
    flex: 1,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
  },
  statusSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  section: {
    marginBottom: 28,
  },
  sectionOptional: {
    opacity: 0.9,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  sectionBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  sectionBadgeOptional: {
    backgroundColor: '#f3f4f6',
  },
  sectionBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#16a34a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionBadgeTextOptional: {
    color: '#6b7280',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  sectionTitleOptional: {
    color: '#374151',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  cardsContainer: {
    gap: 10,
  },
  documentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  documentCardOptional: {
    borderColor: '#f3f4f6',
  },
  documentCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  documentIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentCardContent: {
    flex: 1,
  },
  documentCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  documentCardSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  docStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  docStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  verifiedContainer: {
    backgroundColor: '#ecfdf5',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginBottom: 24,
  },
  verifiedIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  verifiedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 8,
  },
  verifiedSubtitle: {
    fontSize: 14,
    color: '#16a34a',
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 32,
  },
});
