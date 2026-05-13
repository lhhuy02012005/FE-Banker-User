import SockJS from 'sockjs-client';
import { Client, type IMessage } from '@stomp/stompjs';

export type BalanceUpdatePayload = {
  userId: string;
  accountId?: string;
  balance: number;
  currency?: string;
  transactionId?: string;
  amount?: number;
  type?: 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'WELCOME_BONUS';
  timestamp?: string;
};

let balanceStompClient: Client | null = null;
let balanceUpdateCallback: ((payload: BalanceUpdatePayload) => void) | null = null;

const getBalanceUpdateSocketUrl = () => {
  const configuredUrl = process.env.NEXT_PUBLIC_BALANCE_WS_URL;
  if (configuredUrl) return configuredUrl;
  // Reuse same WS endpoint as notifications
  return 'http://localhost:8084/api/ws-notification';
};

/**
 * Connect to balance update WebSocket
 * Listens on /topic/balance-updates-{userId} for real-time balance changes
 */
export const connectBalanceUpdateSocket = (
  token: string,
  userId: string,
  onBalanceUpdate: (payload: BalanceUpdatePayload) => void,
) => {
  if (!token || !userId || typeof window === 'undefined') {
    return () => {};
  }

  balanceUpdateCallback = onBalanceUpdate;
  const socketUrl = getBalanceUpdateSocketUrl();
  const socket = new SockJS(socketUrl);

  balanceStompClient = new Client({
    webSocketFactory: () => socket as unknown as WebSocket,
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
    reconnectDelay: 5000,
    debug: () => {},
    onConnect: () => {
      // Subscribe to balance updates for this specific user
      balanceStompClient?.subscribe(`/topic/balance-updates-${userId}`, (frame: IMessage) => {
        try {
          const payload = JSON.parse(frame.body) as BalanceUpdatePayload;
          onBalanceUpdate(payload);
          console.log('Balance updated:', payload);
        } catch (err) {
          console.error('Error parsing balance update:', err);
        }
      });

      console.log('Connected to balance update socket for user:', userId);
    },
    onStompError: (frame) => {
      console.error('Balance socket error:', frame);
    },
  });

  balanceStompClient.activate();

  return () => {
    try {
      balanceStompClient?.deactivate();
    } catch {
      // Ignore disconnect cleanup issues
    }
    balanceStompClient = null;
    balanceUpdateCallback = null;
  };
};

/**
 * Disconnect balance update socket
 */
export const disconnectBalanceUpdateSocket = () => {
  try {
    balanceStompClient?.deactivate();
  } catch {
    // Ignore
  }
  balanceStompClient = null;
  balanceUpdateCallback = null;
};

/**
 * Check if balance socket is connected
 */
export const isBalanceSocketConnected = (): boolean => {
  return balanceStompClient?.active ?? false;
};
