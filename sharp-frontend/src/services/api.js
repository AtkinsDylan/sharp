import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Automatically attach token to every request if logged in
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sharp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const signup = (data) => api.post('/api/auth/signup', data);
export const login = (data) => api.post('/api/auth/login', data);
export const logout = () => api.post('/api/auth/logout');

// Fights
export const getEvents = () => api.get('/api/fights/events');
export const getEvent = (id) => api.get(`/api/fights/events/${id}`);

// Picks
export const submitPick = (data) => api.post('/api/picks', data);
export const getPicks = (status) => api.get('/api/picks', { params: { status } });
export const getPickStats = () => api.get('/api/picks/stats');

// Users
export const getMe = () => api.get('/api/users/me');
export const updateUsername = (username) => api.patch('/api/users/me', { username });

// Leaderboard
export const getLeaderboard = (period) => api.get('/api/leaderboard', { params: { period } });

export default api;