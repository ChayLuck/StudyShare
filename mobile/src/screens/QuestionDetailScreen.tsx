import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Image, ActivityIndicator, SafeAreaView, ScrollView,
  Modal, TextInput, Alert, KeyboardAvoidingView, Platform, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

export default function QuestionDetailScreen({ route, navigation }: any) {
  const { questionId } = route.params;
  const { colors, isDark } = useTheme();
  
  const [question, setQuestion] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Answer Modal State
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [answerContent, setAnswerContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const fetchQuestionDetail = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/questions/${questionId}`);
      setQuestion(response.data.question);
      
      const userId = await SecureStore.getItemAsync('userId');
      setCurrentUserId(userId);
    } catch (error) {
      console.error('Fetch question detail failed:', error);
      Alert.alert('Error', 'Failed to load question details');
    } finally {
      setLoading(false);
    }
  }, [questionId]);

  useEffect(() => {
    fetchQuestionDetail();
  }, [fetchQuestionDetail]);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled) setSelectedFile(result.assets[0]);
  };

  const handlePickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (!result.canceled) setSelectedFile(result.assets[0]);
  };

  const handlePostAnswer = async () => {
    if (!answerContent) return Alert.alert('Error', 'Please enter your answer');

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('content', answerContent);
      formData.append('questionId', questionId);

      if (selectedFile) {
        formData.append('file', {
          uri: selectedFile.uri,
          name: selectedFile.name || `answer_${Date.now()}.${selectedFile.mimeType === 'application/pdf' ? 'pdf' : 'jpg'}`,
          type: selectedFile.mimeType || 'image/jpeg',
        } as any);
      }

      await api.post('/answers', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Success', 'Answer posted!');
      setShowAnswerModal(false);
      setAnswerContent('');
      setSelectedFile(null);
      fetchQuestionDetail();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to post answer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkCorrect = async (answerId: string) => {
    try {
      await api.patch(`/answers/${answerId}/correct`);
      fetchQuestionDetail();
    } catch (error) {
      Alert.alert('Error', 'Failed to mark as correct');
    }
  };

  const handleMarkSpam = async (answerId: string) => {
    try {
      await api.patch(`/answers/${answerId}/spam`);
      fetchQuestionDetail();
    } catch (error) {
      Alert.alert('Error', 'Failed to mark as spam');
    }
  };

  const handleDeleteQuestion = async () => {
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
              await api.delete(`/questions/${questionId}`);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete question');
            }
          }
        }
      ]
    );
  };

  const handleDeleteAnswer = async (answerId: string) => {
    Alert.alert(
      'Delete Answer',
      'Are you sure you want to delete this answer?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/answers/${answerId}`);
              fetchQuestionDetail();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete answer');
            }
          }
        }
      ]
    );
  };

  const renderHeader = () => (
    <View style={styles.questionSection}>
      <View style={styles.headerRow}>
        <View style={styles.userInfo}>
           <View style={[styles.avatarSmall, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.avatarTextSmall, { color: colors.primary }]}>
              {question.user.name ? question.user.name[0].toUpperCase() : 'U'}
            </Text>
          </View>
          <Text style={[styles.userName, { color: colors.text }]}>{question.user.name}</Text>
        </View>
        <View style={[styles.courseBadge, { backgroundColor: colors.chip }]}>
          <Text style={[styles.courseBadgeText, { color: colors.chipText }]}>{question.course}</Text>
        </View>
      </View>

      {question.isResolved && (
        <View style={[styles.solvedBadge, { backgroundColor: '#10b981' }]}>
          <Text style={styles.solvedBadgeText}>Solved</Text>
        </View>
      )}

      <Text style={[styles.mainContent, { color: colors.text }]}>{question.content}</Text>
      
      {question.fileUrl && (
        <TouchableOpacity 
          style={styles.attachmentContainer}
          onPress={() => Linking.openURL(question.fileUrl)}
        >
          <Image 
            source={{ uri: getThumbnailUrl(question.fileUrl) }} 
            style={styles.attachmentImage} 
            resizeMode="contain" 
          />
        </TouchableOpacity>
      )}

      <View style={styles.divider} />
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Answers ({question.answers.length})</Text>
    </View>
  );

  const renderAnswer = ({ item }: any) => {
    const isQuestionOwner = currentUserId === question.userId;
    
    return (
      <View style={[styles.answerCard, { backgroundColor: colors.card }, item.isCorrect && { borderColor: '#10b981', borderLeftWidth: 4 }]}>
        <View style={styles.answerHeader}>
          <View style={styles.userInfo}>
             <View style={[styles.avatarMini, { backgroundColor: colors.border }]}>
               <Text style={[styles.avatarTextMini, { color: colors.text }]}>
                 {item.user.name ? item.user.name[0].toUpperCase() : 'U'}
               </Text>
             </View>
             <Text style={[styles.userNameSmall, { color: colors.text }]}>{item.user.name}</Text>
             {item.userId === question.userId && (
               <View style={[styles.ownerBadge, { backgroundColor: colors.primary + '20' }]}>
                 <Text style={[styles.ownerBadgeText, { color: colors.primary }]}>OWNER</Text>
               </View>
             )}
          </View>
          {item.isCorrect && (
            <View style={styles.correctBadge}>
              <Ionicons name="checkmark" size={14} color="#10b981" />
              <Text style={styles.correctText}> Best Answer</Text>
            </View>
          )}
        </View>

        <Text style={[styles.answerText, { color: colors.text }]}>{item.content}</Text>
        
        {item.fileUrl && (
          <TouchableOpacity 
            style={styles.answerAttachment}
            onPress={() => Linking.openURL(item.fileUrl)}
          >
            <Image 
              source={{ uri: getThumbnailUrl(item.fileUrl) }} 
              style={styles.answerImage} 
              resizeMode="cover" 
            />
            {item.fileType === 'pdf' && (
              <View style={styles.pdfBadgeOverlay}>
                <Text style={styles.pdfBadgeText}>📄 PDF</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {(isQuestionOwner || item.userId === currentUserId) && (
          <View style={styles.actionRow}>
            {isQuestionOwner && !item.isSpam && (
              <>
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: item.isCorrect ? '#ef4444' : '#10b981' }]}
                  onPress={() => handleMarkCorrect(item.id)}
                >
                  <Text style={styles.actionBtnText}>{item.isCorrect ? 'Unmark Correct' : 'Mark Correct'}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: '#9ca3af' }]}
                  onPress={() => handleMarkSpam(item.id)}
                >
                  <Text style={styles.actionBtnText}>Spam</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: '#ef4444' }]}
              onPress={() => handleDeleteAnswer(item.id)}
            >
              <Text style={styles.actionBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.isSpam && (
          <View style={styles.spamNotice}>
            <Ionicons name="warning" size={14} color="#ef4444" />
            <Text style={styles.spamText}> This answer was reported as spam.</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backBtnText, { color: colors.text }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Question</Text>
        {question.userId === currentUserId ? (
          <TouchableOpacity onPress={handleDeleteQuestion} style={styles.deleteHeaderBtn}>
            <Ionicons name="trash" size={16} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 50 }} />
        )}
      </View>

      <FlatList
        data={question.answers}
        renderItem={renderAnswer}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No answers yet. Be the first to help!</Text>
          </View>
        }
      />

      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setShowAnswerModal(true)}
      >
        <Text style={styles.fabText}>Answer</Text>
      </TouchableOpacity>

      {/* Answer Modal */}
      <Modal visible={showAnswerModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Your Answer</Text>
                <TouchableOpacity onPress={() => setShowAnswerModal(false)}>
                  <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={[styles.textArea, { backgroundColor: isDark ? '#374151' : '#f3f4f6', color: colors.text }]}
                placeholder="Write your answer here..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={6}
                value={answerContent}
                onChangeText={setAnswerContent}
              />

              <View style={styles.attachRow}>
                <TouchableOpacity style={styles.attachBtn} onPress={handlePickImage}>
                  <Ionicons name="camera" size={16} color={colors.primary} />
                  <Text style={styles.attachBtnText}> Image</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.attachBtn} onPress={handlePickDocument}>
                  <Ionicons name="document" size={16} color={colors.primary} />
                  <Text style={styles.attachBtnText}> PDF</Text>
                </TouchableOpacity>
              </View>

              {selectedFile && (
                <View style={[styles.selectedFile, { backgroundColor: colors.chip }]}>
                  <Ionicons name="attach" size={16} color={colors.chipText} />
                  <Text style={[styles.selectedFileText, { color: colors.chipText }]} numberOfLines={1}>
                    {selectedFile.name || 'File selected'}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedFile(null)}>
                    <Text style={{ color: '#ef4444' }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity 
                style={[styles.submitButton, { backgroundColor: colors.primary }]}
                onPress={handlePostAnswer}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Answer</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  backBtn: { padding: 5 },
  backBtnText: { fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  listContent: { padding: 20 },
  questionSection: { marginBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatarSmall: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarTextSmall: { fontWeight: 'bold', fontSize: 14 },
  userName: { fontWeight: 'bold', fontSize: 16 },
  courseBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  courseBadgeText: { fontSize: 12, fontWeight: 'bold' },
  solvedBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginBottom: 15 },
  solvedBadgeText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  mainContent: { fontSize: 17, lineHeight: 26, marginBottom: 20 },
  attachmentContainer: { marginBottom: 20, borderRadius: 12, overflow: 'hidden' },
  attachmentImage: { width: '100%', height: 300, borderRadius: 12 },
  pdfPlaceholder: { height: 120, justifyContent: 'center', alignItems: 'center', borderRadius: 12 },
  pdfText: { marginTop: 10, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  answerCard: { padding: 16, borderRadius: 16, marginBottom: 15, borderWidth: 1, borderColor: '#f3f4f6' },
  answerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  avatarMini: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  avatarTextMini: { fontWeight: 'bold', fontSize: 10 },
  userNameSmall: { fontWeight: '600', fontSize: 14 },
  correctBadge: { backgroundColor: '#10b981', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  correctText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  answerText: { fontSize: 15, lineHeight: 22, marginBottom: 12 },
  answerAttachment: { marginBottom: 10, borderRadius: 12, overflow: 'hidden' },
  answerImage: { width: '100%', height: 200, borderRadius: 12 },
  answerPdf: { padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  ownerBadge: { marginLeft: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  ownerBadgeText: { fontSize: 10, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', marginTop: 10, flexWrap: 'wrap' },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginRight: 10, marginBottom: 5 },
  actionBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  spamNotice: { marginTop: 10, backgroundColor: '#fee2e2', padding: 8, borderRadius: 8 },
  spamText: { color: '#ef4444', fontSize: 12, fontWeight: '600' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { textAlign: 'center', fontSize: 15 },
  fab: { 
    position: 'absolute', 
    bottom: 30, 
    right: 30, 
    paddingHorizontal: 25, 
    paddingVertical: 15, 
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },
  fabText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, minHeight: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  textArea: { borderRadius: 12, padding: 15, fontSize: 16, height: 150, textAlignVertical: 'top' },
  attachRow: { flexDirection: 'row', marginTop: 15 },
  attachBtn: { flex: 1, backgroundColor: '#EEF2FF', padding: 12, borderRadius: 10, alignItems: 'center', marginRight: 10 },
  attachBtnText: { color: '#4F46E5', fontWeight: 'bold' },
  selectedFile: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 10, marginTop: 15 },
  selectedFileText: { flex: 1, marginRight: 10 },
  submitButton: { paddingVertical: 16, borderRadius: 12, marginTop: 25, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  pdfBadgeOverlay: { 
    position: 'absolute', 
    bottom: 10, 
    right: 10, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 8 
  },
  pdfBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  deleteHeaderBtn: { padding: 5, width: 50, alignItems: 'center' }
});
