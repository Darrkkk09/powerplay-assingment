import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') ?? ''}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

export const invoiceService = {
  getAll: (params) => api.get('/invoices', { params }),
  getSummary: () => api.get('/invoices/summary'),
  getTopCustomers: () => api.get('/customers/top-five'),
  getCustomers: () => api.get('/customers'),
  getCustomerProfile: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/invoices', data),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  remove: (id) => api.delete(`/invoices/${id}`),
};

export default api;