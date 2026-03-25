"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShoppingCart, ChefHat, LogOut, LayoutDashboard, Shield, Menu, X } from "lucide-react";
import PWAInstallPrompt from "./PWAInstallPrompt";
import { useAuth } from "@/context/AuthContext";
import { logoutUser } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase/config";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";

export function UserHeader() {
  const { userData } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
        <div className="hidden md:flex items-center gap-6">
          <PWAInstallPrompt />
          <div className="flex items-center gap-3">
            {userData?.profileImage && (
              <img src={userData.profileImage} alt="Profile" className="w-8 h-8 rounded-full border border-white/20 object-cover" />
            )}
            <span className="text-white text-sm font-medium">
              {userData?.name.split(" ")[0]}
            </span>
          </div>
          <button onClick={handleLogout} className="text-white/50 hover:text-red-400 transition-colors ml-4">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        
        <button className="md:hidden text-white/70 hover:text-white transition-colors" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
           {isMobileMenuOpen ? <X className="w-6 h-6"/> : <Menu className="w-6 h-6"/>}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="absolute top-full left-0 w-full bg-[#1a1b2e]/95 backdrop-blur-xl border-b border-white/10 p-4 flex flex-col gap-4 md:hidden shadow-2xl">
          <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="text-white/70 hover:text-white flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
            <LayoutDashboard className="w-5 h-5" /> Dashboard
          </Link>
          <Link href="/dashboard/shopping" onClick={() => setIsMobileMenuOpen(false)} className="text-white/70 hover:text-white flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
            <ShoppingCart className="w-5 h-5" /> Shopping
          </Link>
          <Link href="/cooking" onClick={() => setIsMobileMenuOpen(false)} className="text-white/70 hover:text-white flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
            <ChefHat className="w-5 h-5" /> Cooking
          </Link>
          {userData?.role === "admin" && (
            <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)} className="text-primary hover:text-white flex items-center gap-3 p-2 rounded-lg hover:bg-primary/10 transition-colors">
              <Shield className="w-5 h-5" /> Admin Panel
            </Link>
          )}
          <div className="px-2 py-1">
            <PWAInstallPrompt />
          </div>
          <div className="h-px bg-white/10 my-2"></div>
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center gap-3">
              {userData?.profileImage ? (
                <img src={userData.profileImage} alt="Profile" className="w-8 h-8 rounded-full border border-white/20 object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/10" />
              )}
              <span className="text-white font-medium">{userData?.name.split(" ")[0]}</span>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2 text-rose-400 hover:text-rose-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-rose-500/10">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
