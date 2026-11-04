/**
 * Root navigator.
 *
 * Two worlds: an auth stack when anonymous, a bottom-tab app when authenticated.
 * On top of that, the tab set is role-aware — a patient logs and reviews their
 * own health, a clinician triages a caseload, an administrator audits access.
 * Showing everyone the same five tabs was the original weakness; each role now
 * gets only the tools that match their job.
 */
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import { AdminScreen } from '@/screens/AdminScreen';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { DownloadScreen } from '@/screens/DownloadScreen';
import { InsightsScreen } from '@/screens/InsightsScreen';
import { LogScreen } from '@/screens/LogScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { RegisterScreen } from '@/screens/RegisterScreen';
import { RosterScreen } from '@/screens/RosterScreen';
import { PatientDetailScreen } from '@/screens/PatientDetailScreen';
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
  Patients: undefined;
  Administration: undefined;
  Profile: undefined;
  Download: undefined;
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

function icon(label: string) {
  return ({ focused }: { focused: boolean }) => <TabIcon label={label} focused={focused} />;
}

/** Clinician area: roster plus a stack for the read-only detail view. */
function ClinicianArea(): React.JSX.Element {
  const [selected, setSelected] = React.useState<string | null>(null);
  if (selected) {
    return <PatientDetailScreen patientId={selected} onBack={() => setSelected(null)} />;
  }
  return <RosterScreen onSelectPatient={setSelected} />;
}

function AppTabs(): React.JSX.Element {
  const { user } = useAuth();
  const role = user?.role ?? 'patient';
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      {/* Screens are declared inline (inside fragments) rather than in helper
          components: React Navigation only accepts Screen/Group/Fragment as
          direct children and cannot statically read a custom component's
          return value. */}
      {role === 'patient' ? (
        <>
          <Tabs.Screen
            name="Overview"
            component={DashboardScreen}
            options={{ tabBarIcon: icon('◉') }}
          />
          <Tabs.Screen name="Log" component={LogScreen} options={{ tabBarIcon: icon('＋') }} />
          <Tabs.Screen
            name="Insights"
            component={InsightsScreen}
            options={{ tabBarIcon: icon('▤') }}
          />
          <Tabs.Screen
            name="Therapy"
            component={TherapyScreen}
            options={{ tabBarIcon: icon('◎') }}
          />
        </>
      ) : null}
      {role === 'doctor' ? (
        <Tabs.Screen
          name="Patients"
          component={ClinicianArea}
          options={{ tabBarIcon: icon('☰'), title: 'Patients' }}
        />
      ) : null}
      {role === 'admin' ? (
        <Tabs.Screen
          name="Administration"
          component={AdminScreen}
          options={{ tabBarIcon: icon('⚖'), title: 'Admin' }}
        />
      ) : null}
      <Tabs.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: icon('☺') }} />
      <Tabs.Screen
        name="Download"
        component={DownloadScreen}
        options={{ tabBarIcon: icon('⭳'), title: 'Get app' }}
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

  if (status === 'loading') {
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
