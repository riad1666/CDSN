"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";

// Interface matching Firestore user structure
export interface UserData {
  uid: string;
  name: string;
  email: string;
  studentId: string;
  status: "pending" | "approved" | "rejected";
  role: "user" | "admin" | "superadmin";
  profileImage: string;
  room: string;
  whatsapp: string;
  gender: "male" | "female";
  groupsJoined?: string[]; // Array of group IDs
  currentGroupId?: string; // Currently active group ID
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  currentGroupId: string | null;
  setCurrentGroupId: (groupId: string | null) => void;
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  currentGroupId: null,
  setCurrentGroupId: () => {},
  isSidebarOpen: false,
  setSidebarOpen: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const setCurrentGroupId = async (groupId: string | null) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, { currentGroupId: groupId });
      setUserData(prev => prev ? { ...prev, currentGroupId: groupId ?? undefined } : null);
    } catch (error) {
      console.error("Error updating current group ID:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setUserData({ uid: firebaseUser.uid, ...userDoc.data() } as UserData);
          } else {
            setUserData(null);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserData(null);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ 
        user, 
        userData, 
        loading, 
        currentGroupId: userData?.currentGroupId || null, 
        setCurrentGroupId,
        isSidebarOpen,
        setSidebarOpen
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
