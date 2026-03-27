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
import { motion } from "framer-motion";

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
  const { userData } = useAuth();

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
    return () => unsub();
  }, [userData?.currentGroupId]);

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
                <h2 className="text-3xl font-bold text-white mb-4">Shopping Lists</h2>
                <p className="text-white/60 mb-8 leading-relaxed">
                    Select a group from the sidebar to view its shared shopping history and items.
                </p>
                <Link href="/dashboard" className="glass-button text-sm py-3 px-8 mx-auto">Go to Dashboard</Link>
            </motion.div>
        </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Shopping History</h2>
        </div>
        <button onClick={() => setModalOpen(true)} className="glass-button py-2.5 px-5 text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Record
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.length === 0 && (
          <div className="col-span-3 text-center text-white/20 py-12 glass-panel border-dashed h-48 flex items-center justify-center">
              No shopping records found in this group.
          </div>
        )}
        {items.map(item => (
          <div key={item.id} onClick={() => setSelectedItem(item)} className="glass-panel overflow-hidden group border border-white/5 cursor-pointer hover:border-primary/30 transition-all relative">
             {(userData?.role === "admin" || userData?.role === "superadmin") && (
                <button onClick={async (e) => {
                  e.stopPropagation();
                  if(confirm("Delete this shopping record?")) {
                    await updateDoc(doc(db, "shopping", item.id), { isDeleted: true });
                    toast.success("Record deleted");
                  }
                }} className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all border border-rose-500/30">
                  <Trash2 className="w-4 h-4" />
                </button>
             )}
            <div className="h-48 w-full flex bg-black/20 relative">
              {item.images && item.images.length > 0 ? (
                item.images.length === 1 ? (
                  <img src={item.images[0]} className="w-full h-full object-cover" />
                ) : (
                  <>
                    <img src={item.images[0]} className="w-1/2 h-full object-cover border-r border-[#1a1b2e]" />
                    <img src={item.images[1]} className="w-1/2 h-full object-cover" />
                  </>
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/10 uppercase tracking-widest text-[10px] font-bold">No Image</div>
              )}
            </div>
            <div className="p-5">
              <h3 className="text-lg font-bold text-white mb-1 truncate">{item.title}</h3>
              <div className="text-2xl font-extrabold text-primary mb-4 tracking-tighter">₩{Math.round(item.amount).toLocaleString()}</div>
              
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-white/30">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-3 h-3 text-white/20" />
                  <span className="truncate max-w-[100px]">{item.addedBy}</span>
                </div>
                <span>{item.date ? format(new Date(item.date), "MMM dd, yyyy") : ""}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <AddShoppingModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} />
      
      {selectedItem && (
         <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={() => setSelectedItem(null)}>
            <div className="glass-panel w-full max-w-sm p-8 relative shadow-2xl border-white/10" onClick={e => e.stopPropagation()}>
               <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center cursor-pointer hover:bg-white/20 border border-white/10 transition-colors shadow-lg" onClick={() => setSelectedItem(null)}>
                  <Plus className="w-6 h-6 text-white transform rotate-45" />
               </div>
               
               <h2 className="text-2xl font-black text-white mb-1 tracking-tighter">{selectedItem.title}</h2>
               <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-8 flex items-center justify-between border-b border-white/5 pb-4">
                  <span className="flex items-center gap-1.5"><UserIcon className="w-3 h-3 text-white/20"/> {selectedItem.addedBy}</span>
                  <span>{selectedItem.date ? format(new Date(selectedItem.date), "MMMM dd") : ""}</span>
               </div>
               
               <div className="space-y-4 mb-8 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                  {selectedItem.items && selectedItem.items.length > 0 ? selectedItem.items.map((it, idx) => (
                     <div key={idx} className="flex items-center justify-between text-sm py-2 group/item">
                        <span className="text-white/50 group-hover/item:text-white transition-colors">{it.name}</span>
                        <span className="text-white font-bold ml-4 whitespace-nowrap">₩{parseFloat(it.amount).toLocaleString()}</span>
                     </div>
                  )) : (
                     <div className="text-white/20 text-xs font-bold uppercase tracking-widest text-center py-8">Legacy Record</div>
                  )}
               </div>

               <div className="flex items-center justify-between pt-6 border-t border-white/10">
                  <span className="text-white/40 uppercase tracking-widest text-[10px] font-black">Total Spend</span>
                  <span className="text-primary font-black text-3xl tracking-tighter">₩{selectedItem.amount.toLocaleString()}</span>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}

