"use client";

import { useAuth } from "@/context/AuthContext";
import { logoutUser } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";
import { LogOut, Home } from "lucide-react";
import Link from "next/link";

export function AdminHeader() {
  const { userData } = useAuth();
  const router = useRouter();

  return (
    <header className="h-20 glass-panel rounded-none border-none flex items-center justify-between lg:justify-end px-6 sticky top-0 z-40">
      <div className="lg:hidden text-white font-bold text-xl">Admin Panel</div>
      
      <div className="flex items-center gap-6">
         <Link href="/dashboard" className="text-white/50 hover:text-white flex items-center gap-2 text-sm font-medium transition-colors hidden sm:flex">
            <Home className="w-4 h-4" /> Go to User View
         </Link>
         <div className="flex items-center gap-3 pl-6 border-l border-white/10">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white shadow-lg border border-white/20">
              AD
            </div>
            <button onClick={async () => { await logoutUser(); router.push('/login'); }} className="text-white/50 hover:text-red-400 transition-colors ml-2">
               <LogOut className="w-5 h-5" />
            </button>
         </div>
      </div>
    </header>
  );
}
