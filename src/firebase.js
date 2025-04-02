// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; // Add Firestore

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA1Eom0qZr8e_xo17lNnH6Kyx1T3lXxKtk",
  authDomain: "gatortrips-fe9c9.firebaseapp.com",
  projectId: "gatortrips-fe9c9",
  storageBucket: "gatortrips-fe9c9.firebasestorage.app",
  messagingSenderId: "1038814367416",
  appId: "1:1038814367416:web:0ae186dd621c436978ae4d",
  measurementId: "G-LLV9VS3650"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app); // Initialize Firestore

// Export db so it can be imported in other files
export { db, analytics };