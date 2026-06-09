// StudyShare Mobile App
import React from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, ActivityIndicator, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

import HomeScreen from './src/screens/HomeScreen';
import AuthScreen from './src/screens/AuthScreen';
import UploadScreen from './src/screens/UploadScreen';
import AdminScreen from './src/screens/AdminScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import QuestionsScreen from './src/screens/QuestionsScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import NoteDetailScreen from './src/screens/NoteDetailScreen';
import QuestionDetailScreen from './src/screens/QuestionDetailScreen';
import PomodoroScreen from './src/screens/PomodoroScreen';
import AiSummaryScreen from './src/screens/AiSummaryScreen';
import FlashcardScreen from './src/screens/FlashcardScreen';
import MyNotesScreen from './src/screens/MyNotesScreen';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { NotificationProvider, useNotifications } from './src/context/NotificationContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

export const navigationRef = createNavigationContainerRef();

function TabNavigator() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: IoniconName = 'help-circle';
          if (route.name === 'Dashboard') iconName = 'home';
          else if (route.name === 'Questions') iconName = 'help-circle';
          else if (route.name === 'Favorites') iconName = 'heart';
          else if (route.name === 'Pomodoro') iconName = 'timer';
          else if (route.name === 'Profile') iconName = 'person';

          return (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={iconName} size={size} color={focused ? colors.primary : color} />
            </View>
          );
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: 50 + insets.bottom ,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8
        },
        headerShown: false
      })}
    >
      <Tab.Screen name="Dashboard" component={HomeScreen} />
      <Tab.Screen name="Questions" component={QuestionsScreen} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} />
      <Tab.Screen name="Pomodoro" component={PomodoroScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { isDark, colors } = useTheme();
  const { isLoggedIn, isLoading } = useAuth();
  const { showPopup, activePopupNotification, dismissPopup, markAsRead } = useNotifications();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors?.background || '#fff' }}>
        <ActivityIndicator size="large" color={colors?.primary || '#4F46E5'} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
      
      {showPopup && activePopupNotification && (
        <TouchableOpacity
          activeOpacity={0.9}
          style={{
            position: 'absolute',
            top: 50,
            left: 15,
            right: 15,
            backgroundColor: colors.card,
            padding: 15,
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 5,
            zIndex: 9999,
            borderLeftWidth: 4,
            borderLeftColor: colors.primary
          }}
          onPress={() => {
            const note = activePopupNotification.note;
            const notifId = activePopupNotification.id;
            dismissPopup();
            markAsRead(notifId);
            if (navigationRef.isReady()) {
              (navigationRef.navigate as any)('NoteDetail', { note });
            }
          }}
        >
          <View style={{ marginRight: 12, backgroundColor: colors.primary + '15', padding: 8, borderRadius: 20 }}>
            <Ionicons name="chatbubble-ellipses" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: 'bold', color: colors.text, fontSize: 14 }}>New Comment</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }} numberOfLines={1}>
              {activePopupNotification.sender?.name || 'Someone'} commented on your note!
            </Text>
          </View>
          <TouchableOpacity onPress={dismissPopup} style={{ padding: 4 }}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          <>
            <Stack.Screen name="Tabs" component={TabNavigator} />
            <Stack.Screen name="Upload" component={UploadScreen} />
            <Stack.Screen name="Admin" component={AdminScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
            <Stack.Screen name="NoteDetail" component={NoteDetailScreen} />
            <Stack.Screen name="QuestionDetail" component={QuestionDetailScreen} />
            <Stack.Screen name="UserQuestions" component={QuestionsScreen} />
            <Stack.Screen name="AiSummary" component={AiSummaryScreen} />
            <Stack.Screen name="Flashcard" component={FlashcardScreen} />
            <Stack.Screen name="MyNotes" component={MyNotesScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
