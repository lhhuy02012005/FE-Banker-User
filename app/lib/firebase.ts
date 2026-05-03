// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, type MessagePayload } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBECwFRaG0Yh4KgFc6cRUlny5Q5tzgokqw",
  authDomain: "banker-16f7a.firebaseapp.com",
  projectId: "banker-16f7a",
  storageBucket: "banker-16f7a.firebasestorage.app",
  messagingSenderId: "93848022195",
  appId: "1:93848022195:web:ca4bc86c77cfd2f3a1d4c6",
  measurementId: "G-XYP2HJDLH9"
};

const app = initializeApp(firebaseConfig);

const isMessagingSupported = () => {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "Notification" in window;
};

const getMessagingInstance = () => {
  if (!isMessagingSupported()) return null;
  return getMessaging(app);
};

export const getFCMToken = async () => {
  try {
    const messaging = getMessagingInstance();
    if (!messaging) return null;

    const token = await getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY });
    if (token) {
      localStorage.setItem('fcmToken', token);
      return token;
    }
  } catch (error) {
    console.error("Không thể lấy FCM Token", error);
    return null;
  }
  return null;
};

export const subscribeForegroundMessages = (
  callback: (payload: MessagePayload) => void,
) => {
  const messaging = getMessagingInstance();
  if (!messaging) return () => {};

  return onMessage(messaging, callback);
};