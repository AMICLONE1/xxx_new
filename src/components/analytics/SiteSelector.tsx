import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList, TextInput, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Site {
  id: string;
  name: string;
  dataLoggerId?: string;
}

interface SiteSelectorProps {
  sites: Site[];
  selectedSiteId: string | 'all';
  selectedSiteIds?: string[];
  onSiteChange: (siteId: string | 'all' | 'add') => void;
  onMultiSiteChange?: (siteIds: string[]) => void;
  onAddSite?: (siteName: string, dataLoggerId: string) => void;
  onDeleteSite?: (siteId: string) => void;
  multiSelect?: boolean;
}

export const SiteSelector: React.FC<SiteSelectorProps> = ({
  sites,
  selectedSiteId,
  selectedSiteIds = [],
  onSiteChange,
  onMultiSiteChange,
  onAddSite,
  onDeleteSite,
  multiSelect = true,
}) => {
  const [modalVisible, setModalVisible] = React.useState(false);
  const [addSiteModalVisible, setAddSiteModalVisible] = React.useState(false);
  const [siteName, setSiteName] = React.useState('');
  const [dataLoggerId, setDataLoggerId] = React.useState('');

  const selectedSite = selectedSiteId === 'all' 
    ? { name: 'All Sites', id: 'all' }
    : sites.find(s => s.id === selectedSiteId);

  // Display selected count for multi-select
  const getDisplayText = () => {
    if (selectedSiteId === 'all') return 'All Sites';
    if (multiSelect && selectedSiteIds.length > 0) {
      return `${selectedSiteIds.length} Site${selectedSiteIds.length > 1 ? 's' : ''} Selected`;
    }
    return selectedSite?.name || 'Select Site';
  };

  const handleSelect = (siteId: string | 'all' | 'add') => {
    if (siteId === 'add') {
      setModalVisible(false);
      setAddSiteModalVisible(true);
    } else if (siteId === 'all') {
      onSiteChange(siteId);
      if (onMultiSiteChange) {
        onMultiSiteChange([]);
      }
      setModalVisible(false);
    } else if (multiSelect && onMultiSiteChange) {
      // Check if the site has been added (has dataLoggerId)
      const selectedSite = sites.find(s => s.id === siteId);
      if (!selectedSite || !selectedSite.dataLoggerId) {
        Alert.alert('Add Site First', 'Please add this site with data logger ID before selecting it.');
        return;
      }
      // Toggle selection in multi-select mode
      const newSelection = selectedSiteIds.includes(siteId)
        ? selectedSiteIds.filter(id => id !== siteId)
        : [...selectedSiteIds, siteId];
      onMultiSiteChange(newSelection);
    } else {
      onSiteChange(siteId);
      setModalVisible(false);
    }
  };

  const handleAddSiteSubmit = () => {
    if (!siteName.trim()) {
      Alert.alert('Error', 'Please enter a site name');
      return;
    }
    if (!dataLoggerId.trim()) {
      Alert.alert('Error', 'Please enter a data logger ID');
      return;
    }
    
    // Validate data logger ID format (e.g., TRL-8238-AX49)
    const dataLoggerPattern = /^[A-Z0-9]{3,4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
    if (!dataLoggerPattern.test(dataLoggerId.trim())) {
      Alert.alert(
        'Invalid Format',
        'Data Logger ID must follow the format: XXX-XXXX-XXXX\n\nExample: TRL-8238-AX49\n\nWhere X can be letters or numbers.'
      );
      return;
    }
    
    if (onAddSite) {
      onAddSite(siteName.trim(), dataLoggerId.trim().toUpperCase());
    }
    
    setSiteName('');
    setDataLoggerId('');
    setAddSiteModalVisible(false);
  };

  const handleDelete = (siteId: string, siteName: string) => {
    Alert.alert(
      'Delete Site',
      `Are you sure you want to delete "${siteName}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (onDeleteSite) {
              onDeleteSite(siteId);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const renderItem = ({ item }: { item: Site | { id: 'all' | 'add'; name: string } }) => {
    const isAddItem = item.id === 'add';
    const isAllSites = item.id === 'all';
    const isSelected = multiSelect 
      ? selectedSiteIds.includes(item.id)
      : selectedSiteId === item.id;
    const canDelete = !isAddItem && !isAllSites;
    // Only show tick for sites that have been actually added (have dataLoggerId)
    const hasData = 'dataLoggerId' in item && item.dataLoggerId;
    const showTick = isSelected && hasData && !isAddItem && !isAllSites;

    return (
      <View
        style={[
          styles.siteOption,
          isSelected && styles.siteOptionSelected,
          isAddItem && styles.addSiteOption,
        ]}
      >
        <TouchableOpacity
          style={styles.siteOptionTouchable}
          onPress={() => handleSelect(item.id as string | 'all' | 'add')}
        >
          <View style={styles.siteOptionContent}>
            <MaterialCommunityIcons
              name={
                isAddItem ? 'plus-circle' :
                item.id === 'all' ? 'view-grid' : 
                'home-city'
              }
              size={20}
              color={isAddItem ? '#10b981' : isSelected ? '#10b981' : '#6b7280'}
            />
            <Text
              style={[
                styles.siteOptionText,
                isSelected && styles.siteOptionTextSelected,
                isAddItem && styles.addSiteText,
              ]}
            >
              {item.name}
            </Text>
          </View>
          {showTick && (
            <MaterialCommunityIcons name="check-circle" size={20} color="#10b981" />
          )}
        </TouchableOpacity>
        {canDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={(e) => {
              e.stopPropagation();
              handleDelete(item.id, item.name);
            }}
          >
            <MaterialCommunityIcons name="minus-circle" size={20} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.selectorContent}>
          <MaterialCommunityIcons name="home-city" size={20} color="#10b981" />
          <Text style={styles.selectorText}>{getDisplayText()}</Text>
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
              <Text style={styles.modalTitle}>Select Site</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={[
                { id: 'all', name: 'All Sites' }, 
                ...sites,
                { id: 'add', name: '+ Add Site' }
              ]}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
            />
          </View>
        </View>
      </Modal>

      {/* Add Site Modal */}
      <Modal
        visible={addSiteModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAddSiteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.addSiteModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Site</Text>
              <TouchableOpacity onPress={() => setAddSiteModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Site Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Mumbai Office"
                value={siteName}
                onChangeText={setSiteName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Data Logger ID *</Text>
              <TextInput
                style={styles.input}
                placeholder="Format: TRL-8238-AX49"
                value={dataLoggerId}
                onChangeText={setDataLoggerId}
                autoCapitalize="characters"
                maxLength={14}
              />
              <Text style={styles.helperText}>Use format: XXX-XXXX-XXXX (letters or numbers)</Text>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setSiteName('');
                  setDataLoggerId('');
                  setAddSiteModalVisible(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.addButton]}
                onPress={handleAddSiteSubmit}
              >
                <MaterialCommunityIcons name="plus" size={20} color="#ffffff" />
                <Text style={styles.addButtonText}>Add Site</Text>
              </TouchableOpacity>
            </View>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 20,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  siteOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  siteOptionTouchable: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  siteOptionSelected: {
    backgroundColor: '#f0fdf4',
  },
  siteOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  siteOptionText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  siteOptionTextSelected: {
    color: '#10b981',
    fontWeight: '600',
  },
  addSiteOption: {
    backgroundColor: '#f0fdf4',
    borderTopWidth: 2,
    borderTopColor: '#d1fae5',
  },
  addSiteText: {
    color: '#10b981',
    fontWeight: '700',
  },
  addSiteModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 30,
  },
  inputContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#111827',
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 10,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  addButton: {
    backgroundColor: '#10b981',
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  deleteButton: {
    padding: 16,
    paddingLeft: 8,
  },
});

