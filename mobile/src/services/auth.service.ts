import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export interface AuthData {
  token: string;
  technicianId: string;
  companyId: string;
  name: string;
}

export async function login(email: string, password: string): Promise<AuthData> {
  const { data } = await axios.post(`${API_URL}/auth/login`, { email, password });
  const auth: AuthData = {
    token: data.accessToken,
    technicianId: data.user.id,
    companyId: data.user.company.id,
    name: data.user.name,
  };
  await SecureStore.setItemAsync('fsm_auth', JSON.stringify(auth));
  return auth;
}

export async function getAuthData(): Promise<AuthData | null> {
  const raw = await SecureStore.getItemAsync('fsm_auth');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function logout(): Promise<void> {
  await SecureStore.deleteItemAsync('fsm_auth');
}
