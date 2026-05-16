import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

const AnimatedBlob = ({ color, size, startPos, duration }: any) => {
  const animX = useRef(new Animated.Value(startPos.x)).current;
  const animY = useRef(new Animated.Value(startPos.y)).current;

  useEffect(() => {
    const animate = () => {
      Animated.parallel([
        Animated.timing(animX, {
          toValue: Math.random() * width,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(animY, {
          toValue: Math.random() * height,
          duration: duration,
          useNativeDriver: true,
        }),
      ]).start(() => animate()); // Loop continuously
    };
    animate();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: 0.3, // Soft look
        transform: [{ translateX: animX }, { translateY: animY }],
      }}
    />
  );
};

export default function AuthScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const { colors, isDark } = useTheme();
  const { login } = useAuth();

  const handleSubmit = async () => {
    if (!email || !password) {
      return Alert.alert('Error', 'Please fill in all fields');
    }
    
    try {
      console.log('[AuthScreen] Starting login/register attempt');
      if (isLogin) {
        console.log('[AuthScreen] Posting to /auth/login with email:', email);
        const response = await api.post('/auth/login', { email, password });
        console.log('[AuthScreen] Login response:', response.data);
        if (response.data.user) {
          await login(
            response.data.accessToken, 
            response.data.refreshToken,
            response.data.user.id, 
            response.data.user.role || ''
          );
          Alert.alert('Welcome Back', 'Logged in successfully!');
        } else {
           throw new Error('User data missing');
        }
      } else {
        await api.post('/auth/register', { email, password, name });
        Alert.alert('Success', 'Registered! Check your email to verify.');
        setIsLogin(true);
      }
    } catch (e: any) {
      console.error('[AuthScreen] Auth error:', {
        message: e.message,
        response: e.response?.data,
        status: e.response?.status,
        code: e.code,
        isAxiosError: e.isAxiosError
      });
      const errorMsg = e.response?.data?.error || e.message || 'Something went wrong';
      Alert.alert('Error', errorMsg);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Animated Soft Background */}
      <View style={StyleSheet.absoluteFillObject}>
        <AnimatedBlob color={isDark ? '#4F46E5' : '#818cf8'} size={250} startPos={{ x: -50, y: -50 }} duration={15000} />
        <AnimatedBlob color={isDark ? '#9333EA' : '#c084fc'} size={300} startPos={{ x: width - 100, y: height / 4 }} duration={18000} />
        <AnimatedBlob color={isDark ? '#2563EB' : '#60a5fa'} size={200} startPos={{ x: width / 2, y: height - 100 }} duration={12000} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={[styles.card, { backgroundColor: colors.card, shadowColor: isDark ? '#fff' : '#000' }]}>
          <Text style={[styles.title, { color: colors.text }]}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isLogin ? 'Sign in to continue to StudyShare' : 'Sign up to start sharing notes'}
          </Text>

          <View style={styles.inputContainer}>
            {!isLogin && (
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#374151' : '#f3f4f6', borderColor: colors.border, color: colors.text }]}
                placeholder="Full Name"
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            )}
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#374151' : '#f3f4f6', borderColor: colors.border, color: colors.text }]}
              placeholder="Email address"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#374151' : '#f3f4f6', borderColor: colors.border, color: colors.text }]}
              placeholder="Password"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit}>
            <Text style={styles.primaryButtonText}>{isLogin ? 'Sign In' : 'Sign Up'}</Text>
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
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
  },
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    paddingHorizontal: 20 
  },
  card: { 
    padding: 24, 
    borderRadius: 16, 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 10, 
    elevation: 5 
  },
  title: { 
    fontSize: 28, 
    fontWeight: '800', 
    textAlign: 'center', 
    marginBottom: 8 
  },
  subtitle: { 
    fontSize: 15, 
    textAlign: 'center', 
    marginBottom: 32 
  },
  inputContainer: { 
    marginBottom: 24 
  },
  input: { 
    borderWidth: 1, 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    marginBottom: 16, 
    borderRadius: 8, 
    fontSize: 16, 
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
    fontSize: 15 
  },
  footerLink: { 
    color: '#4F46E5', 
    fontSize: 15, 
    fontWeight: 'bold' 
  }
});

