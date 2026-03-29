import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { getMyNotifications, markNotificationRead, markAllNotificationsRead, type AppNotification } from "../_lib/api";
import { useAuth } from "./AuthContext";

interface NotificationsContextValue {
  notifs: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue>({
  notifs: [],
  unreadCount: 0,
  loading: false,
  refresh: async () => {},
  markRead: async () => {},
  markAllRead: async () => {},
});

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getMyNotifications();
      setNotifs(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial load + poll every 30s
  useEffect(() => {
    if (!user) return;
    void refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [user, refresh]);

  const markRead = useCallback(async (id: number) => {
    // Optimistically update immediately
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      await markNotificationRead(id);
    } catch {
      // Revert on failure
      setNotifs((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: false } : n))
      );
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await markAllNotificationsRead();
    } catch {
      setNotifs((prev) => prev.map((n) => ({ ...n, read: false })));
    }
  }, []);

  const unreadCount = notifs.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider value={{ notifs, unreadCount, loading, refresh, markRead, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
