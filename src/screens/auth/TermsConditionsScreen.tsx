import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
    icon: 'document-text-outline',
  },
  {
    title: '2. User Eligibility',
    content:
      'You must be at least 18 years old and legally eligible to participate in energy trading activities under Indian law.',
    icon: 'person-outline',
  },
  {
    title: '3. Account Registration',
    content:
      'You are responsible for providing accurate and complete information during registration. Any false information may result in account suspension.',
    icon: 'person-add-outline',
  },
  {
    title: '4. KYC & Verification',
    content:
      'PowerNetPro requires identity verification as per government regulations. You agree to submit valid documents for KYC and consent to verification.',
    icon: 'shield-checkmark-outline',
  },
  {
    title: '5. Energy Trading Disclaimer',
    content:
      'PowerNetPro acts as a technology platform facilitating peer-to-peer energy discovery. Actual energy delivery, pricing, and settlement are subject to utility rules and regulatory approvals.',
    icon: 'flash-outline',
  },
  {
    title: '6. No Guaranteed Earnings',
    content:
      'PowerNetPro does not guarantee profits or energy availability. All trades depend on market conditions and grid constraints.',
    icon: 'trending-up-outline',
  },
  {
    title: '7. Data Privacy',
    content:
      'Your data is handled in accordance with the Digital Personal Data Protection Act, 2023. Sensitive data is encrypted and processed only for legitimate purposes.',
    icon: 'lock-closed-outline',
  },
  {
    title: '8. User Responsibilities',
    content:
      'You agree not to misuse the platform, submit fraudulent data, or attempt unauthorized access.',
    icon: 'warning-outline',
  },
  {
    title: '9. Limitation of Liability',
    content:
      'PowerNetPro shall not be liable for indirect losses, grid outages, pricing fluctuations, or third-party service failures.',
    icon: 'alert-circle-outline',
  },
  {
    title: '10. Account Termination',
    content:
      'PowerNetPro reserves the right to suspend or terminate accounts violating policies or regulations.',
    icon: 'close-circle-outline',
  },
  {
    title: '11. Changes to Terms',
    content:
      'Terms may be updated periodically. Continued use of the app constitutes acceptance of revised terms.',
    icon: 'refresh-outline',
  },
  {
    title: '12. Governing Law',
    content: 'These Terms are governed by the laws of India.',
    icon: 'globe-outline',
  },
];

const PRIVACY_POINTS = [
  { text: 'We collect only necessary data for onboarding, KYC, and trading', icon: 'checkmark-circle' },
  { text: 'Aadhaar images are never stored', icon: 'checkmark-circle' },
  { text: 'Data is encrypted in transit and at rest', icon: 'checkmark-circle' },
  { text: 'Users may request account deletion ("Right to Forget")', icon: 'checkmark-circle' },
  { text: 'Data is never sold to third parties', icon: 'checkmark-circle' },
];

export default function TermsConditionsScreen({ navigation }: Props) {
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
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Terms & Conditions</Text>
            <Text style={styles.headerSubtitle}>Legal Information</Text>
          </View>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title Card */}
          <View style={styles.titleCard}>
            <View style={styles.titleIconContainer}>
              <LinearGradient
                colors={['#0ea5e9', '#0284c7']}
                style={styles.titleIconGradient}
              >
                <MaterialCommunityIcons name="file-document-outline" size={32} color="#ffffff" />
              </LinearGradient>
            </View>
            <Text style={styles.mainTitle}>PowerNetPro</Text>
            <Text style={styles.mainSubtitle}>Terms & Conditions</Text>
            <View style={styles.lastUpdatedBadge}>
              <Ionicons name="calendar-outline" size={14} color="#0ea5e9" />
              <Text style={styles.lastUpdated}>Last Updated: December 2025</Text>
            </View>
          </View>

          {/* Terms Sections Card */}
          <View style={styles.termsCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconContainer}>
                <Ionicons name="list-outline" size={20} color="#0ea5e9" />
              </View>
              <Text style={styles.cardTitle}>Terms of Service</Text>
            </View>

            {TERMS_SECTIONS.map((section, index) => (
              <View key={index} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconContainer}>
                    <Ionicons name={section.icon as any} size={16} color="#0ea5e9" />
                  </View>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                </View>
                <Text style={styles.sectionContent}>{section.content}</Text>
              </View>
            ))}
          </View>

          {/* Privacy Policy Card */}
          <View style={styles.privacyCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconContainer}>
                <Ionicons name="shield-outline" size={20} color="#0ea5e9" />
              </View>
              <Text style={styles.cardTitle}>Privacy Policy Summary</Text>
            </View>

            <View style={styles.privacyPoints}>
              {PRIVACY_POINTS.map((point, index) => (
                <View key={index} style={styles.privacyPoint}>
                  <Ionicons name={point.icon as any} size={18} color="#0ea5e9" />
                  <Text style={styles.privacyText}>{point.text}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Footer Note */}
          <View style={styles.footerNote}>
            <View style={styles.footerIconContainer}>
              <Ionicons name="shield-checkmark" size={20} color="#0ea5e9" />
            </View>
            <Text style={styles.footerText}>
              Your data is protected under Indian data protection laws
            </Text>
          </View>

          {/* Accept Button */}
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#0ea5e9', '#0284c7']}
              style={styles.acceptButtonGradient}
            >
              <Ionicons name="checkmark-circle" size={20} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.acceptButtonText}>I Understand</Text>
            </LinearGradient>
          </TouchableOpacity>

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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  // Title Section
  titleCard: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  titleIconContainer: {
    marginBottom: 16,
  },
  titleIconGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0ea5e9',
    marginBottom: 4,
  },
  mainSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  lastUpdatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#0284c7',
    fontWeight: '500',
  },
  // Terms Section
  termsCard: {
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  section: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  sectionContent: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 20,
    marginLeft: 38,
  },
  // Privacy Card
  privacyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 20,
  },
  privacyPoints: {
    gap: 14,
  },
  privacyPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f9ff',
    padding: 14,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  privacyText: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  // Footer Note
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bae6fd',
    gap: 12,
  },
  footerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    flex: 1,
    fontSize: 14,
    color: '#0284c7',
    fontWeight: '500',
    lineHeight: 20,
  },
  // Accept Button
  acceptButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  acceptButtonGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 20,
  },
});

