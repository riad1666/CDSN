"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShoppingCart, ChefHat, LogOut, LayoutDashboard, Shield, Menu, X, Search, Bell, User as UserIcon, Loader2, MessageSquare } from "lucide-react";
import PWAInstallPrompt from "./PWAInstallPrompt";
import { useAuth } from "@/context/AuthContext";
import { logoutUser } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase/config";
import { collection, query, orderBy, limit, onSnapshot, where } from "firebase/firestore";
import { searchUsersByStudentId, UserBasicInfo, AppNotification, subscribeToNotifications } from "@/lib/firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { GroupInviteModal } from "./GroupInviteModal";
import { ChatDrawer } from "./ChatDrawer";
import { subscribeToMessages, markChatAsRead, ChatMessage, subscribeToAllUnread } from "@/lib/firebase/firestore";

export function UserHeader() {
  const { userData, setSidebarOpen, isSidebarOpen } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserBasicInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteUser, setInviteUser] = useState<UserBasicInfo | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!userData) return;
    
    // Listen to notifications
    const unsubNotify = subscribeToNotifications(userData.uid, (data) => setNotifications(data));

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

  // Unread messages logic
  useEffect(() => {
    if (!userData?.uid || !userData.currentGroupId) return;

    const unsubChat = subscribeToAllUnread(userData.uid, [userData.currentGroupId], (counts) => {
        setUnreadMessages(counts[userData.currentGroupId!] || 0);
    });
    return () => unsubChat();
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

  const unreadCount = notifications.filter(n => n.status === "unread").length;

  return (
    <header className="glass-panel rounded-none border-x-0 border-t-0 border-b border-white/5 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between sticky top-0 z-40 bg-[#161724]/80 backdrop-blur-md">
      <div className="flex items-center gap-4 md:gap-8 flex-1">
         <img src="/logo.png" alt="CDS Logo" className="w-8 h-8 md:w-10 md:h-10 object-contain" />
         
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
        <nav className="hidden lg:flex items-center gap-6 mr-6">
            <Link href="/dashboard" className="text-white/50 hover:text-white text-xs font-medium transition-colors">Dashboard</Link>
            <Link href="/dashboard/shopping" className="text-white/50 hover:text-white text-xs font-medium transition-colors">Shopping</Link>
            <Link href="/dashboard/meal-plan" className="text-white/50 hover:text-white text-xs font-medium transition-colors">Meal Plan</Link>
        </nav>

        <div className="flex items-center gap-3">
            <PWAInstallPrompt />
            
            <div className="relative">
                <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center transition-all ${showNotifications ? 'bg-primary/20 text-primary' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}
                >
                    <Bell className="w-4 h-4 md:w-5 md:h-5" />
                    {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse border-2 border-[#161724]"></span>}
                </button>
            </div>

            {userData?.currentGroupId && (
                <button 
                    onClick={() => setIsChatOpen(true)}
                    className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all group relative"
                >
                    <MessageSquare className="w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:scale-110" />
                    {unreadMessages > 0 && (
                        <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-bounce border-2 border-[#161724]">
                            {unreadMessages}
                        </span>
                    )}
                </button>
            )}

            <button className="md:hidden text-white/70 hover:text-white transition-colors ml-2" onClick={() => setSidebarOpen(!isSidebarOpen)}>
                 {isSidebarOpen ? <X className="w-6 h-6"/> : <Menu className="w-6 h-6"/>}
            </button>
        </div>
      </div>

      <ChatDrawer 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        chatId={userData?.currentGroupId || ""} 
        chatName="Group Discussion" 
        type="group" 
      />

      <GroupInviteModal 
        isOpen={isInviteOpen} 
        onClose={() => setIsInviteOpen(false)} 
        targetUser={inviteUser} 
      />
    </header>
  );
}
