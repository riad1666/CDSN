"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, addDoc } from "firebase/firestore";
import { UserBasicInfo, getGroupMembers, writeNotification } from "@/lib/firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useCurrency } from "@/context/CurrencyContext";

export function SettlePaymentModal({ isOpen, onClose, targetUserId }: { isOpen: boolean, onClose: () => void, targetUserId?: string }) {
  const { userData } = useAuth();
  const { formatPrice } = useCurrency();
  const [users, setUsers] = useState<UserBasicInfo[]>([]);
  const [toUser, setToUser] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(true);

  useEffect(() => {
    if (isOpen && userData?.currentGroupId) {
      setUsersLoading(true);
      getGroupMembers(userData.currentGroupId)
        .then(list => setUsers(list.filter(u => u.uid !== userData?.uid)))
        .finally(() => setUsersLoading(false));
        
      if (targetUserId) {
        setToUser(targetUserId);
      }
    } else if (!isOpen) {
      setToUser("");
    }
  }, [isOpen, userData?.uid, userData?.currentGroupId, targetUserId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toUser || !amount) return toast.error("Please select a person and enter an amount");

    setLoading(true);
    try {
      if (!userData?.currentGroupId) {
          throw new Error("No group selected.");
      }

      await addDoc(collection(db, "settlements"), {
        fromUser: userData!.uid,
        toUser,
        amount: parseFloat(amount),
        status: "pending",
        date: new Date().toISOString(),
        groupId: userData.currentGroupId,
        isDeleted: false,
        createdAt: new Date().toISOString()
      });

      await writeNotification(
        toUser,
        "SETTLEMENT_REQUEST",
        `${userData!.name} requested a settlement of ${formatPrice(parseFloat(amount))}.`,
        { groupId: userData.currentGroupId, amount: parseFloat(amount) }
      );

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="glass-panel w-full max-w-sm p-8 relative border-white/10 shadow-2xl">
        <button onClick={onClose} className="absolute top-6 right-6 text-white/30 hover:text-white transition-colors bg-white/5 p-2 rounded-xl">
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-8">Settle Up</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Send Request To</label>
            
            {usersLoading ? (
               <div className="flex gap-2">
                  {[1, 2, 3].map(i => <div key={i} className="w-12 h-12 rounded-2xl bg-white/5 animate-pulse" />)}
               </div>
            ) : (
               <div className="flex overflow-x-auto no-scrollbar gap-3 pb-2 snap-x">
                  {users.length === 0 && (
                     <div className="text-xs font-bold text-white/20 uppercase tracking-widest p-4 glass-card w-full text-center">No other members</div>
                  )}
                  {users.map(u => {
                     const isSelected = toUser === u.uid;
                     return (
                        <div 
                           key={u.uid}
                           onClick={() => setToUser(u.uid)}
                           className={`relative group cursor-pointer shrink-0 snap-start transition-all duration-300 ${isSelected ? 'scale-100 opacity-100' : 'scale-90 opacity-40 hover:opacity-100'}`}
                           title={`${u.name} (Room ${u.room})`}
                        >
                           <div className={`w-14 h-14 rounded-2xl border-2 overflow-hidden flex items-center justify-center ${isSelected ? 'border-primary shadow-[0_0_15px_rgba(var(--color-primary),0.3)]' : 'border-white/10'}`}>
                              {u.profileImage ? (
                                 <img src={u.profileImage} alt={u.name} className="w-full h-full object-cover" />
                              ) : (
                                 <span className={`text-xl font-black ${isSelected ? 'text-primary' : 'text-white/40'}`}>{u.name.charAt(0)}</span>
                              )}
                           </div>
                           {isSelected && (
                              <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center border-2 border-[#0f101a] shadow-lg">
                                 <Check className="w-3 h-3" />
                              </div>
                           )}
                           <p className="text-[9px] font-black text-white/60 uppercase tracking-widest text-center mt-1.5 truncate w-14">{u.name.split(" ")[0]}</p>
                        </div>
                     )
                  })}
               </div>
            )}
            {!toUser && !usersLoading && users.length > 0 && <p className="text-rose-400 text-[10px] font-black uppercase tracking-widest ml-1 animate-pulse">Required</p>}
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Amount</label>
            <input 
              type="number" 
              placeholder="0" 
              className="w-full glass-input font-mono font-bold text-primary text-xl tracking-tighter"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
          
          <button type="submit" disabled={loading} className="w-full glass-button py-4 text-xs tracking-[0.2em] shadow-[0_10px_30px_rgba(var(--color-primary),0.2)] mt-6">
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Transmit Request"}
          </button>
        </form>
      </div>
    </div>
  );
}
