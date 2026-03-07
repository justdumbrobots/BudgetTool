/**
 * PayPeriod — Root Component
 *
 * Initializes the Supabase auth session, then renders the navigation tree.
 * AppNavigator handles all routing based on auth + onboarding state.
 *
 * WebBrowser.maybeCompleteAuthSession() must be called at module level so
 * that the OAuth redirect from Google can close the browser and return tokens.
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

import { Colors } from './src/theme/colors';
import { useAuthStore } from './src/store/useAuthStore';
import { AppNavigator } from './src/navigation/AppNavigator';

// Required for expo-web-browser to properly close after OAuth redirect
WebBrowser.maybeCompleteAuthSession();

export default function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={Colors.bgPrimary} />
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
