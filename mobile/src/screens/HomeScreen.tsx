import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet, Alert, Linking, TouchableOpacity } from 'react-native';
import api from '../services/api';
import * as SecureStore from 'expo-secure-store';

export default function HomeScreen({ navigation }: any) {
  const [notes, setNotes] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [isLogged, setIsLogged] = useState(false);

  useEffect(() => {
    checkToken();
    fetchNotes(1);
  }, []);

  const checkToken = async () => {
    const token = await SecureStore.getItemAsync('accessToken');
    setIsLogged(!!token);
  };

  const fetchNotes = async (pageNum: number) => {
    try {
      const response = await api.get(`/notes?page=${pageNum}&limit=10`);
      if (pageNum === 1) {
        setNotes(response.data.data);
      } else {
        setNotes([...notes, ...response.data.data]);
      }
    } catch (e) {
      console.log('Error fetching notes', e);
    }
  };

  const loadMore = () => {
    const newPage = page + 1;
    setPage(newPage);
    fetchNotes(newPage);
  };

  const reportNote = async (noteId: string) => {
    if (!isLogged) return Alert.alert('Error', 'Must be logged in to report');
    try {
      await api.post('/reports', { noteId, reason: 'Inappropriate content' });
      Alert.alert('Reported', 'Thank you for your report.');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to report');
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Text style={styles.school}>{item.schoolName} - {item.courseName}</Text>
      <Text>{item.description}</Text>
      <Button title="View File" onPress={() => Linking.openURL(item.fileUrl)} />
      {isLogged && (
        <TouchableOpacity onPress={() => reportNote(item.id)} style={styles.reportBtn}>
           <Text style={styles.reportText}>Report</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {isLogged ? (
        <View style={styles.actionRow}>
          <Button title="Upload Note" onPress={() => navigation.navigate('Upload')} />
          <Button title="Admin Dashboard" onPress={() => navigation.navigate('Admin')} color="purple" />
          <Button title="Logout" onPress={async () => {
             await SecureStore.deleteItemAsync('accessToken');
             setIsLogged(false);
          }} color="red" />
        </View>
      ) : (
        <Button title="Login to Upload" onPress={() => navigation.navigate('Auth')} />
      )}
      
      <FlatList
        data={notes}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  card: { padding: 15, marginBottom: 10, backgroundColor: '#fff', borderRadius: 8, elevation: 2 },
  school: { fontWeight: 'bold', fontSize: 16 },
  reportBtn: { marginTop: 10 },
  reportText: { color: 'red', textAlign: 'right' }
});
