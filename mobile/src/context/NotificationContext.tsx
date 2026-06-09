import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: any[];
  unreadCount: number;
  showPopup: boolean;
  activePopupNotification: any | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissPopup: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [activePopupNotification, setActivePopupNotification] = useState<any | null>(null);
  
  const knownNotificationIds = useRef<Set<string>>(new Set());
  const popupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstLoadRef = useRef(true);

  const fetchNotifications = async () => {
    if (!isLoggedIn) return;
    try {
      const response = await api.get('/notifications');
      if (response.data?.success) {
        const fetched = response.data.notifications || [];
        
        if (!isFirstLoadRef.current) {
          // Find if there is a new unread notification that we haven't seen in the previous poll
          const newUnread = fetched.find(
            (n: any) => !n.isRead && !knownNotificationIds.current.has(n.id)
          );
          if (newUnread) {
            setActivePopupNotification(newUnread);
            setShowPopup(true);
            
            if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
            popupTimeoutRef.current = setTimeout(() => {
              setShowPopup(false);
            }, 2000);
          }
        } else {
          isFirstLoadRef.current = false;
        }

        // Update known IDs list
        const updatedIds = new Set<string>();
        fetched.forEach((n: any) => updatedIds.add(n.id));
        knownNotificationIds.current = updatedIds;

        setNotifications(fetched);
        setUnreadCount(fetched.filter((n: any) => !n.isRead).length);
      }
    } catch (error) {
      console.log('Error fetching notifications:', error);
    }
  };

  // Poll notifications every 10 seconds when logged in
  useEffect(() => {
    if (isLoggedIn) {
      isFirstLoadRef.current = true;
      knownNotificationIds.current = new Set();
      fetchNotifications();

      const interval = setInterval(() => {
        fetchNotifications();
      }, 10000);

      return () => {
        clearInterval(interval);
        if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
      };
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setShowPopup(false);
      setActivePopupNotification(null);
      knownNotificationIds.current = new Set();
    }
  }, [isLoggedIn]);

  const markAsRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      // Update local state directly to be instant
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.log('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.log('Error marking all notifications as read:', error);
    }
  };

  const dismissPopup = () => {
    setShowPopup(false);
    if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        showPopup,
        activePopupNotification,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        dismissPopup
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
