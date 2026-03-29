"use client";

import { useAuth } from "@/context/AuthContext";
import { logoutUser } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Search, Bell, ChevronDown, User } from "lucide-react";
import { useState } from "react";

export function AdminHeader() {
  const { userData } = useAuth();
  const router = useRouter();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="h-20 bg-[#0a0b14]/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-8 sticky top-0 z-40">
      {/* Search Bar (Centered) */}
      <div className="hidden md:flex flex-1 justify-center max-w-2xl px-8">
        <div className="relative w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-purple-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Search users, groups, chats..." 
            className="w-full bg-white/3 border border-white/5 rounded-xl py-2.5 pl-11 pr-4 text-xs font-bold text-white placeholder:text-white/20 focus:outline-hidden focus:border-purple-500/50 focus:bg-white/5 transition-all"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-6 ml-auto">
        {/* Notifications */}
        <Link href="/admin/notifications">
            <button className="relative w-10 h-10 rounded-xl bg-white/3 border border-white/5 flex items-center justify-center hover:bg-white/5 transition-all group cursor-pointer">
            <Bell className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#0a0b14] shadow-[0_0_10px_rgba(244,63,94,0.5)]"></span>
            </button>
        </Link>

        {/* Profile Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 pl-4 border-l border-white/10 group cursor-pointer"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-lg border transition-all ${
              userData?.role === 'superadmin' 
              ? 'bg-linear-to-br from-purple-500 to-pink-500 border-white/20 group-hover:shadow-[0_0_15px_rgba(219,39,119,0.3)]' 
              : 'bg-white/5 border-white/10'
            }`}>
              {userData?.name ? userData.name.substring(0, 2).toUpperCase() : "AD"}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-[10px] font-black text-white/90 uppercase tracking-widest">{userData?.name || "Admin"}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[8px] font-bold text-white/30 uppercase tracking-[0.2em]">{userData?.role || "System Admin"}</span>
                <ChevronDown className="w-3 h-3 text-white/20" />
              </div>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute top-14 right-0 w-48 bg-[#11121d] border border-white/5 rounded-2xl shadow-2xl p-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <button 
                  onClick={() => router.push('/admin/settings')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 transition-all"
                >
                  <User className="w-4 h-4" /> Profile Details
                </button>
                <div className="h-px bg-white/5 my-2 mx-2"></div>
                <button 
                  onClick={async () => { await logoutUser(); router.push('/login'); }} 
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/10 transition-all text-left"
                >
                  <LogOut className="w-4 h-4" /> Terminate Session
                </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
