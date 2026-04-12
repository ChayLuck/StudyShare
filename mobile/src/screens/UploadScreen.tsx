import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, ScrollView, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

export default function UploadScreen({ navigation }: any) {
  const [courseName, setCourseName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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
        type: ['application/pdf', 'image/*'],
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

    setLoading(true);
    const formData = new FormData();
    formData.append('courseName', courseName);
    formData.append('schoolName', schoolName);
    formData.append('description', description);

    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || 'application/octet-stream'
    } as any);

    try {
      const token = await SecureStore.getItemAsync('accessToken');
      const apiBase = api.defaults.baseURL || 'http://192.168.0.27:4000/api';
      
      const response = await fetch(`${apiBase}/notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Let fetch automatically set the Content-Type boundary for multipart/form-data
        },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to upload');
      }

      Alert.alert('Success', 'Note uploaded successfully!');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Upload Error', e.message || 'Failed to upload');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Note</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>School Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. HARVARD UNIVERSITY"
            placeholderTextColor="#9ca3af"
            value={schoolName}
            onChangeText={(text) => {
              const val = text.toUpperCase();
              setSchoolName(val);
              searchFuzzy('school', val);
            }}
            autoCapitalize="characters"
          />
          {schoolSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {schoolSuggestions.map(s => (
                <TouchableOpacity key={s} style={styles.suggestionItem} onPress={() => { setSchoolName(s); setSchoolSuggestions([]); }}>
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Course Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. CS50"
            placeholderTextColor="#9ca3af"
            value={courseName}
            onChangeText={(text) => {
              const val = text.toUpperCase();
              setCourseName(val);
              searchFuzzy('course', val);
            }}
            autoCapitalize="characters"
          />
          {courseSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {courseSuggestions.map(s => (
                <TouchableOpacity key={s} style={styles.suggestionItem} onPress={() => { setCourseName(s); setCourseSuggestions([]); }}>
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What is this note about?"
            placeholderTextColor="#9ca3af"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Attachment</Text>
          <TouchableOpacity style={styles.fileBox} onPress={pickFile}>
            <View style={styles.fileIconPlaceholder}>
              <Text style={styles.fileIconText}>{file ? '📄' : '📁'}</Text>
            </View>
            <Text style={styles.fileBoxText}>
              {file ? file.name : 'Tap to select PDF or Image'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.uploadButton, loading && styles.uploadButtonDisabled]} 
          onPress={handleUpload}
          disabled={loading}
        >
          <Text style={styles.uploadButtonText}>
            {loading ? 'Uploading...' : 'Publish Note'}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: { padding: 5 },
  backIcon: { fontSize: 24, color: '#374151', fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  container: { padding: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 15,
    color: '#1f2937',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
      android: { elevation: 1 }
    })
  },
  textArea: { height: 100 },
  suggestionsContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    marginTop: -2,
    maxHeight: 150
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  suggestionText: { color: '#4F46E5', fontWeight: '600' },
  fileBox: {
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: '#C7D2FE',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center'
  },
  fileIconPlaceholder: {
    backgroundColor: '#fff',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  fileIconText: { fontSize: 24 },
  fileBoxText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center'
  },
  uploadButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  uploadButtonDisabled: { backgroundColor: '#818CF8' },
  uploadButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
