import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types';

type TermsConditionsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'TermsConditions'
>;

interface Props {
  navigation: TermsConditionsScreenNavigationProp;
}

// Terms & Conditions Content
const TERMS_SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    content:
      'By accessing or using the PowerNetPro mobile application, you agree to be bound by these Terms & Conditions and all applicable laws and regulations.',
  },
  {
    title: '2. User Eligibility',
    content:
      'You must be at least 18 years old and legally eligible to participate in energy trading activities under Indian law.',
  },
  {
    title: '3. Account Registration',
    content:
      'You are responsible for providing accurate and complete information during registration. Any false information may result in account suspension.',
  },
  {
    title: '4. KYC & Verification',
    content:
      'PowerNetPro requires identity verification as per government regulations. You agree to submit valid documents for KYC and consent to verification.',
  },
  {
    title: '5. Energy Trading Disclaimer',
    content:
      'PowerNetPro acts as a technology platform facilitating peer-to-peer energy discovery. Actual energy delivery, pricing, and settlement are subject to utility rules and regulatory approvals.',
  },
  {
    title: '6. No Guaranteed Earnings',
    content:
      'PowerNetPro does not guarantee profits or energy availability. All trades depend on market conditions and grid constraints.',
  },
  {
    title: '7. Data Privacy',
    content:
      'Your data is handled in accordance with the Digital Personal Data Protection Act, 2023. Sensitive data is encrypted and processed only for legitimate purposes.',
  },
  {
    title: '8. User Responsibilities',
    content:
      'You agree not to misuse the platform, submit fraudulent data, or attempt unauthorized access.',
  },
  {
    title: '9. Limitation of Liability',
    content:
      'PowerNetPro shall not be liable for indirect losses, grid outages, pricing fluctuations, or third-party service failures.',
  },
  {
    title: '10. Account Termination',
    content:
      'PowerNetPro reserves the right to suspend or terminate accounts violating policies or regulations.',
  },
  {
    title: '11. Changes to Terms',
    content:
      'Terms may be updated periodically. Continued use of the app constitutes acceptance of revised terms.',
  },
  {
    title: '12. Governing Law',
    content: 'These Terms are governed by the laws of India.',
  },
];

const PRIVACY_POINTS = [
  'We collect only necessary data for onboarding, KYC, and trading',
  'Aadhaar images are never stored',
  'Data is encrypted in transit and at rest',
  'Users may request account deletion ("Right to Forget")',
  'Data is never sold to third parties',
];

export default function TermsConditionsScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Main Title */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>PowerNetPro</Text>
          <Text style={styles.mainSubtitle}>Terms & Conditions</Text>
          <Text style={styles.lastUpdated}>Last Updated: December 2025</Text>
        </View>

        {/* Terms Sections */}
        <View style={styles.sectionsContainer}>
          {TERMS_SECTIONS.map((section, index) => (
            <View key={index} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionContent}>{section.content}</Text>
            </View>
          ))}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Privacy Policy Section */}
        <View style={styles.privacySection}>
          <Text style={styles.privacyTitle}>Privacy Policy Summary</Text>
          <View style={styles.privacyPoints}>
            {PRIVACY_POINTS.map((point, index) => (
              <View key={index} style={styles.privacyPoint}>
                <View style={styles.bullet} />
                <Text style={styles.privacyText}>{point}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer Note */}
        <View style={styles.footerNote}>
          <Ionicons name="shield-checkmark" size={20} color="#10b981" />
          <Text style={styles.footerText}>
            Your data is protected under Indian data protection laws
          </Text>
        </View>

        {/* Accept Button */}
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.acceptButtonText}>I Understand</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 4,
  },
  mainSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#9ca3af',
  },
  sectionsContainer: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 24,
  },
  privacySection: {
    marginBottom: 24,
  },
  privacyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  privacyPoints: {
    gap: 12,
  },
  privacyPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginTop: 7,
    marginRight: 12,
  },
  privacyText: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  footerText: {
    flex: 1,
    fontSize: 13,
    color: '#166534',
    marginLeft: 10,
  },
  acceptButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
});
