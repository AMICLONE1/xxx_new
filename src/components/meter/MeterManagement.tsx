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
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
    
    if (hasIssue) return { status: 'Defective', color: '#ef4444', icon: 'alert-circle' };
    if (!enabled) return { status: 'Off', color: '#6b7280', icon: 'power-off' };
    return { status: 'Active', color: '#10b981', icon: 'check-circle' };
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialCommunityIcons name="speedometer" size={32} color="#10b981" />
        <Text style={styles.headerTitle}>My Meters</Text>
        <Text style={styles.headerSubtitle}>Manage your registered smart meters</Text>
      </View>

      {/* Meters List */}
      <View style={styles.metersContainer}>
        {meters.map((meter) => {
          const enabled = enabledMeters[meter.id] ?? true;
          const statusInfo = getMeterStatus(meter, enabled);

          return (
            <View key={meter.id} style={styles.meterCard}>
              {/* Status Badge */}
              <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}15` }]}>
                <MaterialCommunityIcons
                  name={statusInfo.icon as any}
                  size={16}
                  color={statusInfo.color}
                />
                <Text style={[styles.statusText, { color: statusInfo.color }]}>
                  {statusInfo.status}
                </Text>
              </View>

              {/* Meter Info */}
              <View style={styles.meterInfo}>
                <Text style={styles.meterTitle}>{meter.discomName}</Text>
                <View style={styles.meterDetail}>
                  <MaterialCommunityIcons name="account-box" size={16} color="#6b7280" />
                  <Text style={styles.detailText}>Consumer: {meter.consumerNumber}</Text>
                </View>
                <View style={styles.meterDetail}>
                  <MaterialCommunityIcons name="identifier" size={16} color="#6b7280" />
                  <Text style={styles.detailText}>Serial: {meter.id.slice(0, 8)}...</Text>
                </View>
              </View>

              {/* Controls */}
              <View style={styles.controls}>
                {/* On/Off Toggle */}
                <View style={styles.toggleContainer}>
                  <Text style={styles.toggleLabel}>
                    {enabled ? 'On' : 'Off'}
                  </Text>
                  <Switch
                    value={enabled}
                    onValueChange={(value) => handleToggle(meter.id, value)}
                    trackColor={{ false: '#d1d5db', true: '#86efac' }}
                    thumbColor={enabled ? '#10b981' : '#f3f4f6'}
                  />
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => onViewDetails(meter)}
                  >
                    <MaterialCommunityIcons name="information" size={20} color="#3b82f6" />
                    <Text style={[styles.actionButtonText, { color: '#3b82f6' }]}>Details</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.disableButton]}
                    onPress={() => handleDisable(meter)}
                  >
                    <MaterialCommunityIcons name="close-circle" size={20} color="#ef4444" />
                    <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>Disable</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* Add Another Meter Button */}
      <TouchableOpacity style={styles.addButton} onPress={onAddMeter}>
        <MaterialCommunityIcons name="plus-circle" size={24} color="#ffffff" />
        <Text style={styles.addButtonText}>Add Another Meter</Text>
      </TouchableOpacity>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <MaterialCommunityIcons name="information" size={20} color="#3b82f6" />
        <Text style={styles.infoText}>
          Toggle meters on/off to control data collection. Disable to permanently remove a meter.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 24,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  metersContainer: {
    padding: 16,
  },
  meterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  meterInfo: {
    marginBottom: 16,
  },
  meterTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  meterDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  controls: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
  },
  disableButton: {
    backgroundColor: '#fef2f2',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginLeft: 8,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    marginLeft: 12,
    lineHeight: 18,
  },
});
