"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase/config";
import { collection, query, onSnapshot, doc, updateDoc, orderBy, deleteDoc } from "firebase/firestore";
import { format } from "date-fns";
import { Check, X, Eye, Trash2 } from "lucide-react";
import { getApprovedUsers, UserBasicInfo, Settlement } from "@/lib/firebase/firestore";
import toast from "react-hot-toast";
import { useCurrency } from "@/context/CurrencyContext";

export default function AdminSettlementsPage() {
  const { formatPrice } = useCurrency();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, UserBasicInfo>>({});

  useEffect(() => {
    getApprovedUsers().then(list => {
      const map: Record<string, UserBasicInfo> = {};
      list.forEach(u => map[u.uid] = u);
      setUsersMap(map);
    });

    const q = query(collection(db, "settlements"), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data: Settlement[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Settlement));
      setSettlements(data);
    });
    return () => unsub();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "settlements", id), { status: newStatus });
      toast.success(`Settlement marked as ${newStatus}`);
    } catch(err) {
      toast.error("Failed to update settlement");
    }
  };

  const pending = settlements.filter(s => s.status === 'pending').length;
  const confirmed = settlements.filter(s => s.status === 'accepted').length;
  const rejected = settlements.filter(s => s.status === 'rejected').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Settlement Management</h2>
        <p className="text-white/60 text-sm">Approve or reject payment settlements</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-6 border-orange-500/20 bg-orange-500/5">
          <div className="text-sm font-medium text-white/50 mb-1">Pending</div>
          <div className="text-2xl font-bold text-orange-400">{pending}</div>
        </div>
        <div className="glass-card p-6 border-emerald-500/20 bg-emerald-500/5">
          <div className="text-sm font-medium text-white/50 mb-1">Confirmed</div>
          <div className="text-2xl font-bold text-emerald-400">{confirmed}</div>
        </div>
        <div className="glass-card p-6 border-rose-500/20 bg-rose-500/5">
          <div className="text-sm font-medium text-white/50 mb-1">Rejected</div>
          <div className="text-2xl font-bold text-rose-400">{rejected}</div>
        </div>
      </div>

      <div className="space-y-4">
        {settlements.map(s => (
          <div key={s.id} className={`p-5 rounded-2xl border transition-colors flex flex-col md:flex-row items-center justify-between gap-4 ${s.status === 'pending' ? 'bg-[#ffedd5]/10 border-orange-500/20' : s.status === 'accepted' ? 'bg-[#d1fae5]/5 border-emerald-500/20' : 'bg-[#ffe4e6]/5 border-rose-500/20'} backdrop-blur-md`}>
            <div className="flex-1">
               <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                 <span className="font-semibold text-white">{usersMap[s.fromUser]?.name || "Unknown"}</span>
                 <span className="mx-1">→</span>
                 <span className="font-semibold text-white">{usersMap[s.toUser]?.name || "Unknown"}</span>
               </div>
               <div className="text-2xl font-bold text-white mb-2">{formatPrice(s.amount)}</div>
               <div className="text-xs text-white/40">
                 Date: {s.date ? format(new Date(s.date), "yyyy-MM-dd") : "N/A"}
               </div>
            </div>
            
            <div className="flex items-center gap-3">
               <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${s.status === 'pending' ? 'bg-orange-500 text-white' : s.status === 'accepted' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                 {s.status === 'accepted' ? 'confirmed' : s.status}
               </span>
               
               {s.status === 'pending' && (
                 <>
                   <button onClick={() => handleUpdateStatus(s.id, "accepted")} className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/30">
                     <Check className="w-4 h-4" />
                   </button>
                   <button onClick={() => handleUpdateStatus(s.id, "rejected")} className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all border border-rose-500/30">
                     <X className="w-4 h-4" />
                   </button>
                 </>
               )}
               <button onClick={async () => {
                  if(confirm("Administratively delete this settlement record?")) {
                     await deleteDoc(doc(db, "settlements", s.id));
                     toast.success("Deleted settlement");
                  }
               }} className="w-8 h-8 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all border border-red-500/30" title="Delete Settlement">
                 <Trash2 className="w-4 h-4" />
               </button>
            </div>
          </div>
        ))}
        {settlements.length === 0 && <div className="text-center py-8 text-white/40">No settlements found.</div>}
      </div>
    </div>
  );
}
