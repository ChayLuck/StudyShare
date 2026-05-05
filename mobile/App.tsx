import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import AuthScreen from './src/screens/AuthScreen';
import UploadScreen from './src/screens/UploadScreen';
import AdminScreen from './src/screens/AdminScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import QuestionsScreen from './src/screens/QuestionsScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  const themeContext = useTheme();
  const colors = themeContext?.colors;
  
  if (!colors) return null;

  return (
    <Tab.Navigator 
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let icon = '❓';
          if (route.name === 'Dashboard') icon = '🏠';
          else if (route.name === 'Questions') icon = '❓';
          else if (route.name === 'Favorites') icon = '❤️';
          else if (route.name === 'Profile') icon = '👤';
          
          return (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: size, color: focused ? colors.primary : color }}>{icon}</Text>
            </View>
          );
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { 
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8
        },
        headerShown: false
      })}
    >
      <Tab.Screen name="Dashboard" component={HomeScreen} />
      <Tab.Screen name="Questions" component={QuestionsScreen} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Tabs">
          <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
          <Stack.Screen name="Auth" component={AuthScreen} options={{ title: 'Sign In / Register' }} />
          <Stack.Screen name="Upload" component={UploadScreen} options={{ title: 'Upload Note' }} />
          <Stack.Screen name="Admin" component={AdminScreen} options={{ title: 'Admin Review' }} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit Profile' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
}
