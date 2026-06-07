import 'react-native-gesture-handler';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
// StyleSheet imported above — used for hairlineWidth in tab bar
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { HabitsProvider, useHabits } from './src/context/HabitsContext';
import WelcomeScreen from './src/screens/WelcomeScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import TodayScreen from './src/screens/TodayScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import StatsScreen from './src/screens/StatsScreen';
import ChallengesScreen from './src/screens/ChallengesScreen';
import { COLORS } from './src/theme';

const Tab = createBottomTabNavigator();

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { active: IoniconsName; inactive: IoniconsName }> = {
  Today: { active: 'today', inactive: 'today-outline' },
  History: { active: 'calendar', inactive: 'calendar-outline' },
  Stats: { active: 'bar-chart', inactive: 'bar-chart-outline' },
  Challenges: { active: 'trophy', inactive: 'trophy-outline' },
};

function AppNavigator() {
  const { hasOnboarded, loaded } = useHabits();
  // Local state: have they passed the Welcome screen this session?
  const [passedWelcome, setPassedWelcome] = useState(false);

  if (!loaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // New user flow: Welcome → Onboarding → App
  if (!hasOnboarded) {
    if (!passedWelcome) {
      return <WelcomeScreen onGetStarted={() => setPassedWelcome(true)} />;
    }
    return <OnboardingScreen onComplete={() => {}} />;
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textMuted,
          tabBarStyle: {
            backgroundColor: COLORS.surface,
            borderTopColor: COLORS.borderHard,
            borderTopWidth: StyleSheet.hairlineWidth,
            height: 60,
            paddingBottom: 8,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '400', letterSpacing: -0.1 },
          tabBarIcon: ({ focused, color, size }) => {
            const icons = TAB_ICONS[route.name];
            const name = focused ? icons.active : icons.inactive;
            return <Ionicons name={name} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Today" component={TodayScreen} />
        <Tab.Screen name="History" component={HistoryScreen} />
        <Tab.Screen name="Stats" component={StatsScreen} />
        <Tab.Screen name="Challenges" component={ChallengesScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <HabitsProvider>
          <StatusBar style="dark" />
          <AppNavigator />
        </HabitsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
});
