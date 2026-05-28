// src/services/files/fileService.js
import api from '../../api/axiosClient';

/**
 * Upload a raw File object to the backend BLOB store.
 * Returns { fileUrl, originalName, sizeBytes }
 * where fileUrl = "http://localhost:PORT/api/files/{guid}"
 * Store fileUrl as the document's fileURI.
 */
export async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/api/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data; // { fileUrl, originalName, sizeBytes }
}