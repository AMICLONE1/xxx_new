import 'react-native-reanimated';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { AppNavigator } from '@/navigation/AppNavigator';
import { useAuthStore, useMeterStore } from '@/store';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function App() {
  const { restoreSession, isLoading, user, isAuthenticated } = useAuthStore();
  const { restoreMeters } = useMeterStore();

  useEffect(() => {
    // Restore session on app startup
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    // After session is restored and user is authenticated, restore meters
    if (!isLoading && isAuthenticated && user?.id) {
      restoreMeters(user.id);
    }
  }, [isLoading, isAuthenticated, user?.id, restoreMeters]);

  // Show loading screen while checking session
  if (isLoading) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
        <StatusBar style="auto" />
      </GestureHandlerRootView>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppNavigator />
        <StatusBar style="auto" />
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});
