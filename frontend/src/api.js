import axios from 'axios';

const api = axios.create({ 
  baseURL: import.meta.env.VITE_API_URL || 'https://curalink-backend.onrender.com' 
});

export const sendMessage = (payload) => api.post('/api/chat/message', payload);
export const getHistory = (sessionId) => api.get(`/api/chat/history/${sessionId}`);
export const clearHistory = (sessionId) => api.delete(`/api/chat/history/${sessionId}`);
export const checkHealth = () => api.get('/api/health');
export const getTrends = (disease) => api.post('/api/trends', { disease });
export const generateReport = (payload) => api.post('/api/report', payload);
