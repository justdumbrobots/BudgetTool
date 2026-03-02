/**
 * PayPeriod — Root Component
 *
 * Initializes the database and Zustand store, then renders the navigation tree.
 * Shows a loading screen while the database hydrates (typically <100ms).
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from './src/theme/colors';
import { useAppStore } from './src/store/useAppStore';
import { AppNavigator } from './src/navigation/AppNavigator';

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <Text style={styles.loadingTitle}>PayPeriod</Text>
      <Text style={styles.loadingSubtitle}>Loading your budget…</Text>
    </View>
  );
}

export default function App() {
  const { initialize, isLoading, error } = useAppStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={Colors.bgPrimary} />
        {isLoading ? (
          <LoadingScreen />
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Startup Error</Text>
            <Text style={styles.errorMessage}>{error}</Text>
          </View>
        ) : (
          <AppNavigator />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textExpense,
  },
  errorMessage: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
