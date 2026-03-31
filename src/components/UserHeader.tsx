"use client";

import { useState, useEffect } from "react";
import { Menu, X, Search, Loader2 } from "lucide-react";
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
    <header className="glass-panel rounded-none border-x-0 border-t-0 border-b border-white/5 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between sticky top-0 z-40 bg-background/80 backdrop-blur-md">
      <div className="flex items-center gap-4 flex-1">
         <button className="lg:hidden text-white/70 hover:text-white transition-colors" onClick={() => setSidebarOpen(!isSidebarOpen)}>
             <Menu className="w-6 h-6"/>
         </button>
         
         <div className="relative max-w-md w-full ml-auto lg:ml-0">
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-primary transition-colors" />
                <input 
                    type="text" 
                    placeholder="Search Users by ID..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 md:py-2.5 pl-9 md:pl-10 pr-10 text-xs md:text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
                )}
                {!isSearching && searchQuery && (
                    <button
                        type="button"
                        onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            <AnimatePresence>
                {searchResults.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full left-0 w-full mt-2 glass-panel p-2 shadow-2xl z-50 overflow-hidden"
                    >
                        <div className="flex items-center justify-between px-2 py-1 mb-2 border-b border-white/5">
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Search Results</span>
                            <button onClick={() => setSearchResults([])} className="text-white/40 hover:text-white"><X className="w-3 h-3" /></button>
                        </div>
                        {searchResults.map(user => (
                            <div key={user.uid} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg group transition-all">
                                <div className="flex items-center gap-3">
                                    {user.profileImage ? (
                                        <img src={user.profileImage} className="w-8 h-8 rounded-full border border-white/10" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/40 font-bold uppercase">{user.name.charAt(0)}</div>
                                    )}
                                    <div>
                                        <div className="text-sm font-medium text-white">{user.name}</div>
                                        <div className="text-[10px] text-white/40">{user.studentId}</div>
                                    </div>
                                </div>
                                 <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setInviteUser(user);
                                            setIsInviteOpen(true);
                                            setSearchResults([]);
                                            setSearchQuery("");
                                        }}
                                        className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-500 hover:text-white"
                                    >
                                        INVITE
                                    </button>
                                    <button
                                        onClick={() => {
                                            router.push(`/personal?trade=${user.uid}`);
                                            setSearchResults([]);
                                            setSearchQuery("");
                                        }}
                                        className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-white"
                                    >
                                        TRADE
                                    </button>
                                 </div>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
         </div>
      </div>
      
      <div className="flex items-center gap-3">
        <PWAInstallPrompt />
      </div>

      <GroupInviteModal 
        isOpen={isInviteOpen} 
        onClose={() => setIsInviteOpen(false)} 
        targetUser={inviteUser} 
      />
    </header>
  );
}

