import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function LeaderboardScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { userId: currentUserId } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<'points' | 'pomodoro'>('points');

  useEffect(() => {
    fetchLeaderboard(type);
  }, [type]);

  const fetchLeaderboard = async (currentType: 'points' | 'pomodoro') => {
    try {
      setLoading(true);
      const res = await api.get(`/auth/leaderboard?type=${currentType}`);
      setUsers(res.data.data);
    } catch (e) {
      console.log('Leaderboard error', e);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    let positionStyle: any = styles.positionCard;
    let positionTextStyle: any = styles.positionText;

    if (index === 0) {
      positionStyle = [styles.positionCard, { backgroundColor: '#FCD34D' }];
      positionTextStyle = [styles.positionText, { color: '#B45309' }];
    } else if (index === 1) {
      positionStyle = [styles.positionCard, { backgroundColor: '#E5E7EB' }];
      positionTextStyle = [styles.positionText, { color: '#4B5563' }];
    } else if (index === 2) {
      positionStyle = [styles.positionCard, { backgroundColor: '#FDBA74' }];
      positionTextStyle = [styles.positionText, { color: '#C2410C' }];
    }

    return (
      <View style={[
        styles.card, 
        { backgroundColor: colors.card, borderBottomColor: colors.border },
        item.id === currentUserId && { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primary + '05' }
      ]}>
        <View style={positionStyle}>
          <Text style={positionTextStyle}>{index + 1}</Text>
        </View>

        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.chip }]}>
            <Text style={{ fontSize: 20 }}>👤</Text>
          </View>
        )}

        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.text }, item.id === currentUserId && { color: colors.primary }]} numberOfLines={1}>
            {item.name || 'Anonymous User'}
            {item.id === currentUserId && " (You)"}
          </Text>
          {item.university && (
            <Text style={[styles.university, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.university}
            </Text>
          )}
        </View>

        <View style={styles.pointsContainer}>
          <Text style={[styles.points, { color: colors.primary }]}>
            {type === 'points' ? item.points : item.pomodoroMinutes || 0}
          </Text>
          <Text style={[styles.pointsLabel, { color: colors.textSecondary }]}>
            {type === 'points' ? 'pts' : 'mins'}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 24, color: colors.text, marginRight: 10 }}>←</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Leaderboard</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.banner, { backgroundColor: colors.primary }]}>
          <Text style={styles.bannerEmoji}>{type === 'points' ? '🏆' : '⏱️'}</Text>
          <Text style={styles.bannerTitle}>{type === 'points' ? 'Top Students' : 'Focus Masters'}</Text>
          <Text style={styles.bannerSub}>
            {type === 'points' 
              ? 'Earn points by uploading notes and getting favorites!' 
              : 'Track your Pomodoro time and compete with others!'}
          </Text>
        </View>

        <View style={styles.toggleContainer}>
          <TouchableOpacity 
            style={[styles.toggleButton, type === 'points' && { backgroundColor: colors.primary }]}
            onPress={() => setType('points')}
          >
            <Text style={[styles.toggleText, { color: type === 'points' ? '#fff' : colors.textSecondary }]}>Points</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleButton, type === 'pomodoro' && { backgroundColor: colors.primary }]}
            onPress={() => setType('pomodoro')}
          >
            <Text style={[styles.toggleText, { color: type === 'pomodoro' ? '#fff' : colors.textSecondary }]}>Pomodoro</Text>
          </TouchableOpacity>
        </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  banner: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerEmoji: { fontSize: 40, marginBottom: 8 },
  bannerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  bannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, textAlign: 'center' },
  toggleContainer: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'center',
    gap: 12,
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  toggleText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  list: { padding: 16, paddingTop: 0 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  positionCard: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  positionText: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#6b7280',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  university: {
    fontSize: 12,
  },
  pointsContainer: {
    alignItems: 'flex-end',
  },
  points: {
    fontSize: 18,
    fontWeight: '900',
  },
  pointsLabel: {
    fontSize: 10,
    fontWeight: 'bold',
  },
});
