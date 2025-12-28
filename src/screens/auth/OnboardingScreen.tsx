import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types';

type OnboardingScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Onboarding'
>;

interface Props {
  navigation: OnboardingScreenNavigationProp;
}

export default function OnboardingScreen({ navigation }: Props) {
  const handleHasMeter = () => {
    navigation.navigate('MeterRegistration');
  };

  const handleNoMeter = () => {
    // Navigate to hardware request flow
    // TODO: Implement hardware request screen
    navigation.navigate('MeterRegistration');
  };

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={24} color="#374151" />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Let's connect your energy source</Text>
        <Text style={styles.subtitle}>
          Do you have a Smart Meter installed at your location?
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleHasMeter}>
          <Text style={styles.buttonText}>Yes, I have a Smart Meter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={handleNoMeter}
        >
          <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
            No, Request Installation
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 24,
    left: 16,
    zIndex: 10,
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#10b981',
  },
});

