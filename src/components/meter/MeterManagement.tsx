import React, { useState, useMemo } from 'react';
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
import { useTheme } from '@/contexts';
import { getThemedColors, ThemedColors } from '@/utils/themedStyles';

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
  const { isDark } = useTheme();
  const colors = getThemedColors(isDark);
  const styles = useMemo(() => createStyles(colors), [colors]);

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

    if (hasIssue) return { status: 'Defective', color: colors.error, icon: 'alert-circle', bgColor: colors.errorBackground };
    if (!enabled) return { status: 'Off', color: colors.textMuted, icon: 'power-off', bgColor: colors.backgroundSecondary };
    return { status: 'Active', color: colors.success, icon: 'check-circle', bgColor: colors.successBackground };
  };

  return (
    <LinearGradient
      colors={colors.backgroundGradient as [string, string, ...string[]]}
      style={styles.gradientBackground}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>My Smart Meters</Text>
            <Text style={styles.headerSubtitle}>Manage your registered devices</Text>
          </View>

          <View style={styles.countBadge}>
            <MaterialCommunityIcons name="lightning-bolt" size={16} color={colors.primary} />
            <Text style={styles.countBadgeText}>{meters.length}</Text>
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
                        <Ionicons name="person-outline" size={14} color={colors.textMuted} />
                      </View>
                      <Text style={styles.detailText} numberOfLines={1}>
                        {meter.consumerNumber}
                      </Text>
                    </View>

                    <View style={styles.meterDetailItem}>
                      <View style={styles.detailIconContainer}>
                        <MaterialCommunityIcons name="identifier" size={14} color={colors.textMuted} />
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
                        color={enabled ? colors.primary : colors.textMuted}
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
                        <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                      </View>
                      <Text style={[styles.actionButtonText, { color: colors.primary }]}>Details</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.disableButton]}
                      onPress={() => handleDisable(meter)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.actionButtonIcon, styles.disableButtonIcon]}>
                        <Ionicons name="close-circle-outline" size={18} color={colors.error} />
                      </View>
                      <Text style={[styles.actionButtonText, { color: colors.error }]}>Disable</Text>
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
            colors={[colors.primary, colors.primaryDark]}
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
            <Ionicons name="information-circle" size={22} color={colors.primary} />
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

const createStyles = (colors: ThemedColors) => StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 6,
  },
  countBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  metersContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  meterCard: {
    backgroundColor: colors.card,
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
    color: colors.text,
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
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  controlsSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
    gap: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  toggleLabelActive: {
    color: colors.primary,
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
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disableButton: {
    backgroundColor: colors.errorBackground,
    borderColor: colors.errorBackground,
  },
  actionButtonIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disableButtonIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
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
    shadowColor: colors.primary,
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
    backgroundColor: colors.card,
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
});
