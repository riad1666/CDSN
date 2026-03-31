"use client";

import { useState, useEffect } from "react";
import { Menu, X, Search, Loader2, Bell, ChevronDown } from "lucide-react";
import PWAInstallPrompt from "./PWAInstallPrompt";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { searchUsersByStudentId, UserBasicInfo } from "@/lib/firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { GroupInviteModal } from "./GroupInviteModal";

export function UserHeader() {
  const { userData, setSidebarOpen, isSidebarOpen } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserBasicInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteUser, setInviteUser] = useState<UserBasicInfo | null>(null);

  // Live search with debounce
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchUsersByStudentId(searchQuery.trim());
      setSearchResults(results);
      setIsSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <header className="h-20 px-6 md:px-8 flex items-center justify-between sticky top-0 z-40 bg-background/40 backdrop-blur-xl border-b border-white/5">
      <div className="flex items-center gap-4 lg:hidden">
         <button className="text-white/70 hover:text-white transition-colors" onClick={() => setSidebarOpen(!isSidebarOpen)}>
             <Menu className="w-6 h-6"/>
         </button>
      </div>

      {/* Centered Search Bar */}
      <div className="flex-1 flex justify-center px-4 max-w-2xl mx-auto">
        <div className="relative w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
            <input 
                type="text" 
                placeholder="Search by Student ID..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-11 pr-11 text-xs md:text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:bg-white/10 transition-all"
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            />
            {isSearching && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
            )}
            {!isSearching && searchQuery && (
                <button
                    type="button"
                    onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 hover:text-white transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            )}

            <AnimatePresence>
                {searchResults.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full left-0 w-full mt-3 glass-panel p-2 shadow-2xl z-50 overflow-hidden ring-1 ring-white/10"
                    >
                        {searchResults.map(user => (
                            <div key={user.uid} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl group transition-all">
                                <div className="flex items-center gap-3">
                                    {user.profileImage ? (
                                        <img src={user.profileImage} className="w-10 h-10 rounded-full border border-white/10 object-cover" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-white/40 font-bold uppercase">{user.name.charAt(0)}</div>
                                    )}
                                    <div>
                                        <div className="text-sm font-bold text-white tracking-tight">{user.name}</div>
                                        <div className="text-[10px] text-white/30 font-medium uppercase tracking-wider">{user.studentId}</div>
                                    </div>
                                </div>
                                 <div className="flex gap-2">
                                    <button onClick={() => { setInviteUser(user); setIsInviteOpen(true); setSearchResults([]); setSearchQuery(""); }}
                                        className="px-4 py-1.5 bg-primary/10 text-primary text-[10px] font-black rounded-lg hover:bg-primary hover:text-white transition-all">INVITE</button>
                                 </div>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
      </div>
      
      {/* Right Side Tools */}
      <div className="flex items-center gap-4 md:gap-6">
        <PWAInstallPrompt />
        
        <button 
          onClick={() => router.push("/notifications")}
          className="relative p-2 text-white/40 hover:text-white transition-colors"
        >
           <Bell className="w-5 h-5" />
           <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-[#0a0b14]"></span>
        </button>


        <div className="flex items-center gap-3 pl-4 border-l border-white/10 group cursor-pointer">
           <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-white tracking-tight leading-none mb-1">{userData?.name || "User Name"}</div>
              <div className="text-[10px] text-white/30 font-medium leading-none flex items-center justify-end gap-1">
                 Live Status <div className="w-1.5 h-1.5 rounded-full bg-success"></div>
              </div>
           </div>
           <div className="relative">
              {userData?.profileImage ? (
                 <img src={userData.profileImage} className="w-10 h-10 rounded-2xl border border-white/20 object-cover group-hover:border-primary transition-colors" />
              ) : (
                 <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-white/10 flex items-center justify-center text-primary font-black uppercase">{userData?.name?.charAt(0) || "U"}</div>
              )}
           </div>
           <ChevronDown className="w-4 h-4 text-white/20 group-hover:text-white transition-colors hidden md:block" />
        </div>
      </div>

      <GroupInviteModal 
        isOpen={isInviteOpen} 
        onClose={() => setIsInviteOpen(false)} 
        targetUser={inviteUser} 
      />
    </header>
  );
}


