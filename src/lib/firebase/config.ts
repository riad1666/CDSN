import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBq1MGKmrToANS6g-8qhXOl2qmc1MixGoU",
  authDomain: "cdsa-4b51d.firebaseapp.com",
  projectId: "cdsa-4b51d",
  storageBucket: "cdsa-4b51d.firebasestorage.app",
  messagingSenderId: "860417869749",
  appId: "1:860417869749:web:f162503f11ee91bacd7bfc",
  measurementId: "G-48PKF3QMTT"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
