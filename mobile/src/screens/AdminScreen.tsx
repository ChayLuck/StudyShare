import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function AdminScreen({ navigation }: any) {
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await api.get('/admin/reports');
      setReports(response.data.data);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Access denied');
      navigation.goBack();
    }
  };

  const viewFile = (fileUrl: string) => {
    Linking.openURL(fileUrl).catch(() => Alert.alert('Error', 'Unable to open file'));
  };

  const verifyNote = async (id: string) => {
    try {
      await api.post(`/admin/notes/${id}/verify`);
      Alert.alert('Success', 'Note verified and reports cleared.');
      fetchReports();
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
              fetchReports();
            } catch (e) {
              Alert.alert('Error', 'Failed to delete');
            }
          } 
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.schoolTitle}>{item.schoolName} - {item.courseName}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.reports.length} Reports</Text>
        </View>
      </View>
      
      <Text style={styles.userInfo}>Uploader: <Text style={{fontWeight: 'bold'}}>{item.user.email}</Text></Text>

      <TouchableOpacity style={styles.viewButton} onPress={() => viewFile(item.fileUrl)}>
        <Ionicons name="document" size={16} color="#4F46E5" />
        <Text style={styles.viewButtonText}> View Content</Text>
      </TouchableOpacity>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.verifyBtn} onPress={() => verifyNote(item.id)}>
          <Ionicons name="checkmark" size={16} color="#10b981" />
          <Text style={styles.verifyBtnText}> Mark as Safe</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteNote(item.id)}>
          <Ionicons name="trash" size={16} color="#ef4444" />
          <Text style={styles.deleteBtnText}> Delete Note</Text>
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

      <FlatList
        data={reports}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No pending reports.</Text>
            <Text style={styles.emptySubText}>All clear! 🎉</Text>
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
  listContainer: { padding: 15 },
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
