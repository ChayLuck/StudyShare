import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Linking, ActivityIndicator, Image, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import * as SecureStore from 'expo-secure-store';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen({ navigation }: any) {
  const { colors, toggleTheme, isDark } = useTheme();

  const { isLoggedIn, userRole, userId: currentUserId, logout: authLogout } = useAuth();

  const [notes, setNotes] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const UNIVERSITIES = ['ALL', 'İTÜ', 'ODTÜ', 'BOĞAZİÇİ', 'HACETTEPE', 'YILDIZ TEKNİK', 'KOÇ UNIVERSITY', 'DOĞUŞ UNIVERSITY'];

  // When mounting or focusing, re-check tokens and fetch recent items
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      setPage(1);
      fetchNotes(1, true, selectedSchool, searchQuery);
      if (isLoggedIn) {
        fetchFavorites();
      }
    });
    return unsubscribe;
  }, [navigation, isLoggedIn, selectedSchool, searchQuery]);


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
    if (!isLoggedIn) return Alert.alert('Error', 'Must be logged in to favorite notes');
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
    if (!isLoggedIn) return Alert.alert('Error', 'Must be logged in to report');
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
    await authLogout();
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={() => viewFile(item.fileUrl)}
      activeOpacity={0.8}
    >
      {isLoggedIn && (
        <View style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
          <TouchableOpacity 
            onPress={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
            style={{ padding: 5 }}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {activeMenuId === item.id && (
            <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {item.userId === currentUserId && (
                <TouchableOpacity 
                  style={styles.dropdownItem} 
                  onPress={() => {
                    setActiveMenuId(null);
                    handleDeleteNote(item.id);
                  }}
                >
                  <Ionicons name="trash-outline" size={16} color="#ef4444" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#ef4444', fontSize: 14 }}>Delete</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={styles.dropdownItem} 
                onPress={() => {
                  setActiveMenuId(null);
                  reportNote(item.id);
                }}
              >
                <Ionicons name="warning-outline" size={16} color="#ef4444" style={{ marginRight: 8 }} />
                <Text style={{ color: '#ef4444', fontSize: 14 }}>Report Spam</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Kullanıcı bilgisi ve tarih */}
      <View style={styles.userRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.avatarMini, { backgroundColor: colors.primary + '20' }]}>
            {item.user?.avatarUrl ? (
              <Image source={{ uri: item.user.avatarUrl }} style={{ width: 32, height: 32, borderRadius: 16 }} />
            ) : (
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {item.user?.name ? item.user.name[0].toUpperCase() : 'U'}
              </Text>
            )}
          </View>
          <View>
            <Text style={[styles.uploaderName, { color: colors.text }]}>{item.user?.name || 'Unknown'}</Text>
            <Text style={[styles.uploadDate, { color: colors.textSecondary }]}>
              {item.createdAt ? new Date(item.createdAt).toLocaleDateString('tr-TR') : ''}
            </Text>
          </View>
        </View>

      </View>

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
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Custom Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>StudyShare</Text>
        <View style={styles.headerLinks}>
          <TouchableOpacity onPress={toggleTheme} style={{ marginRight: 10 }}>
            <Ionicons name={isDark ? 'sunny' : 'moon'} size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Leaderboard')} style={{ marginRight: 15 }}>
            <Ionicons name="trophy" size={20} color={colors.text} />
          </TouchableOpacity>
          {/* Profile icon removed from header as per user request */}

          {!isLoggedIn ? (
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
      <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
      <View style={{ marginBottom: 15 }}>
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
      {isLoggedIn && (
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('Upload')}>
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}
      </View>
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
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
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
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
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
    paddingHorizontal: 20,
    gap: 10
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
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  uploaderName: {
    fontWeight: '600',
    fontSize: 14,
  },
  uploadDate: {
    fontSize: 12,
    marginTop: 1,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 25,
    right: 0,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 5,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 999,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  }
});
