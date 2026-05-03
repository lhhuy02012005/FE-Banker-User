/**
 * Utility functions for security and formatting
 */

/**
 * Mask sensitive information (balance, card numbers, account numbers)
 * Shows first 4 and last 4 characters, masks the rest
 */
export const maskSensitiveInfo = (value: string): string => {
  if (!value) return '*'.repeat(8);
  
  const str = value.toString();
  if (str.length <= 8) return '*'.repeat(str.length);
  
  const first = str.substring(0, 4);
  const last = str.substring(str.length - 4);
  const masked = '*'.repeat(str.length - 8);
  
  return `${first}${masked}${last}`;
};

/**
 * Mask account number
 */
export const maskAccountNumber = (accountNumber: string): string => {
  if (!accountNumber) return '****';
  const last4 = accountNumber.slice(-4);
  return `****${last4}`;
};

/**
 * Format currency (VND)
 */
export const formatCurrency = (amount: number | string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0 VND';
  
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(num);
};

/**
 * Format date and time
 */
export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

/**
 * Format date only
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

/**
 * Format time only
 */
export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

/**
 * Generate QR code data URL (using QR code library)
 * This uses a simple QR code generator via API
 */
export const generateQRCode = async (text: string): Promise<string> => {
  try {
    // Using qr-server API for QR code generation
    const encodedText = encodeURIComponent(text);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedText}`;
    return qrUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
};

/**
 * Validate account number format (15 characters for Vietnamese banks)
 */
export const isValidAccountNumber = (accountNumber: string): boolean => {
  return /^\d{15}$/.test(accountNumber);
};

/**
 * Validate phone number format (Vietnamese)
 */
export const isValidPhoneNumber = (phoneNumber: string): boolean => {
  // Vietnamese phone: starts with 0 and has 10 digits, or +84 format
  return /^(\+84|0)[1-9]\d{8}$/.test(phoneNumber.replace(/\s/g, ''));
};

/**
 * Get transaction status color
 */
export const getTransactionStatusColor = (status: string): string => {
  switch (status) {
    case 'COMPLETED':
      return 'text-green-600 bg-green-50';
    case 'PROCESSNG':
      return 'text-yellow-600 bg-yellow-50';
    case 'FAILED':
      return 'text-red-600 bg-red-50';
    default:
      return 'text-slate-600 bg-slate-50';
  }
};

/**
 * Get transaction type label and icon color
 */
export const getTransactionTypeInfo = (type: string): { label: string; color: string } => {
  switch (type) {
    case 'TRANSFER':
      return { label: 'Transfer', color: 'text-blue-600' };
    case 'DEPOSIT':
      return { label: 'Deposit', color: 'text-green-600' };
    case 'WITHDRAW':
      return { label: 'Withdraw', color: 'text-red-600' };
    case 'WELCOME_BONUS':
      return { label: 'Welcome Bonus', color: 'text-purple-600' };
    case 'REFUND':
      return { label: 'Refund', color: 'text-orange-600' };
    default:
      return { label: type, color: 'text-slate-600' };
  }
};

/**
 * Determine if transaction is incoming or outgoing
 */
export const isTransactionIncoming = (transactionType: string): boolean => {
  return ['DEPOSIT', 'WELCOME_BONUS', 'REFUND'].includes(transactionType);
};

/**
 * Get or generate a persistent device ID
 */
export const getDeviceId = (): string => {
  if (typeof window === 'undefined') return 'server-side';
  
  let deviceId = localStorage.getItem('banker_device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('banker_device_id', deviceId);
  }
  return deviceId;
};
