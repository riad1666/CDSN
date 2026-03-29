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
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      <section>
          <div className="flex items-center gap-4 mb-6">
            <Link href="/dashboard" className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0">
               <ArrowLeft className="w-5 h-5 text-white" />
            </Link>
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                  <Wallet className="w-5 h-5 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Unified Wallet</h2>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-8 bg-linear-to-br from-primary/20 to-transparent border-primary/20"
              >
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2">Net Balance</p>
                  <h3 className={`text-4xl font-black tracking-tighter ${personalReceive - personalOwe >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ₩{Math.round(personalReceive - personalOwe).toLocaleString()}
                  </h3>
                  <p className="text-[10px] text-white/30 mt-4 leading-relaxed font-medium">Combined total from all personal trades and group activities.</p>
              </motion.div>

              <div className="glass-panel p-6 flex flex-col justify-between">
                  <div>
                      <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">Total to Receive</p>
                      <h4 className="text-2xl font-bold text-emerald-400 tracking-tight">₩{Math.round(personalReceive).toLocaleString()}</h4>
                  </div>
                  <div className="flex items-center gap-2 mt-4 text-[10px] font-bold text-emerald-400/50 uppercase tracking-widest">
                      <TrendingUp className="w-3 h-3" /> UP 12% THIS MONTH
                  </div>
              </div>

              <div className="glass-panel p-6 flex flex-col justify-between">
                  <div>
                      <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">Total to Owe</p>
                      <h4 className="text-2xl font-bold text-rose-400 tracking-tight">₩{Math.round(personalOwe).toLocaleString()}</h4>
                  </div>
                  <div className="flex items-center gap-2 mt-4 text-[10px] font-bold text-rose-500/50 uppercase tracking-widest">
                      <TrendingDown className="w-3 h-3" /> DOWN 5% THIS MONTH
                  </div>
              </div>
          </div>
      </section>

      <section>
          <div className="flex items-center justify-between mb-6">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Personal Trades</h2>
              </div>
              <button 
                onClick={() => setTradeModalOpen(true)}
                className="glass-button text-xs py-2.5 px-6 flex items-center gap-2"
              >
                  <Plus className="w-4 h-4" /> Start New Trade
              </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trades.length === 0 ? (
                  <div className="col-span-2 glass-panel p-16 text-center border-dashed border-white/10">
                      <p className="text-white/30 text-sm font-medium">No active 1-to-1 trades. Use the search to find users and start a private trade.</p>
                  </div>
              ) : (
                  trades.map(trade => {
                      const otherUid = trade.participants.find(uid => uid !== userData?.uid);
                      const otherUser = otherUid ? usersMap[otherUid] : null;
                      const unread = unreadCounts[trade.id] || 0;

                      return (
                          <motion.div 
                              key={trade.id}
                              whileHover={{ scale: 1.01 }}
                              className="glass-panel p-6 flex items-center justify-between cursor-pointer group hover:border-primary/30 transition-all border-white/5"
                          >
                              <div className="flex items-center gap-4">
                                  <div className="relative">
                                      {otherUser?.profileImage ? (
                                          <img src={otherUser.profileImage} className="w-12 h-12 rounded-full object-cover border-2 border-white/5" />
                                      ) : (
                                          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/20">
                                              <User className="w-6 h-6" />
                                          </div>
                                      )}
                                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#161724] ${trade.totalBalance >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                  </div>
                                  <div>
                                      <h4 className="text-white font-bold text-sm tracking-tight">{otherUser?.name || "Unknown User"}</h4>
                                      <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-0.5">
                                          {trade.totalBalance >= 0 ? 'Owes You' : 'You Owe'}
                                      </p>
                                  </div>
                              </div>
                              <div className="flex items-center gap-6">
                                  <div className="text-right">
                                      <div className={`text-lg font-black tracking-tighter ${trade.totalBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                          ₩{Math.round(Math.abs(trade.totalBalance)).toLocaleString()}
                                      </div>
                                      <p className="text-[10px] text-white/20 mt-1 font-bold">LAST: {trade.lastActivity ? format(new Date(trade.lastActivity), "MMM dd") : "N/A"}</p>
                                  </div>
                                  <button 
                                    onClick={() => setActiveChat({ id: trade.id, name: otherUser?.name || "Chat" })}
                                    className="p-3 rounded-xl bg-white/5 text-white/30 hover:bg-primary/20 hover:text-primary transition-all relative"
                                  >
                                      <MessageSquare className="w-5 h-5" />
                                      {unread > 0 && (
                                          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-[#161724]">
                                              {unread}
                                          </span>
                                      )}
                                  </button>
                              </div>
                          </motion.div>
                      );
                  })
              )}
          </div>
      </section>

      <section className="glass-panel p-8">
          <div className="flex items-center gap-3 mb-8">
              <History className="w-5 h-5 text-indigo-400" />
              <h3 className="text-lg font-bold text-white tracking-tight">Recent Private Transactions</h3>
          </div>
          <div className="space-y-6">
              <div className="text-center py-12 text-white/20 text-xs font-bold uppercase tracking-[0.2em] border-y border-white/5">
                  End of Transaction History
              </div>
          </div>
      </section>

      <TradeSearchModal 
        isOpen={isTradeModalOpen} 
        onClose={() => setTradeModalOpen(false)} 
      />

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
