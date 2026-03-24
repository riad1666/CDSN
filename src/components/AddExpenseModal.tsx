"use client";

import { useState } from "react";
import { Plus, X, Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
import { uploadReceipts } from "@/lib/firebase/storage";
import toast from "react-hot-toast";

export function AddExpenseModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { userData } = useAuth();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [receipts, setReceipts] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setReceipts(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) return toast.error("Title and amount are required");

    setLoading(true);
    try {
      const q = query(collection(db, "users"), where("status", "==", "approved"), where("role", "==", "user"));
      const snapshot = await getDocs(q);
      const splitBetween: string[] = [];
      snapshot.forEach(docSnap => splitBetween.push(docSnap.id));
      
      if (splitBetween.length === 0) {
        splitBetween.push(userData!.uid);
      }
      
      const expenseRef = await addDoc(collection(db, "expenses"), {
        title,
        amount: parseFloat(amount),
        paidBy: userData!.uid,
        splitBetween,
        date,
        receipts: [] 
      });

      if (receipts.length > 0) {
        const receiptUrls = await uploadReceipts(receipts, expenseRef.id);
        await updateDoc(doc(db, "expenses", expenseRef.id), { receipts: receiptUrls });
      }

      toast.success("Expense added explicitly! Split evenly.");
      onClose();
      // reset forms
      setTitle(""); setAmount(""); setReceipts([]);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong.");
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
        
        <h2 className="text-2xl font-bold text-white mb-6">Add Expense</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/60 uppercase">Title</label>
            <input 
              type="text" 
              placeholder="e.g., Weekly Groceries" 
              className="w-full glass-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/60 uppercase">Date</label>
              <input 
                type="date" 
                className="w-full glass-input"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-1">
             <label className="text-xs font-semibold text-white/60 uppercase">Receipts (Optional)</label>
             <div className="border-2 border-dashed border-white/20 rounded-xl p-6 flex flex-col items-center justify-center relative hover:bg-white/5 transition-colors cursor-pointer group">
               <input 
                 type="file" 
                 multiple 
                 accept="image/*" 
                 onChange={handleFileChange} 
                 className="absolute inset-0 opacity-0 cursor-pointer" 
               />
               <ImageIcon className="w-8 h-8 text-white/30 group-hover:text-primary transition-colors mb-2" />
               <p className="text-sm text-white/60 text-center">
                 {receipts.length > 0 ? `${receipts.length} file(s) selected` : "Click or drag to upload receipts"}
               </p>
             </div>
          </div>
          
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-sm text-blue-200">
            This expense will be automatically split strictly among all approved residents.
          </div>

          <button type="submit" disabled={loading} className="w-full glass-button mt-4">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Expense"}
          </button>
        </form>
      </div>
    </div>
  );
}
