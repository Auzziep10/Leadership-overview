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
            // Auto-heal ONLY for owner
            const isAdmin = firebaseUser.email === 'austin@wovnapparel.com';
            if (isAdmin) {
              const newUserData = {
                name: firebaseUser.email?.split('@')[0] || "User",
                email: firebaseUser.email || "",
                role: 'owner',
                initials: "A"
              };
              
              // Write to the newly active Firestore
              try {
                import('firebase/firestore').then(({ setDoc }) => {
                  setDoc(doc(db, "users", firebaseUser.uid), newUserData).catch(console.error);
                });
              } catch(e){}
              
              setUser({ id: firebaseUser.uid, ...newUserData });
            } else {
              // Sign out deleted users
              await auth.signOut();
              setUser(null);
            }
          }
        } catch(e) {
          console.error("Error reading user doc, likely Firestore Rules:", e);
          // Fallback if firestore read is denied
          const isAdmin = firebaseUser.email === 'austin@wovnapparel.com';
          if (isAdmin) {
            setUser({
              id: firebaseUser.uid,
              name: firebaseUser.email?.split('@')[0] || "User",
              email: firebaseUser.email || "",
              role: 'owner',
              initials: "A"
            });
          } else {
            await auth.signOut();
            setUser(null);
          }
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
