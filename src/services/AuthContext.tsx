import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setLoading(true);
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            setUser({ id: userDoc.id, ...userDoc.data() } as User);
          } else {
            // Auto-heal for accounts made before Firestore was fully initialized
            const isAdmin = firebaseUser.email === 'austin@wovnapparel.com';
            const newUserData = {
              name: firebaseUser.email?.split('@')[0] || "User",
              email: firebaseUser.email || "",
              role: isAdmin ? 'owner' : 'staff',
              initials: firebaseUser.email ? firebaseUser.email.charAt(0).toUpperCase() : "U"
            };
            
            // Write to the newly active Firestore
            try {
              import('firebase/firestore').then(({ setDoc }) => {
                setDoc(doc(db, "users", firebaseUser.uid), newUserData).catch(console.error);
              });
            } catch(e){}
            
            setUser({ id: firebaseUser.uid, ...newUserData });
          }
        } catch(e) {
          console.error("Error reading user doc, likely Firestore Rules:", e);
          // Fallback if firestore read is denied
          const isAdmin = firebaseUser.email === 'austin@wovnapparel.com';
          setUser({
            id: firebaseUser.uid,
            name: firebaseUser.email?.split('@')[0] || "User",
            email: firebaseUser.email || "",
            role: isAdmin ? 'owner' : 'staff',
            initials: firebaseUser.email ? firebaseUser.email.charAt(0).toUpperCase() : "U"
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
