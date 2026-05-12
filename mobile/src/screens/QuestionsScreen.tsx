// Updated Questions Screen
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  TextInput, RefreshControl, SafeAreaView, ActivityIndicator,
  Modal, ScrollView, Alert, Platform, Image, Linking
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as SecureStore from 'expo-secure-store';

const COURSES = ['Calculus', 'Physics', 'Chemistry', 'Biology', 'History', 'Other'];

export default function QuestionsScreen({ route, navigation }: any) {
  const { colors, isDark } = useTheme();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Filtering params from navigation
  const userIdFilter = route.params?.userId;
  const answeredByMe = route.params?.answeredByMe;
  
  // Modal State
  const [showAskModal, setShowAskModal] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCourse, setNewCourse] = useState('Calculus');
  const [newTopic, setNewTopic] = useState('');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

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

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (search) params.search = search;
      if (selectedCourse) params.course = selectedCourse;
      if (userIdFilter) params.userId = userIdFilter;
      if (answeredByMe) params.answeredByMe = 'true';
      
      const response = await api.get('/questions', { params });
      setQuestions(response.data.questions);
    } catch (error) {
      console.error('Fetch questions failed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, selectedCourse, userIdFilter, answeredByMe]);

  useEffect(() => {
    fetchQuestions();
    const getUserId = async () => {
      const id = await SecureStore.getItemAsync('userId');
      setCurrentUserId(id);
    };
    getUserId();
  }, [fetchQuestions]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchQuestions();
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setSelectedFile(result.assets[0]);
    }
  };

  const handlePickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
    });

    if (!result.canceled) {
      setSelectedFile(result.assets[0]);
    }
  };

  const handleAskQuestion = async () => {
    if (!newContent || !newCourse || !newTopic) {
      return Alert.alert('Error', 'Please fill in all fields');
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('content', newContent);
      formData.append('course', newCourse);
      formData.append('topic', newTopic);

      if (selectedFile) {
        const fileToUpload = {
          uri: selectedFile.uri,
          name: selectedFile.name || `upload_${Date.now()}.${selectedFile.mimeType === 'application/pdf' ? 'pdf' : 'jpg'}`,
          type: selectedFile.mimeType || 'image/jpeg',
        };
        formData.append('file', fileToUpload as any);
      }

      await api.post('/questions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Success', 'Question posted successfully!');
      setShowAskModal(false);
      setNewContent('');
      setNewTopic('');
      setSelectedFile(null);
      fetchQuestions();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to post question');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    Alert.alert(
      'Delete Question',
      'Are you sure you want to delete this question?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/questions/${id}`);
              fetchQuestions();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete question');
            }
          }
        }
      ]
    );
  };

  const renderQuestion = ({ item }: any) => (
    <TouchableOpacity 
      style={[styles.questionCard, { backgroundColor: colors.card }]}
      onPress={() => navigation.navigate('QuestionDetail', { questionId: item.id })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {item.user.name ? item.user.name[0].toUpperCase() : 'U'}
            </Text>
          </View>
          <View>
            <Text style={[styles.userName, { color: colors.text }]}>{item.user.name || 'Anonymous'}</Text>
            <Text style={[styles.timeText, { color: colors.textSecondary }]}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
        {item.isResolved && (
          <View style={styles.resolvedBadge}>
            <Text style={styles.resolvedText}>✓ Solved</Text>
          </View>
        )}
      </View>

      <Text style={[styles.questionContent, { color: colors.text }]} numberOfLines={3}>
        {item.content}
      </Text>

      {item.fileUrl && (
        <TouchableOpacity 
          style={styles.cardPreview} 
          onPress={() => Linking.openURL(item.fileUrl)}
        >
          <Image 
            source={{ uri: getThumbnailUrl(item.fileUrl) }} 
            style={styles.previewImage} 
            resizeMode="cover" 
          />
          {item.fileType === 'pdf' && (
            <View style={styles.pdfOverlay}>
              <Text style={styles.pdfOverlayText}>📄 PDF</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      <View style={styles.cardFooter}>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: colors.chip }]}>
            <Text style={[styles.badgeText, { color: colors.chipText }]}>{item.course}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.border }]}>
            <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{item.topic}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.answerCount, { color: colors.primary }]}>
             💬 {item._count.answers}
          </Text>
          {item.userId === currentUserId && (
             <TouchableOpacity 
               onPress={() => handleDeleteQuestion(item.id)}
               style={{ marginLeft: 15 }}
             >
               <Text style={{ fontSize: 18 }}>🗑️</Text>
             </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const getTitle = () => {
    if (userIdFilter) return 'My Questions';
    if (answeredByMe) return 'My Answers';
    return 'Study Q&A';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {(userIdFilter || answeredByMe) && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 15 }}>
              <Text style={{ fontSize: 24, color: colors.text }}>←</Text>
            </TouchableOpacity>
          )}
          <Text style={[styles.headerTitle, { color: colors.text }]}>{getTitle()}</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="Search questions..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {!userIdFilter && !answeredByMe && (
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <TouchableOpacity 
              style={[styles.filterChip, !selectedCourse && { backgroundColor: colors.primary }]}
              onPress={() => setSelectedCourse(null)}
            >
              <Text style={[styles.filterChipText, !selectedCourse ? { color: '#fff' } : { color: colors.textSecondary }]}>All</Text>
            </TouchableOpacity>
            {COURSES.map(course => (
              <TouchableOpacity 
                key={course}
                style={[styles.filterChip, selectedCourse === course && { backgroundColor: colors.primary }]}
                onPress={() => setSelectedCourse(course)}
              >
                <Text style={[styles.filterChipText, selectedCourse === course ? { color: '#fff' } : { color: colors.textSecondary }]}>
                  {course}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={questions}
          renderItem={renderQuestion}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No questions found.</Text>
            </View>
          }
        />
      )}

      {/* Ask Question Modal */}
      <Modal visible={showAskModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Ask a Question</Text>
              <TouchableOpacity onPress={() => setShowAskModal(false)}>
                <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={[styles.label, { color: colors.text }]}>Question Content</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: isDark ? '#374151' : '#f3f4f6', color: colors.text }]}
                placeholder="What is your question?"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
                value={newContent}
                onChangeText={setNewContent}
              />

              <Text style={[styles.label, { color: colors.text }]}>Course</Text>
              <View style={styles.courseGrid}>
                {COURSES.map(course => (
                  <TouchableOpacity 
                    key={course}
                    style={[styles.courseItem, newCourse === course && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => setNewCourse(course)}
                  >
                    <Text style={[styles.courseItemText, newCourse === course ? { color: '#fff' } : { color: colors.textSecondary }]}>
                      {course}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: colors.text }]}>Topic</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#374151' : '#f3f4f6', color: colors.text }]}
                placeholder="e.g. Limits, Integration..."
                placeholderTextColor={colors.textSecondary}
                value={newTopic}
                onChangeText={setNewTopic}
              />

              <Text style={[styles.label, { color: colors.text }]}>Attachment (Optional)</Text>
              <View style={styles.attachRow}>
                <TouchableOpacity style={styles.attachBtn} onPress={handlePickImage}>
                  <Text style={styles.attachBtnText}>📸 Image</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.attachBtn} onPress={handlePickDocument}>
                  <Text style={styles.attachBtnText}>📄 PDF</Text>
                </TouchableOpacity>
              </View>

              {selectedFile && (
                <View style={[styles.selectedFile, { backgroundColor: colors.chip }]}>
                  <Text style={[styles.selectedFileText, { color: colors.chipText }]} numberOfLines={1}>
                    📎 {selectedFile.name || 'Selected image'}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedFile(null)}>
                    <Text style={{ color: '#ef4444' }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity 
                style={[styles.submitButton, { backgroundColor: colors.primary }]}
                onPress={handleAskQuestion}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Post Question</Text>
                )}
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {!userIdFilter && !answeredByMe && (
        <TouchableOpacity 
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => setShowAskModal(true)}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20 
  },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  askButton: { 
    backgroundColor: '#4F46E5', 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20 
  },
  askButtonText: { color: '#fff', fontWeight: 'bold' },
  searchContainer: { paddingHorizontal: 20, marginBottom: 15 },
  searchInput: { 
    height: 45, 
    borderWidth: 1, 
    borderRadius: 12, 
    paddingHorizontal: 15, 
    fontSize: 16 
  },
  filterContainer: { marginBottom: 15 },
  filterScroll: { paddingHorizontal: 15 },
  filterChip: { 
    paddingHorizontal: 20, 
    paddingVertical: 8, 
    borderRadius: 20, 
    marginRight: 10,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  filterChipText: { fontWeight: '600' },
  listContent: { padding: 20, paddingTop: 0 },
  questionCard: { 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatarPlaceholder: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  avatarText: { fontWeight: 'bold', fontSize: 18 },
  userName: { fontWeight: 'bold', fontSize: 15 },
  timeText: { fontSize: 12 },
  resolvedBadge: { backgroundColor: '#10b981', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  resolvedText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  questionContent: { fontSize: 16, lineHeight: 22, marginBottom: 16 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badgeRow: { flexDirection: 'row' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginRight: 8 },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  answerCount: { fontWeight: '600', fontSize: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 16 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '90%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalForm: { flex: 1 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, marginTop: 16 },
  textArea: { borderRadius: 12, padding: 15, fontSize: 16, height: 120, textAlignVertical: 'top' },
  input: { borderRadius: 12, padding: 15, fontSize: 16, height: 50 },
  courseGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 },
  courseItem: { 
    paddingHorizontal: 15, 
    paddingVertical: 8, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#e5e7eb',
    marginRight: 10,
    marginBottom: 10
  },
  courseItemText: { fontWeight: '600' },
  attachRow: { flexDirection: 'row', marginTop: 10 },
  attachBtn: { 
    flex: 1, 
    backgroundColor: '#EEF2FF', 
    padding: 15, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginRight: 10 
  },
  attachBtnText: { color: '#4F46E5', fontWeight: 'bold' },
  selectedFile: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 12, 
    borderRadius: 10, 
    marginTop: 15 
  },
  selectedFileText: { flex: 1, marginRight: 10 },
  submitButton: { paddingVertical: 16, borderRadius: 12, marginTop: 30, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cardPreview: { marginTop: 10, borderRadius: 12, overflow: 'hidden', marginBottom: 15 },
  previewImage: { width: '100%', height: 180, borderRadius: 12 },
  pdfOverlay: { 
    position: 'absolute', 
    bottom: 10, 
    right: 10, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 8 
  },
  pdfOverlayText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  pdfPreview: { height: 80, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  pdfPreviewText: { marginLeft: 10, fontWeight: '600' },
  fab: { 
    position: 'absolute', 
    bottom: 30, 
    right: 25, 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  },
  fabText: { color: '#fff', fontSize: 32, fontWeight: '300' }
});
