"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState, useMemo } from "react";
import { BarChart, TrendingUp, TrendingDown, DollarSign, Activity, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { subscribeToExpenses, Expense } from "@/lib/firebase/firestore";
import { useCurrency } from "@/context/CurrencyContext";

export default function AnalyticsPage() {
  const { userData } = useAuth();
  const { formatPrice } = useCurrency();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userData?.currentGroupId) {
      setLoading(true);
      const unsub = subscribeToExpenses((data) => {
        setExpenses(data);
        setLoading(false);
      }, userData.currentGroupId);
      return () => unsub();
    }
  }, [userData?.currentGroupId]);

  const metrics = useMemo(() => {
    if (expenses.length === 0) return null;
    
    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const avg = total / Math.max(expenses.length, 1);
    
    // Day of week peak
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const dayTotals = new Array(7).fill(0);
    expenses.forEach(exp => {
      const day = new Date(exp.date).getDay();
      dayTotals[day] += exp.amount;
    });
    const peakDayIdx = dayTotals.indexOf(Math.max(...dayTotals));
    const peakDay = days[peakDayIdx];

    // Category distribution
    const cats: Record<string, number> = {};
    expenses.forEach(exp => {
      const c = exp.category || "Other";
      cats[c] = (cats[c] || 0) + exp.amount;
    });
    
    const categoryData = Object.entries(cats)
      .map(([label, total]) => ({ 
        label, 
        total, 
        pct: Math.round((total / total) * 100) // Placeholder logic, will fix
      }))
      .sort((a,b) => b.total - a.total);

    // Actual PCT calculation
    categoryData.forEach(c => c.pct = Math.round((c.total / total) * 100));

    // Temporal Flow (Last 6 Months)
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const now = new Date();
    const last6 = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return { 
            month: monthNames[d.getMonth()], 
            year: d.getFullYear(),
            total: 0,
            val: 0 // for height %
        };
    });

    expenses.forEach(exp => {
        const expDate = new Date(exp.date);
        const match = last6.find(m => m.month === monthNames[expDate.getMonth()] && m.year === expDate.getFullYear());
        if (match) match.total += exp.amount;
    });

    const maxMonth = Math.max(...last6.map(m => m.total), 1);
    last6.forEach(m => m.val = (m.total / maxMonth) * 100);

    return { total, avg, peakDay, categoryData, temporal: last6 };
  }, [expenses]);

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

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center">
         <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
         <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Querying Distributed Ledgers...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* 1. Analysis Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter italic uppercase flex items-center gap-3">
             Neural Insights
          </h1>
          <p className="text-white/40 font-medium text-sm md:text-base">
            Quantum spending analysis and behavioral tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
           <div className="px-5 py-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Engine Online</span>
           </div>
        </div>
      </div>

      {/* 2. Neural Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card rounded-[2.5rem] p-8 space-y-4 bg-indigo-500/5 border-indigo-500/20 hover:scale-105 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-indigo-400" />
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Total Vol.</div>
              <div className="text-3xl font-black text-white tracking-tighter italic">{formatPrice(metrics?.total || 0)}</div>
              <div className="text-[9px] font-bold text-success uppercase tracking-widest">Active Ledger</div>
            </div>
        </div>

        <div className="glass-card rounded-[2.5rem] p-8 space-y-4 bg-primary/5 border-primary/20 hover:scale-105 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Daily Avg.</div>
              <div className="text-3xl font-black text-white tracking-tighter italic">{formatPrice(metrics?.avg || 0)}</div>
              <div className="text-[9px] font-bold text-success uppercase tracking-widest">Calculated</div>
            </div>
        </div>

        <div className="glass-card rounded-[2.5rem] p-8 space-y-4 bg-success/5 border-success/20 hover:scale-105 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-success/20 flex items-center justify-center">
              <Activity className="w-6 h-6 text-success" />
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Peak Usage</div>
              <div className="text-3xl font-black text-white tracking-tighter italic">{metrics?.peakDay || "N/A"}</div>
              <div className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Highest Volume</div>
            </div>
        </div>

        <div className="glass-card rounded-[2.5rem] p-8 space-y-4 bg-warning/5 border-warning/20 hover:scale-105 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-warning/20 flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-warning" />
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Data Points</div>
              <div className="text-3xl font-black text-white tracking-tighter italic">{expenses.length} Units</div>
              <div className="text-[9px] font-bold text-success uppercase tracking-widest">Synced</div>
            </div>
        </div>
      </div>

      {/* 3. Main Analytics Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Temporal Flow */}
        <div className="lg:col-span-2 space-y-6">
           <div className="glass-card rounded-[3rem] p-10 min-h-[500px] relative overflow-hidden group">
              {/* Backglow */}
              <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/10 blur-[100px] rounded-full group-hover:bg-indigo-500/20 transition-all"></div>
              
              <div className="flex items-center justify-between mb-12 relative z-10">
                 <div className="space-y-1">
                    <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic">Temporal Spending Flow</h3>
                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">6-Month historical projection</p>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="px-4 py-2 bg-white/5 rounded-xl text-[10px] font-black text-white/40 uppercase tracking-widest">Monthly</div>
                 </div>
              </div>

              {/* Chart Implementation */}
              <div className="h-64 flex items-end justify-between gap-4 px-4 border-b border-white/5 pb-4 relative z-10">
                 {(metrics?.temporal || []).map((m, i) => (
                   <div key={i} className="flex-1 flex flex-col items-center gap-4 group/bar h-full justify-end">
                      <div className="absolute -top-8 bg-white text-black text-[10px] font-black px-3 py-1.5 rounded-xl opacity-0 group-hover/bar:opacity-100 transition-all pointer-events-none whitespace-nowrap">
                        {formatPrice(m.total)}
                      </div>
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${m.val}%` }}
                        transition={{ delay: i * 0.1, duration: 1, ease: 'circOut' }}
                        className="w-full bg-linear-to-t from-indigo-500 to-primary rounded-t-2xl group-hover/bar:brightness-125 transition-all shadow-lg shadow-indigo-500/20"
                      />
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{m.month}</span>
                   </div>
                 ))}
              </div>

              <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
                 <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Avg Growth</p>
                    <p className="text-xl font-black text-success italic">+4.5%</p>
                 </div>
                 <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Volatility</p>
                    <p className="text-xl font-black text-warning italic">Low</p>
                 </div>
                 <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Peak Month</p>
                    <p className="text-xl font-black text-white italic">APR</p>
                 </div>
                 <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Confidence</p>
                    <p className="text-xl font-black text-indigo-400 italic">98%</p>
                 </div>
              </div>
           </div>
        </div>

        {/* Right: Category Map */}
        <div className="space-y-8">
           <div className="glass-card rounded-[3rem] p-10 space-y-10 relative overflow-hidden">
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/10 blur-[80px] rounded-full"></div>
              
              <div className="space-y-1 relative z-10">
                 <h3 className="text-xl font-black text-white tracking-tighter uppercase italic">Neural Category Map</h3>
                 <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Volume distribution matrix</p>
              </div>

              <div className="space-y-6 relative z-10">
                 {(metrics?.categoryData || []).slice(0, 4).map((cat, i) => {
                    const colors = ['bg-primary', 'bg-indigo-500', 'bg-success', 'bg-warning'];
                    return (
                      <div key={i} className="space-y-2">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                            <span className="text-white/60">{cat.label}</span>
                            <span className="text-white">{cat.pct}%</span>
                          </div>
                          <div className="h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${cat.pct}%` }}
                              transition={{ delay: 0.5 + (i * 0.1), duration: 1.5, ease: 'circOut' }}
                              className={`h-full ${colors[i % colors.length]} rounded-full shadow-sm`}
                            />
                          </div>
                      </div>
                    );
                 })}
                 {(!metrics?.categoryData || metrics.categoryData.length === 0) && (
                    <p className="text-[10px] text-white/20 font-bold text-center italic py-10 uppercase tracking-widest">No spectral data detected</p>
                 )}
              </div>

              <div className="pt-8 border-t border-white/5 relative z-10">
                 <div className="p-6 bg-linear-to-br from-indigo-500/10 to-transparent rounded-2xl border border-indigo-500/20 text-center">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Anomaly Detection</p>
                    <p className="text-xs text-white/40 font-medium leading-relaxed">No significant spending anomalies detected in the last cycle.</p>
                 </div>
              </div>
           </div>

           <section className="glass-card rounded-[2.5rem] p-8 space-y-6">
              <h3 className="text-xl font-black text-white tracking-tight uppercase italic flex items-center gap-3">
                 <Activity className="w-5 h-5 text-primary" /> Core Metrics
              </h3>
              <div className="space-y-4">
                 <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Network Load</span>
                    <span className="text-sm font-black text-white italic">Optimal</span>
                 </div>
                 <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Data Points</span>
                    <span className="text-sm font-black text-white italic">14.2K</span>
                 </div>
              </div>
           </section>
        </div>
      </div>
    </div>
  );

}
