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
  Dimensions,
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

const { width } = Dimensions.get('window');

type KYCScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'KYC'>;

interface Props {
  navigation: KYCScreenNavigationProp;
}

type DocumentType = (typeof KYC_DOCUMENT_TYPES)[number];

// Document configuration with icons, colors, and descriptions - updated to match theme
const documentConfig: Record<DocumentType, { icon: string; color: string; bgColor: string; description: string; title: string }> = {
  aadhaar: {
    icon: 'card-account-details',
    color: '#0ea5e9',
    bgColor: '#e0f2fe',
    description: 'Government issued identity card',
    title: 'Aadhaar Card',
  },
  pan: {
    icon: 'card-account-details-outline',
    color: '#3b82f6',
    bgColor: '#dbeafe',
    description: 'Permanent Account Number card',
    title: 'PAN Card',
  },
  electricity_bill: {
    icon: 'file-document',
    color: '#0ea5e9',
    bgColor: '#e0f2fe',
    description: 'Latest electricity bill',
    title: 'Electricity Bill',
  },
  gst: {
    icon: 'file-certificate',
    color: '#3b82f6',
    bgColor: '#dbeafe',
    description: 'GST registration certificate',
    title: 'GST Certificate',
  },
  society_registration: {
    icon: 'office-building',
    color: '#0ea5e9',
    bgColor: '#e0f2fe',
    description: 'Society registration document',
    title: 'Society Registration',
  },
};

// Status badge configuration for per-document status - updated colors
const statusConfig: Record<DocumentStatus, { label: string; color: string; bgColor: string; icon: string }> = {
  not_started: {
    label: 'Upload',
    color: '#64748b',
    bgColor: '#f1f5f9',
    icon: 'cloud-upload-outline',
  },
  pending: {
    label: 'Pending',
    color: '#0ea5e9',
    bgColor: '#e0f2fe',
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

// Overall status configuration - updated to match theme
const overallStatusConfig: Record<string, { label: string; color: string; bgColor: string; icon: string; message: string }> = {
  not_started: {
    label: 'Not Started',
    color: '#64748b',
    bgColor: '#f1f5f9',
    icon: 'information-circle-outline',
    message: 'Start by uploading your identity documents',
  },
  pending: {
    label: 'Pending Review',
    color: '#0ea5e9',
    bgColor: '#e0f2fe',
    icon: 'time-outline',
    message: 'Your documents are being reviewed',
  },
  verified: {
    label: 'Verified',
    color: '#10b981',
    bgColor: '#d1fae5',
    icon: 'checkmark-circle',
    message: 'Your identity has been verified',
  },
  rejected: {
    label: 'Rejected',
    color: '#ef4444',
    bgColor: '#fee2e2',
    icon: 'close-circle',
    message: 'Please resubmit your documents',
  },
  partial: {
    label: 'In Progress',
    color: '#0ea5e9',
    bgColor: '#e0f2fe',
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

  // Render document card with per-document status badge - symmetrical grid layout
  const renderDocumentCard = (docType: DocumentType) => {
    const config = documentConfig[docType];
    const status = getDocumentStatus(docType as KYCDocumentType);
    const statusCfg = statusConfig[status];

    return (
      <TouchableOpacity
        key={docType}
        style={styles.documentCard}
        onPress={() => handleDocumentPress(docType)}
        activeOpacity={0.9}
      >
        <View style={styles.documentCardInner}>
          {/* Icon container */}
          <View style={[styles.documentIconWrapper, { backgroundColor: config.bgColor }]}>
            <MaterialCommunityIcons
              name={config.icon as any}
              size={28}
              color={config.color}
            />
          </View>

          {/* Content */}
          <Text style={styles.documentCardTitle}>{config.title}</Text>
          <Text style={styles.documentCardSubtitle}>{config.description}</Text>

          {/* Status badge */}
          <View style={[styles.docStatusBadge, { backgroundColor: statusCfg.bgColor }]}>
            <Ionicons name={statusCfg.icon as any} size={12} color={statusCfg.color} />
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
            <Text style={styles.headerTitle}>KYC Verification</Text>
            <Text style={styles.headerSubtitle}>Verify your identity</Text>
          </View>
          <View style={styles.shieldIconWrapper}>
            <MaterialCommunityIcons name="shield-check" size={24} color="#0ea5e9" />
          </View>
        </View>

        {/* Loading State */}
        {isLoading && !refreshing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0ea5e9" />
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
                colors={['#0ea5e9']}
                tintColor="#0ea5e9"
              />
            }
          >
            {/* Overall Status Card */}
            <View style={styles.statusCard}>
              <View style={[styles.statusIconWrapper, { backgroundColor: currentOverallStatus.bgColor }]}>
                <Ionicons
                  name={currentOverallStatus.icon as any}
                  size={24}
                  color={currentOverallStatus.color}
                />
              </View>
              <View style={styles.statusCardContent}>
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
                  <MaterialCommunityIcons name="check-circle" size={64} color="#10b981" />
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
                    <Text style={styles.sectionTitle}>Identity Documents</Text>
                    <View style={styles.sectionBadge}>
                      <Text style={styles.sectionBadgeText}>Required</Text>
                    </View>
                  </View>

                  <View style={styles.cardsGrid}>
                    {renderDocumentCard('aadhaar')}
                    {renderDocumentCard('pan')}
                  </View>
                </View>

                {/* Section 2: Address Verification */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Address Verification</Text>
                    <View style={styles.sectionBadge}>
                      <Text style={styles.sectionBadgeText}>Required</Text>
                    </View>
                  </View>

                  <View style={styles.cardsGrid}>
                    {renderDocumentCard('electricity_bill')}
                  </View>
                </View>

                {/* Section 3: Business Documents (Optional) */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Business Documents</Text>
                    <View style={[styles.sectionBadge, styles.sectionBadgeOptional]}>
                      <Text style={[styles.sectionBadgeText, styles.sectionBadgeTextOptional]}>Optional</Text>
                    </View>
                  </View>

                  <View style={styles.cardsGrid}>
                    {renderDocumentCard('gst')}
                    {renderDocumentCard('society_registration')}
                  </View>
                </View>
              </>
            )}

            {/* Info Banner */}
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle" size={18} color="#64748b" />
              <Text style={styles.infoBannerText}>
                As per government regulations, we need to verify your identity before you can trade energy.
              </Text>
            </View>

            {/* Bottom Spacing */}
            <View style={styles.bottomSpacer} />
          </ScrollView>
        )}
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
  shieldIconWrapper: {
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  // Status Card - matches HomeScreen hero card style
  statusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginTop : 10,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  statusIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCardContent: {
    flex: 1,
    marginLeft: 14,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusSubtext: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  // Section styles
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  sectionBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sectionBadgeOptional: {
    backgroundColor: '#f1f5f9',
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3b82f6',
  },
  sectionBadgeTextOptional: {
    color: '#64748b',
  },
  // Cards Grid - symmetrical 2-column layout
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  // Document Card - symmetrical card design
  documentCard: {
    width: (width - 52) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  documentCardInner: {
    padding: 16,
    alignItems: 'center',
  },
  documentIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  documentCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 4,
  },
  documentCardSubtitle: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 15,
    marginBottom: 12,
  },
  docStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  docStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Info Banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
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
  // Verified State
  verifiedContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  verifiedIconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  verifiedTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 8,
  },
  verifiedSubtitle: {
    fontSize: 14,
    color: '#10b981',
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomSpacer: {
    height: 32,
  },
});
