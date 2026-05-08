import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  Alert,
  ActivityIndicator
} from 'react-native';
import api from '../services/api';
import * as SecureStore from 'expo-secure-store';
import { useTheme } from '../context/ThemeContext';

export default function ProfileScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const { colors, toggleTheme, isDark } = useTheme();

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      checkAuthAndFetch();
    });
    return unsubscribe;
  }, [navigation]);

  const checkAuthAndFetch = async () => {
    const token = await SecureStore.getItemAsync('accessToken');
    if (!token) {
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }
    setIsAuthenticated(true);
    fetchProfile();
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/me');
      console.log('Profile fetched:', res.data.user);
      setUser(res.data.user);
    } catch (e: any) {
      console.log('Error fetching profile', e.response?.data || e.message);
      if (e.response && (e.response.status === 401 || e.response.status === 404)) {
        // Token is invalid, expired, or user deleted. Logout automatically.
        handleLogout(false);
      } else {
        const errorMsg = e.response?.data?.message || e.response?.data?.error || e.message || 'Unknown error';
        Alert.alert('Error', `Could not load profile data: ${errorMsg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async (redirect = true) => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('userRole');
    await SecureStore.deleteItemAsync('userId');
    setIsAuthenticated(false);
    setUser(null);
    if (redirect) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Tabs' }],
      });
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action is permanent and all your data will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await api.delete('/auth/delete-account');
              await handleLogout();
              Alert.alert('Success', 'Your account has been deleted.');
            } catch (e: any) {
              Alert.alert('Error', e.response?.data?.error || 'Failed to delete account');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.unauthContainer}>
          <Text style={{ fontSize: 60, marginBottom: 20 }}>🔒</Text>
          <Text style={[styles.unauthTitle, { color: colors.text }]}>Login Required</Text>
          <Text style={[styles.unauthText, { color: colors.textSecondary }]}>
            Please log in or register to view and manage your profile.
          </Text>
          <TouchableOpacity 
            style={[styles.loginButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Auth')}
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>StudyShare</Text>
        <View style={styles.headerLinks}>
          <TouchableOpacity onPress={toggleTheme} style={styles.iconButton}>
            <Text style={{ fontSize: 20 }}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleLogout()}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarEmoji}>👤</Text>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.userName, { color: colors.text }]}>{user?.name || 'User'}</Text>
              <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
              <View style={[styles.uniChip, { backgroundColor: colors.chip }]}>
                <Text style={[styles.uniChipText, { color: colors.primary }]}>{user?.university || 'NOT SPECIFIED'}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.editButton, { borderColor: colors.border }]}
              onPress={() => navigation.navigate('EditProfile')}
            >
              <Text style={[styles.editButtonText, { color: colors.primary }]}>📝 Edit Profile</Text>
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{user?._count?.notes || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Uploads</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{user?._count?.favoriteNotes || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Favorites</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{user?.points || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Points</Text>
            </View>
          </View>
        </View>

        {/* My Activity Section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>My Activity</Text>
        <View style={[styles.menuContainer, { backgroundColor: colors.card }]}>
          <MenuItem icon="❓" label="My Questions" color={colors.text} onPress={() => navigation.navigate('Questions')} />
          <MenuItem icon="💬" label="My Answers" color={colors.text} onPress={() => {}} />
          <MenuItem icon="❤️" label="Liked Content" color={colors.text} onPress={() => navigation.navigate('Favorites')} />
          <MenuItem icon="🔖" label="Saved Items" color={colors.text} last onPress={() => {}} />
        </View>

        {/* Account Settings Section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Account Settings</Text>
        <View style={[styles.menuContainer, { backgroundColor: colors.card }]}>
          <MenuItem icon="👤" label="Personal Information" color={colors.text} onPress={() => navigation.navigate('EditProfile')} />
          <MenuItem icon="🔒" label="Password & Security" color={colors.text} last onPress={() => navigation.navigate('EditProfile')} />
        </View>

        {/* Danger Zone */}
        <Text style={[styles.sectionTitle, { color: '#ef4444' }]}>Danger Zone</Text>
        <View style={[styles.menuContainer, { backgroundColor: colors.card, borderColor: '#fee2e2', borderWidth: 1 }]}>
          <MenuItem icon="🗑️" label="Delete Account" color="#ef4444" last onPress={handleDeleteAccount} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({ icon, label, color, last, onPress }: any) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity 
      style={[
        styles.menuItem, 
        !last && { borderBottomWidth: 1, borderBottomColor: colors.divider }
      ]}
      onPress={onPress}
    >
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuIconContainer, { backgroundColor: colors.chip }]}>
          <Text style={{ fontSize: 16 }}>{icon}</Text>
        </View>
        <Text style={[styles.menuLabel, { color }]}>{label}</Text>
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: 18 }}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5
  },
  headerLinks: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  iconButton: {
    marginRight: 15
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ef4444'
  },
  scrollContent: {
    padding: 16,
  },
  profileCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarEmoji: {
    fontSize: 40,
  },
  avatarImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  uniChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  uniChipText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    marginLeft: 4,
  },
  menuContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  unauthContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  unauthTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  unauthText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  loginButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
