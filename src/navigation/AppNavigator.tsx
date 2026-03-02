/**
 * App Navigation
 *
 * Structure:
 *   Root Stack
 *   ├── Onboarding (shown when !isOnboarded)
 *   ├── PeriodDetail (pushed from Timeline or Dashboard)
 *   └── Main Tabs
 *       ├── Dashboard
 *       ├── Timeline
 *       ├── Bills
 *       └── Settings
 */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';

import { Colors } from '../theme/colors';
import { RootStackParamList } from '../types';
import { useAppStore } from '../store/useAppStore';

// Screens
import { OnboardingScreen }    from '../screens/OnboardingScreen';
import { DashboardScreen }     from '../screens/DashboardScreen';
import { TimelineScreen }      from '../screens/TimelineScreen';
import { BillsManagerScreen }  from '../screens/BillsManagerScreen';
import { SettingsScreen }      from '../screens/SettingsScreen';
import { PeriodDetailScreen }  from '../screens/PeriodDetailScreen';

// ─── Tab icons (text-based, no icon library dependency at runtime) ─────────────

function TabIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 20, color: focused ? Colors.accent : Colors.textMuted }}>
        {icon}
      </Text>
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
          tabBarIcon: ({ focused }) => <TabIcon icon="⬡" label="Home" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Timeline"
        component={TimelineScreen}
        options={{
          title: 'Timeline',
          tabBarIcon: ({ focused }) => <TabIcon icon="≡" label="Timeline" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Bills"
        component={BillsManagerScreen}
        options={{
          title: 'Bills',
          tabBarIcon: ({ focused }) => <TabIcon icon="$" label="Bills" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon icon="⚙" label="Settings" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Root Stack Navigator ─────────────────────────────────────────────────────

export function AppNavigator() {
  const { isOnboarded } = useAppStore();

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
        {!isOnboarded ? (
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            options={{ title: 'Welcome to PayPeriod', headerShown: false }}
          />
        ) : (
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
