import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

export default function MyNotesScreen({ navigation }: any) {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchMyNotes();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchMyNotes = async () => {
    setLoading(true);
    try {
      const response = await api.get('/notes/my-notes');
      setNotes(response.data.data);
    } catch (e: any) {
      console.log('Error fetching user notes', e.message);
      Alert.alert('Error', 'Failed to load your notes.');
    } finally {
      setLoading(false);
    }
  };

  const viewFile = async (fileUrl: string) => {
    try {
      await WebBrowser.openBrowserAsync(fileUrl);
    } catch (error) {
      Alert.alert('Error', 'Unable to open file');
    }
  };

  const getThumbnailUrl = (fileUrl: string) => {
    if (!fileUrl) return undefined;
    if (fileUrl.includes('res.cloudinary.com')) {
      if (fileUrl.toLowerCase().includes('.pdf')) {
        return fileUrl
          .replace('/upload/', '/upload/pg_1,w_600,h_400,c_fill,g_north/')
          .replace(/\.pdf$/i, '.jpg');
      }
      return fileUrl.replace('/upload/', '/upload/w_600,h_400,c_fill/');
    }
    return fileUrl;
  };

  const handleDeleteNote = async (noteId: string) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to permanently delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await api.delete(`/notes/${noteId}`);
              setNotes(prev => prev.filter(n => n.id !== noteId));
              Alert.alert('Success', 'Note deleted successfully.');
            } catch (e: any) {
              Alert.alert('Error', e.response?.data?.error || 'Failed to delete note');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.noteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Top Info */}
      <TouchableOpacity onPress={() => viewFile(item.fileUrl)} style={styles.noteCardPressable}>
        <View style={styles.noteCardHeader}>
          <View style={[styles.noteCourseChip, { backgroundColor: colors.chip }]}>
            <Text style={[styles.noteCourseText, { color: colors.primary }]}>{item.courseName}</Text>
          </View>
          <View style={[
            styles.noteStatusBadge,
            { backgroundColor: item.isPrivate ? '#fee2e2' : '#d1fae5' }
          ]}>
            <Ionicons 
              name={item.isPrivate ? "lock-closed" : "globe-outline"} 
              size={10} 
              color={item.isPrivate ? "#ef4444" : "#10b981"} 
              style={{ marginRight: 3 }}
            />
            <Text style={[
              styles.noteStatusText, 
              { color: item.isPrivate ? "#ef4444" : "#10b981" }
            ]}>
              {item.isPrivate ? 'Private' : 'Public'}
            </Text>
          </View>
        </View>
        <Text style={[styles.noteSchool, { color: colors.text }]} numberOfLines={1}>{item.schoolName}</Text>
        {item.description && (
          <Text style={[styles.noteDesc, { color: colors.textSecondary }]} numberOfLines={2}>{item.description}</Text>
        )}
      </TouchableOpacity>

      <Image
        source={{ uri: getThumbnailUrl(item.fileUrl) }}
        style={styles.thumbnail}
        resizeMode="cover"
      />

      {/* Divider */}
      <View style={[styles.noteDivider, { backgroundColor: colors.divider }]} />

      {/* Bottom Actions Row */}
      <View style={styles.noteActionsRow}>
        <TouchableOpacity
          style={[styles.noteActionBtn, { backgroundColor: colors.chip }]}
          onPress={() => navigation.navigate('AiSummary', { note: item })}
        >
          <Ionicons name="sparkles" size={14} color="#eab308" style={{ marginRight: 4 }} />
          <Text style={[styles.noteActionText, { color: colors.text }]}>Study with AI</Text>
        </TouchableOpacity>

        {!item.isPrivate && (
          <TouchableOpacity
            style={[styles.noteActionBtn, { backgroundColor: colors.chip }]}
            onPress={() => navigation.navigate('NoteDetail', { note: item })}
          >
            <Ionicons name="chatbubble-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.noteActionText, { color: colors.text }]}>Comments</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.noteActionBtn, { backgroundColor: '#fee2e2' }]}
          onPress={() => handleDeleteNote(item.id)}
        >
          <Ionicons name="trash-outline" size={14} color="#ef4444" style={{ marginRight: 4 }} />
          <Text style={[styles.noteActionText, { color: '#ef4444' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Notes</Text>
        <TouchableOpacity
          style={[styles.uploadPrivateBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('Upload', { isPrivate: true })}
        >
          <Ionicons name="add" size={16} color="#fff" style={{ marginRight: 2 }} />
          <Text style={styles.uploadPrivateText}>Upload Private</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <FlatList
          data={notes}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={64} color={colors.textSecondary} style={{ marginBottom: 16 }} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>You haven't uploaded any notes yet.</Text>
                <TouchableOpacity
                  style={[styles.emptyUploadBtn, { borderColor: colors.primary, marginTop: 16 }]}
                  onPress={() => navigation.navigate('Upload', { isPrivate: true })}
                >
                  <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Upload Your First Private Note</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
          ListFooterComponent={loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} /> : null}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', flex: 1, marginLeft: 10 },
  backButton: { padding: 4 },
  uploadPrivateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  uploadPrivateText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  listContainer: { padding: 15 },
  emptyContainer: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyText: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
  emptyUploadBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  noteCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  noteCardPressable: {
    width: '100%',
  },
  noteCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteCourseChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  noteCourseText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  noteStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  noteStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  noteSchool: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  noteDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  noteDivider: {
    height: 1,
    marginVertical: 12,
  },
  noteActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  noteActionText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  thumbnail: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    marginTop: 10,
  },
});
