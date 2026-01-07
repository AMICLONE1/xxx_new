import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Meter } from '@/types';

interface Site {
  id: string;
  name: string;
  discomName?: string;
  consumerNumber?: string;
  address?: string;
}

interface MeterSelectorProps {
  meters: Meter[];
  sites: Site[];
  selectedMeterId: string | 'all';
  onMeterChange: (meterId: string | 'all') => void;
}

export const MeterSelector: React.FC<MeterSelectorProps> = ({
  meters,
  sites,
  selectedMeterId,
  onMeterChange,
}) => {
  const [modalVisible, setModalVisible] = React.useState(false);

  const selectedMeter = selectedMeterId === 'all' 
    ? { name: 'All Meters', id: 'all' }
    : sites.find(s => s.id === selectedMeterId) || meters.find(m => m.id === selectedMeterId);

  const handleSelect = (meterId: string | 'all') => {
    onMeterChange(meterId);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.selectorContent}>
          <MaterialCommunityIcons name="speedometer" size={20} color="#10b981" />
          <Text style={styles.selectorText}>
            {selectedMeter ? (
              selectedMeterId === 'all' ? 'All Meters' : 
              'name' in selectedMeter && selectedMeter.name
            ) : 'Select Meter'}
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={20} color="#6b7280" />
        </View>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Meter</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={[{ id: 'all', name: 'All Meters', discomName: 'Aggregated View' }, ...sites]}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.meterOption,
                    selectedMeterId === item.id && styles.meterOptionSelected,
                  ]}
                  onPress={() => handleSelect(item.id)}
                >
                  <View style={styles.meterOptionContent}>
                    <MaterialCommunityIcons
                      name={item.id === 'all' ? 'view-grid' : 'speedometer'}
                      size={20}
                      color={selectedMeterId === item.id ? '#10b981' : '#6b7280'}
                    />
                    <View style={styles.meterInfo}>
                      <Text
                        style={[
                          styles.meterOptionText,
                          selectedMeterId === item.id && styles.meterOptionTextSelected,
                        ]}
                      >
                        {item.name}
                      </Text>
                      {item.discomName && item.id !== 'all' && (
                        <Text style={styles.meterDiscom}>{item.discomName}</Text>
                      )}
                    </View>
                  </View>
                  {selectedMeterId === item.id && (
                    <MaterialCommunityIcons name="check-circle" size={20} color="#10b981" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  selector: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    minHeight: 56,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectorText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  meterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  meterOptionSelected: {
    backgroundColor: '#ecfdf5',
  },
  meterOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  meterInfo: {
    flex: 1,
  },
  meterOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  meterOptionTextSelected: {
    color: '#10b981',
    fontWeight: '600',
  },
  meterDiscom: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
});
