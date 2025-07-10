// Import the functions you need from the SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCcq4vF4yGXOx3XVd30Mhqh4bfF2z8O7XU",
    authDomain: "oredipendenti-81442.firebaseapp.com",
    projectId: "oredipendenti-81442",
    storageBucket: "oredipendenti-81442.firebasestorage.app",
    messagingSenderId: "605987945448",
    appId: "1:605987945448:web:17d89a5f410c07b464025d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Export for use in other modules
export { db, app };