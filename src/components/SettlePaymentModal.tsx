"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, addDoc } from "firebase/firestore";
import { getApprovedUsers, UserBasicInfo } from "@/lib/firebase/firestore";
import toast from "react-hot-toast";

export function SettlePaymentModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { userData } = useAuth();
  const [users, setUsers] = useState<UserBasicInfo[]>([]);
  const [toUser, setToUser] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getApprovedUsers().then(list => setUsers(list.filter(u => u.uid !== userData?.uid)));
    }
  }, [isOpen, userData?.uid]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toUser || !amount) return toast.error("Please select a person and enter an amount");

    setLoading(true);
    try {
      await addDoc(collection(db, "settlements"), {
        fromUser: userData!.uid,
        toUser,
        amount: parseFloat(amount),
        status: "pending",
        date: new Date().toISOString()
      });
      toast.success("Settlement request sent!");
      onClose();
      setToUser("");
      setAmount("");
    } catch(err: any) {
      toast.error(err.message || "Failed to create settlement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
        
        <h2 className="text-2xl font-bold text-white mb-6">Settle Payment</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/60 uppercase">Send To</label>
            <select 
              className="w-full glass-input appearance-none bg-[#1a1b2e]/80"
              value={toUser}
              onChange={e => setToUser(e.target.value)}
            >
              <option value="">Select a person...</option>
              {users.map(u => (
                <option key={u.uid} value={u.uid}>{u.name} (Room {u.room})</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/60 uppercase">Amount (₩)</label>
            <input 
              type="number" 
              placeholder="0" 
              className="w-full glass-input"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
          
          <button type="submit" disabled={loading} className="w-full glass-button mt-4">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Request Settlement"}
          </button>
        </form>
      </div>
    </div>
  );
}
