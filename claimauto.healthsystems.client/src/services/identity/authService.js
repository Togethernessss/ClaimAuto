import api from '../../api/axiosClient';

// All HTTP calls related to authentication live here.
// Pages don't talk to axios directly — they call these functions.

export async function login(email, password) {
  const response = await api.post('/api/auth/login', { email, password });
  return response.data;
}

export async function register(dto) {
  const response = await api.post('/api/auth/register', dto);
  return response.data;
}

export async function verifyMfa(mfaToken, code) {
  const response = await api.post('/api/auth/verify-mfa', { mfaToken, code });
  return response.data;
}

export async function setupMfa() {
  const response = await api.post('/api/auth/mfa/setup');
  return response.data;
}

export async function confirmMfa(code) {
  const response = await api.post('/api/auth/mfa/confirm', { code });
  return response.data;
}

export async function disableMfa(code) {
  const response = await api.post('/api/auth/mfa/disable', { code });
  return response.data;
}