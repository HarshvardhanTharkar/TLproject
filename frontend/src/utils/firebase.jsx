import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
   apiKey: "AIzaSyAo2fH54YsLwDaO0hfmoDhq9K5Qan7r6j0",
  authDomain: "trestlelabsapp.firebaseapp.com",
  projectId: "trestlelabsapp",
  storageBucket: "trestlelabsapp.appspot.com", // important: .appspot.com
  messagingSenderId: "879777148200",
  appId: "1:879777148200:web:XXXXXXXXXXXX",
  measurementId: "G-KPVGKBZMC9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);
const db = getFirestore(app);

export { auth, storage, db };



 