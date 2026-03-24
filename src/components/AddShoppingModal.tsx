"use client";

import { useState } from "react";
import { X, Upload, Loader2, Image as ImageIcon, Plus, Minus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, addDoc, updateDoc, doc } from "firebase/firestore";
import { uploadReceipts } from "@/lib/firebase/storage";
import { getApprovedUsers } from "@/lib/firebase/firestore";
import toast from "react-hot-toast";

export function AddShoppingModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { userData } = useAuth();
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<{name: string, amount: string}[]>([{ name: "", amount: "" }]);
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setImages(Array.from(e.target.files));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || items.some(it => !it.name || !it.amount)) return toast.error("Title and all item amounts required");

    const totalAmount = items.reduce((acc, it) => acc + (parseFloat(it.amount) || 0), 0);
    if (totalAmount <= 0) return toast.error("Total amount must be greater than 0");

    setLoading(true);
    try {
      const shopRef = await addDoc(collection(db, "shopping"), {
        title,
        items,
        amount: totalAmount,
        addedBy: userData?.name,
        date: new Date().toISOString(),
        images: [] 
      });

      if (images.length > 0) {
        const imageUrls = await uploadReceipts(images, shopRef.id);
        await updateDoc(doc(db, "shopping", shopRef.id), { images: imageUrls });
      }

      const allUsers = await getApprovedUsers();
      const splitUids = allUsers.map(u => u.uid);
      
      await addDoc(collection(db, "expenses"), {
        title: `Shopping: ${title}`,
        amount: totalAmount,
        paidBy: userData?.uid,
        splitBetween: splitUids,
        date: new Date().toISOString(),
        receipts: []
      });

      toast.success("Shopping created and added to Expenses!");
      onClose();
      setTitle(""); setItems([{ name: "", amount: "" }]); setImages([]);
    } catch (err: any) {
      toast.error(err.message || "Failed to create shopping");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-lg p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-white mb-6">Add Shopping</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
           <div className="space-y-1">
            <label className="text-xs font-semibold text-white/60 uppercase">Title</label>
            <input type="text" placeholder="e.g. Weekly Groceries" className="w-full glass-input" value={title} onChange={e => setTitle(e.target.value)} required />
          </div>

          <div className="space-y-3">
             <label className="text-xs font-semibold text-white/60 uppercase block mb-2">Shopping Items</label>
             {items.map((item, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input type="text" placeholder="Item name" className="w-[60%] glass-input" value={item.name} onChange={(e) => {
                    const newItems = [...items]; newItems[index].name = e.target.value; setItems(newItems);
                  }} required />
                  <input type="number" placeholder="₩ Amount" className="w-[30%] glass-input" value={item.amount} onChange={(e) => {
                    const newItems = [...items]; newItems[index].amount = e.target.value; setItems(newItems);
                  }} required />
                  {index === items.length - 1 ? (
                    <button type="button" onClick={() => setItems([...items, { name: '', amount: '' }])} className="w-[10%] shrink-0 h-10 bg-primary/20 text-primary rounded-xl flex items-center justify-center hover:bg-primary/40"><Plus className="w-4 h-4"/></button>
                  ) : (
                    <button type="button" onClick={() => setItems(items.filter((_, i) => i !== index))} className="w-[10%] shrink-0 h-10 bg-rose-500/20 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500/40"><Minus className="w-4 h-4"/></button>
                  )}
                </div>
             ))}
             <div className="flex justify-between items-center text-white/80 font-bold px-1 mt-4 mb-2">
               <span>Total Check Amount:</span>
               <span className="text-primary text-xl">₩{items.reduce((acc, it) => acc + (parseFloat(it.amount) || 0), 0).toLocaleString()}</span>
             </div>
          </div>

          <div className="space-y-1">
             <label className="text-xs font-semibold text-white/60 uppercase">Images</label>
             <div className="border-2 border-dashed border-white/20 rounded-xl p-6 flex flex-col items-center justify-center relative hover:bg-white/5 transition-colors cursor-pointer group">
               <input type="file" multiple accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
               <ImageIcon className="w-8 h-8 text-white/30 group-hover:text-primary transition-colors mb-2" />
               <p className="text-sm text-white/60">{images.length > 0 ? `${images.length} files` : "Click to upload"}</p>
             </div>
          </div>
          <button type="submit" disabled={loading} className="w-full glass-button mt-4">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Publish"}
          </button>
        </form>
      </div>
    </div>
  );
}
