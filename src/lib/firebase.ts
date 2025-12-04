import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBcnLvJSaGfgQnnWUQ9Zy5pxYVJhMDYtkY",
  authDomain: "texoditor.firebaseapp.com",
  projectId: "texoditor",
  storageBucket: "texoditor.firebasestorage.app",
  messagingSenderId: "1073837608622",
  appId: "1:1073837608622:web:02f0071c04005ce7e4e73f",
  measurementId: "G-MBG24EJ726"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
