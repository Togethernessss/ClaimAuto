import api from '../../api/axiosClient';

export async function getMyNotifications(status = null, category = null) {
  const params = {};
  if (status)   params.status   = status;
  if (category) params.category = category;
  const res = await api.get('/api/notifications', { params });
  return res.data;
}

export async function getUnreadNotifications() {
  const res = await api.get('/api/notifications/unread');
  return res.data;
}

export async function markAsRead(id) {
  const res = await api.put(`/api/notifications/${id}/read`);
  return res.data;
}

export async function markAllAsRead() {
  const res = await api.put('/api/notifications/read-all');
  return res.data;
}

export async function dismissNotification(id) {
  const res = await api.put(`/api/notifications/${id}/dismiss`);
  return res.data;
}

export async function deleteNotification(id) {
  await api.delete(`/api/notifications/${id}`);
}

export async function deleteAllNotifications() {
  const res = await api.delete('/api/notifications/all');
  return res.data;
}