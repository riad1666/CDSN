"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShoppingCart, ChefHat, LogOut, LayoutDashboard, Shield, Menu, X, Search, Bell, User as UserIcon, Loader2 } from "lucide-react";
import PWAInstallPrompt from "./PWAInstallPrompt";
import { useAuth } from "@/context/AuthContext";
import { logoutUser } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase/config";
import { collection, query, orderBy, limit, onSnapshot, where } from "firebase/firestore";
import { searchUsersByStudentId, UserBasicInfo, AppNotification, subscribeToNotifications } from "@/lib/firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { GroupInviteModal } from "./GroupInviteModal";

export function UserHeader() {
  const { userData, setSidebarOpen, isSidebarOpen } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserBasicInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteUser, setInviteUser] = useState<UserBasicInfo | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!userData) return;
    
    // Listen to notifications
    const unsubNotify = subscribeToNotifications(userData.uid, (data) => setNotifications(data));

    // Request browser notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Listen to the most recent group notice if a group is selected
    let unsubNotice = () => {};
    if (userData.currentGroupId) {
        const q = query(
            collection(db, "notices"), 
            where("groupId", "==", userData.currentGroupId)
        );
        let isFirstLoad = true;
        
        unsubNotice = onSnapshot(q, (snapshot) => {
          if (isFirstLoad) {
            isFirstLoad = false;
            return;
          }
          
          snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
              const noticeData = change.doc.data();
              if (noticeData.isDeleted) return;
              if ("Notification" in window && Notification.permission === "granted") {
                new Notification(`CDS Notice: ${noticeData.title}`, {
                  body: noticeData.message?.substring(0, 100),
                  icon: '/logo.png'
                });
              }
            }
          });
        });
    }

    return () => {
        unsubNotify();
        unsubNotice();
    };
  }, [userData?.uid, userData?.currentGroupId]);

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

  const handleLogout = async () => {
    await logoutUser();
    router.push("/login");
  };

  const unreadCount = notifications.filter(n => n.status === "unread").length;

  return (
    <header className="glass-panel rounded-none border-x-0 border-t-0 border-b border-white/5 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between sticky top-0 z-40 bg-[#161724]/80 backdrop-blur-md">
      <div className="flex items-center gap-4 md:gap-8 flex-1">
         <img src="/logo.png" alt="CDS Logo" className="w-8 h-8 md:w-10 md:h-10 object-contain" />
         
         {/* Global Search Bar */}
         <div className="relative max-w-md w-full">
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-primary transition-colors" />
                <input 
                    type="text" 
                    placeholder="Search..."
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
                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/40"><UserIcon className="w-4 h-4" /></div>
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
      
      <div className="flex items-center gap-4">
        {/* Navigation - Dynamic based on group selection? */}
        <nav className="hidden lg:flex items-center gap-6 mr-6">
            <Link href="/dashboard/shopping" className="text-white/50 hover:text-white text-xs font-medium transition-colors">Shopping</Link>
            <Link href="/dashboard/meal-plan" className="text-white/50 hover:text-white text-xs font-medium transition-colors">Meal Plan</Link>
            <Link href="/cooking" className="text-white/50 hover:text-white text-xs font-medium transition-colors">Cooking</Link>
        </nav>

        {/* Action Icons */}
        <div className="flex items-center gap-3">
            <PWAInstallPrompt />
            
            {/* Notifications */}
            <div className="relative">
                <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center transition-all ${showNotifications ? 'bg-primary/20 text-primary' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}
                >
                    <Bell className="w-4 h-4 md:w-5 md:h-5" />
                    {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse border-2 border-[#161724]"></span>}
                </button>
                
                <AnimatePresence>
                    {showNotifications && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="absolute right-0 top-full mt-2 w-80 glass-panel p-4 shadow-2xl z-50 overflow-hidden"
                        >
                            <h3 className="text-sm font-bold text-white mb-4">Notifications</h3>
                            <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                                {notifications.length === 0 ? (
                                    <div className="text-center py-8 text-white/40 text-xs">No notifications yet</div>
                                ) : (
                                    notifications.map(n => (
                                        <div key={n.id} className="p-2 rounded-lg hover:bg-white/5 transition-colors border-l-2 border-primary/20">
                                            <p className="text-xs text-white/80 leading-relaxed">{n.message}</p>
                                            <span className="text-[10px] text-white/30 mt-1 block">Just now</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <button className="md:hidden text-white/70 hover:text-white transition-colors ml-2" onClick={() => setSidebarOpen(!isSidebarOpen)}>
                 {isSidebarOpen ? <X className="w-6 h-6"/> : <Menu className="w-6 h-6"/>}
            </button>
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
