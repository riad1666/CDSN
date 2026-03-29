"use client";

import { useAuth } from "@/context/AuthContext";
import { subscribeToUserGroups, Group } from "@/lib/firebase/firestore";
import { useEffect, useState } from "react";
import { User, Plus, Search, LayoutDashboard, Settings, ShieldCheck, LogOut, Users, Key, ChefHat } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import { CreateGroupModal } from "./CreateGroupModal";
import { JoinGroupModal } from "./JoinGroupModal";

export const Sidebar = () => {
  const { userData, setCurrentGroupId, isSidebarOpen, setSidebarOpen } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isJoinOpen, setJoinOpen] = useState(false);
  const [isPlusMenuOpen, setPlusMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (userData?.uid) {
      const unsub = subscribeToUserGroups(userData.uid, (data) => setGroups(data));
      return () => unsub();
    }
  }, [userData?.uid]);

  const handleSignOut = () => {
    signOut(auth);
  };

  const sidebarVariants = {
    open: { x: 0, opacity: 1 },
    closed: { x: "-100%", opacity: 0 }
  };

  const SidebarContent = (
    <aside className={`fixed left-0 top-0 h-full w-20 flex flex-col items-center py-6 bg-[#0f101a] border-r border-white/5 z-50`}>
      {/* App Logo / Group Dashboard */}
      <Link href="/dashboard" className="mb-8 group relative" onClick={() => setSidebarOpen(false)}>
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
            pathname === "/dashboard" 
              ? "bg-primary text-white shadow-[0_0_20px_rgba(var(--color-primary),0.3)]" 
              : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
          }`}
        >
          <LayoutDashboard className="w-6 h-6" />
        </motion.div>
        <span className="absolute left-16 top-1/2 -translate-y-1/2 px-2 py-1 bg-white/10 backdrop-blur-md rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Group Dashboard
        </span>
      </Link>
      
      {/* Group Profile Link (Conditional) */}
      {userData?.currentGroupId && (
        <Link href="/dashboard/group" className="mb-4 group relative" onClick={() => setSidebarOpen(false)}>
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              pathname === "/dashboard/group" 
                ? "bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]" 
                : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Users className="w-6 h-6" />
          </motion.div>
          <span className="absolute left-16 top-1/2 -translate-y-1/2 px-2 py-1 bg-white/10 backdrop-blur-md rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            Group Profile
          </span>
        </Link>
      )}

      {/* Meal Plan Link (Mobile Friendly) */}
      {userData?.currentGroupId && (
        <Link href="/dashboard/meal-plan" className="mb-4 group relative block md:hidden" onClick={() => setSidebarOpen(false)}>
          <motion.div
            whileHover={{ scale: 1.1 }}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              pathname === "/dashboard/meal-plan" ? "bg-orange-500 text-white" : "bg-white/5 text-orange-400/60 hover:bg-orange-500/10"
            }`}
          >
            <ChefHat className="w-6 h-6" />
          </motion.div>
          <span className="absolute left-16 top-1/2 -translate-y-1/2 px-2 py-1 bg-white/10 backdrop-blur-md rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            Meal Plan
          </span>
        </Link>
      )}

      <div className="w-8 h-px bg-white/10 mb-6" />

      {/* Personal Dashboard */}
      <Link href="/personal" className="mb-4 group relative" onClick={() => setSidebarOpen(false)}>
        <motion.div
           whileHover={{ scale: 1.1 }}
           className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all ${
             pathname === "/personal" ? "border-primary shadow-[0_0_15px_rgba(var(--color-primary),0.2)]" : "border-transparent opacity-60 hover:opacity-100"
           }`}
        >
          {userData?.profileImage ? (
            <img src={userData.profileImage} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-white/10 flex items-center justify-center">
              <User className="w-5 h-5 text-white/40" />
            </div>
          )}
        </motion.div>
        <span className="absolute left-16 top-1/2 -translate-y-1/2 px-2 py-1 bg-white/10 backdrop-blur-md rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none text-center">
          Personal<br/>Dashboard
        </span>
      </Link>

      {/* Groups List */}
      <div className="flex-1 w-full overflow-y-auto no-scrollbar flex flex-col items-center gap-4 py-4">
        {groups.map((group) => (
          <motion.button
            key={group.id}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setCurrentGroupId(group.id); setSidebarOpen(false); }}
            className={`group relative w-12 h-12 rounded-2xl overflow-hidden transition-all shrink-0 ${
              userData?.currentGroupId === group.id 
                ? "ring-2 ring-primary ring-offset-4 ring-offset-[#0f101a] opacity-100" 
                : "opacity-40 hover:opacity-100"
            }`}
          >
            {group.profileImage ? (
              <img src={group.profileImage} alt={group.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-xs uppercase italic tracking-tighter">
                {group.name.substring(0, 2)}
              </div>
            )}
            <span className="absolute left-16 top-1/2 -translate-y-1/2 px-2 py-1 bg-white/10 backdrop-blur-md rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
              {group.name}
            </span>
          </motion.button>
        ))}

        {/* Add/Join Group Actions */}
        <div className="relative">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setPlusMenuOpen(!isPlusMenuOpen)}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                isPlusMenuOpen ? 'bg-primary text-white' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
              }`}
            >
              <Plus className={`w-6 h-6 transition-transform duration-300 ${isPlusMenuOpen ? 'rotate-45' : ''}`} />
            </motion.button>
            <AnimatePresence>
                {isPlusMenuOpen && (
                    <motion.div 
                        initial={{ opacity: 0, x: -10, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -10, scale: 0.9 }}
                        className="absolute left-16 top-0 bg-[#161724] border border-white/10 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 z-50 min-w-[140px]"
                    >
                        <button 
                            onClick={() => { setCreateOpen(true); setPlusMenuOpen(false); setSidebarOpen(false); }}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-all group"
                        >
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                <Users className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest">Create</span>
                        </button>
                        <button 
                            onClick={() => { setJoinOpen(true); setPlusMenuOpen(false); setSidebarOpen(false); }}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-all group"
                        >
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                <Key className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest">Join</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
      </div>

      {/* Super Admin Section */}
      {userData?.role === "superadmin" && (
        <Link href="/admin/super" className="mb-4 group relative" onClick={() => setSidebarOpen(false)}>
          <motion.div
            whileHover={{ scale: 1.1 }}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              pathname === "/admin/super" ? "bg-rose-500 text-white" : "bg-white/5 text-rose-400/60 hover:bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.1)]"
            }`}
          >
            <ShieldCheck className="w-6 h-6" />
          </motion.div>
          <span className="absolute left-16 top-1/2 -translate-y-1/2 px-2 py-1 bg-white/10 backdrop-blur-md rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            Control Center
          </span>
        </Link>
      )}

      {/* Bottom Actions */}
      <div className="mt-auto flex flex-col items-center gap-4 border-t border-white/5 pt-6 w-full">
        <Link href="/settings" className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all group relative ${
            pathname === "/settings" ? "bg-primary text-white" : "bg-white/5 text-white/30 hover:bg-white/10 hover:text-white"
        }`} onClick={() => setSidebarOpen(false)}>
          <Settings className="w-5 h-5 transition-transform group-hover:rotate-45" />
          <span className="absolute left-16 top-1/2 -translate-y-1/2 px-2 py-1 bg-white/10 backdrop-blur-md rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            Settings
          </span>
        </Link>
        <button onClick={() => { handleSignOut(); setSidebarOpen(false); }} className="w-12 h-12 rounded-2xl bg-white/5 text-white/30 hover:bg-rose-500/10 hover:text-rose-400 transition-all group relative">
          <LogOut className="w-5 h-5" />
          <span className="absolute left-16 top-1/2 -translate-y-1/2 px-2 py-1 bg-white/10 backdrop-blur-md rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            Sign Out
          </span>
        </button>
      </div>

      <CreateGroupModal isOpen={isCreateOpen} onClose={() => setCreateOpen(false)} />
      <JoinGroupModal isOpen={isJoinOpen} onClose={() => setJoinOpen(false)} />
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        {SidebarContent}
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.div
              initial="closed"
              animate="open"
              exit="closed"
              variants={sidebarVariants}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 md:hidden"
            >
              {SidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
