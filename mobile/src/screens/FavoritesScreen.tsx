import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

  const viewFile = (fileUrl: string) => {
    Linking.openURL(fileUrl).catch(() => Alert.alert('Error', 'Unable to open file'));
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

      <View style={[styles.cardFooter, { justifyContent: 'space-between' }]}>
        <TouchableOpacity style={[styles.viewButton, { backgroundColor: colors.primary }]} onPress={() => viewFile(item.fileUrl)}>
           <Text style={styles.viewButtonText}>View Material</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('NoteDetail', { note: item })} style={{ marginRight: 5 }}>
          <Text style={{ fontSize: 22 }}>💬</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backIcon, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Favorites</Text>
        <View style={{ width: 40 }} />
      </View>

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
        ListFooterComponent={loading ? <ActivityIndicator size="large" color="#4F46E5" style={{marginVertical: 20}} /> : null}
      />
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
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: '900' },
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
});
