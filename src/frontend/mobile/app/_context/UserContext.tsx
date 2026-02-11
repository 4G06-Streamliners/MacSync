import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUsers, getUser, type User } from '../_lib/api';

const STORAGE_KEY_USER_ID = '@macsync_current_user_id';

interface UserContextType {
  currentUser: User | null;
  allUsers: User[];
  switchUser: (id: number) => void;
  isAdmin: boolean;
  loading: boolean;
}

const UserContext = createContext<UserContextType>({
  currentUser: null,
  allUsers: [],
  switchUser: () => {},
  isAdmin: false,
  loading: true,
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const users = await getUsers();
        setAllUsers(users);
        const storedId = await AsyncStorage.getItem(STORAGE_KEY_USER_ID);
        const userId = storedId ? parseInt(storedId, 10) : null;
        const preferred =
          userId != null && !Number.isNaN(userId)
            ? users.find((u) => u.id === userId)
            : null;
        const targetUser = preferred ?? users[0];
        if (targetUser) {
          const user = await getUser(targetUser.id);
          setCurrentUser(user);
          await AsyncStorage.setItem(STORAGE_KEY_USER_ID, String(user.id));
        }
      } catch (err) {
        console.error('Failed to load users:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const switchUser = async (id: number) => {
    try {
      const user = await getUser(id);
      setCurrentUser(user);
      await AsyncStorage.setItem(STORAGE_KEY_USER_ID, String(user.id));
    } catch (err) {
      console.error('Failed to switch user:', err);
    }
  };

  const isAdmin =
    currentUser?.isSystemAdmin === true ||
    (currentUser?.roles?.includes('Admin') ?? false);

  return (
    <UserContext.Provider
      value={{ currentUser, allUsers, switchUser, isAdmin, loading }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
