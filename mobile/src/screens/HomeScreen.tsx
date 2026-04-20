import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Linking, SafeAreaView, ActivityIndicator } from 'react-native';
import api from '../services/api';
import * as SecureStore from 'expo-secure-store';

export default function HomeScreen({ navigation }: any) {
  const [notes, setNotes] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [isLogged, setIsLogged] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // When mounting or focusing, re-check tokens and fetch recent items
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      checkToken();
      setPage(1);
      fetchNotes(1, true);
    });
    return unsubscribe;
  }, [navigation]);

  const checkToken = async () => {
    const token = await SecureStore.getItemAsync('accessToken');
    const role = await SecureStore.getItemAsync('userRole');
    setIsLogged(!!token);
    setUserRole(role);
  };

  const fetchNotes = async (pageNum: number, reset = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await api.get(`/notes?page=${pageNum}&limit=10`);
      if (reset) {
        setNotes(response.data.data);
      } else {
        setNotes((prev) => [...prev, ...response.data.data]);
      }
    } catch (e) {
      console.log('Error fetching notes', e);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && notes.length >= page * 10) {
      const newPage = page + 1;
      setPage(newPage);
      fetchNotes(newPage);
    }
  };

  const viewFile = (fileUrl: string) => {
    Linking.openURL(fileUrl).catch(() => Alert.alert('Error', 'Unable to open file'));
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

  const logout = async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('userRole');
    setIsLogged(false);
    setUserRole(null);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
         <View style={styles.chip}>
            <Text style={styles.chipText}>{item.courseName}</Text>
         </View>
         <Text style={styles.schoolText} numberOfLines={1}>{item.schoolName}</Text>
      </View>

      <Text style={styles.descriptionText} numberOfLines={3}>
         {item.description || "No description provided."}
      </Text>

      <View style={styles.divider} />

      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.viewButton} onPress={() => viewFile(item.fileUrl)}>
           <Text style={styles.viewButtonText}>View Material</Text>
        </TouchableOpacity>
        
        {isLogged && (
          <TouchableOpacity style={styles.reportButton} onPress={() => reportNote(item.id)}>
             <Text style={styles.reportButtonText}>⚠ Report</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Custom Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>StudyShare</Text>
        <View style={styles.headerLinks}>
          {!isLogged ? (
            <TouchableOpacity onPress={() => navigation.navigate('Auth')}>
              <Text style={styles.headerActionText}>Login</Text>
            </TouchableOpacity>
          ) : (
            <>
              {userRole === 'ADMIN' && (
                <TouchableOpacity onPress={() => navigation.navigate('Admin')} style={{marginRight: 15}}>
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

      <FlatList
        data={notes}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContainer}
        ListFooterComponent={loading ? <ActivityIndicator size="large" color="#4F46E5" style={{marginVertical: 20}} /> : null}
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
  listContainer: {
    padding: 15,
    paddingBottom: 100 // space for FAB
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
    fontSize: 13,
    fontWeight: 'bold'
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
