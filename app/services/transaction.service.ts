import { SERVICE_PREFIX } from "@/app/constants/config";
import axiosClient from "@/app/lib/axios";
import { v4 as uuidv4 } from "uuid";
import { getDeviceId } from "../lib/utils";

export interface TransactionResponse {
  id: string;
  accountId: string;
  targetAccountId?: string;
  userId: string;
  senderAccountNumber: string;
  senderName: string;
  receiverAccountNumber?: string;
  receiverName?: string;
  description: string;
  amount: number;
  status: 'PROCESSNG' | 'COMPLETED' | 'FAILED';
  transactionType: 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'WELCOME_BONUS' | 'REFUND';
  failureReason?: string;
  createdAt: string;
  bank?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface CreateTransactionRequest {
  userId?: string;
  email?: string;
  phoneNumber?: string;
  accountId?: string;
  targetAccountNumber?: string;
  amount: number;
  description: string;
  transactionType: 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER';
  verificationMethod?: 'EMAIL_OTP' | 'SMS_OTP' | 'BIOMETRIC';
  credentialId?: string;
  signature?: string;
  challenge?: string;
  otp?: string;
  verificationId?: string;
  clientDataJSON?: string;
  authenticatorData?: string;
}

export const transactionService = {
  // Get user's transactions
  getMyTransactions: async (page: number = 0, size: number = 10, keyword?: string, sort?: string) => {
    const params: any = { page, size };
    if (keyword) params.keyword = keyword;
    if (sort) params.sort = sort;

    const response = await axiosClient.get(
      `${SERVICE_PREFIX.TRANSACTION}/v1/transactions/my`,
      { params }
    );
    return response.data;
  },

  // Get transaction detail
  getTransactionDetail: async (id: string) => {
    const response = await axiosClient.get(
      `${SERVICE_PREFIX.TRANSACTION}/v1/transactions/my/${id}`
    );
    return response.data;
  },

  // Create transaction
  createTransaction: async (request: CreateTransactionRequest) => {
    const payload = {
      ...request,
      idempotencyKey: uuidv4(),
      deviceId: getDeviceId(),
    };

    const response = await axiosClient.post(
      `${SERVICE_PREFIX.TRANSACTION}/v1/transactions`,
      payload
    );
    return response.data;
  },

  // Verify transaction with biometric
  verifyTransactionBiometric: async (
    credentialId: string,
    signature: string,
    challenge: string,
    clientDataJSON?: string,
    authenticatorData?: string,
    ticketId?: string
  ) => {
    const response = await axiosClient.post(
      `${SERVICE_PREFIX.SECURITY}/v1/security/transaction/verify`,
      {
        method: 'BIOMETRIC',
        credentialId,
        signature,
        challenge,
        clientDataJSON,
        authenticatorData,
        ticketId,
      },
      {
        headers: {
          'X-Device-Id': localStorage.getItem('device_id'),
        },
      }
    );
    return response.data;
  },

  // Verify transaction with OTP
  verifyTransactionOTP: async (
    verificationId: string,
    otp: string,
    ticketId?: string
  ) => {
    const response = await axiosClient.post(
      `${SERVICE_PREFIX.SECURITY}/v1/security/transaction/verify`,
      {
        method: 'EMAIL_OTP',
        verificationId,
        otp,
        ticketId,
      },
      {
        headers: {
          'X-Device-Id': localStorage.getItem('device_id'),
        },
      }
    );
    return response.data;
  },
};
