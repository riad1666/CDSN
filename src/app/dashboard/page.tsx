"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { Bell, TrendingUp, TrendingDown, DollarSign, User as UserIcon, Plus, Lock, ChefHat, LayoutGrid, Users, Loader2, Camera, Trash2, X, PlusCircle, ShoppingCart, ShieldCheck, Pencil, AlertTriangle } from "lucide-react";
import { subscribeToNotices, subscribeToExpenses, subscribeToSettlements, getApprovedUsers, Notice, Expense, Settlement, UserBasicInfo, Group, subscribeToUserGroups, updateGroupCoverPhoto, subscribeToAllUnread } from "@/lib/firebase/firestore";
import { format } from "date-fns";
import Link from "next/link";
import { doc, updateDoc, collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

import { AddExpenseModal } from "@/components/AddExpenseModal";
import { SettlePaymentModal } from "@/components/SettlePaymentModal";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { CreateNoticeModal } from "@/components/CreateNoticeModal";
import { CreateGroupModal } from "@/components/CreateGroupModal";
import { JoinGroupModal } from "@/components/JoinGroupModal";
import { updateGroupProfileImage } from "@/lib/firebase/firestore";
import { ChatDrawer } from "@/components/ChatDrawer";
import { MessageSquare } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";

export default function DashboardPage() {
  const { userData } = useAuth();
  const { formatPrice } = useCurrency();
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
  const [group, setGroup] = useState<Group | null>(null);
  const [isUpdatingCover, setIsUpdatingCover] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isNoticeOpen, setNoticeOpen] = useState(false);
  const [noticeToEdit, setNoticeToEdit] = useState<Notice | null>(null);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isJoinOpen, setJoinOpen] = useState(false);
  const [isChatOpen, setChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);

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

    // Subscribe to group data
    const unsubGroup = subscribeToUserGroups(userData.uid, (groups) => {
        const current = groups.find(g => g.id === userData.currentGroupId);
        if (current) setGroup(current);
    });

    // Subscribe to unread count
    const unsubUnread = subscribeToAllUnread(userData.uid, [userData.currentGroupId], (counts) => {
        setUnreadCount(counts[userData.currentGroupId!] || 0);
    });

    return () => {
      unsubNotices();
      unsubExpenses();
      unsubSettlements();
      unsubCooking();
      unsubPersonal();
      unsubGroup();
      unsubUnread();
    };
  }, [userData?.uid, userData?.currentGroupId]);

  const userRole = group?.memberRoles?.[userData?.uid || ""] || "member";
  const isAdmin = userRole === "admin" || userRole === "owner";

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userData?.currentGroupId) return;

    if (file.size > 1.5 * 1024 * 1024) { // Slightly larger for covers
        return toast.error("Cover image too large (max 1.5MB)");
    }

    setIsUpdatingCover(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
            await updateGroupCoverPhoto(userData.currentGroupId!, base64String);
            toast.success("Cover photo updated!");
        } catch (error) {
            toast.error("Failed to update cover photo");
        } finally {
            setIsUpdatingCover(false);
        }
    };
    reader.readAsDataURL(file);
  };

  const handleProfileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userData?.currentGroupId) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      setIsUpdatingProfile(true);
      try {
        await updateGroupProfileImage(userData.currentGroupId!, reader.result as string);
        toast.success("Group profile photo updated!");
      } catch (error) {
        toast.error("Failed to update group profile photo");
      } finally {
        setIsUpdatingProfile(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteNotice = async (id: string) => {
    if (!confirm("Remove this notice?")) return;
    try {
        await updateDoc(doc(db, "notices", id), { isDeleted: true });
        toast.success("Notice removed");
    } catch (error) {
        toast.error("Failed to remove notice");
    }
  };

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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                    <button onClick={() => setCreateOpen(true)} className="glass-button text-sm py-3 font-black tracking-widest uppercase">Create Group</button>
                    <button onClick={() => setJoinOpen(true)} className="glass-button-secondary text-sm py-3 bg-white/5 border border-white/10 font-black tracking-widest uppercase">Join Group</button>
                </div>
                
                <CreateGroupModal isOpen={isCreateOpen} onClose={() => setCreateOpen(false)} />
                <JoinGroupModal isOpen={isJoinOpen} onClose={() => setJoinOpen(false)} />
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
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* 1. Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-2">
            Welcome back, {userData?.name?.split(' ')[0] || 'User'}! 👋
          </h1>
          <p className="text-white/40 font-medium text-sm md:text-base">
            Here's what's happening with your finances today
          </p>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={() => setExpenseOpen(true)}
             className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
           >
             <Plus className="w-6 h-6" />
           </button>
        </div>
      </div>

      {/* 2. Notice Board */}
      <section className="glass-card rounded-[2.5rem] p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
             <Bell className="w-5 h-5 text-warning" />
           </div>
           <h2 className="text-xl font-black text-white tracking-tight uppercase">Notice Board</h2>
           {isAdmin && (
             <button 
               onClick={() => { setNoticeToEdit(null); setNoticeOpen(true); }}
               className="p-2 bg-white/5 rounded-xl text-white/40 hover:text-white transition-all ml-auto flex items-center gap-2 group"
             >
                <Plus className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Add Notice</span>
             </button>
           )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           {notices.filter(n => !n.isDeleted).length === 0 ? (
             <div className="col-span-full py-12 flex flex-col items-center justify-center text-center space-y-3 glass-panel rounded-3xl border-white/5">
                <Bell className="w-8 h-8 text-white/10" />
                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest italic">No active notices for this group</p>
             </div>
           ) : (
             notices.filter(n => !n.isDeleted).slice(0, 3).map(notice => {
               const theme = getNoticeTheme(notice.type);
               const Icon = notice.type === 'WARNING' ? AlertTriangle : notice.type === 'IMPORTANT' ? Bell : Bell;
               return (
                 <div key={notice.id} className={`glass-panel p-5 rounded-[2rem] border ${theme.border} flex flex-col gap-4 ${theme.bg} relative group/notice transition-all hover:scale-[1.02]`}>
                    <div className="flex items-center gap-4">
                       <div className={`w-12 h-12 rounded-2xl ${theme.tag} flex items-center justify-center shrink-0 shadow-lg shadow-black/20`}>
                         <Icon className="w-6 h-6 text-white" />
                       </div>
                       <div className="flex-1 pr-12">
                          <div className="text-sm font-black text-white leading-tight uppercase italic tracking-tight truncate">{notice.title}</div>
                          <div className="text-[10px] text-white/40 uppercase font-black tracking-widest mt-0.5">{format(new Date(notice.createdAt), "MMM dd, yyyy")}</div>
                       </div>
                    </div>
                    <p className="text-xs text-white/60 line-clamp-3 px-1 leading-relaxed">{notice.message}</p>
                    
                    {isAdmin && (
                      <div className="absolute top-5 right-5 flex items-center gap-1.5 opacity-0 group-hover/notice:opacity-100 transition-all">
                         <button 
                           onClick={() => { setNoticeToEdit(notice); setNoticeOpen(true); }}
                           className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl text-white/60 hover:text-white hover:bg-white/20 transition-all border border-white/5"
                         >
                            <Pencil className="w-3.5 h-3.5" />
                         </button>
                         <button 
                           onClick={() => handleDeleteNotice(notice.id)}
                           className="p-2.5 bg-rose-500/10 backdrop-blur-md rounded-xl text-rose-400 hover:text-white hover:bg-rose-500 transition-all border border-rose-500/20"
                         >
                            <Trash2 className="w-3.5 h-3.5" />
                         </button>
                      </div>
                    )}
                 </div>
               )
             })
           )}
        </div>
      </section>

      {/* 3. Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1 */}
        <div className="glass-card rounded-[2.5rem] p-8 flex flex-col items-center text-center space-y-4 hover:border-info/30 transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-info/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-info font-black text-xl italic leading-none">$</span>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Total You Spent</div>
              <div className="text-3xl font-black text-white tracking-tighter italic">{formatPrice(totalSpent)}</div>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-success">
               <TrendingUp className="w-3 h-3" /> +12% from last month
            </div>
        </div>

        {/* Metric 2 */}
        <div className="glass-card rounded-[2.5rem] p-8 flex flex-col items-center text-center space-y-4 hover:border-success/30 transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-success/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6 text-success" />
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">You Will Receive</div>
              <div className="text-3xl font-black text-success tracking-tighter italic">{formatPrice(totalReceive)}</div>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-success">
               <TrendingUp className="w-3 h-3" /> +5% from last month
            </div>
        </div>

        {/* Metric 3 */}
        <div className="glass-card rounded-[2.5rem] p-8 flex flex-col items-center text-center space-y-4 hover:border-destructive/30 transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-destructive/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingDown className="w-6 h-6 text-destructive" />
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">You Owe</div>
              <div className="text-3xl font-black text-destructive tracking-tighter italic">{formatPrice(totalOwe)}</div>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-destructive">
               <TrendingDown className="w-3 h-3" /> -8% from last month
            </div>
        </div>

        {/* Metric 4 */}
        <div className="glass-card rounded-[2.5rem] p-8 flex flex-col items-center text-center space-y-4 hover:border-accent/30 transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6 text-accent" />
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Total Group Expense</div>
              <div className="text-3xl font-black text-white tracking-tighter italic">{formatPrice(groupSpent)}</div>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-success">
               <TrendingUp className="w-3 h-3" /> +15% from last month
            </div>
        </div>
      </div>

      {/* 4. Main Activity Area & Wallet */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
           <div className="flex items-center justify-between px-2">
             <h2 className="text-2xl font-black text-white tracking-tight italic uppercase">Recent Activity</h2>
             <button className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest">View All</button>
           </div>

           <div className="glass-card rounded-[2.5rem] p-2 overflow-hidden">
             {activityList.length === 0 ? (
               <div className="text-center py-20 text-white/20 font-bold uppercase tracking-widest">No Recent Activity</div>
             ) : (
               <div className="divide-y divide-white/5">
                 {activityList.map((act, i) => (
                   <div key={i} className="flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors group">
                     <div className="flex items-center gap-5">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                          act.type === 'expense' ? 'bg-info/20 text-info' : 'bg-success/20 text-success'
                        }`}>
                          {act.type === 'expense' ? <ShoppingCart className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
                        </div>
                        <div>
                          <div className="text-base font-bold text-white">
                             {usersMap[act.type === 'expense' ? act.data.paidBy : act.data.fromUser]?.name || 'User'} {act.type === 'expense' ? 'added expense' : 'settled payment'}
                          </div>
                          <div className="text-[11px] text-white/40 font-medium mt-0.5">{formatPrice(act.data.amount)} • {act.type === 'expense' ? act.data.title : 'Settlement'}</div>
                        </div>
                     </div>
                     <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                           <div className="text-[10px] font-bold text-white uppercase opacity-40">{format(new Date(act.date), "h:mm a")}</div>
                           <div className="text-[11px] font-black text-white/20 uppercase tracking-widest">{format(new Date(act.date), "MMM dd")}</div>
                        </div>
                        <div className="w-10 h-10 rounded-full border-2 border-white/10 bg-white/5 flex items-center justify-center text-[10px] font-black text-white group-hover:border-primary transition-colors">
                           {usersMap[act.type === 'expense' ? act.data.paidBy : act.data.fromUser]?.name?.substring(0, 2).toUpperCase() || '??'}
                        </div>
                     </div>
                   </div>
                 ))}
               </div>
             )}
             <button className="w-full py-5 text-center text-xs font-black text-white/20 uppercase tracking-widest hover:text-white/60 transition-colors border-t border-white/5">
                View All Activity
             </button>
           </div>
        </div>

        {/* Right: Unified Wallet */}
        <div className="space-y-6">
           <div className="flex items-center justify-between px-2">
             <h2 className="text-2xl font-black text-white tracking-tight italic uppercase">Unified Wallet</h2>
             <button className="px-3 py-1 bg-white/5 rounded-lg text-[9px] font-black text-white/40 uppercase tracking-widest">Combined Balance</button>
           </div>

           <div className="glass-card rounded-[3rem] p-3 space-y-3">
              {/* Group Balance */}
              <div className="glass-panel p-6 rounded-[2rem] border-white/5">
                 <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Group Balance</span>
                    <span className="text-[10px] font-black text-success uppercase">You will receive</span>
                 </div>
                 <div className="text-3xl font-black text-white tracking-tighter italic">{formatPrice(totalReceive - totalOwe)}</div>
                 <div className="text-[10px] font-bold text-success/60 mt-2">Overall positive from group members</div>
              </div>

              {/* Personal Balance */}
              <div className="glass-panel p-6 rounded-[2rem] border-white/5">
                 <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Personal Balance</span>
                    <span className="text-[10px] font-black text-destructive uppercase">You owe</span>
                 </div>
                 <div className="text-3xl font-black text-white tracking-tighter italic">{formatPrice(personalBalance)}</div>
                 <div className="text-[10px] font-bold text-destructive/60 mt-2">Active personal trades pending</div>
              </div>

              {/* Net Balance */}
              <div className="glass-panel p-8 rounded-[2.5rem] border-primary/20 bg-primary/5">
                 <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-black text-white/40 uppercase tracking-widest">Net Balance</span>
                    <div className="w-2 h-2 rounded-full bg-success"></div>
                 </div>
                 <div className="text-4xl font-black text-success tracking-tighter italic">
                    {((totalReceive - totalOwe) + personalBalance) >= 0 ? '+' : '-'}{formatPrice(Math.abs((totalReceive - totalOwe) + personalBalance))}
                 </div>
                 <div className="text-xs font-bold text-white/40 mt-3 uppercase tracking-tighter">Overall positive performance</div>
              </div>
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
      
      <CreateNoticeModal 
        isOpen={isNoticeOpen} 
        onClose={() => { setNoticeOpen(false); setNoticeToEdit(null); }} 
        groupId={userData.currentGroupId!} 
        noticeToEdit={noticeToEdit}
      />

      <ChatDrawer 
        isOpen={isChatOpen}
        onClose={() => setChatOpen(false)}
        chatId={userData.currentGroupId!}
        chatName={group?.name || "Group Chat"}
        type="group"
      />
    </div>
  );

}
