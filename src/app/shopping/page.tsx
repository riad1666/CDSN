"use client";

import { useEffect, useState } from "react";
import { Plus, ArrowLeft, User as UserIcon, Trash2, ShoppingBag, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/firebase/config";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, where, updateDoc } from "firebase/firestore";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { AddShoppingModal } from "@/components/AddShoppingModal";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrency } from "@/context/CurrencyContext";
import { subscribeToUserGroups, Group, deleteShopping } from "@/lib/firebase/firestore";



interface ShoppingItem {
  id: string;
  title: string;
  items?: { name: string, amount: string }[];
  amount: number;
  addedBy: string;
  date: string;
  images: string[];
  groupId: string;
}

export default function ShoppingPage() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ShoppingItem | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const { userData } = useAuth();
  const { formatPrice } = useCurrency();


  useEffect(() => {
    if (!userData?.currentGroupId) return;

    const q = query(
        collection(db, "shopping"), 
        where("groupId", "==", userData.currentGroupId)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const data: ShoppingItem[] = [];
      snapshot.forEach(doc => {
        const itemData = doc.data();
        if (!itemData.isDeleted) {
          data.push({ id: doc.id, ...itemData } as ShoppingItem);
        }
      });
      // Sort by date descending
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setItems(data);
    });

    // Subscribe to group data for role check
    const unsubGroup = subscribeToUserGroups(userData.uid, (groups) => {
        const current = groups.find(g => g.id === userData.currentGroupId);
        if (current) setGroup(current);
    });

    return () => {
        unsub();
        unsubGroup();
    };
  }, [userData?.uid, userData?.currentGroupId]);

  const userRole = group?.memberRoles?.[userData?.uid || ""] || "member";
  const isAdmin = userRole === "admin" || userRole === "owner" || userData?.role === "superadmin";


  if (!userData?.currentGroupId) {
    return (
        <div className="h-[80vh] flex flex-col items-center justify-center text-center px-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-panel p-12 max-w-lg w-full"
            >
                <div className="w-20 h-20 rounded-3xl bg-primary/20 flex items-center justify-center mx-auto mb-6">
                    <ShoppingBag className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-4 uppercase tracking-tighter italic">Shopping Lists</h2>
                <p className="text-white/40 mb-8 leading-relaxed uppercase font-bold tracking-widest text-[10px]">
                    Select a group from the sidebar to view its shared shopping history and items.
                </p>
                <Link href="/dashboard" className="glass-button text-[10px] font-black uppercase tracking-widest py-4 px-10 mx-auto">Go to Dashboard</Link>
            </motion.div>
        </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* 1. Shopping Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter italic uppercase flex items-center gap-4">
             Shopping Log
          </h1>
          <p className="text-white/40 font-medium text-sm md:text-base">
            Systematic tracking of group inventory and shared purchases
          </p>
        </div>
        <button 
          onClick={() => setModalOpen(true)} 
          className="px-10 py-5 bg-primary text-white rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/30 flex items-center gap-3"
        >
          <Plus className="w-5 h-5" /> New Record
        </button>
      </div>

      {/* 2. Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="glass-card rounded-[2.5rem] p-8 space-y-4 bg-primary/5 border-primary/20">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
               <ShoppingBag className="w-6 h-6 text-primary" />
            </div>
            <div>
               <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Monthly Procurement</p>
               <h3 className="text-3xl font-black text-white italic tracking-tighter">{formatPrice(items.reduce((acc, i) => acc + i.amount, 0))}</h3>
            </div>
         </div>
         <div className="glass-card rounded-[2.5rem] p-8 space-y-4 bg-white/5 border-white/10">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
               <LayoutGrid className="w-6 h-6 text-white/40" />
            </div>
            <div>
               <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Active Records</p>
               <h3 className="text-3xl font-black text-white italic tracking-tighter">{items.length} Units</h3>
            </div>
         </div>
         <div className="glass-card rounded-[2.5rem] p-8 space-y-4 bg-success/5 border-success/20">
            <div className="w-12 h-12 rounded-2xl bg-success/20 flex items-center justify-center">
               <UserIcon className="w-6 h-6 text-success" />
            </div>
            <div>
               <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Primary Purchaser</p>
               <h3 className="text-3xl font-black text-white italic tracking-tighter truncate">
                  {(() => {
                    const counts: Record<string, number> = {};
                    items.forEach(i => counts[i.addedBy] = (counts[i.addedBy] || 0) + 1);
                    const top = Object.entries(counts).sort((a,b) => b[1] - a[1])[0];
                    return top ? top[0].split(' ')[0] : 'N/A';
                  })()}
               </h3>
            </div>
         </div>
      </div>

      {/* 3. Records Archive */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
           <h4 className="text-sm font-black text-white/60 uppercase tracking-widest italic">Asset Ledger</h4>
           <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">{items.length} Records found</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item, idx) => (
            <motion.div 
               key={item.id} 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: idx * 0.05 }}
               onClick={() => setSelectedItem(item)} 
               className="glass-card rounded-[3rem] overflow-hidden cursor-pointer group hover:border-primary/40 transition-all border-white/5"
            >
               {/* Preview Image */}
               <div className="h-56 relative overflow-hidden bg-black/40">
                  {item.images && item.images.length > 0 ? (
                    <img src={item.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-60 group-hover:opacity-100" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-10">
                       <ShoppingBag className="w-20 h-20 text-white" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-background via-transparent to-transparent"></div>
                  
                  {/* Quick Meta */}
                  <div className="absolute top-6 right-6 flex flex-col items-end gap-2">
                     <span className="px-4 py-2 bg-black/60 backdrop-blur-md rounded-xl text-[9px] font-black text-white/60 uppercase tracking-widest border border-white/10">
                        {item.date ? format(new Date(item.date), "MMM dd") : "N/D"}
                     </span>
                     {isAdmin && (

                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            if(confirm("Permanently remove this record?")) {
                              await deleteShopping(item.id);
                              toast.success("Record expunged");
                            }
                          }}
                          className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center hover:bg-destructive hover:text-white transition-all backdrop-blur-md"
                        >
                           <Trash2 className="w-4 h-4" />
                        </button>
                     )}
                  </div>

                  <div className="absolute bottom-6 left-8 right-8">
                     <h3 className="text-xl font-black text-white tracking-tighter uppercase italic leading-tight mb-1 truncate group-hover:text-primary transition-colors">{item.title}</h3>
                     <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-lg bg-white/10 flex items-center justify-center">
                           <UserIcon className="w-3 h-3 text-white/40" />
                        </div>
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{item.addedBy}</span>
                     </div>
                  </div>
               </div>

               {/* Financial Data */}
               <div className="p-8 flex items-center justify-between bg-white/2 border-t border-white/5">
                  <div className="space-y-1">
                     <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Transaction Total</p>
                     <div className="text-3xl font-black text-white italic tracking-tighter">{formatPrice(item.amount)}</div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary transition-all">
                     <Plus className="w-5 h-5 text-primary group-hover:text-white" />
                  </div>
               </div>
            </motion.div>
          ))}
        </div>
      </div>
      
      <AddShoppingModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} />
      
      {/* Detail Modal Overlay */}
      <AnimatePresence>
        {selectedItem && (
           <motion.div 
             initial={{ opacity: 0 }} 
             animate={{ opacity: 1 }} 
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-100 flex items-center justify-center bg-background/95 backdrop-blur-xl p-6" 
             onClick={() => setSelectedItem(null)}
           >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="glass-card w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl border-white/10" 
                onClick={e => e.stopPropagation()}
              >
                 <div className="grid grid-cols-1 md:grid-cols-2">
                    {/* Left: Images */}
                    <div className="bg-black/40 h-[400px] md:h-auto relative group">
                       {selectedItem.images && selectedItem.images.length > 0 ? (
                         <div className="h-full flex flex-col gap-1">
                            {selectedItem.images.map((img, idx) => (
                              <img key={idx} src={img} className="w-full flex-1 object-cover hover:flex-2 transition-all duration-500" />
                            ))}
                         </div>
                       ) : (
                         <div className="h-full flex items-center justify-center opacity-10">
                            <ShoppingBag className="w-32 h-32 text-white" />
                         </div>
                       )}
                       <div className="absolute top-8 left-8">
                          <button onClick={() => setSelectedItem(null)} className="w-12 h-12 rounded-2xl bg-black/60 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 transition-all">
                             <Plus className="w-6 h-6 rotate-45" />
                          </button>
                       </div>
                    </div>

                    {/* Right: Info */}
                    <div className="p-10 flex flex-col">
                       <div className="mb-8">
                          <div className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2">Record Verified</div>
                          <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none">{selectedItem.title}</h2>
                          <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-3">Purchased {selectedItem.date ? format(new Date(selectedItem.date), "MMMM dd, yyyy") : ""}</p>
                       </div>

                       <div className="flex-1 space-y-4 mb-8 custom-scrollbar overflow-y-auto max-h-[300px] pr-4">
                          <div className="text-[10px] font-black text-white/20 uppercase tracking-widest border-b border-white/5 pb-2">Manifest</div>
                          {selectedItem.items && selectedItem.items.length > 0 ? selectedItem.items.map((it, idx) => (
                             <div key={idx} className="flex items-center justify-between group/item py-1">
                                <span className="text-sm font-bold text-white/50 group-hover/item:text-white transition-colors italic uppercase">{it.name}</span>
                                <div className="h-px bg-white/5 flex-1 mx-4 order-2"></div>
                                <span className="text-sm font-black text-white order-3">{formatPrice(parseFloat(it.amount))}</span>
                             </div>
                          )) : (
                             <p className="text-xs text-white/20 uppercase font-black py-4">No detailed manifest available</p>
                          )}
                       </div>

                       <div className="pt-8 border-t border-white/10 mt-auto">
                          <div className="flex items-center justify-between mb-8">
                             <div className="space-y-1">
                                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Settlement Amount</p>
                                <div className="text-4xl font-black text-white italic tracking-tighter">{formatPrice(selectedItem.amount)}</div>
                             </div>
                             <div className="text-right">
                                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Buyer</p>
                                <div className="flex items-center gap-3">
                                   <span className="text-sm font-black text-white italic uppercase tracking-tight">{selectedItem.addedBy}</span>
                                </div>
                             </div>
                          </div>
                          <button 
                            onClick={async () => {
                              await navigator.clipboard.writeText(`Shopping: ${selectedItem.title} - ${formatPrice(selectedItem.amount)}`);
                              toast.success("Manifest data copied!");
                            }}
                            className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-white/40 uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-3"
                          >
                             <Plus className="w-4 h-4" /> Share Record
                          </button>
                       </div>
                    </div>
                 </div>
              </motion.div>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


