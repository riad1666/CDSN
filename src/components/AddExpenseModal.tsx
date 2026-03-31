"use client";

import { useState, useEffect } from "react";
import { Plus, X, Upload, Loader2, Image as ImageIcon, Users, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, addDoc, updateDoc, doc } from "firebase/firestore";
import { uploadReceipts } from "@/lib/firebase/storage";
import { getGroupMembers, writeNotification, writeGroupActivity, UserBasicInfo, Expense } from "@/lib/firebase/firestore";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrency } from "@/context/CurrencyContext";

export function AddExpenseModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { userData } = useAuth();
  const { formatPrice } = useCurrency();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [receipts, setReceipts] = useState<File[]>([]);
  const [category, setCategory] = useState<Expense['category']>("Other");
  const [loading, setLoading] = useState(false);
  
  const [members, setMembers] = useState<UserBasicInfo[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);

  useEffect(() => {
    if (isOpen && userData?.currentGroupId) {
      setMembersLoading(true);
      getGroupMembers(userData.currentGroupId)
        .then(list => {
           // Filter out admins and superadmins from splitting
           const eligibleMembers = list.filter(m => m.role !== "admin" && m.role !== "superadmin");
           setMembers(eligibleMembers);
           setSelectedMembers(eligibleMembers.map(u => u.uid));
        })
        .catch(err => console.error("Failed to fetch group members:", err))
        .finally(() => setMembersLoading(false));
    }
  }, [isOpen, userData?.currentGroupId]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setReceipts(Array.from(e.target.files));
    }
  };

  const toggleMember = (uid: string) => {
     setSelectedMembers(prev => 
        prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
     );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) return toast.error("Title and amount are required");
    if (selectedMembers.length === 0) return toast.error("Select at least one member to split with");

    setLoading(true);
    try {
      if (!userData?.currentGroupId) {
        throw new Error("No group selected. Please select a group first.");
      }
      
      const expenseRef = await addDoc(collection(db, "expenses"), {
        title,
        amount: parseFloat(amount),
        paidBy: userData!.uid,
        splitBetween: selectedMembers,
        date,
        receipts: [],
        category,
        groupId: userData.currentGroupId,
        isDeleted: false,
        createdAt: new Date().toISOString()
      });

      let receiptUrls: string[] = [];
      if (receipts.length > 0) {
        receiptUrls = await uploadReceipts(receipts, expenseRef.id);
        await updateDoc(doc(db, "expenses", expenseRef.id), { receipts: receiptUrls });
      }

      // Log activity
      await writeGroupActivity(
        userData.currentGroupId, 
        "expense_added", 
        `${userData.name} added a new expense: "${title}" (${formatPrice(parseFloat(amount))})`,
        userData.uid
      );

      // Notify others
      const otherMembers = selectedMembers.filter(id => id !== userData.uid);
      await Promise.all(otherMembers.map(memberId => 
        writeNotification(
          memberId, 
          "EXPENSE_ADDED", 
          `${userData.name} added "${title}" in your group.`,
          { groupId: userData.currentGroupId, expenseId: expenseRef.id }
        )
      ));

      toast.success("Expense added successfully!");
      onClose();
      setTitle(""); setAmount(""); setReceipts([]);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="glass-panel w-full max-w-lg p-8 relative border-white/10 shadow-2xl">
        <button onClick={onClose} className="absolute top-6 right-6 text-white/30 hover:text-white transition-colors bg-white/5 p-2 rounded-xl">
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-8">Add Expense</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Title</label>
            <input 
              type="text" 
              placeholder="e.g., Weekly Groceries" 
              className="w-full glass-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Category</label>
            <div className="grid grid-cols-3 gap-2">
               {["Food", "Utilities", "Supplies", "Kitchen", "Grocery", "Other"].map((cat) => (
                 <button
                   key={cat}
                   type="button"
                   onClick={() => setCategory(cat as any)}
                   className={`py-2 px-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${
                     category === cat 
                     ? "bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(var(--color-primary),0.2)]" 
                     : "bg-white/2 border-white/5 text-white/40 hover:border-white/20"
                   }`}
                 >
                   {cat}
                 </button>
               ))}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Amount</label>
              <input 
                type="number" 
                placeholder="0" 
                className="w-full glass-input font-mono font-bold text-primary"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Date</label>
              <input 
                type="date" 
                className="w-full glass-input"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-1.5">
             <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Split Between</label>
                <button 
                  type="button" 
                  onClick={() => setSelectedMembers(members.map(m => m.uid))}
                  className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline"
                >
                   Select All
                </button>
             </div>
             
             {membersLoading ? (
                 <div className="flex gap-2">
                    {[1, 2, 3].map(i => <div key={i} className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />)}
                 </div>
             ) : (
                 <div className="flex flex-wrap gap-3 p-4 bg-white/2 rounded-2xl border border-white/5">
                    {members.map(member => {
                       const isSelected = selectedMembers.includes(member.uid);
                       return (
                          <div 
                             key={member.uid}
                             onClick={() => toggleMember(member.uid)}
                             className={`relative group cursor-pointer transition-all duration-300 ${isSelected ? 'scale-100 opacity-100' : 'scale-90 opacity-40 hover:opacity-100'}`}
                             title={member.name}
                          >
                             <div className={`w-12 h-12 rounded-2xl border-2 overflow-hidden flex items-center justify-center ${isSelected ? 'border-primary shadow-[0_0_15px_rgba(var(--color-primary),0.3)]' : 'border-white/10'}`}>
                                {member.profileImage ? (
                                   <img src={member.profileImage} alt={member.name} className="w-full h-full object-cover" />
                                ) : (
                                   <span className={`text-lg font-black ${isSelected ? 'text-primary' : 'text-white/40'}`}>{member.name.charAt(0)}</span>
                                )}
                             </div>
                             {isSelected && (
                                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center border-2 border-[#0f101a] shadow-lg">
                                   <Check className="w-3 h-3" />
                                </div>
                             )}
                             <p className="text-[8px] font-black text-white/60 uppercase tracking-widest text-center mt-1 truncate w-12">{member.name.split(" ")[0]}</p>
                          </div>
                       )
                    })}
                 </div>
             )}
          </div>
          
          <div className="space-y-1.5">
             <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Receipts (Optional)</label>
             <div className="border border-dashed border-white/20 bg-white/2 rounded-2xl p-6 flex flex-col items-center justify-center relative hover:bg-white/5 transition-colors cursor-pointer group">
               <input 
                 type="file" 
                 multiple 
                 accept="image/*" 
                 onChange={handleFileChange} 
                 className="absolute inset-0 opacity-0 cursor-pointer" 
               />
               <ImageIcon className="w-8 h-8 text-white/20 group-hover:text-primary transition-colors mb-2" />
               <p className="text-[10px] text-white/40 text-center font-bold tracking-widest uppercase">
                 {receipts.length > 0 ? <span className="text-primary">{receipts.length} Neural files ready</span> : "Securely attach receipt images"}
               </p>
             </div>
          </div>
          
          <button type="submit" disabled={loading} className="w-full glass-button py-4 text-xs tracking-[0.2em] shadow-[0_10px_30px_rgba(var(--color-primary),0.2)]">
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Initiate Transaction Split"}
          </button>
        </form>
      </div>
    </div>
  );
}
