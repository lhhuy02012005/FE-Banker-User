import { SERVICE_PREFIX } from "@/app/constants/config";
import axiosClient from "@/app/lib/axios";
import { getDeviceId } from "@/app/lib/utils";

export interface TransactionVerificationRequest {
  deviceId: string;
  method: 'EMAIL_OTP' | 'SMS_OTP' | 'BIOMETRIC';
  verificationId?: string;
  otp?: string;
  credentialId?: string;
  signature?: string;
  challenge?: string;
  clientDataJSON?: string;
  authenticatorData?: string;
}

export interface BiometricVerificationResponse {
  verified: boolean;
  ticketId?: string;
  failureReason?: string;
}

export const securityService = {
  // Get challenge for biometric authentication
  getChallenge: async (deviceId?: string) => {
    const response = await axiosClient.get(
      `${SERVICE_PREFIX.SECURITY}/v1/security/challenge`,
      {
        params: {
          deviceId: deviceId || getDeviceId(),
        },
      }
    );
    return response.data;
  },

  // Enable biometric for device
  enableBiometric: async (payload: {
    deviceId: string;
    deviceName: string;
    publicKey: string;
    credentialId: string;
  }) => {
    const response = await axiosClient.post(
      `${SERVICE_PREFIX.SECURITY}/v1/security/devices/biometric`,
      {
        ...payload,
        deviceId: getDeviceId(),
      }
    );
    return response.data;
  },

  // Verify transaction via biometric
  verifyTransactionBiometric: async (payload: {
    credentialId: string;
    signature: string;
    challenge: string;
    clientDataJSON?: string;
    authenticatorData?: string;
    ticketId?: string;
  }) => {
    const response = await axiosClient.post(
      `${SERVICE_PREFIX.SECURITY}/v1/security/transaction/verify`,
      {
        method: 'BIOMETRIC',
        deviceId: getDeviceId(),
        ...payload,
      }
    );
    return response.data;
  },

  // Verify transaction via OTP
  verifyTransactionOTP: async (payload: {
    verificationId: string;
    otp: string;
    method?: 'EMAIL_OTP' | 'SMS_OTP';
  }) => {
    const response = await axiosClient.post(
      `${SERVICE_PREFIX.SECURITY}/v1/security/transaction/verify`,
      {
        deviceId: getDeviceId(),
        method: payload.method || 'EMAIL_OTP',
        ...payload,
      }
    );
    return response.data;
  },

  // Generate OTP for transaction
  generateOTP: async () => {
    const response = await axiosClient.post(
      `${SERVICE_PREFIX.OTP}/v1/otp/generate`,
      {
        otpType: 'EMAIL_OTP',
      }
    );
    return response.data;
  },

  // Verify OTP
  verifyOTP: async (verificationId: string, otp: string) => {
    const response = await axiosClient.post(
      `${SERVICE_PREFIX.OTP}/v1/otp/verify`,
      {
        verificationId,
        otp,
        otpType: 'EMAIL_OTP',
      }
    );
    return response.data;
  },

  // Get user registered devices
  getUserDevices: async () => {
    const response = await axiosClient.get(`${SERVICE_PREFIX.SECURITY}/v1/security/devices`);
    return response.data;
  },

  // Register device on login
  registerDevice: async (deviceName: string, fcmToken?: string) => {
    const response = await axiosClient.post(`${SERVICE_PREFIX.SECURITY}/v1/security/devices/register`, {
      deviceId: getDeviceId(),
      deviceName: deviceName,
      fcmToken: fcmToken,
    });
    return response.data;
  },
};
