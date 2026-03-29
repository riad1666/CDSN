"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { Shield, Users, LayoutGrid, Settings, Search, CheckCircle, X, History, MessageSquare, Edit3, Trash2, Mail, Phone, Zap } from "lucide-react";
import { collection, getDocs, query, where, updateDoc, doc, orderBy, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { UserBasicInfo, Group, getAllUsers, getAllGroups, updateUserData, subscribeToAllActivities, ChatMessage, subscribeToMessages, PersonalTrade, getAllPersonalTrades } from "@/lib/firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { ChatDrawer } from "@/components/ChatDrawer";
import { format } from "date-fns";

type Tab = "overview" | "users" | "groups" | "activities" | "chats";

export default function SuperAdminPage() {
  const { userData: myData } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<UserBasicInfo[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [allTrades, setAllTrades] = useState<PersonalTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modals
  const [editingUser, setEditingUser] = useState<UserBasicInfo | null>(null);
  const [managingGroup, setManagingGroup] = useState<Group | null>(null);
  const [monitoringChat, setMonitoringChat] = useState<{ id: string; name: string; type: "group" | "private" } | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [u, g, t] = await Promise.all([getAllUsers(), getAllGroups(), getAllPersonalTrades()]);
        setUsers(u);
        setGroups(g);
        setAllTrades(t);
      } catch (err) {
        toast.error("Failed to load initial data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();

    const unsubActivities = subscribeToAllActivities((data) => setActivities(data));
    return () => unsubActivities();
  }, []);

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await updateUserData(editingUser.uid, {
        name: editingUser.name,
        email: editingUser.email,
        studentId: editingUser.studentId,
        whatsapp: editingUser.whatsapp,
        gender: editingUser.gender,
        role: editingUser.role,
        status: editingUser.status
      });
      setUsers(prev => prev.map(u => u.uid === editingUser.uid ? editingUser : u));
      setEditingUser(null);
      toast.success("User details updated - System Override Complete");
    } catch (err) {
      toast.error("Failed to update user");
    }
  };

  const handleApprove = async (uid: string) => {
    await updateUserData(uid, { status: "approved" });
    setUsers(u => u.map(x => x.uid === uid ? { ...x, status: "approved" } : x));
    toast.success("User approved");
  };

  if (myData?.role !== "superadmin") {
    return <div className="h-screen flex items-center justify-center text-rose-500 font-black">ACCESS DENIED</div>;
  }

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto px-4 md:px-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 flex items-center justify-center border border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
            <Shield className="w-8 h-8 text-rose-400" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Control Center</h2>
            <p className="text-[10px] font-black text-rose-500 tracking-widest uppercase flex items-center gap-2">
              <Zap className="w-3 h-3 animate-pulse" /> System God Mode — Full Write Access
            </p>
          </div>
        </div>

        {/* Global Tabs */}
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
            {([
                { id: "overview", label: "Overview", icon: Shield },
                { id: "users", label: "Users", icon: Users },
                { id: "groups", label: "Groups", icon: LayoutGrid },
                { id: "activities", label: "Log", icon: History },
                { id: "chats", label: "Chats", icon: MessageSquare },
            ] as const).map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        activeTab === tab.id ? 'bg-rose-500 text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <tab.icon className="w-4 h-4" /> {tab.label}
                </button>
            ))}
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {[
                { label: "Global Users", val: users.length, color: "text-white" },
                { label: "Active Groups", val: groups.length, color: "text-primary" },
                { label: "Pending Approvals", val: users.filter(u => u.status === "pending").length, color: "text-orange-400" },
                { label: "Daily Activities", val: activities.length, color: "text-emerald-400" },
            ].map(stat => (
                <div key={stat.label} className="glass-panel p-6 border-white/5 group hover:border-rose-500/30 transition-all">
                    <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-2">{stat.label}</p>
                    <h3 className={`text-4xl font-black tracking-tighter ${stat.color}`}>{stat.val}</h3>
                </div>
            ))}
        </div>
      )}

      {activeTab === "users" && (
        <section className="glass-panel p-8 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-8 gap-4">
                <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                    <Users className="w-6 h-6 text-indigo-400" /> User Oversight
                </h3>
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input 
                        type="text" 
                        placeholder="Search Student ID or Name..." 
                        className="w-full glass-input pl-10 py-2.5 text-xs font-bold"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                {users.filter(u => u.name?.toLowerCase().includes(search.toLowerCase()) || u.studentId?.includes(search)).map(u => (
                    <div key={u.uid} className="glass-card p-4 hover:border-indigo-500/30 transition-all group">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                {u.profileImage ? (
                                    <img src={u.profileImage} className="w-10 h-10 rounded-xl object-cover" />
                                ) : (
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-white/20">{u.name?.charAt(0)}</div>
                                )}
                                <div>
                                    <h4 className="text-white font-black text-sm">{u.name}</h4>
                                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{u.studentId}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setEditingUser(u)}
                                className="p-2 rounded-lg bg-white/5 text-white/30 hover:bg-emerald-500/20 hover:text-emerald-400 transition-all opacity-0 group-hover:opacity-100"
                            >
                                <Edit3 className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="mt-4 flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${u.role === 'superadmin' ? 'bg-rose-500/20 text-rose-500' : 'bg-white/5 text-white/40'}`}>{u.role}</span>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${u.status === 'approved' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-orange-500/20 text-orange-400'}`}>{u.status}</span>
                            {u.status === 'pending' && (
                                <button onClick={() => handleApprove(u.uid)} className="text-[8px] font-black uppercase text-emerald-400 hover:underline">Approve Now</button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </section>
      )}

      {activeTab === "groups" && (
        <section className="glass-panel p-8 animate-in fade-in duration-300">
            <h3 className="text-xl font-bold text-white tracking-tight mb-8 flex items-center gap-3">
                <LayoutGrid className="w-6 h-6 text-primary" /> Group Master List
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.map(g => (
                    <div key={g.id} className="glass-card p-4 hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary font-black text-xl italic uppercase">
                                {g.name?.charAt(0)}
                            </div>
                            <div>
                                <h4 className="text-white font-black text-sm">{g.name}</h4>
                                <p className="text-[9px] text-white/30 font-bold uppercase tracking-[0.2em]">Code: {g.inviteCode}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                            <div className="flex -space-x-2">
                                {g.memberIds?.slice(0, 3).map((mid, i) => (
                                    <div key={i} className="w-6 h-6 rounded-full border border-dark bg-white/10" />
                                ))}
                                {g.memberIds && g.memberIds.length > 3 && (
                                    <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[8px] text-white/30 font-black">+{g.memberIds.length - 3}</div>
                                )}
                            </div>
                            <button 
                                onClick={() => setMonitoringChat({ id: g.id, name: g.name, type: "group" })}
                                className="text-[9px] font-black uppercase tracking-widest text-primary hover:underline hover:scale-105 transition-all"
                            >
                                Open Chat
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </section>
      )}

      {activeTab === "activities" && (
        <section className="glass-panel p-8 animate-in fade-in duration-300">
             <h3 className="text-xl font-bold text-white tracking-tight mb-8 flex items-center gap-3">
                <History className="w-6 h-6 text-emerald-400" /> Real-time System Log
            </h3>
            <div className="space-y-3">
                {activities.map(act => (
                    <div key={act.id} className="flex items-center gap-4 p-4 border-b border-white/5 hover:bg-white/2 group transition-all">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                            <Shield className="w-4 h-4 text-white/20" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 font-bold mb-0.5">
                                <span className="text-xs text-white/80">{act.message}</span>
                            </div>
                            <p className="text-[8px] text-white/20 uppercase tracking-widest font-black">
                                Group: <span className="text-primary">{groups.find(g => g.id === act.groupId)?.name || "Unknown"}</span> • {act.createdAt ? format(new Date(act.createdAt), "HH:mm:ss dd MMM") : "..."}
                            </p>
                        </div>
                    </div>
                ))}
                {activities.length === 0 && <div className="text-center py-20 text-white/10 font-black uppercase tracking-[0.3em]">Monitoring for actions...</div>}
            </div>
        </section>
      )}

      {activeTab === "chats" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-300">
            <section className="glass-panel p-8 overflow-y-auto max-h-[600px] custom-scrollbar">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                    <LayoutGrid className="w-5 h-5 text-primary" /> Group Chats
                </h3>
                <div className="space-y-4">
                    {groups.map(g => (
                        <button 
                            key={g.id}
                            onClick={() => setMonitoringChat({ id: g.id, name: g.name, type: "group" })}
                            className="w-full glass-card p-4 flex items-center justify-between hover:border-primary/40 hover:bg-white/5 transition-all text-left group"
                        >
                            <div>
                                <span className="text-white font-bold text-sm tracking-tight group-hover:text-primary transition-colors">{g.name}</span>
                                <p className="text-[8px] text-white/20 mt-1 uppercase font-black tracking-widest">{g.memberIds.length} Members</p>
                            </div>
                            <span className="text-[9px] text-white/20 font-black uppercase tracking-widest">Global Access</span>
                        </button>
                    ))}
                </div>
            </section>
            <section className="glass-panel p-8 overflow-y-auto max-h-[600px] custom-scrollbar">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                    <Shield className="w-5 h-5 text-rose-500" /> Private Monitors
                </h3>
                <div className="space-y-4">
                    {allTrades.map(t => {
                        const u1 = users.find(u => u.uid === t.participants[0]);
                        const u2 = users.find(u => u.uid === t.participants[1]);
                        const chatName = `${u1?.name || "???"} <> ${u2?.name || "???"}`;
                        return (
                            <button 
                                key={t.id}
                                onClick={() => setMonitoringChat({ id: t.id, name: chatName, type: "private" })}
                                className="w-full glass-card p-4 flex items-center justify-between hover:border-rose-500/40 hover:bg-white/5 transition-all text-left group"
                            >
                                <div>
                                    <span className="text-white font-bold text-sm tracking-tight group-hover:text-rose-400 transition-colors">
                                        {chatName}
                                    </span>
                                    <p className="text-[8px] text-white/20 mt-1 uppercase font-black tracking-widest italic">{u1?.studentId} / {u2?.studentId}</p>
                                </div>
                                <span className="text-[8px] bg-rose-500/10 text-rose-500 px-2 py-1 rounded font-black uppercase tracking-widest">Warp Access</span>
                            </button>
                        );
                    })}
                </div>
            </section>
        </div>
      )}

      {/* GOD MODE: Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
            <div className="fixed inset-0 z-110 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
                <motion.form 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onSubmit={handleUpdateUser}
                    className="glass-panel w-full max-w-lg p-10 relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-rose-500 via-primary to-rose-500" />
                    
                    <button type="button" onClick={() => setEditingUser(null)} className="absolute top-6 right-6 text-white/30 hover:text-white"><X /></button>
                    
                    <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic mb-2">Modify Identity</h3>
                    <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest mb-8">Override core details for {editingUser.name}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="space-y-1.5 col-span-1 md:col-span-2">
                            <label className="text-[9px] font-black text-white/40 uppercase tracking-widest ml-1">Account Email (Auth Record)</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-white/20" />
                                <input className="w-full glass-input pl-10 py-3" value={editingUser.email || ""} onChange={e => setEditingUser({...editingUser, email: e.target.value})} placeholder="example@cds.com" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-white/40 uppercase tracking-widest ml-1">Full Name</label>
                            <div className="relative">
                                <Users className="absolute left-3.5 top-3.5 w-4 h-4 text-white/20" />
                                <input className="w-full glass-input pl-10 py-3" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-white/40 uppercase tracking-widest ml-1">Student ID</label>
                            <div className="relative">
                                <Edit3 className="absolute left-3.5 top-3.5 w-4 h-4 text-white/20" />
                                <input className="w-full glass-input pl-10 py-3" value={editingUser.studentId} onChange={e => setEditingUser({...editingUser, studentId: e.target.value})} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-white/40 uppercase tracking-widest ml-1">WhatsApp</label>
                            <div className="relative">
                                <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-white/20" />
                                <input className="w-full glass-input pl-10 py-3" value={editingUser.whatsapp} onChange={e => setEditingUser({...editingUser, whatsapp: e.target.value})} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-white/40 uppercase tracking-widest ml-1">Gender</label>
                            <select 
                                className="w-full glass-input" 
                                value={editingUser.gender} 
                                onChange={e => setEditingUser({...editingUser, gender: e.target.value as any})}
                            >
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-white/40 uppercase tracking-widest ml-1">Platform Role</label>
                            <select 
                                className="w-full glass-input" 
                                value={editingUser.role} 
                                onChange={e => setEditingUser({...editingUser, role: e.target.value as any})}
                            >
                                <option value="user">User</option>
                                <option value="admin">System Admin</option>
                                <option value="superadmin">Super Admin (God)</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-white/40 uppercase tracking-widest ml-1">Approval Status</label>
                            <select 
                                className="w-full glass-input border-rose-500/30" 
                                value={editingUser.status} 
                                onChange={e => setEditingUser({...editingUser, status: e.target.value as any})}
                            >
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                    </div>

                    <button type="submit" className="w-full glass-button py-4 font-black uppercase tracking-[0.2em] text-xs shadow-[0_10px_30px_rgba(244,63,94,0.3)]">
                        Commit Core Override
                    </button>
                    <p className="text-[8px] text-white/20 text-center mt-3 uppercase tracking-tighter">This action is logged and cannot be undone via automatic restore.</p>
                </motion.form>
            </div>
        )}
      </AnimatePresence>

      <ChatDrawer 
        isOpen={!!monitoringChat} 
        onClose={() => setMonitoringChat(null)} 
        chatId={monitoringChat?.id || ""} 
        chatName={monitoringChat?.name || ""} 
        type={monitoringChat?.type || "group"} 
      />
    </div>
  );
}
