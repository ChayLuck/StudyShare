import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function NoteDetailScreen({ route, navigation }: any) {
  const { note } = route.params;
  const { colors, isDark } = useTheme();
  const { isLoggedIn: isLogged } = useAuth();
  
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/notes/${note.id}/comments`);
      setComments(res.data.data);
    } catch (e) {
      console.log('Error fetching comments', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!isLogged) {
      return Alert.alert('Error', 'You must be logged in to comment');
    }
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      const res = await api.post(`/notes/${note.id}/comments`, { text: newComment });
      setComments([res.data.comment, ...comments]);
      setNewComment('');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const renderComment = ({ item }: { item: any }) => (
    <View style={[styles.commentCard, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      {item.user?.avatarUrl ? (
        <Image source={{ uri: item.user.avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.chip }]}>
          <Text style={{ fontSize: 16 }}>👤</Text>
        </View>
      )}
      <View style={styles.commentContent}>
        <Text style={[styles.commentName, { color: colors.text }]}>{item.user?.name || 'Anonymous'}</Text>
        <Text style={[styles.commentText, { color: colors.textSecondary }]}>{item.text}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>← Comments</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={comments}
        keyExtractor={item => item.id}
        renderItem={renderComment}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 40, marginBottom: 10 }}>💬</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No comments yet.</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Be the first to share your thoughts!</Text>
            </View>
          )
        }
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder={isLogged ? "Add a comment..." : "Log in to comment"}
            placeholderTextColor={colors.textSecondary}
            value={newComment}
            onChangeText={setNewComment}
            editable={isLogged}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendButton, { backgroundColor: colors.primary }, (!isLogged || submitting || !newComment.trim()) && { opacity: 0.5 }]}
            onPress={handleAddComment}
            disabled={!isLogged || submitting || !newComment.trim()}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  listContainer: { padding: 15 },
  commentCard: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  commentContent: { flex: 1 },
  commentName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    marginRight: 12,
    fontSize: 15,
  },
  sendButton: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
