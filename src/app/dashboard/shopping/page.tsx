"use client";

import { useEffect, useState } from "react";
import { Plus, ArrowLeft, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/firebase/config";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { AddShoppingModal } from "@/components/AddShoppingModal";

interface ShoppingItem {
  id: string;
  title: string;
  details: string;
  amount: number;
  addedBy: string;
  date: string;
  images: string[];
}

export default function ShoppingPage() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const { userData } = useAuth();

  useEffect(() => {
    const q = query(collection(db, "shopping"), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data: ShoppingItem[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as ShoppingItem));
      setItems(data);
    });
    return () => unsub();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
             Shopping
          </h2>
        </div>
        <button onClick={() => setModalOpen(true)} className="glass-button py-2.5 px-5 text-sm">
          <Plus className="w-4 h-4" /> Add Shopping
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.length === 0 && (
          <div className="col-span-3 text-center text-white/40 py-12">No shopping data available.</div>
        )}
        {items.map(item => (
          <div key={item.id} className="glass-panel overflow-hidden group border border-white/5">
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
                <div className="w-full h-full flex items-center justify-center text-white/20">No Image</div>
              )}
            </div>
            <div className="p-5">
              <h3 className="text-lg font-bold text-white mb-1">{item.title}</h3>
              <div className="text-2xl font-bold text-primary mb-4">₩{Math.round(item.amount).toLocaleString()}</div>
              
              <div className="flex items-center justify-between text-xs text-white/50">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-3 h-3" />
                  <span className="truncate max-w-[100px]">{item.addedBy}</span>
                </div>
                <span>{item.date ? format(new Date(item.date), "yyyy-MM-dd") : ""}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <AddShoppingModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}

