import SockJS from 'sockjs-client';
import { Client, type IMessage } from '@stomp/stompjs';

export type CampaignSocketPayload = {
  eventType?: string;
  campaignId?: string;
  campaign?: Record<string, any>;
  remainingQuantity?: number;
  totalQuantity?: number;
  [key: string]: any;
};

let stompClient: Client | null = null;

const getCampaignSocketUrl = () => {
  const configuredUrl = process.env.NEXT_PUBLIC_NOTIFICATION_WS_URL;
  if (configuredUrl) return configuredUrl;
  return 'http://localhost:8084/api/ws-notification';
};

export const connectCampaignSocket = (
  token: string,
  onMessage: (payload: CampaignSocketPayload) => void,
) => {
  if (!token || typeof window === 'undefined') {
    return () => {};
  }

  const socketUrl = getCampaignSocketUrl();
  const socket = new SockJS(socketUrl);

  stompClient = new Client({
    webSocketFactory: () => socket as unknown as WebSocket,
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
    reconnectDelay: 5000,
    debug: () => {},
    onConnect: () => {
      // subscribe to a general campaigns topic
      stompClient?.subscribe(`/topic/campaigns`, (frame: IMessage) => {
        try {
          onMessage(JSON.parse(frame.body));
        } catch {
          onMessage({ raw: frame.body } as CampaignSocketPayload);
        }
      });
    },
  });

  stompClient.activate();

  return () => {
    try {
      stompClient?.deactivate();
    } catch {
      // ignore
    }
    stompClient = null;
  };
};
