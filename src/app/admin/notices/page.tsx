"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase/config";
import { collection, query, onSnapshot, doc, deleteDoc, addDoc, orderBy } from "firebase/firestore";
import { format } from "date-fns";
import { Trash2, Plus, X } from "lucide-react";
import { Notice } from "@/lib/firebase/firestore";
import toast from "react-hot-toast";

export default function AdminNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"IMPORTANT" | "INFO" | "WARNING">("INFO");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data: Notice[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Notice));
      setNotices(data);
    });
    return () => unsub();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this notice?")) return;
    try {
      await deleteDoc(doc(db, "notices", id));
      toast.success("Notice deleted");
    } catch(err) { toast.error("Error deleting notice"); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!title || !message) return toast.error("Title and message required");
    setLoading(true);
    try {
      await addDoc(collection(db, "notices"), {
        title, message, type, createdAt: new Date().toISOString()
      });
      toast.success("Notice created");
      setIsOpen(false); setTitle(""); setMessage(""); setType("INFO");
    } catch(err) { toast.error("Error creating notice"); }
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
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Notice Management</h2>
          <p className="text-white/60 text-sm">Create and manage notices for all users</p>
        </div>
        <button onClick={() => setIsOpen(true)} className="glass-button py-2.5 px-5 text-sm">
          <Plus className="w-4 h-4" /> Create Notice
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {notices.map(n => {
           const theme = getNoticeTheme(n.type);
           return (
             <div key={n.id} className={`p-5 rounded-2xl border ${theme.border} ${theme.bg} backdrop-blur-md relative group`}>
               <button onClick={() => handleDelete(n.id)} className="absolute top-4 right-4 text-white/30 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all">
                 <Trash2 className="w-4 h-4" />
               </button>
               <div className="flex items-center gap-3 mb-3">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full text-white uppercase tracking-wide ${theme.tag}`}>{n.type}</span>
               </div>
               <h3 className="text-white font-semibold mb-2 pr-6">{n.title}</h3>
               <p className="text-sm text-white/70 leading-relaxed mb-4">{n.message}</p>
               <div className="text-xs text-white/40">{n.createdAt ? format(new Date(n.createdAt), "yyyy-MM-dd") : ""}</div>
             </div>
           );
        })}
        {notices.length === 0 && <div className="col-span-3 text-white/40 text-sm py-8 text-center pt-12">No active notices.</div>}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-lg p-6 relative">
             <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"><X className="w-6 h-6"/></button>
             <h2 className="text-2xl font-bold text-white mb-6">Create Notice</h2>
             <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/60 uppercase">Title</label>
                  <input type="text" className="w-full glass-input" value={title} onChange={e=>setTitle(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/60 uppercase">Message</label>
                  <textarea className="w-full glass-input min-h-[100px]" value={message} onChange={e=>setMessage(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/60 uppercase">Type</label>
                  <select className="w-full glass-input appearance-none bg-[#1a1b2e]/80" value={type} onChange={e=>setType(e.target.value as any)}>
                    <option value="INFO">Info</option>
                    <option value="IMPORTANT">Important</option>
                    <option value="WARNING">Warning</option>
                  </select>
                </div>
                <button type="submit" disabled={loading} className="w-full glass-button mt-6">
                  {loading ? "Creating..." : "Publish Notice"}
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
