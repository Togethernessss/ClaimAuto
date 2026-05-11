import axios from 'axios';

// One axios instance shared across the entire app.
// All API calls go through this — single place to configure base URL and token.
const api = axios.create({
  baseURL: 'http://localhost:7182',
  headers: {
    'Content-Type': 'application/json',
  },
});

// REQUEST interceptor — automatically attach JWT to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// RESPONSE interceptor — if any call returns 401, clear stale token.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login'
    }
    return Promise.reject(error);
  }
);

export default api;