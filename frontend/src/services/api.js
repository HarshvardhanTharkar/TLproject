import axios from 'axios';
import { auth } from '../utils/firebase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const postImageMetadata = async (metadata) => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated.");
  const token = await user.getIdToken();
  return axios.post(`${API_BASE_URL}/upload-metadata`, metadata, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const getImages = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated.");
  const token = await user.getIdToken();
  return axios.get(`${API_BASE_URL}/images`, {
    headers: { Authorization: `Bearer ${token}` }
  });
};
