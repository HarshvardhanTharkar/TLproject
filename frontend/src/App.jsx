// frontend/src/App.jsx

import React, { useState, useEffect } from 'react';
import { auth } from './utils/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Login from './components/Login';
import DocumentScanner from './components/DocumentScanner'; // <-- Import the new component

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <header className="flex items-center justify-between p-4 bg-white shadow-md">
        <h1 className="text-xl font-bold">Image App</h1>
        {user && (
          <button onClick={handleLogout} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700">
            Logout
          </button>
        )}
      </header>
      <main className="container mx-auto p-4">
        {!user ? (
          <Login onLogin={() => {}} />
        ) : (
          <div className="space-y-8">
            <DocumentScanner /> {/* <-- Use the new component here */}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;