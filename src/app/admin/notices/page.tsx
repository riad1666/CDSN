"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase/config";
import { collection, query, onSnapshot, doc, updateDoc, addDoc, orderBy, where } from "firebase/firestore";
import { format } from "date-fns";
import { Trash2, Plus, X, Bell, Loader2 } from "lucide-react";
import { Notice } from "@/lib/firebase/firestore";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function AdminNoticesPage() {
  const { userData } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"IMPORTANT" | "INFO" | "WARNING">("INFO");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userData?.currentGroupId) return;

    const q = query(
        collection(db, "notices"), 
        where("groupId", "==", userData.currentGroupId),
        orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const data: Notice[] = [];
      snapshot.forEach(doc => {
          const d = doc.data();
          if (!d.isDeleted) {
              data.push({ id: doc.id, ...d } as Notice);
          }
      });
      setNotices(data);
    });
    return () => unsub();
  }, [userData?.currentGroupId]);

  if (!userData?.currentGroupId) {
    return (
        <div className="h-[80vh] flex flex-col items-center justify-center text-center px-4 md:ml-0 overflow-hidden">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-panel p-12 max-w-lg w-full"
            >
                <div className="w-20 h-20 rounded-3xl bg-indigo-500/20 flex items-center justify-center mx-auto mb-6">
                    <Bell className="w-10 h-10 text-indigo-400" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">Group Notices</h2>
                <p className="text-white/60 mb-8 leading-relaxed">
                    Select a group from the sidebar to manage its private notice board.
                </p>
                <Link href="/dashboard" className="glass-button text-sm py-3 px-8 mx-auto">Go to Dashboard</Link>
            </motion.div>
        </div>
    );
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this notice?")) return;
    try {
      await updateDoc(doc(db, "notices", id), { isDeleted: true });
      toast.success("Notice removed");
    } catch(err) { toast.error("Error removing notice"); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!title || !message) return toast.error("Title and message required");
    setLoading(true);
    try {
      await addDoc(collection(db, "notices"), {
        title, 
        message, 
        type, 
        createdAt: new Date().toISOString(),
        groupId: userData.currentGroupId,
        isDeleted: false,
        addedBy: userData.uid
      });
      toast.success("Notice published");
      setIsOpen(false); setTitle(""); setMessage(""); setType("INFO");
    } catch(err) { toast.error("Error publishing notice"); }
    setLoading(false);
  };

  const getNoticeTheme = (t: string) => {
    switch (t) {
      case "IMPORTANT": return { bg: "bg-rose-500/10", border: "border-rose-500/30", tag: "bg-rose-500" };
      case "WARNING": return { bg: "bg-orange-500/10", border: "border-orange-500/30", tag: "bg-orange-500" };
      default: return { bg: "bg-blue-500/10", border: "border-blue-500/30", tag: "bg-blue-500" };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
              <Bell className="w-6 h-6 text-indigo-400" />
           </div>
           <div>
              <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Notice Management</h2>
              <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest">Group Specific Announcements</p>
           </div>
        </div>
        <button onClick={() => setIsOpen(true)} className="glass-button py-2.5 px-6 text-xs font-bold uppercase tracking-widest">
          <Plus className="w-4 h-4" /> Create Notice
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {notices.map(n => {
           const theme = getNoticeTheme(n.type);
           return (
             <div key={n.id} className={`p-6 rounded-3xl border ${theme.border} ${theme.bg} backdrop-blur-xl relative group shadow-2xl shadow-black/20`}>
               <button onClick={() => handleDelete(n.id)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white">
                 <Trash2 className="w-4 h-4" />
               </button>
               <div className="flex items-center gap-3 mb-4">
                  <span className={`text-[9px] font-black px-3 py-1 rounded-lg text-white uppercase tracking-widest ${theme.tag}`}>{n.type}</span>
               </div>
               <h3 className="text-white font-black text-lg mb-2 pr-8 tracking-tight leading-none uppercase">{n.title}</h3>
               <p className="text-xs text-white/60 leading-relaxed mb-6 font-medium">{n.message}</p>
               <div className="text-[10px] text-white/20 font-bold uppercase tracking-widest mt-auto pt-4 border-t border-white/5">{n.createdAt ? format(new Date(n.createdAt), "MMMM dd, yyyy") : ""}</div>
             </div>
           );
        })}
        {notices.length === 0 && (
            <div className="col-span-3 text-white/20 text-xs font-bold uppercase tracking-[0.2em] py-20 text-center glass-panel border-dashed">
                No active notices in this group.
            </div>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
            <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="glass-panel w-full max-w-lg p-8 relative shadow-2xl border-white/10"
                >
                    <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-colors">
                        <X className="w-6 h-6"/>
                    </button>
                    
                    <h2 className="text-3xl font-black text-white mb-2 tracking-tighter italic uppercase">Create Notice</h2>
                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-8">Broadcast an announcement to the group</p>

                    <form onSubmit={handleCreate} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Title</label>
                            <input type="text" className="w-full glass-input py-4 text-sm" value={title} onChange={e=>setTitle(e.target.value)} placeholder="ENTER TITLE..." required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Message</label>
                            <textarea className="w-full glass-input min-h-[120px] py-4 text-sm" value={message} onChange={e=>setMessage(e.target.value)} placeholder="TYPE MESSAGE HERE..." required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Priority Type</label>
                            <select className="w-full glass-input appearance-none bg-[#161724] py-4 text-sm font-bold uppercase tracking-widest" value={type} onChange={e=>setType(e.target.value as any)}>
                                <option value="INFO">Default Info</option>
                                <option value="IMPORTANT">High Priority</option>
                                <option value="WARNING">System Warning</option>
                            </select>
                        </div>
                        <button type="submit" disabled={loading} className="w-full glass-button py-4 font-black uppercase tracking-widest text-xs mt-4">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto"/> : "Publish Announcement"}
                        </button>
                    </form>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
}
