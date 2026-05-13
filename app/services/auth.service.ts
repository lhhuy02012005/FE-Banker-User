
import { SERVICE_PREFIX } from "../constants/config";
import axiosClient , {getDeviceId} from "../lib/axios";

export interface RegisterPayload {
  fullName: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  email: string;
}
export interface VerifyOtpRequest {
  verificationId: string;
  otp: string;
  otpType: string;
}

export interface LoginPayload {
  phoneNumber: string;
  password: string;
  fcmToken?: string;
}

export interface BiometricSetupPayload {
  deviceId: string;
  deviceName: string;
  publicKey: string;
  credentialId: string;
}

export const authService = {
  register: async (payload: RegisterPayload) => {
    // RegisterRequest trong Java không có deviceId, nên gửi nguyên payload
    const response = await axiosClient.post(`${SERVICE_PREFIX.IDENTITY}/v1/auth/register`, payload);
    return response.data;
  },


  login: async (payload: LoginPayload) => {
    const response = await axiosClient.post(`${SERVICE_PREFIX.IDENTITY}/v1/auth/login`, {
      phoneNumber: payload.phoneNumber,
      password: payload.password,
      fcmToken: payload.fcmToken || localStorage.getItem('fcmToken'),
      deviceId: getDeviceId(), 
    });
    return response.data;
  },

  // 3. Lấy Challenge từ Redis (Dùng cho cả Login vân tay và Setup vân tay)
  getChallenge: async () => {
    const response = await axiosClient.get(`${SERVICE_PREFIX.SECURITY}/v1/security/challenge`, {
      params: { deviceId: getDeviceId() }
    });
    return response.data;
  },

  loginByBiometric: async (payload: {
    phoneNumber: string;
    credentialId: string;
    signature: string;
    clientDataJSON: string;
    authenticatorData: string;
    challenge: string;
  }) => {
    const response = await axiosClient.post(`${SERVICE_PREFIX.IDENTITY}/v1/auth/biometric-login`, {
      ...payload,
      fcmToken: localStorage.getItem('fcmToken'),
      deviceId: getDeviceId(),
    });
    return response.data;
  },

  enableBiometric: async (payload: BiometricSetupPayload) => {
    const response = await axiosClient.post(`${SERVICE_PREFIX.SECURITY}/v1/security/devices/biometric`, {
      deviceId: getDeviceId(), 
      deviceName: payload.deviceName, 
      publicKey: payload.publicKey, 
      credentialId: payload.credentialId, 
    });
    return response.data;
  },

  verifyOtp: async (payload: VerifyOtpRequest) => {
    // 1. Verify OTP with OTP-Service
    const otpResponse = await axiosClient.post(
      `${SERVICE_PREFIX.OTP}/v1/otp/verify`, {
        verificationId: payload.verificationId,
        otp: payload.otp,
        otpType: payload.otpType,
      }
    );
    console.log("OTP verification response:", otpResponse.data);
    
    // The OTP-Service returns a ticketId in the 'data' field of ApiResponse
    const ticketId = otpResponse.data?.data;
    
    if (!ticketId) {
      throw new Error("Invalid OTP verification response: no ticketId");
    }
    
    // 2. Activate Account with Identity-Service using the ticketId
    const activateResponse = await axiosClient.post(
      `${SERVICE_PREFIX.IDENTITY}/v1/auth/activate`, {
        ticketId: ticketId,
        deviceId: getDeviceId(),
      }
    );
    console.log("Activate response:", activateResponse.data);
    return activateResponse.data;
  },

  resendOtp: async (oldVerificationId: string) => {
    const response = await axiosClient.post(
      `${SERVICE_PREFIX.OTP}/v1/otp/resend`,
      null,
      { params: {oldVerificationId} }
    );
    console.log("Resend OTP response:", response.data);
    return response.data;
  },

  logoutAllDevices: async () => {
    const response = await axiosClient.post(
      `${SERVICE_PREFIX.IDENTITY}/v1/auth/logout/all`
    );
    return response.data;
  }

};