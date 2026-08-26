import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDxsrLy_I0n54NmdKwNZkZDLwlN55KPq60",
  authDomain: "visual-novel-studio-26634.firebaseapp.com",
  projectId: "visual-novel-studio-26634",
  storageBucket: "visual-novel-studio-26634.firebasestorage.app",
  messagingSenderId: "630969758710",
  appId: "1:630969758710:web:91af1dbe31581cb1db0dd7",
  measurementId: "G-7ELJLZRMM1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
