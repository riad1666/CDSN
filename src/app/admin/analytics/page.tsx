"use client";

import { useState, useEffect } from "react";
import { 
  DollarSign, 
  Layers, 
  Users, 
  CreditCard,
  ArrowUpRight,
  TrendingUp,
  BarChart,
  PieChart as PieChartIcon
} from "lucide-react";
import { 
  BarChart as ReBarChart, Bar, PieChart as RePieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { subscribeToGlobalAnalytics, subscribeToSystemStats } from "@/lib/firebase/firestore";
import { useCurrency } from "@/context/CurrencyContext";

const COLORS = ['#3b82f6', '#9333ea', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function AnalyticsHub() {
  const { formatPrice } = useCurrency();
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    const unsubStats = subscribeToSystemStats(setStats);
    const unsubAnalytics = subscribeToGlobalAnalytics(setAnalytics);
    return () => {
      unsubStats();
      unsubAnalytics();
    };
  }, []);

  const metricCards = [
    { label: "Total Spending", value: formatPrice(stats?.totalExpenses || 0), sub: "March 2024", color: "bg-blue-500", icon: DollarSign },
    { label: "Total Expenses", value: stats?.totalGroups * 4 || 24, sub: "This month", color: "bg-purple-500", icon: Layers },
    { label: "Active Users", value: stats?.activeUsers24h || 5, sub: "Contributing members", color: "bg-green-500", icon: Users },
    { label: "Avg per Person", value: formatPrice((stats?.totalExpenses || 0) / 5), sub: "This month", color: "bg-orange-500", icon: CreditCard },
  ];

  const topSpenders = [
    { name: "John Doe", amount: 125000, percentage: 28 },
    { name: "Sarah Lee", amount: 98000, percentage: 20 },
    { name: "Imran Ahmed", amount: 87000, percentage: 18 },
    { name: "Rahat Khan", amount: 76000, percentage: 16 },
    { name: "Mike Chen", amount: 94000, percentage: 20 },
  ];

  return (
    <div className="space-y-10 pb-20">
      <header>
        <h1 className="text-3xl font-black text-white tracking-tight italic uppercase">Analytics Hub</h1>
        <p className="text-white/30 text-xs font-bold uppercase tracking-widest mt-1 italic">View spending patterns and statistics</p>
      </header>

      {/* COLORFUL STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((card, i) => (
          <div key={i} className={`${card.color} p-8 rounded-3xl shadow-xl hover:scale-105 transition-transform group cursor-default relative overflow-hidden`}>
             <div className="absolute top-0 right-0 p-6 opacity-20"><card.icon className="w-16 h-16" /></div>
             <p className="text-white/70 text-[10px] font-black uppercase tracking-widest">{card.label}</p>
             <h3 className="text-3xl font-black text-white mt-1.5 tracking-tight">{card.value}</h3>
             <p className="text-white/50 text-[9px] font-bold uppercase tracking-widest mt-4 italic">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Trend - White Background Theme Like Screenshot */}
        <div className="bg-white p-8 rounded-4xl shadow-2xl h-[450px] flex flex-col">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-blue-500" /></div>
                    <h3 className="text-black font-black uppercase tracking-widest text-xs">Monthly Spending Trend</h3>
                </div>
            </div>
            <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ReBarChart data={analytics?.monthly || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000005" />
                        <XAxis dataKey="name" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} dy={5} stroke="#00000040" />
                        <YAxis hide />
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontSize: '10px' }} />
                        <Bar 
                            dataKey="value" 
                            fill="#3b82f6" 
                            radius={[12, 12, 12, 12]} 
                            barSize={60} 
                            fillOpacity={0.8}
                        />
                    </ReBarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Categories - White Background Theme */}
        <div className="bg-white p-8 rounded-4xl shadow-2xl h-[450px] flex flex-col">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center"><PieChartIcon className="w-5 h-5 text-purple-500" /></div>
                    <h3 className="text-black font-black uppercase tracking-widest text-xs">Spending by Category</h3>
                </div>
            </div>
            <div className="flex-1 w-full flex items-center">
                 <div className="w-full h-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                            <Pie
                                data={analytics?.categories || []}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={110}
                                paddingAngle={8}
                                dataKey="value"
                            >
                                {(analytics?.categories || []).map((_:any, index:number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontSize: '10px' }} />
                        </RePieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                         <p className="text-[10px] font-black text-black/20 uppercase tracking-[0.2em]">Global</p>
                         <p className="text-2xl font-black text-black tracking-tight mt-1">100%</p>
                    </div>
                 </div>
            </div>
        </div>
      </div>

      {/* TOP SPENDERS LEADERBOARD */}
      <div className="bg-white p-10 rounded-4xl shadow-2xl">
         <div className="flex items-center justify-between mb-10">
            <h3 className="text-black font-black uppercase tracking-widest text-xs">Top Spenders This Month</h3>
            <button className="flex items-center gap-2 text-[10px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-400 transition-colors">
                Deep Intelligence <ArrowUpRight className="w-3 h-3" />
            </button>
         </div>

         <div className="space-y-8">
            {topSpenders.map((spender, i) => (
                <div key={i} className="group">
                    <div className="flex items-center justify-between mb-3 px-2">
                        <div className="flex items-center gap-4">
                            <span className="w-8 h-8 rounded-full bg-blue-500 text-white font-black text-[10px] flex items-center justify-center shadow-lg">{i+1}</span>
                            <span className="text-xs font-black text-black/80 group-hover:text-blue-500 transition-colors uppercase italic">{spender.name}</span>
                        </div>
                        <div className="flex items-center gap-6">
                            <span className="text-xs font-black text-black">{formatPrice(spender.amount)}</span>
                            <span className="text-[10px] font-black text-black/20 italic">{spender.percentage}%</span>
                        </div>
                    </div>
                    <div className="h-2 w-full bg-black/5 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-linear-to-r from-blue-500 to-indigo-600 rounded-full group-hover:shadow-[0_0_10px_rgba(59,130,246,0.3)] transition-all duration-1000 origin-left"
                            style={{ width: `${spender.percentage}%` }}
                        ></div>
                    </div>
                </div>
            ))}
         </div>
         <div className="mt-12 text-center">
            <p className="text-[9px] font-black text-black/10 uppercase tracking-[0.5em] italic">Neural Spending Analytics Protocol Activated</p>
         </div>
      </div>
    </div>
  );
}
