import SockJS from 'sockjs-client';
import { Client, type IMessage } from '@stomp/stompjs';

export type NotificationSocketPayload = {
  title?: string;
  body?: string;
  amount?: string | number;
  type?: string;
  eventType?: string;
  transactionId?: string;
  metadata?: Record<string, string>;
};

let stompClient: Client | null = null;

const getNotificationSocketUrl = () => {
  const configuredUrl = process.env.NEXT_PUBLIC_NOTIFICATION_WS_URL;
  if (configuredUrl) return configuredUrl;

  return 'http://localhost:8084/api/ws-notification';
};

export const connectNotificationSocket = (
  token: string,
  userId: string,
  onMessage: (payload: NotificationSocketPayload) => void,
) => {
  if (!token || !userId || typeof window === 'undefined') {
    return () => {};
  }

  const socketUrl = getNotificationSocketUrl();
  const socket = new SockJS(socketUrl);

  stompClient = new Client({
    webSocketFactory: () => socket as unknown as WebSocket,
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
    reconnectDelay: 5000,
    debug: () => {},
    onConnect: () => {
      stompClient?.subscribe(`/topic/notifications-${userId}`, (frame: IMessage) => {
        try {
          onMessage(JSON.parse(frame.body));
        } catch {
          onMessage({ body: frame.body });
        }
      });
    },
  });

  stompClient.activate();

  return () => {
    try {
      stompClient?.deactivate();
    } catch {
      // Ignore disconnect cleanup issues.
    }

    stompClient = null;
  };
};
