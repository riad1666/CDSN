"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { Calendar, ChefHat, Plus, ArrowLeft, Coffee, Sun, Moon, Edit2, LayoutGrid } from "lucide-react";
import { subscribeToMealPlans, MealPlan, subscribeToUserGroups, Group } from "@/lib/firebase/firestore";
import Link from "next/link";
import { format, addDays, startOfToday } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { MealPlanModal } from "@/components/MealPlanModal";

export default function MealPlanPage() {
    const { userData } = useAuth();
    const [meals, setMeals] = useState<MealPlan[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editMeal, setEditMeal] = useState<MealPlan | null>(null);
    const [group, setGroup] = useState<Group | null>(null);

    useEffect(() => {
        if (!userData?.currentGroupId) return;

        const unsubMeals = subscribeToMealPlans(userData.currentGroupId, (data) => setMeals(data));
        const unsubGroups = subscribeToUserGroups(userData.uid, (groups) => {
            const current = groups.find(g => g.id === userData.currentGroupId);
            if (current) setGroup(current);
        });

        return () => {
            unsubMeals();
            unsubGroups();
        };
    }, [userData?.uid, userData?.currentGroupId]);

    const userRole = group?.memberRoles?.[userData?.uid || ""] || "member";
    const isAdmin = userRole === "admin" || userRole === "owner";

    // Create a 7-day view starting from today
    const days = Array.from({ length: 7 }, (_, i) => addDays(startOfToday(), i));

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                            <ChefHat className="w-5 h-5 text-orange-400" />
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">Meal Plan</h2>
                    </div>
                </div>

                {isAdmin && (
                    <button 
                        onClick={() => { setEditMeal(null); setIsModalOpen(true); }}
                        className="glass-button text-xs py-2 px-4 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Plan Meal
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 gap-6">
                {days.map((day, idx) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const dayMeal = meals.find(m => m.date === dateStr);
                    
                    return (
                        <motion.div 
                            key={dateStr}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="glass-panel p-6 relative overflow-hidden group/day"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="text-center p-2 rounded-xl bg-white/5 border border-white/5 min-w-[60px]">
                                        <div className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">{format(day, "EEE")}</div>
                                        <div className="text-xl font-black text-white">{format(day, "dd")}</div>
                                    </div>
                                    <div>
                                        <h3 className="text-white font-black uppercase text-sm tracking-tight">{format(day, "MMMM yyyy")}</h3>
                                        {format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") && (
                                            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-black uppercase tracking-widest">Today</span>
                                        )}
                                    </div>
                                </div>
                                {isAdmin && dayMeal && (
                                    <button 
                                        onClick={() => { setEditMeal(dayMeal); setIsModalOpen(true); }}
                                        className="absolute top-4 right-4 md:static p-2 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all opacity-0 group-hover/day:opacity-100"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Breakfast */}
                                <div className="p-4 rounded-xl bg-white/2 border border-white/5 group/meal transition-colors hover:bg-white/5">
                                    <div className="flex items-center gap-2 mb-2 text-amber-400">
                                        <Coffee className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Breakfast</span>
                                    </div>
                                    <p className="text-sm text-white font-medium italic min-h-5">
                                        {dayMeal?.breakfast || "—"}
                                    </p>
                                </div>

                                {/* Lunch */}
                                <div className="p-4 rounded-xl bg-white/2 border border-white/5 group/meal transition-colors hover:bg-white/5">
                                    <div className="flex items-center gap-2 mb-2 text-orange-400">
                                        <Sun className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Lunch</span>
                                    </div>
                                    <p className="text-sm text-white font-medium italic min-h-5">
                                        {dayMeal?.lunch || "—"}
                                    </p>
                                </div>

                                {/* Dinner */}
                                <div className="p-4 rounded-xl bg-white/2 border border-white/5 group/meal transition-colors hover:bg-white/5">
                                    <div className="flex items-center gap-2 mb-2 text-indigo-400">
                                        <Moon className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Dinner</span>
                                    </div>
                                    <p className="text-sm text-white font-medium italic min-h-5">
                                        {dayMeal?.dinner || "—"}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {userData?.currentGroupId && (
                <MealPlanModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    groupId={userData.currentGroupId}
                    editMeal={editMeal}
                />
            )}
        </div>
    );
}
