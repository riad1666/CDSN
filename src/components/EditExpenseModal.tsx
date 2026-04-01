"use client";

import { useState, useEffect } from "react";
import { X, Save, Trash2, Loader2, DollarSign, Calendar, Tag, User, Users } from "lucide-react";

import { Expense, UserBasicInfo, getGroupMembers, updateExpense, deleteExpense } from "@/lib/firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense;
}

export function EditExpenseModal({ isOpen, onClose, expense }: EditExpenseModalProps) {
  const { userData } = useAuth();
  const [title, setTitle] = useState(expense.title);
  const [amount, setAmount] = useState(expense.amount.toString());
  const [date, setDate] = useState(expense.date.split('T')[0]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>(expense.splitBetween);
  const [members, setMembers] = useState<UserBasicInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen && userData?.currentGroupId) {
      getGroupMembers(userData.currentGroupId).then(list => {
        // Filter out admins and superadmins from eligible members
        const eligible = list.filter(m => m.role !== "admin" && m.role !== "superadmin");
        setMembers(eligible);
      });
      setTitle(expense.title);
      setAmount(expense.amount.toString());
      setDate(expense.date.split('T')[0]);
      setSelectedMembers(expense.splitBetween);
    }
  }, [isOpen, userData?.currentGroupId, expense]);

  if (!isOpen) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount || selectedMembers.length === 0) {
      return toast.error("Please fill all required fields");
    }

    setLoading(true);
    try {
      await updateExpense(expense.id, {
        title: title.trim(),
        amount: parseFloat(amount),
        date: new Date(date).toISOString(),
        splitBetween: selectedMembers
      });
      toast.success("Expense updated successfully!");
      onClose();
    } catch (error) {
      toast.error("Failed to update expense");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this expense?")) return;
    setIsDeleting(true);
    try {
      await deleteExpense(expense.id);
      toast.success("Expense deleted");
      onClose();
    } catch (error) {
      toast.error("Failed to delete expense");
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleMember = (uid: string) => {
    setSelectedMembers(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl glass-card rounded-[3rem] overflow-hidden shadow-2xl flex flex-col md:flex-row border-white/10"
        >
          {/* Left Side: Illustration/Meta */}
          <div className="md:w-1/3 bg-primary/10 p-10 flex flex-col justify-between border-r border-white/5">
             <div className="space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
                   <Tag className="w-8 h-8 text-primary" />
                </div>
                <div>
                   <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none">Edit Ledger</h2>
                   <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em] mt-2 italic shadow-primary/20">Authorized Terminal</p>
                </div>
             </div>
             
             <button 
               onClick={handleDelete}
               disabled={isDeleting}
               className="flex items-center gap-3 text-destructive hover:text-white transition-colors group mt-8"
             >
                <div className="w-10 h-10 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center group-hover:bg-destructive group-hover:border-transparent transition-all">
                   {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Delete Entry</span>
             </button>
          </div>

          {/* Right Side: Form */}
          <form onSubmit={handleUpdate} className="flex-1 p-10 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar bg-background">
             <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Title</label>
                   <div className="relative">
                      <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                      <input 
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-sm text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold"
                        placeholder="Expense title"
                      />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Amount</label>
                      <div className="relative">
                         <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                         <input 
                           type="number"
                           step="0.01"
                           value={amount}
                           onChange={e => setAmount(e.target.value)}
                           className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-sm text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold"
                           placeholder="0.00"
                         />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Date</label>
                      <div className="relative">
                         <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                         <input 
                           type="date"
                           value={date}
                           onChange={e => setDate(e.target.value)}
                           className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-sm text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold"
                         />
                      </div>
                   </div>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Split Between</label>
                      <button 
                        type="button" 
                        onClick={() => setSelectedMembers(members.map(m => m.uid))}
                        className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                      >
                         Select All
                      </button>
                   </div>
                   <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto px-1 custom-scrollbar">
                      {members.map(member => (
                         <button
                            key={member.uid}
                            type="button"
                            onClick={() => toggleMember(member.uid)}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left group ${
                               selectedMembers.includes(member.uid)
                               ? 'bg-primary/10 border-primary text-white'
                               : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                            }`}
                         >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                               selectedMembers.includes(member.uid) ? 'bg-primary text-white' : 'bg-white/5 text-white/20'
                            }`}>
                               <User className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-tight truncate">{member.name}</span>
                         </button>
                      ))}
                   </div>
                </div>
             </div>

             <button 
               type="submit" 
               disabled={loading}
               className="w-full py-5 bg-primary rounded-2xl text-white text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/30 mt-4"
             >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Sync Ledger Entry
             </button>
          </form>
          
          <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 text-white/30 hover:text-white transition-all md:hidden">
             <X className="w-5 h-5" />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
