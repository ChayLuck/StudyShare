import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList
} from 'react-native';
import { useNotifications } from '../context/NotificationContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import * as SecureStore from 'expo-secure-store';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen({ navigation }: any) {
  const { colors, toggleTheme, isDark } = useTheme();
  const { logout, isLoggedIn, userId } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (isLoggedIn) {
        fetchProfile();
      } else {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, [navigation, isLoggedIn]);


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
        logout();
      } else {
        const errorMsg = e.response?.data?.message || e.response?.data?.error || e.message || 'Unknown error';
        Alert.alert('Error', `Could not load profile data: ${errorMsg}`);
      }
    } finally {
      setLoading(false);
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
              await logout();
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

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        <View style={styles.unauthContainer}>
          <Ionicons name="lock-closed" size={60} color={colors.textSecondary} style={{ marginBottom: 20 }} />
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
        <View style={styles.headerLinks}>
          <TouchableOpacity onPress={() => setShowNotificationsModal(true)} style={[styles.iconButton, { position: 'relative', padding: 4 }]}>
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
            {unreadCount > 0 && (
              <View style={{
                position: 'absolute',
                top: 0,
                right: 0,
                backgroundColor: '#ef4444',
                borderRadius: 7,
                width: 14,
                height: 14,
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: 'bold' }}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleTheme} style={styles.iconButton}>
            <Ionicons name={isDark ? 'sunny' : 'moon'} size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => logout()}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={40} color={colors.textSecondary} />
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
              <Text style={[styles.editButtonText, { color: colors.primary }]}> Edit Profile</Text>
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
          <MenuItem icon="document-text" label="My Notes" color={colors.text} onPress={() => navigation.navigate('MyNotes')} />
          <MenuItem icon="help-circle" label="My Questions" color={colors.text} onPress={() => navigation.navigate('UserQuestions', { userId: user.id })} />
          <MenuItem icon="chatbubble" label="My Answers" color={colors.text} last onPress={() => navigation.navigate('UserQuestions', { answeredByMe: true })} />
        </View>




        {/* Danger Zone */}
        <Text style={[styles.sectionTitle, { color: '#ef4444' }]}>Danger Zone</Text>
        <View style={[styles.menuContainer, { backgroundColor: colors.card, borderColor: '#fee2e2', borderWidth: 1 }]}>
          <MenuItem icon="trash" label="Delete Account" color="#ef4444" last onPress={handleDeleteAccount} />
        </View>
      </ScrollView>
      </View>

      {/* Notifications Modal */}
      <Modal
        visible={showNotificationsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNotificationsModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end'
        }}>
          <View style={{
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            height: '75%',
            backgroundColor: colors.background,
            paddingTop: 20
          }}>
            {/* Modal Header */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingBottom: 15,
              borderBottomWidth: 1,
              borderBottomColor: colors.border
            }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>Notifications</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={markAllAsRead}>
                    <Text style={{ color: colors.primary, fontWeight: '600' }}>Mark all read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowNotificationsModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Notification List */}
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 15 }}
              ListEmptyComponent={(
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 50 }}>
                  <Ionicons name="notifications-off-outline" size={48} color={colors.textSecondary} style={{ marginBottom: 10 }} />
                  <Text style={{ color: colors.textSecondary, fontSize: 16 }}>No notifications yet</Text>
                </View>
              )}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: item.isRead ? colors.card : colors.primary + '10',
                    marginBottom: 10,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: item.isRead ? colors.border : colors.primary + '30'
                  }}
                  onPress={async () => {
                    await markAsRead(item.id);
                    setShowNotificationsModal(false);
                    navigation.navigate('NoteDetail', { note: item.note });
                  }}
                >
                  {/* Sender Avatar */}
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: colors.chip,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12
                  }}>
                    {item.sender?.avatarUrl ? (
                      <Image source={{ uri: item.sender.avatarUrl }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                    ) : (
                      <Ionicons name="person" size={20} color={colors.textSecondary} />
                    )}
                  </View>

                  {/* Notification Content */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 14, lineHeight: 18 }}>
                      <Text style={{ fontWeight: 'bold' }}>{item.sender?.name || 'Someone'}</Text>
                      {' commented on your note '}
                      <Text style={{ fontWeight: '600', color: colors.primary }}>{item.note?.courseName}</Text>
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 4 }}>
                      {new Date(item.createdAt).toLocaleDateString('tr-TR')} {new Date(item.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>

                  {/* Unread Dot Indicator */}
                  {!item.isRead && (
                    <View style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors.primary,
                      marginLeft: 8
                    }} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
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
          <Ionicons name={icon} size={16} color={color} />
        </View>
        <Text style={[styles.menuLabel, { color }]}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
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
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
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
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  uploadPrivateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  uploadPrivateText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyNotesContainer: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyNotesText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyUploadBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  notesListContainer: {
    marginBottom: 24,
  },
  noteCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  noteCardPressable: {
    width: '100%',
  },
  noteCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteCourseChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  noteCourseText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  noteStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  noteStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  noteSchool: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  noteDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  noteDivider: {
    height: 1,
    marginVertical: 12,
  },
  noteActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  noteActionText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  deleteActionBtn: {
    // extra style for delete
  },
});
