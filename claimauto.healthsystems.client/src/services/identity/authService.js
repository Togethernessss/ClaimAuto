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

// CHANGE PASSWORD 
// Backend: POST /api/auth/change-password
// Body:    { currentPassword, newPassword }
// Returns: { message: "Password changed successfully." }
// Used by: ChangePasswordModal on the Profile page
//
// Backend will return 400 if the new password doesn't meet the policy,
// 401 if the current password is wrong, or 404 if the user can't be found.
export async function changePassword(currentPassword, newPassword) {
  const response = await api.post('/api/auth/change-password', {
    currentPassword,
    newPassword,
  });
  return response.data;
}

/**
 * Admin invites a user. Backend generates a temp password and emails it.
 * Body: { name, email, role, phone?, department? }
 */
export async function inviteUser(payload) {
  const response = await api.post('/api/users/invite', payload);
  return response.data;
}

// FORGOT PASSWORD — step 1
// Backend: POST /api/auth/forgot-password
// Body:    { email }
// Always returns 200 with a generic message (no user enumeration).
export async function requestPasswordReset(email) {
  const response = await api.post('/api/auth/forgot-password', { email });
  return response.data;
}

// FORGOT PASSWORD — token validity check (used on reset page load)
// Backend: POST /api/auth/reset-password/validate
// Body:    { token }
export async function validateResetToken(token) {
  const response = await api.post('/api/auth/reset-password/validate', { token });
  return response.data;
}

// FORGOT PASSWORD — step 2
// Backend: POST /api/auth/reset-password
// Body:    { token, newPassword }
export async function resetPassword(token, newPassword) {
  const response = await api.post('/api/auth/reset-password', { token, newPassword });
  return response.data;
}