/**
 * App Navigation
 *
 * Auth flow:
 *   No session           → Login screen
 *   Session, !onboarded  → Onboarding wizard
 *   Session, onboarded   → Main tab navigator
 *
 * When the authenticated user changes (sign-in / sign-out), the app store
 * is re-initialized or reset so that each user sees only their own data.
 *
 * Stack structure:
 *   Root Stack
 *   ├── Login          (auth gate)
 *   ├── Onboarding     (first-time setup)
 *   ├── PeriodDetail   (pushed from Timeline or Dashboard)
 *   └── Main Tabs
 *       ├── Dashboard
 *       ├── Timeline
 *       ├── Bills
 *       └── Settings
 */

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native';

import { Colors } from '../theme/colors';
import { RootStackParamList } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';

// Screens
import { LoginScreen }         from '../screens/auth/LoginScreen';
import { OnboardingScreen }    from '../screens/OnboardingScreen';
import { DashboardScreen }     from '../screens/DashboardScreen';
import { TimelineScreen }      from '../screens/TimelineScreen';
import { BillsManagerScreen }  from '../screens/BillsManagerScreen';
import { SettingsScreen }      from '../screens/SettingsScreen';
import { PeriodDetailScreen }  from '../screens/PeriodDetailScreen';

// ─── Tab icons (text-based, no icon library dependency at runtime) ─────────────

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 20, color: focused ? Colors.accent : Colors.textMuted }}>
      {icon}
    </Text>
  );
}

// ─── Loading Overlay ──────────────────────────────────────────────────────────

function LoadingScreen({ message }: { message: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={Colors.accent} />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
}

// ─── Navigator instances ──────────────────────────────────────────────────────

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// ─── Bottom Tab Navigator ─────────────────────────────────────────────────────

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.bgCard },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        tabBarStyle: {
          backgroundColor: Colors.bgCard,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon icon="⬡" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Timeline"
        component={TimelineScreen}
        options={{
          title: 'Timeline',
          tabBarIcon: ({ focused }) => <TabIcon icon="≡" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Bills"
        component={BillsManagerScreen}
        options={{
          title: 'Bills',
          tabBarIcon: ({ focused }) => <TabIcon icon="$" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon icon="⚙" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Root Stack Navigator ─────────────────────────────────────────────────────

export function AppNavigator() {
  const { user, isLoading: authLoading } = useAuthStore();
  const { initialize, reset, isOnboarded, isLoading: dataLoading } = useAppStore();

  // Re-initialize app data whenever the logged-in user changes
  useEffect(() => {
    if (user) {
      initialize(user.id);
    } else {
      reset();
    }
  }, [user?.id]);

  // Show spinner while auth session is being restored
  if (authLoading) {
    return <LoadingScreen message="Restoring session…" />;
  }

  // Show spinner while the user's data is being loaded from SQLite
  if (user && dataLoading) {
    return <LoadingScreen message="Loading your budget…" />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: Colors.bgCard },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: Colors.bgPrimary },
        }}
      >
        {!user ? (
          // ── Auth gate ──────────────────────────────────────────────────────
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : !isOnboarded ? (
          // ── First-time setup ───────────────────────────────────────────────
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            options={{ title: 'Welcome to PayPeriod', headerShown: false }}
          />
        ) : (
          // ── Main app ───────────────────────────────────────────────────────
          <>
            <Stack.Screen
              name="Main"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="PeriodDetail"
              component={PeriodDetailScreen}
              options={{ title: 'Period Detail', headerBackTitle: 'Back' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
});
