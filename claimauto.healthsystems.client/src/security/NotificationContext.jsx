import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getUnreadNotifications } from '../services/notifications/notificationService';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadList,  setUnreadList]  = useState([]);
  const [loading,     setLoading]     = useState(false);

  const failCountRef = useRef(0);

  const refresh = useCallback(async () => {
    if (failCountRef.current >= 3) return;  // stop flooding after 3 failures
    setLoading(true);
    try {
      const data = await getUnreadNotifications();
      setUnreadList(data);
      setUnreadCount(data.length);
      failCountRef.current = 0;             // reset on success
    } catch {
      failCountRef.current += 1;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <NotificationContext.Provider value={{
      unreadCount,
      unreadList,
      loading,
      refresh,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}