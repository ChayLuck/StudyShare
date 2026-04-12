import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import api from '../services/api';
import * as SecureStore from 'expo-secure-store';

export default function AuthScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  const handleSubmit = async () => {
    if (!email || !password) {
      return Alert.alert('Error', 'Please fill in all fields');
    }
    
    try {
      if (isLogin) {
        const response = await api.post('/auth/login', { email, password });
        await SecureStore.setItemAsync('accessToken', response.data.accessToken);
        if (response.data.user && response.data.user.role) {
           await SecureStore.setItemAsync('userRole', response.data.user.role);
        } else {
           await SecureStore.deleteItemAsync('userRole'); 
        }
        Alert.alert('Welcome Back', 'Logged in successfully!');
        navigation.replace('Home');
      } else {
        await api.post('/auth/register', { email, password });
        Alert.alert('Success', 'Registered! Check your email to verify.');
        setIsLogin(true); // Switch to login screen after successful registration
      }
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Something went wrong');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.card}>
          <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
          <Text style={styles.subtitle}>
            {isLogin ? 'Sign in to continue to StudyShare' : 'Sign up to start sharing notes'}
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit}>
            <Text style={styles.primaryButtonText}>{isLogin ? 'Sign In' : 'Sign Up'}</Text>
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </Text>
            <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
              <Text style={styles.footerLink}>{isLogin ? 'Register' : 'Sign In'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#F9FAFB' 
  },
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    paddingHorizontal: 20 
  },
  card: { 
    backgroundColor: '#fff', 
    padding: 24, 
    borderRadius: 16, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 10, 
    elevation: 5 
  },
  title: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: '#1f2937', 
    textAlign: 'center', 
    marginBottom: 8 
  },
  subtitle: { 
    fontSize: 15, 
    color: '#6b7280', 
    textAlign: 'center', 
    marginBottom: 32 
  },
  inputContainer: { 
    marginBottom: 24 
  },
  input: { 
    backgroundColor: '#f3f4f6', 
    borderWidth: 1, 
    borderColor: '#e5e7eb', 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    marginBottom: 16, 
    borderRadius: 8, 
    fontSize: 16, 
    color: '#1f2937' 
  },
  primaryButton: { 
    backgroundColor: '#4F46E5', 
    paddingVertical: 16, 
    borderRadius: 8, 
    alignItems: 'center', 
    shadowColor: '#4F46E5', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8, 
    elevation: 4 
  },
  primaryButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold', 
    letterSpacing: 0.5 
  },
  footerRow: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginTop: 24 
  },
  footerText: { 
    color: '#6b7280', 
    fontSize: 15 
  },
  footerLink: { 
    color: '#4F46E5', 
    fontSize: 15, 
    fontWeight: 'bold' 
  }
});
