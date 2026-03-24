"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Bell, TrendingUp, TrendingDown, DollarSign, User as UserIcon, Plus } from "lucide-react";
import { subscribeToNotices, subscribeToExpenses, subscribeToSettlements, getApprovedUsers, Notice, Expense, Settlement, UserBasicInfo } from "@/lib/firebase/firestore";
import { format } from "date-fns";
import Link from "next/link";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

import { AddExpenseModal } from "@/components/AddExpenseModal";
import { SettlePaymentModal } from "@/components/SettlePaymentModal";

export default function DashboardPage() {
  const { userData } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, UserBasicInfo>>({});
  const [balanceTab, setBalanceTab] = useState<'receive' | 'owe'>('receive');
  const [isExpenseOpen, setExpenseOpen] = useState(false);
  const [isSettleOpen, setSettleOpen] = useState(false);

  useEffect(() => {
    const unsubNotices = subscribeToNotices((data) => setNotices(data));
    const unsubExpenses = subscribeToExpenses((data) => setExpenses(data));
    const unsubSettlements = subscribeToSettlements((data) => setSettlements(data));
    
    getApprovedUsers().then(list => {
      const map: Record<string, UserBasicInfo> = {};
      list.forEach(u => map[u.uid] = u);
      setUsersMap(map);
    });

    return () => {
      unsubNotices();
      unsubExpenses();
      unsubSettlements();
    };
  }, []);

  let totalSpent = 0;
  let groupSpent = 0;
  const balances: Record<string, number> = {};

  if (userData) {
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
  }

  let totalReceive = 0;
  let totalOwe = 0;
  Object.values(balances).forEach(bal => {
    if (bal > 0) totalReceive += bal;
    if (bal < 0) totalOwe += Math.abs(bal);
  });

  const receiveList = Object.entries(balances).filter(([uid, amt]) => amt > 0).map(([uid, amt]) => ({uid, amount: amt}));
  const oweList = Object.entries(balances).filter(([uid, amt]) => amt < 0).map(([uid, amt]) => ({uid, amount: Math.abs(amt)}));
  const displayList = balanceTab === 'receive' ? receiveList : oweList;

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
      {/* Notice Board */} 
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[#232048] flex items-center justify-center">
          <Bell className="w-5 h-5 text-indigo-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Notice Board</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
         {notices.length === 0 && <div className="col-span-3 text-white/40 text-sm">No active notices at the moment.</div>}
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

      {/* Pending Settlement Requests directed to the current user */}
      {settlements.filter(s => s.toUser === userData?.uid && s.status === 'pending').length > 0 && (
        <div className="mb-8 space-y-3">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
            Pending Settlement Requests
          </h3>
          {settlements.filter(s => s.toUser === userData?.uid && s.status === 'pending').map(req => (
            <div key={req.id} className="glass-card border-orange-500/30 bg-orange-500/5 p-4 flex items-center justify-between">
              <div>
                 <span className="text-white font-semibold">{usersMap[req.fromUser]?.name || 'Someone'}</span> requested 
                 <span className="text-orange-400 font-bold ml-1">₩{Math.round(req.amount).toLocaleString()}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => updateDoc(doc(db, 'settlements', req.id), { status: 'accepted' })} className="px-4 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-sm font-semibold transition-colors">Accept</button>
                <button onClick={() => updateDoc(doc(db, 'settlements', req.id), { status: 'rejected' })} className="px-4 py-1.5 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 text-sm font-semibold transition-colors">Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="text-white/60 text-sm font-medium">Total Spent</span>
          </div>
          <div className="text-2xl font-bold text-white">₩{Math.round(totalSpent).toLocaleString()}</div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-white/60 text-sm font-medium">You'll Receive</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400">₩{Math.round(totalReceive).toLocaleString()}</div>
        </div>

        <div className="glass-card p-6">
           <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-rose-400" />
            </div>
            <span className="text-white/60 text-sm font-medium">You Owe</span>
          </div>
          <div className="text-2xl font-bold text-rose-400">₩{Math.round(totalOwe).toLocaleString()}</div>
        </div>

        <div className="glass-card p-6">
           <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-white/60 text-sm font-medium">Total Group Spent</span>
          </div>
          <div className="text-2xl font-bold text-white">₩{Math.round(groupSpent).toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Balance Overview */}
        <div className="glass-panel p-6 lg:col-span-2">
          <h3 className="text-xl font-bold text-white mb-6">Balance Overview</h3>
          
          {/* Tabs */}
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 mb-6">
            <button 
               className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${balanceTab === 'receive' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-lg text-white' : 'text-white/50 hover:text-white'}`}
               onClick={() => setBalanceTab('receive')}
            >
              You'll Receive ({receiveList.length})
            </button>
            <button 
               className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${balanceTab === 'owe' ? 'bg-white/10 shadow-lg text-white' : 'text-white/50 hover:text-white'}`}
               onClick={() => setBalanceTab('owe')}
            >
              You Owe ({oweList.length})
            </button>
          </div>

          {/* List */}
          <div className="space-y-4">
            {displayList.length === 0 && (
              <div className="text-center text-white/40 py-12 text-sm">No active balances in this category.</div>
            )}
            {displayList.map(item => (
              <div key={item.uid} className="hover:bg-white/5 border border-white/5 rounded-2xl transition-all p-4 flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {usersMap[item.uid]?.profileImage ? (
                      <img src={usersMap[item.uid].profileImage} alt={usersMap[item.uid].name} className="w-12 h-12 rounded-full object-cover border-2 border-transparent group-hover:border-white/20 transition-all" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/40">
                        <UserIcon className="w-6 h-6" />
                      </div>
                    )}
                    <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#1a1b2e] ${balanceTab === 'receive' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                  </div>
                  <div>
                    <div className="text-white font-semibold flex items-center gap-2">
                      {usersMap[item.uid]?.name || "Unknown User"}
                    </div>
                    <div className="text-white/40 text-xs mt-0.5">Room {usersMap[item.uid]?.room || "N/A"}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold text-lg ${balanceTab === 'receive' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ₩{Math.round(item.amount).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-white/40 mt-1 uppercase tracking-wider group-hover:text-white/60 transition-colors">Click for details</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: Recent Activity Placeholder + Quick Actions */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
             <button onClick={() => setExpenseOpen(true)} className="glass-button w-full shadow-purple-900/20 text-md py-4">
               <Plus className="w-5 h-5" /> Add Expense
             </button>
             <button onClick={() => setSettleOpen(true)} className="glass-button-secondary bg-white/5 border border-white/10 w-full text-md py-4 shadow-none hover:bg-white/10">
               <Plus className="w-5 h-5" /> Settle Payment
             </button>
          </div>

          {/* Recent Activity Timeline Plugin */}
          <div className="glass-panel p-6 flex-1 min-h-[300px]">
            <h3 className="text-lg font-bold text-white mb-6 border-b border-white/10 pb-4">Recent Activity</h3>
            {activityList.length === 0 ? (
               <div className="text-center text-white/40 text-sm py-8">No recent activity.</div>
            ) : (
               <div className="space-y-5">
                 {activityList.map((act, index) => (
                   <div key={index} className="flex gap-4">
                     <div className="relative mt-1 flex flex-col items-center">
                       <div className={`w-2.5 h-2.5 rounded-full ${act.type === 'expense' ? 'bg-primary shadow-[0_0_8px_theme(colors.primary.DEFAULT)]' : 'bg-orange-400'}`}></div>
                       {index !== activityList.length - 1 && <div className="w-px h-full bg-white/10 my-1"></div>}
                     </div>
                     <div className="flex-1 pb-2">
                       {act.type === 'expense' ? (
                          <>
                             <p className="text-sm font-medium text-white">
                                <span className="text-white/60 mr-1">{usersMap[act.data.paidBy]?.name || 'Someone'} paid</span>
                                ₩{Math.round(act.data.amount).toLocaleString()}
                                <span className="text-white/60 ml-1">for {act.data.title}</span>
                             </p>
                             <p className="text-[10px] text-white/40 mt-1">{format(new Date(act.date), "MMM dd, yyyy")}</p>
                          </>
                       ) : (
                          <>
                             <p className="text-sm font-medium text-white">
                                <span className="text-white/60 mr-1">{usersMap[act.data.fromUser]?.name || 'Someone'}</span>
                                {act.data.status === 'pending' ? 'requested settlement of' : act.data.status === 'accepted' ? 'settled' : 'rejected'}
                                <span className="ml-1 font-bold">₩{Math.round(act.data.amount).toLocaleString()}</span>
                             </p>
                             <p className="text-[10px] text-white/40 mt-1">{format(new Date(act.date), "MMM dd, yyyy")}</p>
                          </>
                       )}
                     </div>
                   </div>
                 ))}
               </div>
            )}
          </div>
        </div>
      </div>
      
      <AddExpenseModal isOpen={isExpenseOpen} onClose={() => setExpenseOpen(false)} />
      <SettlePaymentModal isOpen={isSettleOpen} onClose={() => setSettleOpen(false)} />
    </div>
  );
}
