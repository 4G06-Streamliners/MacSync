import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { getUsers, getUser, type User } from '../lib/api';

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
        if (users[0]) {
          const user = await getUser(users[0].id);
          setCurrentUser(user);
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
