import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity, FlatList } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import api from '../services/api';

export default function UploadScreen({ navigation }: any) {
  const [courseName, setCourseName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<any>(null);

  const [courseSuggestions, setCourseSuggestions] = useState<string[]>([]);
  const [schoolSuggestions, setSchoolSuggestions] = useState<string[]>([]);

  const searchFuzzy = async (type: 'course' | 'school', query: string) => {
    if (query.length < 2) {
        if (type === 'course') setCourseSuggestions([]);
        else setSchoolSuggestions([]);
        return;
    }
    try {
      const res = await api.get(`/notes/search?type=${type}&query=${query}`);
      if (type === 'course') setCourseSuggestions(res.data.results);
      else setSchoolSuggestions(res.data.results);
    } catch (e) {
      console.log('Search error', e);
    }
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'], // Exclude videos
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFile(result.assets[0]);
      }
    } catch (e) {
      console.log('Error picking file', e);
    }
  };

  const handleUpload = async () => {
    if (!courseName || !schoolName || !file) {
      return Alert.alert('Error', 'School, Course, and File are required');
    }

    const formData = new FormData();
    formData.append('courseName', courseName);
    formData.append('schoolName', schoolName);
    formData.append('description', description);
    
    // Formatting the object properly for React Native FormData
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || 'application/octet-stream'
    } as any);

    try {
      await api.post('/notes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      Alert.alert('Success', 'Note uploaded!');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Upload Error', e.response?.data?.error || 'Failed to upload');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>School Name (CAPITALS ONLY)</Text>
      <TextInput
        style={styles.input}
        value={schoolName}
        onChangeText={(text) => {
           const val = text.toUpperCase();
           setSchoolName(val);
           searchFuzzy('school', val);
        }}
        autoCapitalize="characters"
      />
      {schoolSuggestions.map(s => (
        <TouchableOpacity key={s} onPress={() => { setSchoolName(s); setSchoolSuggestions([]); }}>
           <Text style={styles.suggestion}>{s}</Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.label}>Course Name (CAPITALS ONLY)</Text>
      <TextInput
        style={styles.input}
        value={courseName}
        onChangeText={(text) => {
           const val = text.toUpperCase();
           setCourseName(val);
           searchFuzzy('course', val);
        }}
        autoCapitalize="characters"
      />
      {courseSuggestions.map(s => (
        <TouchableOpacity key={s} onPress={() => { setCourseName(s); setCourseSuggestions([]); }}>
           <Text style={styles.suggestion}>{s}</Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={styles.input}
        value={description}
        onChangeText={setDescription}
      />

      <Button title={file ? `File: ${file.name}` : "Select PDF/Image"} onPress={pickFile} />
      
      <View style={{ marginTop: 20 }}>
        <Button title="Upload" onPress={handleUpload} color="green" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  label: { fontWeight: 'bold', marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginTop: 5, borderRadius: 5 },
  suggestion: { padding: 10, backgroundColor: '#eee', marginTop: 2 }
});
