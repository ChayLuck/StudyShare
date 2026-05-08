import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  FlatList, 
  Image, 
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

export default function LeaderboardScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await api.get('/auth/leaderboard');
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
      <View style={[styles.card, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
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
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {item.name || 'Anonymous User'}
          </Text>
          {item.university && (
            <Text style={[styles.university, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.university}
            </Text>
          )}
        </View>

        <View style={styles.pointsContainer}>
          <Text style={[styles.points, { color: colors.primary }]}>{item.points}</Text>
          <Text style={[styles.pointsLabel, { color: colors.textSecondary }]}>pts</Text>
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
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={{ padding: 10 }} onPress={() => navigation.goBack()}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>← Leaderboard</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.banner, { backgroundColor: colors.primary }]}>
        <Text style={styles.bannerEmoji}>🏆</Text>
        <Text style={styles.bannerTitle}>Top Students</Text>
        <Text style={styles.bannerSub}>Earn points by uploading notes and getting favorites!</Text>
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  banner: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerEmoji: { fontSize: 40, marginBottom: 8 },
  bannerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  bannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, textAlign: 'center' },
  list: { padding: 16 },
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
