import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import api from '../services/api';

export default function AdminScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<'reports' | 'all' | 'users'>('reports');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let endpoint = '/admin/reports';
      if (activeTab === 'all') endpoint = '/admin/notes';
      else if (activeTab === 'users') endpoint = '/admin/users';

      const response = await api.get(endpoint);
      setData(response.data.data);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Access denied');
      if (activeTab === 'reports') navigation.goBack();
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

  const verifyNote = async (id: string) => {
    try {
      await api.post(`/admin/notes/${id}/verify`);
      Alert.alert('Success', 'Note verified.');
      fetchData();
    } catch (e) {
      Alert.alert('Error', 'Failed to verify');
    }
  };

  const deleteNote = async (id: string) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to permanently delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await api.delete(`/admin/notes/${id}`);
              Alert.alert('Deleted', 'Note permanently removed');
              fetchData();
            } catch (e) {
              Alert.alert('Error', 'Failed to delete');
            }
          } 
        }
      ]
    );
  };

  const deleteUser = async (id: string) => {
    Alert.alert(
      'Confirm User Deletion',
      'Are you sure you want to permanently delete this user? Their uploaded content will remain as "Unknown User".',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await api.delete(`/admin/users/${id}`);
              Alert.alert('Deleted', 'User permanently removed');
              fetchData();
            } catch (e) {
              Alert.alert('Error', 'Failed to delete user');
            }
          } 
        }
      ]
    );
  };

  const renderContentItem = ({ item }: { item: any }) => (
    <View style={[styles.card, item.isVerified ? { borderLeftColor: '#10B981' } : {}]}>
      <View style={styles.cardHeader}>
        <Text style={styles.schoolTitle}>{item.schoolName} - {item.courseName}</Text>
        <View style={[styles.badge, item.isVerified ? { backgroundColor: '#D1FAE5' } : {}]}>
          <Text style={[styles.badgeText, item.isVerified ? { color: '#065F46' } : {}]}>
            {item.isVerified ? 'Verified' : `${item.reports?.length || 0} Reports`}
          </Text>
        </View>
      </View>
      
      <Text style={styles.userInfo}>Uploader: <Text style={{fontWeight: 'bold'}}>{item.user?.email || 'Unknown User'}</Text></Text>

      <TouchableOpacity style={styles.viewButton} onPress={() => viewFile(item.fileUrl)}>
        <Ionicons name="document" size={16} color="#4F46E5" />
        <Text style={styles.viewButtonText}> View Content</Text>
      </TouchableOpacity>

      <View style={styles.actionRow}>
        {!item.isVerified ? (
          <TouchableOpacity style={styles.verifyBtn} onPress={() => verifyNote(item.id)}>
            <Ionicons name="checkmark" size={16} color="#fff" />
            <Text style={styles.verifyBtnText}> Verify & Safe</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.verifyBtn, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="shield-checkmark" size={16} color="#059669" />
            <Text style={[styles.verifyBtnText, { color: '#059669' }]}> Verified</Text>
          </View>
        )}
        <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteNote(item.id)}>
          <Ionicons name="trash" size={16} color="#fff" />
          <Text style={styles.deleteBtnText}> Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderUserItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { borderLeftColor: '#3B82F6' }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.schoolTitle}>{item.name || 'Anonymous'}</Text>
        <View style={[styles.badge, { backgroundColor: '#DBEAFE' }]}>
          <Text style={[styles.badgeText, { color: '#1E40AF' }]}>
            {item.role}
          </Text>
        </View>
      </View>
      
      <Text style={styles.userInfo}>Email: <Text style={{fontWeight: 'bold'}}>{item.email}</Text></Text>
      <Text style={styles.userInfo}>Total Uploads: <Text style={{fontWeight: 'bold'}}>{item._count?.notes || 0}</Text></Text>

      <View style={[styles.actionRow, { marginTop: 10 }]}>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteUser(item.id)}>
          <Ionicons name="trash" size={16} color="#fff" />
          <Text style={styles.deleteBtnText}> Delete User</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'reports' && styles.activeTab]} 
          onPress={() => setActiveTab('reports')}
        >
          <Text style={[styles.tabText, activeTab === 'reports' && styles.activeTabText]}>Reported</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'all' && styles.activeTab]} 
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All Notes</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'users' && styles.activeTab]} 
          onPress={() => setActiveTab('users')}
        >
          <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>Users</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={data}
        keyExtractor={item => item.id}
        renderItem={activeTab === 'users' ? renderUserItem : renderContentItem}
        contentContainerStyle={styles.listContainer}
        refreshing={loading}
        onRefresh={fetchData}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No data found.</Text>
            {activeTab === 'reports' && <Text style={styles.emptySubText}>All clear! 🎉</Text>}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: { padding: 5 },
  backIcon: { fontSize: 24, color: '#374151', fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4F46E5',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#4F46E5',
  },
  listContainer: { padding: 15, paddingBottom: 50 },
  card: {
    backgroundColor: '#fff',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  schoolTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginRight: 10
  },
  badge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  badgeText: { color: '#B91C1C', fontSize: 12, fontWeight: 'bold' },
  userInfo: { color: '#6b7280', fontSize: 14, marginBottom: 12 },
  viewButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 15
  },
  viewButtonText: { color: '#4B5563', fontWeight: 'bold', fontSize: 14 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  verifyBtn: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginRight: 10
  },
  verifyBtnText: { color: '#fff', fontWeight: 'bold' },
  deleteBtn: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center'
  },
  deleteBtnText: { color: '#fff', fontWeight: 'bold' },
  emptyContainer: {
    marginTop: 100,
    alignItems: 'center'
  },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#374151' },
  emptySubText: { fontSize: 15, color: '#9CA3AF', marginTop: 10 }
});
