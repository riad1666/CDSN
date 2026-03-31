"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState, Suspense } from "react";
import { User, DollarSign, ArrowUpRight, ArrowDownLeft, Search, Plus, Wallet, TrendingUp, TrendingDown, History, Loader2, ArrowLeft, MessageSquare } from "lucide-react";
import { PersonalTrade, subscribeToPersonalTrades, UserBasicInfo, getApprovedUsers, findOrCreatePersonalTrade, subscribeToMessages, subscribeToAllUnread } from "@/lib/firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useSearchParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import { useCurrency } from "@/context/CurrencyContext";

import { TradeSearchModal } from "@/components/TradeSearchModal";
import { ChatDrawer } from "@/components/ChatDrawer";

export default function PersonalDashboard() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center text-white/30 text-sm">Loading...</div>}>
      <PersonalDashboardContent />
    </Suspense>
  );
}

function PersonalDashboardContent() {
  const { userData } = useAuth();
  const { formatPrice } = useCurrency();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [trades, setTrades] = useState<PersonalTrade[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, UserBasicInfo>>({});
  const [isTradeModalOpen, setTradeModalOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  
  const [activeChat, setActiveChat] = useState<{ id: string; name: string } | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!userData?.uid) return;

    const unsub = subscribeToPersonalTrades(userData.uid, (data) => setTrades(data));
    
    getApprovedUsers().then(list => {
      const map: Record<string, UserBasicInfo> = {};
      list.forEach(u => map[u.uid] = u);
      setUsersMap(map);
    });

    const tradeWith = searchParams.get("trade");
    if (tradeWith && tradeWith !== userData.uid) {
        setIsInitializing(true);
        findOrCreatePersonalTrade(userData.uid, tradeWith)
            .then(() => {
                toast.success("Trade session initialized");
                const params = new URLSearchParams(searchParams.toString());
                params.delete("trade");
                router.replace(`/personal?${params.toString()}`);
            })
            .catch(() => toast.error("Failed to start trade"))
            .finally(() => setIsInitializing(false));
    }

    return () => unsub();
  }, [userData?.uid, searchParams, router]);

  // Handle unread counts for all trades
  useEffect(() => {
    if (!userData?.uid || trades.length === 0) return;

    const unreadUnsub = subscribeToAllUnread(userData.uid, trades.map(t => t.id), (counts) => {
        setUnreadCounts(counts);
    });

    return () => unreadUnsub();
  }, [userData?.uid, trades]);

  const personalOwe = trades.filter(t => t.totalBalance < 0).reduce((acc, t) => acc + Math.abs(t.totalBalance), 0);
  const personalReceive = trades.filter(t => t.totalBalance > 0).reduce((acc, t) => acc + t.totalBalance, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* 1. Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter italic uppercase flex items-center gap-3">
             Personal Wallet
          </h1>
          <p className="text-white/40 font-medium text-sm md:text-base">
            Manage your 1-to-1 trades and private transactions
          </p>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={() => setTradeModalOpen(true)}
             className="px-8 py-3.5 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
           >
             <Plus className="w-4 h-4" /> Start New Trade
           </button>
        </div>
      </div>

      {/* 2. Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card rounded-[2.5rem] p-8 flex flex-col items-center text-center space-y-4 border-primary/20 bg-primary/5">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Net Balance</div>
              <div className={`text-3xl font-black tracking-tighter italic ${personalReceive - personalOwe >= 0 ? 'text-success' : 'text-destructive'}`}>
                {((personalReceive - personalOwe) >= 0 ? '+' : '-')}{formatPrice(Math.abs(personalReceive - personalOwe))}
              </div>
            </div>
        </div>

        <div className="glass-card rounded-[2.5rem] p-8 flex flex-col items-center text-center space-y-4 hover:border-success/30 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-success/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-success" />
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">To Receive</div>
              <div className="text-3xl font-black text-success tracking-tighter italic">{formatPrice(personalReceive)}</div>
            </div>
        </div>

        <div className="glass-card rounded-[2.5rem] p-8 flex flex-col items-center text-center space-y-4 hover:border-destructive/30 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-destructive/20 flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-destructive" />
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">To Owe</div>
              <div className="text-3xl font-black text-destructive tracking-tighter italic">{formatPrice(personalOwe)}</div>
            </div>
        </div>

        <div className="glass-card rounded-[2.5rem] p-8 flex flex-col items-center text-center space-y-4 hover:border-info/30 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-info/20 flex items-center justify-center">
              <History className="w-6 h-6 text-info" />
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Active Trades</div>
              <div className="text-3xl font-black text-white tracking-tighter italic">{trades.length} Contacts</div>
            </div>
        </div>
      </div>

      {/* 3. Main Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Contact List */}
        <div className="lg:col-span-2 space-y-6">
           <div className="flex items-center justify-between px-2">
             <h2 className="text-2xl font-black text-white tracking-tight italic uppercase">Trade Contacts</h2>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trades.length === 0 ? (
                <div className="col-span-2 glass-card rounded-[2.5rem] p-20 text-center border-dashed border-white/10">
                   <p className="text-white/20 font-black uppercase tracking-widest">No active trade contacts</p>
                </div>
              ) : (
                trades.map((trade, i) => {
                  const otherUid = trade.participants.find(uid => uid !== userData?.uid);
                  const otherUser = otherUid ? usersMap[otherUid] : null;
                  const unread = unreadCounts[trade.id] || 0;
                  
                  return (
                    <motion.div 
                        key={trade.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="glass-card rounded-[2rem] p-6 hover:border-primary/40 transition-all group relative overflow-hidden"
                    >
                      {/* Gradient Backglow */}
                      <div className={`absolute -top-10 -right-10 w-24 h-24 blur-[60px] opacity-20 transition-opacity group-hover:opacity-40 ${trade.totalBalance >= 0 ? 'bg-success' : 'bg-destructive'}`}></div>

                      <div className="flex items-start justify-between relative z-10">
                         <div className="flex items-center gap-4">
                            <div className="relative">
                               {otherUser?.profileImage ? (
                                 <img src={otherUser.profileImage} className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white/5 group-hover:ring-primary/40 transition-all" />
                               ) : (
                                 <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white/20 font-black text-xl italic uppercase">
                                    {otherUser?.name?.substring(0, 2) || '??'}
                                 </div>
                               )}
                               <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0a0b14] ${trade.totalBalance >= 0 ? 'bg-success' : 'bg-destructive'}`}></div>
                            </div>
                            <div>
                               <h4 className="text-white font-black text-base tracking-tight uppercase leading-none mb-1">{otherUser?.name || 'Unknown'}</h4>
                               <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest flex items-center gap-2">
                                  ROOM {otherUser?.room || 'N/A'} • {trade.id.substring(0, 6)}
                               </div>
                            </div>
                         </div>
                         <button 
                            onClick={(e) => { e.stopPropagation(); setActiveChat({ id: trade.id, name: otherUser?.name || "Chat" }); }}
                            className="p-3 rounded-xl bg-white/5 text-white/30 hover:bg-primary/20 hover:text-white transition-all relative"
                         >
                            <MessageSquare className="w-5 h-5" />
                            {unread > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-[8px] font-black flex items-center justify-center border-2 border-[#0a0b14]">{unread}</span>}
                         </button>
                      </div>

                      <div className="mt-8 flex items-end justify-between relative z-10">
                         <div className="space-y-1">
                            <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Balance Status</div>
                            <div className={`text-2xl font-black tracking-tighter italic ${trade.totalBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                               {trade.totalBalance >= 0 ? '+' : '-'}{formatPrice(Math.abs(trade.totalBalance))}
                            </div>
                         </div>
                         <div className="text-right">
                           <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Last Activity</div>
                           <div className="text-[11px] font-bold text-white/40">{trade.lastActivity ? format(new Date(trade.lastActivity), "MMM dd, yyyy") : "No activity"}</div>
                         </div>
                      </div>
                    </motion.div>
                  )
                })
              )}
           </div>
        </div>

        {/* Right: History Summary */}
        <div className="space-y-6">
           <div className="flex items-center justify-between px-2">
             <h2 className="text-2xl font-black text-white tracking-tight italic uppercase">Recent History</h2>
           </div>

           <div className="glass-card rounded-[3rem] p-8 min-h-[400px] flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center">
                 <History className="w-8 h-8 text-white/10" />
              </div>
              <div>
                 <p className="text-sm font-black text-white/20 uppercase tracking-[0.2em]">Transaction Log</p>
                 <p className="text-[10px] text-white/10 italic mt-1 leading-relaxed">System is up to date.<br/>Latest trades are listed on individual contact cards.</p>
              </div>
           </div>
        </div>
      </div>

      <TradeSearchModal isOpen={isTradeModalOpen} onClose={() => setTradeModalOpen(false)} />
      <ChatDrawer 
        isOpen={!!activeChat}
        onClose={() => setActiveChat(null)}
        chatId={activeChat?.id || ""}
        chatName={activeChat?.name || ""}
        type="private"
      />
    </div>
  );
}

