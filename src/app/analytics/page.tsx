"use client";

import { useAuth } from "@/context/AuthContext";
import { BarChart, TrendingUp, TrendingDown, DollarSign, Activity } from "lucide-react";
import { motion } from "framer-motion";

export default function AnalyticsPage() {
  const { userData } = useAuth();
  
  if (!userData?.currentGroupId) {
       return (
        <div className="h-[80vh] flex flex-col items-center justify-center text-center px-4 animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 rounded-3xl bg-indigo-500/10 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                <BarChart className="w-12 h-12 text-indigo-400" />
            </div>
            <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter italic">No Data Source Found</h2>
            <p className="text-white/40 text-sm max-w-sm uppercase font-bold tracking-widest leading-relaxed">Join a group to unlock powerful neural analytics and spending trends.</p>
        </div>
       );
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
           <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
                 <BarChart className="w-6 h-6 text-indigo-400" />
              </div>
              Neural Analytics
           </h2>
           <p className="text-[10px] text-indigo-400 mt-2 font-black uppercase tracking-[0.3em]">Quantum Spending Analysis Engine</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-8 border-l-2 border-l-indigo-500 hover:scale-[1.02] transition-transform">
          <div className="flex items-center gap-3 mb-4 text-white/40 uppercase tracking-widest text-[10px] font-bold">
            <DollarSign className="w-4 h-4 text-indigo-400" />
            <span>Total Group Volume</span>
          </div>
          <div className="text-4xl font-black text-white tracking-tighter">₩1,204,500</div>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-400 tracking-widest uppercase">
            <TrendingUp className="w-3 h-3" /> +14.5% from last month
          </div>
        </div>

        <div className="glass-panel p-8 border-l-2 border-l-primary hover:scale-[1.02] transition-transform">
          <div className="flex items-center gap-3 mb-4 text-white/40 uppercase tracking-widest text-[10px] font-bold">
            <Activity className="w-4 h-4 text-primary" />
            <span>Your Neural Footprint</span>
          </div>
          <div className="text-4xl font-black text-white tracking-tighter">₩450,200</div>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-rose-400 tracking-widest uppercase">
            <TrendingDown className="w-3 h-3" /> Highest spender this week
          </div>
        </div>
        
        <div className="glass-panel p-8 border-l-2 border-l-emerald-500 hover:scale-[1.02] transition-transform">
          <div className="flex items-center gap-3 mb-4 text-white/40 uppercase tracking-widest text-[10px] font-bold">
            <TrendingDown className="w-4 h-4 text-emerald-400" />
            <span>Personal Savings</span>
          </div>
          <div className="text-4xl font-black text-white tracking-tighter">₩85,000</div>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-400 tracking-widest uppercase">
            <TrendingUp className="w-3 h-3" /> Saved via shared meals
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="glass-panel p-8 min-h-[400px] flex flex-col">
            <h3 className="text-sm font-black text-white/60 uppercase tracking-widest mb-6 border-b border-white/5 pb-4">Spending Frequency</h3>
            <div className="flex-1 flex items-center justify-center flex-col gap-4 opacity-50">
               <BarChart className="w-16 h-16 text-indigo-400/50" />
               <p className="text-[10px] font-bold uppercase tracking-widest">Chart Visualization Engine Loading...</p>
            </div>
        </div>
        <div className="glass-panel p-8 min-h-[400px] flex flex-col">
            <h3 className="text-sm font-black text-white/60 uppercase tracking-widest mb-6 border-b border-white/5 pb-4">Category Distribution</h3>
            <div className="flex-1 flex items-center justify-center flex-col gap-4 opacity-50">
               <Activity className="w-16 h-16 text-primary/50" />
               <p className="text-[10px] font-bold uppercase tracking-widest">Distribution Matrix Offline</p>
            </div>
        </div>
      </div>
    </div>
  );
}
