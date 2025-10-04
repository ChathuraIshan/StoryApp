import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from './screens/HomeScreen';
import WriteScreen from './screens/WriteScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import { OfflineProvider } from './contexts/OfflineContext';

const Tab = createBottomTabNavigator();

// Custom theme for the app
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6366f1', // Indigo
    primaryContainer: '#e0e7ff',
    secondary: '#ec4899', // Pink
    secondaryContainer: '#fce7f3',
    tertiary: '#10b981', // Emerald
    surface: '#ffffff',
    background: '#f8fafc',
    error: '#ef4444',
    onPrimary: '#ffffff',
    onSecondary: '#ffffff',
    onSurface: '#1e293b',
    onBackground: '#1e293b',
    outline: '#e2e8f0',
    shadow: '#000000',
    surfaceVariant: '#f1f5f9',
    inverseSurface: '#334155',
    inverseOnSurface: '#f1f5f9',
    inversePrimary: '#a5b4fc',
  },
};

/**
 * Badge component for showing counts on tab icons
 */
const Badge = ({ count, visible }: { count: number; visible: boolean }) => {
  const scaleAnim = new Animated.Value(0);

  useEffect(() => {
    if (visible && count > 0) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }).start();
    } else {
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, count]);

  if (!visible || count === 0) return null;

  return (
    <Animated.View
      style={[
        styles.badge,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Animated.Text style={styles.badgeText}>
        {count > 99 ? '99+' : count}
      </Animated.Text>
    </Animated.View>
  );
};

/**
 * Custom tab bar icon component with animations
 */
const TabIcon = ({ 
  name, 
  focused, 
  color, 
  size = 24,
  badgeCount = 0,
  showBadge = false 
}: {
  name: string;
  focused: boolean;
  color: string;
  size?: number;
  badgeCount?: number;
  showBadge?: boolean;
}) => {
  const scaleAnim = new Animated.Value(1);

  useEffect(() => {
    if (focused) {
      Animated.spring(scaleAnim, {
        toValue: 1.1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }).start();
    } else {
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [focused]);

  return (
    <View style={styles.iconContainer}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Ionicons name={name as any} size={size} color={color} />
      </Animated.View>
      <Badge count={badgeCount} visible={showBadge} />
    </View>
  );
};

/**
 * Main App component with enhanced navigation
 * Features custom themes, animated icons, and badge counts
 */
const AppContent = () => {
  const { favoritesCount } = useNavigation();

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.primary,
            elevation: 8,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
          },
          headerTitleStyle: {
            color: theme.colors.onPrimary,
            fontWeight: 'bold',
            fontSize: 20,
          },
          headerTintColor: theme.colors.onPrimary,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopWidth: 0,
            elevation: 16,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            height: 80,
            paddingBottom: 10,
            paddingTop: 10,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            marginTop: 4,
          },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
          tabBarShowLabel: true,
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: 'Stories',
            headerTitle: '📚 Stories Feed',
            tabBarIcon: ({ focused, color, size }) => (
              <TabIcon
                name={focused ? 'library' : 'library-outline'}
                focused={focused}
                color={color}
                size={size}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Write"
          component={WriteScreen}
          options={{
            title: 'Write',
            headerTitle: '✍️ Write Story',
            tabBarIcon: ({ focused, color, size }) => (
              <TabIcon
                name={focused ? 'create' : 'create-outline'}
                focused={focused}
                color={color}
                size={size}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Favorites"
          component={FavoritesScreen}
          options={{
            title: 'Favorites',
            headerTitle: '❤️ My Favorites',
            tabBarIcon: ({ focused, color, size }) => (
              <TabIcon
                name={focused ? 'heart' : 'heart-outline'}
                focused={focused}
                color={color}
                size={size}
                badgeCount={favoritesCount}
                showBadge={favoritesCount > 0}
              />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

/**
 * Root App component with providers
 */
export default function App() {
  return (
    <PaperProvider theme={theme}>
      <OfflineProvider>
        <NavigationProvider>
          <AppContent />
        </NavigationProvider>
      </OfflineProvider>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -12,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});