import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Linking, SafeAreaView, ActivityIndicator, Image, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import * as SecureStore from 'expo-secure-store';
import { useTheme } from '../context/ThemeContext';

export default function HomeScreen({ navigation }: any) {
  const [notes, setNotes] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [isLogged, setIsLogged] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const { colors, toggleTheme, isDark } = useTheme();

  const UNIVERSITIES = ['ALL', 'İTÜ', 'ODTÜ', 'BOĞAZİÇİ', 'HACETTEPE', 'YILDIZ TEKNİK', 'KOÇ UNIVERSITY', 'DOĞUŞ UNIVERSITY'];

  // When mounting or focusing, re-check tokens and fetch recent items
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      await checkToken();
      setPage(1);
      fetchNotes(1, true, selectedSchool, searchQuery);
      const token = await SecureStore.getItemAsync('accessToken');
      if (token) {
        fetchFavorites();
      }
    });
    return unsubscribe;
  }, [navigation]);

  const checkToken = async () => {
    const token = await SecureStore.getItemAsync('accessToken');
    const role = await SecureStore.getItemAsync('userRole');
    const uId = await SecureStore.getItemAsync('userId');
    setIsLogged(!!token);
    setUserRole(role);
    setCurrentUserId(uId);
  };

  const fetchFavorites = async () => {
    try {
      const res = await api.get('/favorites');
      const favIds = res.data.data.map((n: any) => n.id);
      setFavorites(favIds);
    } catch (e) {
      console.log('Error fetching favs', e);
    }
  };

  const fetchNotes = async (pageNum: number, reset = false, school = 'ALL', search = '') => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await api.get('/notes', {
        params: {
          page: pageNum,
          limit: 10,
          school: school,
          search: search
        }
      });
      if (reset) {
        setNotes(response.data.data);
      } else {
        setNotes((prev) => [...prev, ...response.data.data]);
      }
    } catch (e: any) {
      console.log('Error fetching notes', e);
      Alert.alert('Error', e.message || 'Failed to fetch notes');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && notes.length >= page * 10) {
      const newPage = page + 1;
      setPage(newPage);
      fetchNotes(newPage, false, selectedSchool, searchQuery);
    }
  };

  const handleSchoolSelect = (school: string) => {
    setSelectedSchool(school);
    setPage(1);
    fetchNotes(1, true, school, searchQuery);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setPage(1);
    fetchNotes(1, true, selectedSchool, text);
  };

  const viewFile = (fileUrl: string) => {
    Linking.openURL(fileUrl).catch(() => Alert.alert('Error', 'Unable to open file'));
  };

  const toggleFavorite = async (noteId: string) => {
    if (!isLogged) return Alert.alert('Error', 'Must be logged in to favorite notes');
    try {
      const res = await api.post('/favorites/toggle', { noteId });
      if (res.data.favorited) {
        setFavorites([...favorites, noteId]);
      } else {
        setFavorites(favorites.filter(id => id !== noteId));
      }
    } catch (e) {
      console.log('Toggle favorite error', e);
    }
  };

  const getThumbnailUrl = (fileUrl: string) => {
    if (!fileUrl) return undefined;

    // Check if it is a Cloudinary URL
    if (fileUrl.includes('res.cloudinary.com')) {
      if (fileUrl.toLowerCase().includes('.pdf')) {
        // Transformation: First page (pg_1), crop to size (w_500,h_300,c_fill), gravity north
        // Also change extension to .jpg for the preview
        return fileUrl
          .replace('/upload/', '/upload/pg_1,w_600,h_400,c_fill,g_north/')
          .replace(/\.pdf$/i, '.jpg');
      }
      // For images, just optimize size
      return fileUrl.replace('/upload/', '/upload/w_600,h_400,c_fill/');
    }
    return fileUrl;
  };

  const reportNote = async (noteId: string) => {
    if (!isLogged) return Alert.alert('Error', 'Must be logged in to report');
    try {
      await api.post('/reports', { noteId, reason: 'Inappropriate content' });
      Alert.alert('Reported', 'Thank you for your report. Admins will review it.');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to report');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    Alert.alert(
      "Delete Note",
      "Are you sure you want to permanently delete this note?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              await api.delete(`/notes/${noteId}`);
              setNotes(notes.filter(n => n.id !== noteId));
              Alert.alert("Deleted", "Note has been removed successfully.");
            } catch (e: any) {
              Alert.alert("Error", e.response?.data?.error || "Failed to delete note");
            }
          }
        }
      ]
    );
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('userRole');
    await SecureStore.deleteItemAsync('userId');
    setIsLogged(false);
    setUserRole(null);
    setCurrentUserId(null);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.chip, { backgroundColor: colors.chip }]}>
          <Text style={[styles.chipText, { color: colors.chipText }]}>{item.courseName}</Text>
        </View>
        <Text style={[styles.schoolText, { color: colors.text }]} numberOfLines={1}>{item.schoolName}</Text>
      </View>

      <Text style={[styles.descriptionText, { color: colors.textSecondary }]} numberOfLines={3}>
        {item.description || "No description provided."}
      </Text>

      <Image
        source={{ uri: getThumbnailUrl(item.fileUrl) }}
        style={styles.thumbnail}
        resizeMode="cover"
      />

      <View style={[styles.divider, { backgroundColor: colors.divider }]} />

      <View style={styles.cardFooter}>
        <TouchableOpacity style={[styles.viewButton, { backgroundColor: colors.primary }]} onPress={() => viewFile(item.fileUrl)}>
          <Text style={styles.viewButtonText}>View Material</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => toggleFavorite(item.id)} style={{ marginRight: 15 }}>
            <Ionicons name={favorites.includes(item.id) ? 'heart' : 'heart-outline'} size={22} color={favorites.includes(item.id) ? '#ef4444' : colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('NoteDetail', { note: item })} style={{ marginRight: 10 }}>
            <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {isLogged && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {item.userId === currentUserId && (
                <TouchableOpacity 
                  style={[styles.reportButton, { marginRight: 10 }]} 
                  onPress={() => handleDeleteNote(item.id)}
                >
                  <Ionicons name="trash" size={18} color="#ef4444" />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.reportButton} onPress={() => reportNote(item.id)}>
                <Ionicons name="warning" size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Custom Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>StudyShare</Text>
        <View style={styles.headerLinks}>
          <TouchableOpacity onPress={toggleTheme} style={{ marginRight: 10 }}>
            <Ionicons name={isDark ? 'sunny' : 'moon'} size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Leaderboard')} style={{ marginRight: 15 }}>
            <Ionicons name="trophy" size={20} color={colors.text} />
          </TouchableOpacity>
          {/* Profile icon removed from header as per user request */}

          {!isLogged ? (
            <TouchableOpacity onPress={() => navigation.navigate('Auth')}>
              <Text style={styles.headerActionText}>Login</Text>
            </TouchableOpacity>
          ) : (
            <>
              {userRole === 'ADMIN' && (
                <TouchableOpacity onPress={() => navigation.navigate('Admin')} style={{ marginRight: 15 }}>
                  <Text style={[styles.headerActionText, { color: '#4F46E5', fontWeight: 'bold' }]}>Admin</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={logout}>
                <Text style={[styles.headerActionText, { color: '#ef4444' }]}>Logout</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.searchWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.text} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search school or course..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close" size={20} color={colors.textSecondary} style={{ marginRight: 10 }} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* University Filter Bar */}
      <View style={{ backgroundColor: colors.card }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={UNIVERSITIES}
          keyExtractor={item => item}
          contentContainerStyle={styles.filterContainer}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                { backgroundColor: colors.chip, borderColor: colors.border },
                selectedSchool === item && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              onPress={() => handleSchoolSelect(item)}
            >
              <Text style={[
                styles.filterChipText,
                { color: selectedSchool === item ? '#fff' : colors.textSecondary }
              ]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={notes}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContainer}
        ListFooterComponent={loading ? <ActivityIndicator size="large" color="#4F46E5" style={{ marginVertical: 20 }} /> : null}
      />

      {/* Floating Action Button */}
      {isLogged && (
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('Upload')}>
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1f2937',
    letterSpacing: -0.5
  },
  headerLinks: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280'
  },
  searchContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 45,
  },
  searchIcon: {
    marginRight: 8,
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  listContainer: {
    padding: 15,
    paddingBottom: 100 // space for FAB
  },
  filterContainer: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    gap: 8
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600'
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  chip: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginRight: 10
  },
  chipText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '700'
  },
  schoolText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    flex: 1
  },
  descriptionText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginBottom: 12
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  viewButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold'
  },
  reportButton: {
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  reportButtonText: {
    color: '#ef4444',
    fontSize: 22,
    fontWeight: 'bold'
  },
  thumbnail: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    marginBottom: 12
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 60,
    height: 60,
    backgroundColor: '#4F46E5',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8
  },
  fabIcon: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '300',
    marginTop: -2
  }
});
