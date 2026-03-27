"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Bell, TrendingUp, TrendingDown, DollarSign, User as UserIcon, Plus, Lock, ChefHat, LayoutGrid, Users } from "lucide-react";
import { subscribeToNotices, subscribeToExpenses, subscribeToSettlements, getApprovedUsers, Notice, Expense, Settlement, UserBasicInfo } from "@/lib/firebase/firestore";
import { format } from "date-fns";
import Link from "next/link";
import { doc, updateDoc, collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { motion, AnimatePresence } from "framer-motion";

import { AddExpenseModal } from "@/components/AddExpenseModal";
import { SettlePaymentModal } from "@/components/SettlePaymentModal";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";

export default function DashboardPage() {
  const { userData } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, UserBasicInfo>>({});
  const [balanceTab, setBalanceTab] = useState<'receive' | 'owe'>('receive');
  const [isExpenseOpen, setExpenseOpen] = useState(false);
  const [isSettleOpen, setSettleOpen] = useState(false);
  const [isPasswordOpen, setPasswordOpen] = useState(false);
  const [cookingDate, setCookingDate] = useState<string | null>(null);
  const [personalBalance, setPersonalBalance] = useState(0);
  const [quickSettleUser, setQuickSettleUser] = useState<string | null>(null);

  useEffect(() => {
    if (!userData?.currentGroupId) return;

    const unsubNotices = subscribeToNotices((data) => setNotices(data), userData.currentGroupId);
    const unsubExpenses = subscribeToExpenses((data) => setExpenses(data), userData.currentGroupId);
    const unsubSettlements = subscribeToSettlements((data) => setSettlements(data), userData.currentGroupId);
    
    getApprovedUsers().then(list => {
      const map: Record<string, UserBasicInfo> = {};
      list.forEach(u => map[u.uid] = u);
      setUsersMap(map);
    });

    let unsubCooking: () => void = () => {};
    const pq = query(
        collection(db, "cookingSchedules"), 
        where("groupId", "==", userData.currentGroupId),
        where("assignedUser", "==", userData.uid)
    );
    unsubCooking = onSnapshot(pq, (snap) => {
        const upcoming = snap.docs
          .map(d => d.data())
          .filter(data => !data.isDeleted)
          .map(data => data.date)
          .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
          .find(d => new Date(d) >= new Date(new Date().setHours(0,0,0,0)));
        setCookingDate(upcoming || null);
    });

    // Subscribe to personal trades for Unified Wallet
    const unsubPersonal = onSnapshot(
      query(collection(db, "personalTrades"), where("participants", "array-contains", userData.uid)),
      (snap) => {
        let bal = 0;
        snap.docs.forEach(doc => {
          const data = doc.data();
          const balances = data.balances || {};
          const myBal = balances[userData.uid] || 0;
          bal += myBal;
        });
        setPersonalBalance(bal);
      }
    );

    return () => {
      unsubNotices();
      unsubExpenses();
      unsubSettlements();
      unsubCooking();
      unsubPersonal();
    };
  }, [userData?.uid, userData?.currentGroupId]);

  if (!userData?.currentGroupId) {
    return (
        <div className="h-[80vh] flex flex-col items-center justify-center text-center px-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-panel p-12 max-w-lg w-full"
            >
                <div className="w-20 h-20 rounded-3xl bg-primary/20 flex items-center justify-center mx-auto mb-6">
                    <LayoutGrid className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">Welcome to CDS</h2>
                <p className="text-white/60 mb-8 leading-relaxed">
                    You are not currently viewing any group. Please create a new group or join an existing one using an invite code from the sidebar.
                </p>
                <div className="grid grid-cols-2 gap-4">
                    <button className="glass-button text-sm py-3">Create Group</button>
                    <button className="glass-button-secondary text-sm py-3 bg-white/5 border border-white/10">Join Group</button>
                </div>
            </motion.div>
        </div>
    );
  }

  let totalSpent = 0;
  let groupSpent = 0;
  const balances: Record<string, number> = {};

  expenses.forEach(exp => {
    groupSpent += exp.amount;
    const share = exp.amount / (exp.splitBetween.length || 1);
    const iAmInvolved = exp.splitBetween.includes(userData.uid);
    const iPaid = exp.paidBy === userData.uid;

    if (iAmInvolved) totalSpent += share;

    if (iPaid) {
      exp.splitBetween.forEach(uid => {
        if (uid !== userData.uid) balances[uid] = (balances[uid] || 0) + share;
      });
    } else if (iAmInvolved) {
      balances[exp.paidBy] = (balances[exp.paidBy] || 0) - share;
    }
  });

  settlements.filter(s => s.status === "accepted").forEach(s => {
    if (s.fromUser === userData.uid) {
      balances[s.toUser] = (balances[s.toUser] || 0) + s.amount;
    } else if (s.toUser === userData.uid) {
      balances[s.fromUser] = (balances[s.fromUser] || 0) - s.amount;
    }
  });

  let totalReceive = 0;
  let totalOwe = 0;
  Object.values(balances).forEach(bal => {
    if (bal > 0) totalReceive += bal;
    if (bal < 0) totalOwe += Math.abs(bal);
  });

  const receiveList = Object.entries(balances).filter(([uid, amt]) => amt > 0).map(([uid, amt]) => ({uid, amount: amt}));
  const oweList = Object.entries(balances).filter(([uid, amt]) => amt < 0).map(([uid, amt]) => ({uid, amount: Math.abs(amt)}));
  const displayList = balanceTab === 'receive' ? receiveList : oweList;

  const smartTip = balanceTab === 'owe' && oweList.length > 0 
    ? oweList.sort((a,b) => b.amount - a.amount)[0]
    : null;

  const activityList = [
    ...expenses.map(e => ({ type: 'expense', date: e.date, data: e as any })),
    ...settlements.map(s => ({ type: 'settlement', date: s.date, data: s as any }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
   .slice(0, 5);

  const getNoticeTheme = (type: string) => {
    switch (type) {
      case "IMPORTANT": return { bg: "bg-rose-500/10", border: "border-rose-500/30", tag: "bg-rose-500", text: "text-rose-400" };
      case "WARNING": return { bg: "bg-orange-500/10", border: "border-orange-500/30", tag: "bg-orange-500", text: "text-orange-400" };
      default: return { bg: "bg-blue-500/10", border: "border-blue-500/30", tag: "bg-blue-500", text: "text-blue-400" };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Group Dashboard</h2>
          </div>
          <div className="flex gap-3">
              <button onClick={() => setExpenseOpen(true)} className="glass-button text-xs px-4 py-2">
                <Plus className="w-4 h-4" /> Add Expense
              </button>
              <button onClick={() => setSettleOpen(true)} className="glass-button-secondary text-xs px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10">
                <DollarSign className="w-4 h-4" /> Settle All
              </button>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
         {cookingDate && (
            <div className={`p-5 rounded-2xl border border-orange-500/30 bg-orange-500/10 backdrop-blur-md`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full text-white uppercase tracking-wide bg-orange-500`}>
                  YOUR COOKING DUTY
                </span>
                <span className="text-xs text-white/50">
                  {cookingDate}
                </span>
              </div>
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2"><ChefHat className="w-5 h-5 text-orange-400"/> Reminder</h3>
              <p className="text-sm text-white/70 leading-relaxed">You are scheduled for cooking duty on {format(new Date(cookingDate), "EEEE, MMMM do")}. Please be prepared!</p>
            </div>
         )}
         
         {notices.length === 0 && !cookingDate && <div className="col-span-3 text-white/40 text-sm p-8 text-center glass-panel border-dashed">No active notices for this group.</div>}
         {notices.map(notice => {
            const theme = getNoticeTheme(notice.type);
            return (
              <div key={notice.id} className={`p-5 rounded-2xl border ${theme.border} ${theme.bg} backdrop-blur-md`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full text-white uppercase tracking-wide ${theme.tag}`}>
                    {notice.type}
                  </span>
                  <span className="text-xs text-white/50">
                    {notice.createdAt ? format(new Date(notice.createdAt), "yyyy-MM-dd") : ""}
                  </span>
                </div>
                <h3 className="text-white font-semibold mb-2">{notice.title}</h3>
                <p className="text-sm text-white/70 leading-relaxed">{notice.message}</p>
              </div>
            )
         })}
      </div>

      {/* Pending Settlement Requests */}
      {settlements.filter(s => s.toUser === userData?.uid && s.status === 'pending').length > 0 && (
        <div className="mb-8 space-y-3">
          <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
            Pending Settlements
          </h3>
          {settlements.filter(s => s.toUser === userData?.uid && s.status === 'pending').map(req => (
            <div key={req.id} className="glass-card border-orange-500/30 bg-orange-500/5 p-4 flex items-center justify-between">
              <div className="text-sm">
                 <span className="text-white font-semibold">{usersMap[req.fromUser]?.name || 'Someone'}</span> requested 
                 <span className="text-orange-400 font-bold ml-1">₩{Math.round(req.amount).toLocaleString()}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => updateDoc(doc(db, 'settlements', req.id), { status: 'accepted' })} className="px-4 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-xs font-semibold transition-colors">Accept</button>
                <button onClick={() => updateDoc(doc(db, 'settlements', req.id), { status: 'rejected' })} className="px-4 py-1.5 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 text-xs font-semibold transition-colors">Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-6 border-white/5 hover:border-white/10 transition-colors">
          <div className="flex items-center gap-3 mb-2 text-white/40 uppercase tracking-widest text-[10px] font-bold">
            <TrendingUp className="w-3 h-3 text-primary" />
            <span>Personal Spent</span>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">₩{Math.round(totalSpent).toLocaleString()}</div>
        </div>

        <div className="glass-panel p-6 border-white/5 hover:border-white/10 transition-colors border-l-primary/30">
          <div className="flex items-center gap-3 mb-2 text-white/40 uppercase tracking-widest text-[10px] font-bold">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span>To Receive</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400 tracking-tight">₩{Math.round(totalReceive).toLocaleString()}</div>
        </div>

        <div className="glass-panel p-6 border-white/5 hover:border-white/10 transition-colors border-l-rose-500/30">
           <div className="flex items-center gap-3 mb-2 text-white/40 uppercase tracking-widest text-[10px] font-bold">
            <TrendingDown className="w-3 h-3 text-rose-400" />
            <span>To Owe</span>
          </div>
          <div className="text-2xl font-bold text-rose-400 tracking-tight">₩{Math.round(totalOwe).toLocaleString()}</div>
        </div>

        <div className="glass-panel p-6 border-white/5 hover:border-white/10 transition-colors border-t-indigo-500/50">
           <div className="flex items-center gap-3 mb-2 text-white/40 uppercase tracking-widest text-[10px] font-bold">
            <LayoutGrid className="w-3 h-3 text-indigo-400" />
            <span>Unified Wallet</span>
          </div>
          <div className="text-2xl font-black text-white tracking-tight italic">
            ₩{Math.round((totalReceive - totalOwe) + personalBalance).toLocaleString()}
          </div>
          <p className="text-[9px] text-white/20 mt-1 uppercase font-bold tracking-widest">Group + Personal Trade</p>
        </div>
      </div>

      {/* Smart Tip */}
      {smartTip && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-4 bg-primary/5 border-primary/20 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
               <Bell className="w-4 h-4 text-primary" />
             </div>
             <p className="text-sm text-white/80">
               Smart Tip: You should settle with <span className="text-white font-bold">{usersMap[smartTip.uid]?.name}</span> first to clear ₩{Math.round(smartTip.amount).toLocaleString()}.
             </p>
          </div>
          <button 
            onClick={() => {
              setQuickSettleUser(smartTip.uid);
              setSettleOpen(true);
            }}
            className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
          >
            Settle Now
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
        {/* Balance Overview */}
        <div className="glass-panel p-6 lg:col-span-2 shadow-2xl shadow-black/20">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Member Balances
          </h3>
          
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 mb-6">
            <button 
               className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${balanceTab === 'receive' ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
               onClick={() => setBalanceTab('receive')}
            >
              RECEIVE ({receiveList.length})
            </button>
            <button 
               className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${balanceTab === 'owe' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
               onClick={() => setBalanceTab('owe')}
            >
              OWE ({oweList.length})
            </button>
          </div>

          <div className="space-y-3">
            {displayList.length === 0 && (
              <div className="text-center text-white/20 py-12 text-sm">No active balances in this category.</div>
            )}
            {displayList.map(item => (
              <div key={item.uid} className="hover:bg-white/5 border border-white/5 rounded-2xl transition-all p-4 flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {usersMap[item.uid]?.profileImage ? (
                      <img src={usersMap[item.uid].profileImage} alt={usersMap[item.uid].name} className="w-12 h-12 rounded-full object-cover border-2 border-white/5 group-hover:border-primary transition-all" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/40">
                        <UserIcon className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">
                      {usersMap[item.uid]?.name || "Unknown User"}
                    </div>
                    <div className="text-white/30 text-[10px] mt-0.5 tracking-wide">ROOM {usersMap[item.uid]?.room || "N/A"}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold text-lg tracking-tight ${balanceTab === 'receive' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ₩{Math.round(item.amount).toLocaleString()}
                  </div>
                  {balanceTab === 'owe' && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuickSettleUser(item.uid);
                        setSettleOpen(true);
                      }}
                      className="mt-1 flex items-center gap-1.5 text-[9px] font-black text-rose-500/60 uppercase tracking-widest transition-all hover:text-rose-400"
                    >
                      <DollarSign className="w-3 h-3" /> Quick Settle
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: Recent Activity */}
        <div className="space-y-6">
          <div className="glass-panel p-6 flex-1 min-h-[400px]">
            <h3 className="text-sm font-bold text-white/40 mb-6 uppercase tracking-widest border-b border-white/5 pb-4">Activity Stream</h3>
            {activityList.length === 0 ? (
               <div className="text-center text-white/20 text-sm py-8">No recent activity.</div>
            ) : (
               <div className="space-y-6">
                 {activityList.map((act, index) => (
                   <div key={index} className="flex gap-4 group">
                     <div className="relative mt-1 flex flex-col items-center">
                       <div className={`w-2 h-2 rounded-full ${act.type === 'expense' ? 'bg-primary' : 'bg-orange-400'}`}></div>
                       {index !== activityList.length - 1 && <div className="w-px h-full bg-white/5 my-2"></div>}
                     </div>
                     <div className="flex-1 pb-4 border-b border-white/2">
                       {act.type === 'expense' ? (
                          <>
                             <p className="text-xs text-white/80 leading-relaxed">
                                <span className="text-primary font-bold mr-1">{usersMap[act.data.paidBy]?.name || 'Someone'}</span>
                                paid <span className="text-white font-bold">₩{Math.round(act.data.amount).toLocaleString()}</span>
                                <span className="text-white/40 ml-1">for {act.data.title}</span>
                             </p>
                             <p className="text-[10px] text-white/20 mt-1 uppercase font-bold">{format(new Date(act.date), "MMM dd")} • EXPENSE</p>
                          </>
                       ) : (
                          <>
                             <p className="text-xs text-white/80 leading-relaxed">
                                <span className="text-orange-400 font-bold mr-1">{usersMap[act.data.fromUser]?.name || 'Someone'}</span>
                                {act.data.status === 'pending' ? 'requested' : act.data.status === 'accepted' ? 'settled' : 'rejected'}
                                <span className="ml-1 text-white font-bold">₩{Math.round(act.data.amount).toLocaleString()}</span>
                             </p>
                             <p className="text-[10px] text-white/20 mt-1 uppercase font-bold">{format(new Date(act.date), "MMM dd")} • SETTLEMENT</p>
                          </>
                       )}
                     </div>
                   </div>
                 ))}
               </div>
            )}
            <button onClick={() => setPasswordOpen(true)} className="w-full mt-8 py-3 rounded-xl bg-white/5 border border-white/5 text-[10px] font-bold text-white/40 hover:bg-white/10 hover:text-white transition-all uppercase tracking-widest">
              Security Settings
            </button>
          </div>
        </div>
      </div>
      
      <AddExpenseModal isOpen={isExpenseOpen} onClose={() => setExpenseOpen(false)} />
      <SettlePaymentModal 
        isOpen={isSettleOpen} 
        onClose={() => { setSettleOpen(false); setQuickSettleUser(null); }} 
        targetUserId={quickSettleUser || undefined}
      />
      <ChangePasswordModal isOpen={isPasswordOpen} onClose={() => setPasswordOpen(false)} />
    </div>
  );
}
