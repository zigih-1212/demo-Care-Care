/**
 * Root navigator.
 *
 * Two worlds: an auth stack when anonymous, a bottom-tab app when authenticated.
 * The switch is driven purely by AuthContext status, so deep links / restores
 * land in the right place without manual redirects.
 */
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { InsightsScreen } from '@/screens/InsightsScreen';
import { LogScreen } from '@/screens/LogScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { RegisterScreen } from '@/screens/RegisterScreen';
import { TherapyScreen } from '@/screens/TherapyScreen';
import { colors, spacing, typography } from '@/theme/tokens';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AppTabParamList = {
  Overview: undefined;
  Log: undefined;
  Insights: undefined;
  Therapy: undefined;
  Profile: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tabs = createBottomTabNavigator<AppTabParamList>();

function TabIcon({ label, focused }: { label: string; focused: boolean }): React.JSX.Element {
  return (
    <Text style={[styles.tabIcon, focused && styles.tabIconFocused]} accessibilityElementsHidden>
      {label}
    </Text>
  );
}

function AppTabs(): React.JSX.Element {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="Overview"
        component={DashboardScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="◉" focused={focused} /> }}
      />
      <Tabs.Screen
        name="Log"
        component={LogScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="＋" focused={focused} /> }}
      />
      <Tabs.Screen
        name="Insights"
        component={InsightsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="▤" focused={focused} /> }}
      />
      <Tabs.Screen
        name="Therapy"
        component={TherapyScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="◎" focused={focused} /> }}
      />
      <Tabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="☺" focused={focused} /> }}
      />
    </Tabs.Navigator>
  );
}

function AuthNavigator(): React.JSX.Element {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login">
        {({ navigation }) => (
          <LoginScreen onNavigateRegister={() => navigation.navigate('Register')} />
        )}
      </AuthStack.Screen>
      <AuthStack.Screen name="Register">
        {({ navigation }) => (
          <RegisterScreen onNavigateLogin={() => navigation.navigate('Login')} />
        )}
      </AuthStack.Screen>
    </AuthStack.Navigator>
  );
}

export function RootNavigator(): React.JSX.Element {
  const { status } = useAuth();
  // Local dev convenience: allow switching auth mode in the tab bar collapses
  // to nothing extra here; React Query handles server-state separately.
  const [ready] = useState(true);

  if (status === 'loading' || !ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={styles.loadingText}>Loading your data…</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {status === 'authenticated' ? <AppTabs /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  loadingText: { ...(typography.body as object), color: colors.textSecondary, marginTop: spacing.md },
  tabIcon: { fontSize: 20, color: colors.textMuted },
  tabIconFocused: { color: colors.brand },
});
