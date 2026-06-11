import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_URL,
});

// Automatically add token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── AUTH ─────────────────────────────────────────────────────
export const login = (email, password) => {
  const formData = new FormData();
  formData.append('username', email);
  formData.append('password', password);
  return api.post('/auth/login', formData);
};

export const getMe = () => api.get('/auth/me');

// ── PATIENTS ─────────────────────────────────────────────────
export const getPatients = (clinicId, params = {}) =>
  api.get('/patients/', { params: { clinic_id: clinicId, ...params } });

export const getPatient = (patientId) =>
  api.get(`/patients/${patientId}`);

export const updatePatient = (patientId, data) =>
  api.patch(`/patients/${patientId}`, data);

// ── STAFF ────────────────────────────────────────────────────
export const getStaff = (branchId) =>
  api.get('/staff/', { params: { branch_id: branchId } });

export const createStaff = (data) =>
  api.post('/staff/', data);

export const updateWage = (staffId, newRate, effectiveFrom) =>
  api.patch(`/staff/${staffId}/wage`, null, {
    params: { new_rate: newRate, effective_from: effectiveFrom }
  });

// ── INVOICES ─────────────────────────────────────────────────
export const getInvoiceSummary = (clinicId, params = {}) =>
  api.get('/invoices/summary', { params: { clinic_id: clinicId, ...params } });

export const getOutstanding = (clinicId) =>
  api.get('/invoices/outstanding', { params: { clinic_id: clinicId } });

export const getInvoices = (clinicId, params = {}) =>
  api.get('/invoices/', { params: { clinic_id: clinicId, ...params } });

// ── ANALYTICS ────────────────────────────────────────────────
export const getOverview = (clinicId) =>
  api.get('/analytics/overview', { params: { clinic_id: clinicId } });

export const getRevenueTrend = (clinicId, months = 6) =>
  api.get('/analytics/revenue/trend', { params: { clinic_id: clinicId, months } });

export const getServicePnl = (clinicId, params = {}) =>
  api.get('/analytics/services/pnl', { params: { clinic_id: clinicId, ...params } });

export const getForecast = (clinicId, monthsAhead = 6) =>
  api.get('/analytics/forecast', { params: { clinic_id: clinicId, months_ahead: monthsAhead } });

export const getDeviceRoi = (branchId) =>
  api.get('/analytics/devices/roi', { params: { branch_id: branchId } });

export const getDemographics = (clinicId) =>
  api.get('/analytics/demographics', { params: { clinic_id: clinicId } });

// ── DEVICES ──────────────────────────────────────────────────
export const getDevices = (branchId) =>
  api.get('/devices/', { params: { branch_id: branchId } });

export const createDevice = (data) =>
  api.post('/devices/', data);

export const addMaintenance = (data) =>
  api.post('/devices/maintenance', data);

// ── INVENTORY ────────────────────────────────────────────────
export const getMaterials = (clinicId) =>
  api.get('/inventory/materials', { params: { clinic_id: clinicId } });

export const getBatches = (branchId) =>
  api.get('/inventory/batches', { params: { branch_id: branchId } });

export const logConsumption = (data) =>
  api.post('/inventory/batches/consume', data);

// ── PAYMENTS ─────────────────────────────────────────────────
export const recordPayment = (data) =>
  api.post('/payments/', data);

export const getPatientPayments = (patientId) =>
  api.get(`/payments/patient/${patientId}`);

// ── EXPENSES ─────────────────────────────────────────────────
export const getExpenses = (clinicId, params = {}) =>
  api.get('/expenses/', { params: { clinic_id: clinicId, ...params } });

export const getExpenseSummary = (clinicId) =>
  api.get('/expenses/summary', { params: { clinic_id: clinicId } });

export const createExpense = (data) =>
  api.post('/expenses/', data);

export const getSubcategories = (clinicId) =>
  api.get('/expenses/subcategories', { params: { clinic_id: clinicId } });

export const importPatients = (clinicId, branchId, file) => {
  const formData = new FormData();
  formData.append('clinic_id', clinicId);
  formData.append('branch_id', branchId);
  formData.append('file', file);
  return api.post('/import/patients', formData);
};

export const importSessions = (clinicId, branchId, file) => {
  const formData = new FormData();
  formData.append('clinic_id', clinicId);
  formData.append('branch_id', branchId);
  formData.append('file', file);
  return api.post('/import/sessions', formData);
};

export const importInvoices = (clinicId, branchId, file) => {
  const formData = new FormData();
  formData.append('clinic_id', clinicId);
  formData.append('branch_id', branchId);
  formData.append('file', file);
  return api.post('/import/invoices', formData);
};

export default api;

export const getServices = (clinicId) =>
  api.get('/services/', { params: { clinic_id: clinicId } });

export const updateSessionService = (patientId, sessionId, data) =>
  api.patch(`/patients/${patientId}/sessions/${sessionId}`, data);