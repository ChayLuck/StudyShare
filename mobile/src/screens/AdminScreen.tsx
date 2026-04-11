import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet, Alert, Linking } from 'react-native';
import api from '../services/api';

export default function AdminScreen() {
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
    }
  };

  const verifyNote = async (id: string) => {
    try {
      await api.post(`/admin/notes/${id}/verify`);
      Alert.alert('Success', 'Note verified');
      fetchReports();
    } catch (e) {
      Alert.alert('Errorr', 'Failed to verify');
    }
  };

  const deleteNote = async (id: string) => {
    try {
      await api.delete(`/admin/notes/${id}`);
      Alert.alert('Deleted', 'Note permanently removed');
      fetchReports();
    } catch (e) {
      Alert.alert('Error', 'Failed to delete');
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Text style={styles.school}>{item.schoolName} - {item.courseName}</Text>
      <Text>User: {item.user.email}</Text>
      <Text style={styles.red}>Reports: {item.reports.length}</Text>
      <Button title="View Content" onPress={() => Linking.openURL(item.fileUrl)} />

      <View style={styles.actionRow}>
        <Button title="Verify (Safe)" onPress={() => verifyNote(item.id)} color="green" />
        <Button title="Delete" onPress={() => deleteNote(item.id)} color="red" />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reported Notes for Review</Text>
      <FlatList
        data={reports}
        keyExtractor={item => item.id}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  card: { padding: 15, marginBottom: 10, backgroundColor: '#ffe6e6', borderRadius: 8 },
  school: { fontWeight: 'bold', fontSize: 16 },
  red: { color: 'red', fontWeight: 'bold', marginVertical: 5 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }
});
