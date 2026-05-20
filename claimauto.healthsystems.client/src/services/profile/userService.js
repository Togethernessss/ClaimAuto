import axiosClient from '../../api/axiosClient';

export const getUserProfile = async () => {
  try {
    const response = await axiosClient.get('/users/profile'); // adjust path if needed
    console.log("Profile API response:", response.data); // debug
    return response.data;
  } catch (error) {
    console.error("Failed to fetch profile:", error);
    throw error;
  }
};

export const updateUserPhone = async (phone) => {
  const response = await axiosClient.put('/users/profile/phone', { phone });
  return response.data;
};

export const enableMfa = async () => {
  const response = await axiosClient.post('/users/profile/mfa/enable');
  return response.data;
};

export const changePassword = async (newPassword) => {
  const response = await axiosClient.put('/users/profile/password', { password: newPassword });
  return response.data;
};
