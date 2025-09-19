// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyCQRU2lP3Qlk49Y4nlt-fJtgv9jS6JiDbQ",
    authDomain: process.env.NODE_ENV === 'development'
        ? 'localhost:5173'  // This will now match HTTPS
        : 'dev-app-526e2.firebaseapp.com',
    // : 'dev-app-526e2.firebaseapp.com',
    projectId: "dev-app-526e2",
    storageBucket: "dev-app-526e2.firebasestorage.app",
    messagingSenderId: "934667224897",
    appId: "1:934667224897:web:96d534d8fb68b652f183c0"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
