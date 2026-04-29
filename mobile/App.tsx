import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './src/screens/HomeScreen';
import AuthScreen from './src/screens/AuthScreen';
import UploadScreen from './src/screens/UploadScreen';
import AdminScreen from './src/screens/AdminScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';

import { ThemeProvider } from './src/context/ThemeContext';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <ThemeProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'StudyShare' }} />
        <Stack.Screen name="Auth" component={AuthScreen} options={{ title: 'Sign In / Register' }} />
        <Stack.Screen name="Upload" component={UploadScreen} options={{ title: 'Upload Note' }} />
        <Stack.Screen name="Admin" component={AdminScreen} options={{ title: 'Admin Review' }} />
        <Stack.Screen name="Favorites" component={FavoritesScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  </ThemeProvider>
  );
}
