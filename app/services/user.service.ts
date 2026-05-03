import { SERVICE_PREFIX } from "@/app/constants/config";
import axiosClient from "@/app/lib/axios";

export interface UserProfile {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  kycLevel?: string;
  status: string;
  createdAt?: string;
}

export interface AccountInfo {
  id: string;
  userId: string;
  ownerName: string;
  accountNumber: string;
  balance: number;
  currency: string;
  status: string;
}

export interface UserDevice {
  id: string;
  deviceId: string;
  deviceName: string;
  biometricEnabled: boolean;
  lastUsed?: string;
  createdAt?: string;
}

export const userService = {
  // Get current user profile
  getMyProfile: async () => {
    const response = await axiosClient.post(
      `${SERVICE_PREFIX.IDENTITY}/v1/users/my-info`
    );
    return { ...response.data, data: response.data.data.user };
  },

  // Get user's account information
  getMyAccount: async () => {
    const response = await axiosClient.get(
      `${SERVICE_PREFIX.ACCOUNT}/v1/accounts/my`
    );
    return response.data;
  },
  getMyInfo: async () => {
    const response = await axiosClient.get(
      `${SERVICE_PREFIX.IDENTITY}/v1/users/my-info`
    );
    return response.data;
  },  
  // Get account by account number
  searchAccount: async (accountNumber: string) => {
    const response = await axiosClient.get(
      `${SERVICE_PREFIX.ACCOUNT}/v1/accounts/search`,
      { params: { accountNumber } }
    );
    return response.data;
  },

  // Logout all devices
  logoutAllDevices: async () => {
    const response = await axiosClient.post(
      `${SERVICE_PREFIX.IDENTITY}/v1/auth/logout/all`
    );
    return response.data;
  },

  // Logout single device
  logout: async () => {
    const response = await axiosClient.post(
      `${SERVICE_PREFIX.IDENTITY}/v1/auth/logout`
    );
    return response.data;
  },

  // Get all user devices for security settings
  getMyDevices: async () => {
    const response = await axiosClient.get(
      `${SERVICE_PREFIX.SECURITY}/v1/security/devices/my`
    );
    return response.data;
  },

  // Revoke biometric from a device
  revokeBiometric: async (deviceId: string) => {
    const response = await axiosClient.post(
      `${SERVICE_PREFIX.SECURITY}/v1/security/devices/${deviceId}/revoke`
    );
    return response.data;
  },
};
