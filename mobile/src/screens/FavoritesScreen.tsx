import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

export default function FavoritesScreen({ navigation }: any) {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { colors, isDark } = useTheme();

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchFavorites();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const response = await api.get('/favorites');
      setNotes(response.data.data);
    } catch (e) {
      console.log('Error fetching favorites', e);
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

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={() => viewFile(item.fileUrl)}
      activeOpacity={0.8}
    >
      <View style={{ position: "absolute", top: 12, right: 12, zIndex: 10 }}>
        <TouchableOpacity
          onPress={() => navigation.navigate("AiSummary", { note: item })}
          style={{ padding: 5 }}
        >
          <Ionicons name="sparkles" size={20} color="#EAB308" />
        </TouchableOpacity>
      </View>
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

      <View style={[styles.cardFooter, { justifyContent: 'space-between' }]}>
        <TouchableOpacity onPress={() => navigation.navigate('NoteDetail', { note: item })} style={{ marginRight: 5 }}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backIcon, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Favorites</Text>
        <View style={{ width: 40 }} />
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
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No favorites yet. Go explore some notes!</Text>
              </View>
            ) : null
          }
          ListFooterComponent={loading ? <ActivityIndicator size="large" color="#4F46E5" style={{ marginVertical: 20 }} /> : null}
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
    paddingVertical: 20,
  },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  backButton: { width: 40 },
  backIcon: { fontSize: 24, fontWeight: 'bold' },
  listContainer: { padding: 15 },
  emptyContainer: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyText: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
  card: { borderRadius: 12, padding: 16, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginRight: 10 },
  chipText: { fontSize: 12, fontWeight: '700' },
  schoolText: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  descriptionText: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  thumbnail: { width: '100%', height: 180, borderRadius: 8, backgroundColor: '#f3f4f6', marginBottom: 12 },
  divider: { height: 1, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  viewButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  viewButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  }
});
