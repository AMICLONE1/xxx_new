import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface BuySellToggleProps {
  mode: 'buy' | 'sell';
  onModeChange: (mode: 'buy' | 'sell') => void;
}

export const BuySellToggle: React.FC<BuySellToggleProps> = ({ mode, onModeChange }) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.toggleButton, mode === 'buy' && styles.toggleButtonActive]}
        onPress={() => onModeChange('buy')}
        activeOpacity={0.8}
      >
        {mode === 'buy' ? (
          <LinearGradient
            colors={['#3b82f6', '#2563eb']}
            style={styles.toggleButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <MaterialCommunityIcons name="cart" size={20} color="#ffffff" />
            <Text style={styles.toggleButtonTextActive}>Buy</Text>
          </LinearGradient>
        ) : (
          <View style={styles.toggleButtonInactive}>
            <MaterialCommunityIcons name="cart-outline" size={20} color="#6b7280" />
            <Text style={styles.toggleButtonTextInactive}>Buy</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.toggleButton, mode === 'sell' && styles.toggleButtonActive]}
        onPress={() => onModeChange('sell')}
        activeOpacity={0.8}
      >
        {mode === 'sell' ? (
          <LinearGradient
            colors={['#0ea5e9', '#0284c7']}
            style={styles.toggleButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <MaterialCommunityIcons name="currency-inr" size={20} color="#ffffff" />
            <Text style={styles.toggleButtonTextActive}>Sell</Text>
          </LinearGradient>
        ) : (
          <View style={styles.toggleButtonInactive}>
            <MaterialCommunityIcons name="currency-inr" size={20} color="#6b7280" />
            <Text style={styles.toggleButtonTextInactive}>Sell</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 4,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  toggleButtonActive: {
    // Active state handled by gradient
  },
  toggleButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  toggleButtonInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
    backgroundColor: '#f9fafb',
  },
  toggleButtonTextActive: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  toggleButtonTextInactive: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
});

