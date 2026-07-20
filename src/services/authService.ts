import { apiPost, endPointApi } from './api';

export interface AuthResponse {
  _id: string;
  name: string;
  email: string;
  roles: string[];
  permissions?: Record<string, boolean>;
  token: string;
}

export const loginUser = async (payload: { email: string; password?: string }): Promise<AuthResponse> => {
  const { data } = await apiPost(endPointApi.authLogin, payload);
  return data;
};

export const loginAsUser = async (userId: string): Promise<AuthResponse> => {
  const { data } = await apiPost(endPointApi.authLoginAs, { userId });
  return data;
};

export const forgotPassword = async (email: string): Promise<{ message: string; resetUrlForTesting?: string }> => {
  const { data } = await apiPost(endPointApi.authForgotPassword, { email });
  return data;
};

export const resetPassword = async (payload: { token: string; password?: string }): Promise<{ message: string }> => {
  const { data } = await apiPost(endPointApi.authResetPassword, payload);
  return data;
};
