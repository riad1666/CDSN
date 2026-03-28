"use client";

import { useState } from "react";
import { X, Bell, Info, AlertTriangle, Loader2 } from "lucide-react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import toast from "react-hot-toast";

interface CreateNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
}

export function CreateNoticeModal({ isOpen, onClose, groupId }: CreateNoticeModalProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"INFO" | "IMPORTANT" | "WARNING">("INFO");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return toast.error("Please fill all fields");

    setLoading(true);
    try {
      await addDoc(collection(db, "notices"), {
        groupId,
        title,
        message,
        type,
        createdAt: new Date().toISOString(),
        isDeleted: false
      });
      toast.success("Notice posted successfully!");
      setTitle("");
      setMessage("");
      onClose();
    } catch (error) {
      toast.error("Failed to post notice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative glass-panel w-full max-w-lg p-8 animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                <Bell className="w-6 h-6 text-primary" />
            </div>
            <div>
                <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">Create Notice</h2>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">Post an update to the group</p>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Notice Type</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'INFO', icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                { id: 'IMPORTANT', icon: Bell, color: 'text-rose-400', bg: 'bg-rose-500/10' },
                { id: 'WARNING', icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id as any)}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${
                    type === t.id 
                    ? `border-${t.id === 'INFO' ? 'blue' : t.id === 'IMPORTANT' ? 'rose' : 'orange'}-500/50 ${t.bg} scale-105 shadow-lg` 
                    : 'border-white/5 bg-white/2 hover:bg-white/5'
                  }`}
                >
                  <t.icon className={`w-5 h-5 mb-2 ${t.color}`} />
                  <span className={`text-[8px] font-black uppercase tracking-tighter ${type === t.id ? 'text-white' : 'text-white/40'}`}>{t.id}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Notice Title</label>
            <input
              type="text"
              required
              className="w-full glass-input py-4 px-5 text-sm"
              placeholder="e.g. Monthly Meeting"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Notice Message</label>
            <textarea
              required
              rows={4}
              className="w-full glass-input py-4 px-5 text-sm resize-none"
              placeholder="Enter the notice details here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full glass-button py-4 text-xs font-black uppercase tracking-widest"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-white" /> : "Post Notice"}
          </button>
        </form>
      </div>
    </div>
  );
}
