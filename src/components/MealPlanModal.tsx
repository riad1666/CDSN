"use client";

import { useState } from "react";
import { X, Loader2, Calendar, Coffee, Sun, Moon } from "lucide-react";
import { db } from "@/lib/firebase/config";
import { collection, addDoc, updateDoc, doc } from "firebase/firestore";
import toast from "react-hot-toast";

interface MealPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  editMeal?: any; // Existing meal to edit
}

export function MealPlanModal({ isOpen, onClose, groupId, editMeal }: MealPlanModalProps) {
  const [date, setDate] = useState(editMeal?.date || new Date().toISOString().split("T")[0]);
  const [breakfast, setBreakfast] = useState(editMeal?.breakfast || "");
  const [lunch, setLunch] = useState(editMeal?.lunch || "");
  const [dinner, setDinner] = useState(editMeal?.dinner || "");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return toast.error("Date is required");

    setLoading(true);
    try {
      const mealData = {
        date,
        breakfast,
        lunch,
        dinner,
        groupId,
        isDeleted: false,
        updatedAt: new Date().toISOString(),
      };

      if (editMeal?.id) {
        await updateDoc(doc(db, "mealPlans", editMeal.id), mealData);
        toast.success("Meal plan updated!");
      } else {
        await addDoc(collection(db, "mealPlans"), {
          ...mealData,
          createdAt: new Date().toISOString(),
        });
        toast.success("Meal plan added!");
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save meal plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-200">
      <div className="glass-panel w-full max-w-md p-8 relative shadow-2xl border-white/10">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>

        <div className="w-16 h-16 rounded-2xl bg-orange-500/20 flex items-center justify-center mb-6 mx-auto">
            <Calendar className="w-8 h-8 text-orange-400" />
        </div>

        <h2 className="text-2xl font-black text-white mb-2 text-center tracking-tighter uppercase italic">
          {editMeal ? "Edit Meal" : "Plan New Meal"}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Meal Date</label>
            <input 
              type="date" 
              required
              className="w-full glass-input py-3"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                <Coffee className="w-3 h-3 text-amber-400" /> Breakfast
            </label>
            <input 
              type="text" 
              placeholder="What's for breakfast?"
              className="w-full glass-input py-3"
              value={breakfast}
              onChange={e => setBreakfast(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                <Sun className="w-3 h-3 text-orange-400" /> Lunch
            </label>
            <input 
              type="text" 
              placeholder="What's for lunch?"
              className="w-full glass-input py-3"
              value={lunch}
              onChange={e => setLunch(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                <Moon className="w-3 h-3 text-indigo-400" /> Dinner
            </label>
            <input 
              type="text" 
              placeholder="What's for dinner?"
              className="w-full glass-input py-3"
              value={dinner}
              onChange={e => setDinner(e.target.value)}
            />
          </div>

          <button type="submit" disabled={loading} className="w-full glass-button-secondary py-4 font-black uppercase tracking-[0.2em] text-xs bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500 hover:text-white mt-4">
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (editMeal ? "Update Plan" : "Confirm Plan")}
          </button>
        </form>
      </div>
    </div>
  );
}
