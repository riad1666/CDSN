"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ShoppingCart, ChefHat, LogOut, LayoutDashboard, Shield } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { logoutUser } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase/config";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";

export function UserHeader() {
  const { userData } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!userData) return;
    
    // Request browser notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Listen to the most recent notice
    const q = query(collection(db, "notices"), orderBy("createdAt", "desc"), limit(1));
    let isFirstLoad = true;
    
    const unsub = onSnapshot(q, (snapshot) => {
      if (isFirstLoad) {
        isFirstLoad = false;
        return;
      }
      
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const notice = change.doc.data();
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(`CDS Notice: ${notice.title}`, {
              body: notice.message,
              icon: "/logo.png"
            });
          }
        }
      });
    });

    return () => unsub();
  }, [userData]);

  const handleLogout = async () => {
    await logoutUser();
    router.push("/login");
  };

  return (
    <header className="glass-panel rounded-none border-x-0 border-t-0 border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3">
         <img src="/logo.png" alt="CDS Logo" className="w-10 h-10 object-contain" />
      </div>
      
      <nav className="hidden md:flex items-center gap-8">
        <Link href="/dashboard" className="text-white/70 hover:text-white flex items-center gap-2 text-sm font-medium transition-colors">
          <LayoutDashboard className="w-4 h-4" /> Dashboard
        </Link>
        <Link href="/dashboard/shopping" className="text-white/70 hover:text-white flex items-center gap-2 text-sm font-medium transition-colors">
          <ShoppingCart className="w-4 h-4" /> Shopping
        </Link>
        <Link href="/cooking" className="text-white/70 hover:text-white flex items-center gap-2 text-sm font-medium transition-colors">
          <ChefHat className="w-4 h-4" /> Cooking
        </Link>
        {userData?.role === "admin" && (
          <Link href="/admin" className="text-primary hover:text-white flex items-center gap-2 text-sm font-medium transition-colors">
            <Shield className="w-4 h-4" /> Admin
          </Link>
        )}
      </nav>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          {userData?.profileImage && (
            <img src={userData.profileImage} alt="Profile" className="w-8 h-8 rounded-full border border-white/20 object-cover" />
          )}
          <span className="text-white text-sm font-medium hidden sm:block">
            {userData?.name.split(" ")[0]}
          </span>
        </div>
        <button onClick={handleLogout} className="text-white/50 hover:text-red-400 transition-colors ml-4">
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
