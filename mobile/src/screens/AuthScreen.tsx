import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import api from '../services/api';
import * as SecureStore from 'expo-secure-store';

export default function AuthScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  const handleSubmit = async () => {
    try {
      if (isLogin) {
        const response = await api.post('/auth/login', { email, password });
        await SecureStore.setItemAsync('accessToken', response.data.accessToken);
        Alert.alert('Success', 'Logged in');
        navigation.replace('Home');
      } else {
        await api.post('/auth/register', { email, password });
        Alert.alert('Success', 'Registered! Check your email to verify.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Something went wrong');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isLogin ? 'Login' : 'Register'}</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button title={isLogin ? 'Sign In' : 'Sign Up'} onPress={handleSubmit} />
      <Button
        title={isLogin ? 'Need an account?' : 'Already have an account?'}
        onPress={() => setIsLogin(!isLogin)}
        color="gray"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 15, borderRadius: 5 }
});
