import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, ScrollView, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

export default function UploadScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const [courseName, setCourseName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const UNIVERSITIES = ['İTÜ', 'ODTÜ', 'BOĞAZİÇİ', 'HACETTEPE', 'YILDIZ TEKNİK', 'KOÇ UNIVERSITY', 'DOĞUŞ UNIVERSITY'];

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
      const apiBase = api.defaults.baseURL || 'http://localhost:4000/api';
      
      const response = await fetch(`${apiBase}/notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={[styles.backIcon, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Upload Note</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>School Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            placeholder="e.g. HARVARD UNIVERSITY"
            placeholderTextColor={colors.textSecondary}
            value={schoolName}
            onChangeText={(text) => {
              const val = text.toUpperCase();
              setSchoolName(val);
              searchFuzzy('school', val);
            }}
            autoCapitalize="characters"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
            {UNIVERSITIES.map(u => (
              <TouchableOpacity 
                key={u} 
                style={[
                  styles.chip, 
                  { backgroundColor: colors.card, borderColor: colors.border },
                  schoolName === u && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]} 
                onPress={() => setSchoolName(u)}
              >
                <Text style={[styles.chipText, { color: colors.textSecondary }, schoolName === u && { color: '#fff' }]}>{u}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {schoolSuggestions.length > 0 && (
            <View style={[styles.suggestionsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {schoolSuggestions.map(s => (
                <TouchableOpacity 
                  key={s} 
                  style={[styles.suggestionItem, { borderBottomColor: colors.divider }]} 
                  onPress={() => { setSchoolName(s); setSchoolSuggestions([]); }}
                >
                  <Text style={[styles.suggestionText, { color: colors.primary }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Course Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            placeholder="e.g. CS50"
            placeholderTextColor={colors.textSecondary}
            value={courseName}
            onChangeText={(text) => {
              const val = text.toUpperCase();
              setCourseName(val);
              searchFuzzy('course', val);
            }}
            autoCapitalize="characters"
          />
          {courseSuggestions.length > 0 && (
            <View style={[styles.suggestionsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {courseSuggestions.map(s => (
                <TouchableOpacity 
                  key={s} 
                  style={[styles.suggestionItem, { borderBottomColor: colors.divider }]} 
                  onPress={() => { setCourseName(s); setCourseSuggestions([]); }}
                >
                  <Text style={[styles.suggestionText, { color: colors.primary }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            placeholder="What is this note about?"
            placeholderTextColor={colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Attachment</Text>
          <TouchableOpacity 
            style={[
              styles.fileBox, 
              { backgroundColor: isDark ? colors.card : '#EEF2FF', borderColor: colors.primary }
            ]} 
            onPress={pickFile}
          >
            <View style={[styles.fileIconPlaceholder, { backgroundColor: colors.background }]}>
              <Text style={styles.fileIconText}>{file ? '📄' : '📁'}</Text>
            </View>
            <Text style={[styles.fileBoxText, { color: colors.primary }]}>
              {file ? file.name : 'Tap to select PDF or Image'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.uploadButton, { backgroundColor: colors.primary }, loading && styles.uploadButtonDisabled]} 
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
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  backButton: { padding: 5 },
  backIcon: { fontSize: 24, fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  container: { padding: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: {
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 15,
  },
  textArea: { height: 100 },
  suggestionsContainer: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    marginTop: -2,
    maxHeight: 150
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
  },
  suggestionText: { fontWeight: '600' },
  fileBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center'
  },
  fileIconPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  fileIconText: { fontSize: 24 },
  fileBoxText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center'
  },
  uploadButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  uploadButtonDisabled: { opacity: 0.6 },
  uploadButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  chipContainer: {
    marginTop: 10,
    flexDirection: 'row',
  },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  }
});
