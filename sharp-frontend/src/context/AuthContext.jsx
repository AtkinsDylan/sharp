/* eslint-disable react-hooks/exhaustive-deps */
import { createContext, useContext, useEffect, useState } from 'react';
import { getMe } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const token = localStorage.getItem('sharp_token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await getMe();
        setUser(res.data.user);
      } catch {
        localStorage.removeItem('sharp_token');
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const loginUser = (token, userData) => {
    localStorage.setItem('sharp_token', token);
    setUser(userData);
  };

  const logoutUser = () => {
    localStorage.removeItem('sharp_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, loginUser, logoutUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}