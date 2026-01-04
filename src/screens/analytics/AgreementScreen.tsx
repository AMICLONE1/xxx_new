import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '@/types';
import { useTransactionStore, useAuthStore } from '@/store';

const { width } = Dimensions.get('window');

const AgreementScreen = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'Agreement'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { mode, entityName, amount, rate } = route.params;
  
  const { addTransaction } = useTransactionStore();
  const { user } = useAuthStore();

  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedDisclosure, setAgreedDisclosure] = useState(false);
  const [signature, setSignature] = useState('');

  const isBuyer = mode === 'buyer';

  // Mock current user data
  const currentUserName = 'Rajesh Kumar';
  const currentUserEmail = 'rajesh@powernet.com';
  const currentUserKYC = 'Verified';

  // Agreement details
  const agreementDetails = {
    date: new Date().toLocaleDateString('en-IN'),
    time: new Date().toLocaleTimeString('en-IN'),
    quantity: '2,500 kWh',
    duration: '30 days',
    deliveryWindow: '6:00 AM - 8:00 PM',
  };

  const canConfirm = agreedTerms && agreedDisclosure && signature.trim().length > 2;

  const handleConfirm = () => {
    if (!canConfirm) return;
    
    // Record the transaction
    const energyAmount = amount || 2500; // Use passed amount or default
    const pricePerUnit = rate || 30; // Use passed rate or default
    const totalAmount = (energyAmount * pricePerUnit) / 1000; // Convert to proper calculation
    
    addTransaction({
      userId: user?.id || 'unknown',
      type: isBuyer ? 'energy_purchase' : 'energy_sale',
      amount: totalAmount,
      currency: 'INR',
      status: 'completed',
      energyAmount: energyAmount,
      pricePerUnit: pricePerUnit,
      counterPartyName: entityName || 'Unknown Party',
      tradeType: isBuyer ? 'buy' : 'sell',
      description: `${isBuyer ? 'Purchased' : 'Sold'} ${energyAmount} kWh from ${entityName}`,
    });
    
    Alert.alert(
      'Agreement Signed',
      `Digital agreement with ${entityName} has been signed successfully. Check History tab to view the transaction.`,
      [
        {
          text: 'OK',
          onPress: () => {
            navigation.navigate('Main');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient
        colors={isBuyer ? ['#ef4444', '#dc2626'] : ['#10b981', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={28} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <MaterialCommunityIcons
            name={isBuyer ? 'arrow-down-bold-circle' : 'arrow-up-bold-circle'}
            size={32}
            color="#ffffff"
          />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>{isBuyer ? 'Buyer Agreement' : 'Seller Agreement'}</Text>
            <Text style={styles.headerSubtitle}>Digital Energy Trade Contract</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Party Details */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Agreement Parties</Text>
        <View style={styles.partyContainer}>
          <View style={styles.partyCard}>
            <View style={styles.partyHeader}>
              <MaterialCommunityIcons name="account-circle" size={24} color="#3b82f6" />
              <Text style={styles.partyLabel}>{isBuyer ? 'Buyer' : 'Seller'} (You)</Text>
            </View>
            <Text style={styles.partyName}>{currentUserName}</Text>
            <Text style={styles.partyDetail}>{currentUserEmail}</Text>
            <View style={styles.kycBadge}>
              <MaterialCommunityIcons name="shield-check" size={14} color="#10b981" />
              <Text style={styles.kycText}>{currentUserKYC}</Text>
            </View>
          </View>

          <View style={styles.arrowBridge}>
            <MaterialCommunityIcons
              name={isBuyer ? 'arrow-right' : 'arrow-left'}
              size={24}
              color="#9ca3af"
            />
          </View>

          <View style={[styles.partyCard, { borderColor: isBuyer ? '#ef4444' : '#10b981' }]}>
            <View style={styles.partyHeader}>
              <MaterialCommunityIcons
                name="account-circle"
                size={24}
                color={isBuyer ? '#ef4444' : '#10b981'}
              />
              <Text style={[styles.partyLabel, { color: isBuyer ? '#ef4444' : '#10b981' }]}>
                {isBuyer ? 'Seller' : 'Buyer'}
              </Text>
            </View>
            <Text style={styles.partyName}>{entityName || 'Counterparty'}</Text>
            <Text style={styles.partyDetail}>counterparty@powernet.com</Text>
            <View style={styles.kycBadge}>
              <MaterialCommunityIcons name="shield-check" size={14} color="#10b981" />
              <Text style={styles.kycText}>Verified</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Trade Details */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Trade Details</Text>
        <View style={styles.detailGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Quantity</Text>
            <Text style={styles.detailValue}>{agreementDetails.quantity}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Unit Rate</Text>
            <Text style={styles.detailValue}>{rate || '₹6.50'}/kWh</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Total Amount</Text>
            <Text style={[styles.detailValue, { color: isBuyer ? '#ef4444' : '#10b981' }]}>
              {amount || '₹16,250'}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>{agreementDetails.duration}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Delivery Window</Text>
            <Text style={styles.detailValue}>{agreementDetails.deliveryWindow}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Agreement Date</Text>
            <Text style={styles.detailValue}>{agreementDetails.date}</Text>
          </View>
        </View>
      </View>

      {/* Terms & Conditions */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Digital Agreement Terms</Text>
        <Text style={styles.bodyText}>
          This digital agreement covers energy {isBuyer ? 'purchase' : 'sale'} terms including pricing,
          delivery schedule, penalties for default, and dispute resolution. Both parties commit to the
          outlined terms electronically.
        </Text>

        <View style={styles.termsSection}>
          <Text style={styles.termsTitle}>Key Terms</Text>
          <View style={styles.listRow}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#10b981" />
            <Text style={styles.listText}>Pricing locked for agreed quantity and duration.</Text>
          </View>
          <View style={styles.listRow}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#10b981" />
            <Text style={styles.listText}>Delivery windows and metering snapshots recorded.</Text>
          </View>
          <View style={styles.listRow}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#10b981" />
            <Text style={styles.listText}>Penalties for late delivery or non-payment outlined.</Text>
          </View>
          <View style={styles.listRow}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#10b981" />
            <Text style={styles.listText}>Disputes resolved via arbitration if applicable.</Text>
          </View>
          <View style={styles.listRow}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#10b981" />
            <Text style={styles.listText}>Digital signature legally binding under e-sign laws.</Text>
          </View>
        </View>
      </View>

      {/* Review & Consent */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Review & Consent</Text>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>I have read and accept the terms</Text>
            <Text style={styles.switchHint}>Confirm you've reviewed all conditions</Text>
          </View>
          <Switch value={agreedTerms} onValueChange={setAgreedTerms} trackColor={{ true: '#10b981' }} />
        </View>
        <View style={[styles.switchRow, { marginTop: 14 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>I consent to digital signature & data use</Text>
            <Text style={styles.switchHint}>Your signature will be legally binding</Text>
          </View>
          <Switch
            value={agreedDisclosure}
            onValueChange={setAgreedDisclosure}
            trackColor={{ true: '#10b981' }}
          />
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Digital Signature</Text>
        <Text style={styles.signHint}>Sign with your full legal name to confirm agreement</Text>
        <TextInput
          value={signature}
          onChangeText={setSignature}
          placeholder="Type full name as digital signature"
          style={styles.input}
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* Action Buttons */}
      <TouchableOpacity
        disabled={!canConfirm}
        onPress={handleConfirm}
        style={[styles.ctaButton, !canConfirm && styles.ctaDisabled]}
      >
        <MaterialCommunityIcons name="file-sign" size={18} color="#ffffff" />
        <Text style={styles.ctaText}>Sign & Confirm Agreement</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.secondaryButton}>
        <Text style={styles.secondaryText}>Decline & Close</Text>
      </TouchableOpacity>

      <View style={{ height: 28 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  backButton: {
    marginRight: 12,
    padding: 8,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#f3e8e8',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 12,
    marginVertical: 10,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  partyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partyCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
  },
  partyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  partyLabel: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#3b82f6',
  },
  partyName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  partyDetail: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  kycBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf3',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  kycText: {
    marginLeft: 6,
    fontSize: 11,
    fontWeight: '600',
    color: '#065f46',
  },
  arrowBridge: {
    marginHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailItem: {
    width: '50%',
    paddingBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  bodyText: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
    marginBottom: 12,
  },
  termsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  termsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  listText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#374151',
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 0,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  switchHint: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  signHint: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: '#f9fafb',
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  ctaButton: {
    marginHorizontal: 12,
    marginTop: 18,
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ctaDisabled: {
    backgroundColor: '#9ca3af',
  },
  ctaText: {
    marginLeft: 8,
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    marginHorizontal: 12,
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryText: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 15,
  },
});

export default AgreementScreen;
