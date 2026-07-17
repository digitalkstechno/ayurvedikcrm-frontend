import axios from 'axios';
import endPointApi from './endpoints';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('wrixty_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('wrixty_token');
        localStorage.removeItem('wrixty_authenticated');
        localStorage.removeItem('wrixty_authenticated_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

const pendingGetRequests = new Map();

// Helper: GET /endpoint
export const apiGet = (endpoint: string, params?: object) => {
  const requestKey = `${endpoint}?${JSON.stringify(params || {})}`;
  if (pendingGetRequests.has(requestKey)) {
    return pendingGetRequests.get(requestKey);
  }
  const promise = api.get(endpoint, { params }).finally(() => {
    pendingGetRequests.delete(requestKey);
  });
  pendingGetRequests.set(requestKey, promise);
  return promise;
};

// Helper: GET /endpoint/:id
export const apiGetById = (endpoint: string, id: string) => {
  const requestKey = `${endpoint}/${id}`;
  if (pendingGetRequests.has(requestKey)) {
    return pendingGetRequests.get(requestKey);
  }
  const promise = api.get(`${endpoint}/${id}`).finally(() => {
    pendingGetRequests.delete(requestKey);
  });
  pendingGetRequests.set(requestKey, promise);
  return promise;
};

// Helper: POST /endpoint
export const apiPost = (endpoint: string, body: object) =>
  api.post(endpoint, body);

// Helper: PUT /endpoint/:id
export const apiPut = (endpoint: string, id: string, body: object) =>
  api.put(`${endpoint}/${id}`, body);

// Helper: DELETE /endpoint/:id
export const apiDelete = (endpoint: string, id: string) =>
  api.delete(`${endpoint}/${id}`);

export { endPointApi };
export default api;
