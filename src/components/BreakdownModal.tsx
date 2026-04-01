"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, TrendingDown, User, DollarSign, ArrowRight } from "lucide-react";
import { UserBasicInfo } from "@/lib/firebase/firestore";
import { useCurrency } from "@/context/CurrencyContext";

interface BreakdownItem {
    uid: string;
    amount: number;
}

interface BreakdownModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'owe' | 'receive';
    list: BreakdownItem[];
    usersMap: Record<string, UserBasicInfo>;
    onSettle?: (uid: string, amount: number) => void;
}



export function BreakdownModal({ isOpen, onClose, type, list, usersMap, onSettle }: BreakdownModalProps) {

    const { formatPrice } = useCurrency();

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                />

                {/* Content */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-lg glass-card rounded-[3rem] overflow-hidden shadow-2xl border-white/10"
                >
                    {/* Header */}
                    <div className={`p-8 pb-6 flex items-center justify-between border-b border-white/5 ${type === 'owe' ? 'bg-destructive/5' : 'bg-success/5'}`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${type === 'owe' ? 'bg-destructive/20 text-destructive' : 'bg-success/20 text-success'}`}>
                                {type === 'owe' ? <TrendingDown className="w-6 h-6" /> : <TrendingUp className="w-6 h-6" />}
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic line-none">
                                    {type === 'owe' ? 'To Owe' : 'To Receive'}
                                </h2>
                                <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] mt-1">
                                    Detailed breakdown of your debts
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl bg-white/5 text-white/30 hover:text-white transition-all">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* List */}
                    <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        <div className="space-y-3">
                            {list.length === 0 ? (
                                <div className="py-20 text-center flex flex-col items-center gap-4">
                                    <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center">
                                        <TrendingUp className="w-8 h-8 text-white/10" />
                                    </div>
                                    <p className="text-white/20 font-black text-[10px] uppercase tracking-widest italic">No pending transactions in this category</p>
                                </div>
                            ) : (
                                list.map((item, i) => {
                                    const user = usersMap[item.uid];
                                    return (
                                        <motion.div 
                                            key={item.uid}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="glass-panel p-5 rounded-[2rem] border-white/5 flex items-center justify-between group hover:border-white/20 transition-all"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                                                    {user?.profileImage ? (
                                                        <img src={user.profileImage} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User className="w-5 h-5 text-white/20" />
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="text-white font-black text-sm tracking-tight uppercase italic truncate max-w-[150px]">
                                                        {user?.name || 'Unknown Agent'}
                                                    </h4>
                                                    <p className="text-[9px] text-white/30 font-black uppercase tracking-widest mt-0.5">
                                                        {user?.studentId || 'No ID'} • {user?.room || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <div className={`text-lg font-black tracking-tighter italic ${type === 'owe' ? 'text-destructive' : 'text-success'}`}>
                                                        {type === 'owe' ? '-' : '+'}{formatPrice(item.amount)}
                                                    </div>
                                                    <div className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Pending Settlement</div>
                                                </div>
                                                {type === 'owe' && onSettle && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); onSettle(item.uid, item.amount); }}
                                                        className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center hover:bg-primary hover:text-white transition-all group/btn shrink-0"
                                                        title="Settle this debt"
                                                    >

                                                        <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-0.5 transition-transform" />
                                                    </button>
                                                )}
                                            </div>

                                        </motion.div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-8 border-t border-white/5">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Total Amount</span>
                            <span className={`text-2xl font-black italic tracking-tighter ${type === 'owe' ? 'text-destructive' : 'text-success'}`}>
                                {formatPrice(list.reduce((acc, i) => acc + i.amount, 0))}
                            </span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
