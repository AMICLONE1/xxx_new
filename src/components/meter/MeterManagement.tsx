import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Meter } from '@/types';

interface MeterManagementProps {
  meters: Meter[];
  onAddMeter: () => void;
  onToggleMeter: (meterId: string, enabled: boolean) => void;
  onDisableMeter: (meterId: string) => void;
  onViewDetails: (meter: Meter) => void;
}

export const MeterManagement: React.FC<MeterManagementProps> = ({
  meters,
  onAddMeter,
  onToggleMeter,
  onDisableMeter,
  onViewDetails,
}) => {
  const [enabledMeters, setEnabledMeters] = useState<{ [key: string]: boolean }>(
    meters.reduce((acc, meter) => ({ ...acc, [meter.id]: true }), {})
  );

  const handleToggle = (meterId: string, value: boolean) => {
    setEnabledMeters(prev => ({ ...prev, [meterId]: value }));
    onToggleMeter(meterId, value);
  };

  const handleDisable = (meter: Meter) => {
    Alert.alert(
      'Disable Meter',
      `Are you sure you want to disable "${meter.discomName}"?\n\nThis will stop data collection and the meter will need to be re-registered.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: () => onDisableMeter(meter.id),
        },
      ]
    );
  };

  const getMeterStatus = (meter: Meter, enabled: boolean) => {
    // Check if meter has issues (you can add more complex logic here)
    const hasIssue = false; // TODO: Add actual meter health check logic

    if (hasIssue) return { status: 'Defective', color: '#ef4444', icon: 'alert-circle', bgColor: '#fee2e2' };
    if (!enabled) return { status: 'Off', color: '#64748b', icon: 'power-off', bgColor: '#f1f5f9' };
    return { status: 'Active', color: '#3b82f6', icon: 'check-circle', bgColor: '#dbeafe' };
  };

  return (
    <LinearGradient
      colors={['#e0f2fe', '#f0f9ff', '#ffffff']}
      style={styles.gradientBackground}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIconContainer}>
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              style={styles.headerIconGradient}
            >
              <MaterialCommunityIcons name="speedometer" size={32} color="#ffffff" />
            </LinearGradient>
          </View>
          <Text style={styles.headerTitle}>My Smart Meters</Text>
          <Text style={styles.headerSubtitle}>Manage your registered devices</Text>

          {/* Meter Count Badge */}
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{meters.length} Meter{meters.length !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Meters Grid */}
        <View style={styles.metersContainer}>
          {meters.map((meter) => {
            const enabled = enabledMeters[meter.id] ?? true;
            const statusInfo = getMeterStatus(meter, enabled);

            return (
              <View key={meter.id} style={styles.meterCard}>
                {/* Card Header */}
                <View style={styles.meterCardHeader}>
                  <View style={[styles.meterIconContainer, { backgroundColor: statusInfo.bgColor }]}>
                    <MaterialCommunityIcons
                      name="lightning-bolt"
                      size={24}
                      color={statusInfo.color}
                    />
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
                    <MaterialCommunityIcons
                      name={statusInfo.icon as any}
                      size={14}
                      color={statusInfo.color}
                    />
                    <Text style={[styles.statusText, { color: statusInfo.color }]}>
                      {statusInfo.status}
                    </Text>
                  </View>
                </View>

                {/* Meter Info */}
                <View style={styles.meterInfo}>
                  <Text style={styles.meterTitle} numberOfLines={1}>
                    {meter.discomName}
                  </Text>

                  <View style={styles.meterDetails}>
                    <View style={styles.meterDetailItem}>
                      <View style={styles.detailIconContainer}>
                        <Ionicons name="person-outline" size={14} color="#64748b" />
                      </View>
                      <Text style={styles.detailText} numberOfLines={1}>
                        {meter.consumerNumber}
                      </Text>
                    </View>

                    <View style={styles.meterDetailItem}>
                      <View style={styles.detailIconContainer}>
                        <MaterialCommunityIcons name="identifier" size={14} color="#64748b" />
                      </View>
                      <Text style={styles.detailText} numberOfLines={1}>
                        {meter.id.slice(0, 12)}...
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Controls Section */}
                <View style={styles.controlsSection}>
                  {/* Toggle Row */}
                  <View style={styles.toggleRow}>
                    <View style={styles.toggleLabelContainer}>
                      <Ionicons
                        name={enabled ? 'power' : 'power-outline'}
                        size={16}
                        color={enabled ? '#3b82f6' : '#64748b'}
                      />
                      <Text style={[styles.toggleLabel, enabled && styles.toggleLabelActive]}>
                        {enabled ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                    <Switch
                      value={enabled}
                      onValueChange={(value) => handleToggle(meter.id, value)}
                      trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
                      thumbColor={enabled ? '#3b82f6' : '#cbd5e1'}
                      ios_backgroundColor="#e2e8f0"
                    />
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => onViewDetails(meter)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.actionButtonIcon}>
                        <Ionicons name="information-circle-outline" size={18} color="#3b82f6" />
                      </View>
                      <Text style={[styles.actionButtonText, { color: '#3b82f6' }]}>Details</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.disableButton]}
                      onPress={() => handleDisable(meter)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.actionButtonIcon, styles.disableButtonIcon]}>
                        <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
                      </View>
                      <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>Disable</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Add Another Meter Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={onAddMeter}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#3b82f6', '#2563eb']}
            style={styles.addButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.addButtonIconContainer}>
              <Ionicons name="add-circle" size={24} color="#ffffff" />
            </View>
            <Text style={styles.addButtonText}>Add Another Meter</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="information-circle" size={22} color="#3b82f6" />
          </View>
          <Text style={styles.infoText}>
            Toggle meters on/off to control data collection. Disable to permanently remove a meter.
          </Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 16,
    alignItems: 'center',
  },
  headerIconContainer: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  headerIconGradient: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  countBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
  },
  metersContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  meterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  meterCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  meterIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  meterInfo: {
    marginBottom: 16,
  },
  meterTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  meterDetails: {
    gap: 8,
  },
  meterDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 13,
    color: '#64748b',
    flex: 1,
  },
  controlsSection: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
    gap: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  toggleLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  toggleLabelActive: {
    color: '#3b82f6',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    gap: 6,
  },
  disableButton: {
    backgroundColor: '#fef2f2',
  },
  actionButtonIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disableButtonIcon: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
  },
  addButtonIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
  },
});
