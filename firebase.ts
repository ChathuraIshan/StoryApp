/**
 * Firebase configuration and initialization
 * Sets up the Firebase app and exports the Firestore database instance
 */
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBO9OnyE_j2G5vJ-N1RzMGPA851ali4QLg",
  authDomain: "anonstories-7a897.firebaseapp.com",
  projectId: "anonstories-7a897",
  storageBucket: "anonstories-7a897.firebasestorage.app",
  messagingSenderId: "176041000911",
  appId: "1:176041000911:web:3e160cd46c36c14a28dcba",
  measurementId: "G-W1BTJYQSV4"
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firestore and export the database instance
export const db = getFirestore(app);
