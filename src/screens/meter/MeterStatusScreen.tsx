import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMeterStore } from '@/store';
import { MeterVerificationStatus, RootStackParamList } from '@/types';

type MeterStatusScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'MeterStatus'>;

interface StatusStep {
  id: string;
  label: string;
  status: 'completed' | 'current' | 'pending';
}

export default function MeterStatusScreen() {
  const navigation = useNavigation<MeterStatusScreenNavigationProp>();
  const { currentMeter } = useMeterStore();
  const [steps, setSteps] = useState<StatusStep[]>([]);

  useEffect(() => {
    if (!currentMeter) return;

    const statusSteps: StatusStep[] = [
      {
        id: 'requested',
        label: 'Request Received',
        status:
          currentMeter.verificationStatus === 'pending' ||
          currentMeter.verificationStatus === 'verified' ||
          currentMeter.verificationStatus === 'rejected'
            ? 'completed'
            : currentMeter.verificationStatus === 'requested'
            ? 'current'
            : 'pending',
      },
      {
        id: 'pending',
        label: 'Verification in Progress',
        status:
          currentMeter.verificationStatus === 'verified'
            ? 'completed'
            : currentMeter.verificationStatus === 'pending'
            ? 'current'
            : 'pending',
      },
      {
        id: 'verified',
        label: 'Meter Verified',
        status:
          currentMeter.verificationStatus === 'verified'
            ? 'completed'
            : currentMeter.verificationStatus === 'pending' ||
              currentMeter.verificationStatus === 'requested'
            ? 'current'
            : 'pending',
      },
    ];

    setSteps(statusSteps);
  }, [currentMeter]);

  if (!currentMeter) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No meter registered</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getStatusColor = () => {
    switch (currentMeter.verificationStatus) {
      case 'verified':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      default:
        return '#f59e0b';
    }
  };

  const getStatusText = () => {
    switch (currentMeter.verificationStatus) {
      case 'verified':
        return 'Verified';
      case 'rejected':
        return 'Rejected';
      case 'pending':
        return 'Pending Verification';
      case 'requested':
        return 'Request Received';
      default:
        return 'Unknown';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Header with Back Button */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.title}>Meter Status</Text>
          </View>

          <View style={styles.meterInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>DISCOM</Text>
              <Text style={styles.infoValue}>{currentMeter.discomName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Consumer Number</Text>
              <Text style={styles.infoValue}>{currentMeter.consumerNumber}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Meter Serial ID</Text>
              <Text style={styles.infoValue}>{currentMeter.meterSerialId}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {getStatusText()}
              </Text>
            </View>
          </View>

          <View style={styles.timeline}>
            <Text style={styles.timelineTitle}>Progress</Text>
            {steps.map((step, index) => (
              <View key={step.id} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View
                    style={[
                      styles.timelineDot,
                      step.status === 'completed' && styles.timelineDotCompleted,
                      step.status === 'current' && styles.timelineDotCurrent,
                    ]}
                  >
                    {step.status === 'completed' && <Text style={styles.checkmark}>✓</Text>}
                    {step.status === 'current' && (
                      <ActivityIndicator size="small" color="#10b981" />
                    )}
                  </View>
                  {index < steps.length - 1 && (
                    <View
                      style={[
                        styles.timelineLine,
                        step.status === 'completed' && styles.timelineLineCompleted,
                      ]}
                    />
                  )}
                </View>
                <View style={styles.timelineRight}>
                  <Text
                    style={[
                      styles.timelineLabel,
                      step.status === 'current' && styles.timelineLabelCurrent,
                      step.status === 'completed' && styles.timelineLabelCompleted,
                    ]}
                  >
                    {step.label}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  meterInfo: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
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
  timeline: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  timelineLeft: {
    width: 40,
    alignItems: 'center',
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineDotCompleted: {
    backgroundColor: '#10b981',
  },
  timelineDotCurrent: {
    backgroundColor: '#f0fdf4',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e5e7eb',
    marginTop: 4,
    minHeight: 40,
  },
  timelineLineCompleted: {
    backgroundColor: '#10b981',
  },
  timelineRight: {
    flex: 1,
    paddingLeft: 16,
    justifyContent: 'center',
  },
  timelineLabel: {
    fontSize: 16,
    color: '#6b7280',
  },
  timelineLabelCurrent: {
    color: '#10b981',
    fontWeight: '600',
  },
  timelineLabelCompleted: {
    color: '#111827',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
});

