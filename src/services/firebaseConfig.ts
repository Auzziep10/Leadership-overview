import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-apiKey",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "demo-authDomain",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-projectId",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "demo-storageBucket",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "demo-senderId",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "demo-appId"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
