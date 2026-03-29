"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  UserCheck, 
  Layers, 
  DollarSign, 
  Clock, 
  MessageSquare,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import Link from "next/link";
import { subscribeToSystemStats, subscribeToGlobalAnalytics, subscribeToAllActivities } from "@/lib/firebase/firestore";
import { formatDistanceToNow } from "date-fns";

const COLORS = ['#9333ea', '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function OverviewPage() {
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    const unsubStats = subscribeToSystemStats(setStats);
    const unsubAnalytics = subscribeToGlobalAnalytics(setAnalytics);
    const unsubActivities = subscribeToAllActivities((data) => setActivities(data.slice(0, 5)));
    
    return () => {
      unsubStats();
      unsubAnalytics();
      unsubActivities();
    };
  }, []);

  if (!stats) return (
    <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="w-12 h-12 bg-white/5 rounded-full border-b-2 border-purple-500 animate-spin"></div>
            <p className="text-white/20 font-black uppercase tracking-widest text-[10px]">Synchronizing Neural Data...</p>
        </div>
    </div>
  );

  const vitals = [
    { label: "Total Users", value: stats.totalUsers, p: "+12%", up: true, icon: Users, color: "bg-blue-500/10 text-blue-500", href: "/admin/users" },
    { label: "Active Users (24h)", value: stats.activeUsers24h, p: "+8%", up: true, icon: UserCheck, color: "bg-green-500/10 text-green-500", href: "/admin/users" },
    { label: "Total Groups", value: stats.totalGroups, p: "+3", up: true, icon: Layers, color: "bg-purple-500/10 text-purple-500", href: "/admin/groups" },
    { label: "Total Expenses", value: `₩${stats.totalExpenses.toLocaleString()}`, p: "+15%", up: true, icon: DollarSign, color: "bg-orange-500/10 text-orange-500", href: "/admin/analytics" },
    { label: "Pending Requests", value: stats.pendingRequests, p: "-2", up: false, icon: Clock, color: "bg-pink-500/10 text-pink-500", href: "/admin/users" },
    { label: "Active Chats", value: stats.activeChats, p: "+24%", up: true, icon: MessageSquare, color: "bg-indigo-500/10 text-indigo-500", href: "/admin/chats" },
  ];

  return (
    <div className="space-y-10 pb-20">
      <header>
        <h1 className="text-3xl font-black text-white tracking-tight italic uppercase">Dashboard Overview</h1>
        <p className="text-white/30 text-xs font-bold uppercase tracking-widest mt-1">Monitor and manage your CDS platform</p>
      </header>

      {/* VITALS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
        {vitals.map((vital, i) => (
          <Link href={vital.href} key={i}>
            <div className="bg-[#131422] border border-white/5 p-8 rounded-3xl group hover:border-purple-500/30 transition-all cursor-pointer h-full">
                <div className="flex items-start justify-between">
                <div className={`p-4 rounded-2xl ${vital.color} group-hover:scale-110 transition-transform`}>
                    <vital.icon className="w-6 h-6" />
                </div>
                <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${vital.up ? 'text-green-500' : 'text-rose-500'}`}>
                    {vital.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {vital.p}
                </div>
                </div>
                <div className="mt-6">
                <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.2em]">{vital.label}</p>
                <h3 className="text-4xl font-black text-white mt-1.5 tracking-tighter">{vital.value}</h3>
                </div>
            </div>
          </Link>
        ))}
      </div>

      {/* ANALYTICS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Trend */}
        <div className="bg-[#131422] border border-white/5 p-8 rounded-3xl h-[400px] flex flex-col">
            <h3 className="text-white font-black uppercase tracking-widest text-xs mb-8">Monthly Expenses Trend</h3>
            <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics?.monthly || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis 
                            dataKey="name" 
                            stroke="#ffffff20" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false} 
                            dy={10}
                        />
                        <YAxis 
                            stroke="#ffffff20" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false}
                            tickFormatter={(v) => `₩${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#131422', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '10px', color: '#fff' }}
                            itemStyle={{ color: '#a855f7' }}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#a855f7" 
                            strokeWidth={4} 
                            dot={{ r: 4, fill: '#a855f7', strokeWidth: 2, stroke: '#131422' }}
                            activeDot={{ r: 8, stroke: '#ffffff20', strokeWidth: 4 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Expenses by Category */}
        <div className="bg-[#131422] border border-white/5 p-8 rounded-3xl h-[400px] flex flex-col">
            <h3 className="text-white font-black uppercase tracking-widest text-xs mb-8">Expense Categories</h3>
            <div className="flex-1 w-full flex items-center">
                <div className="w-1/2 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={analytics?.categories || []}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {(analytics?.categories || []).map((_:any, index:number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#131422', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '10px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="w-1/2 space-y-4 pr-4">
                    {(analytics?.categories || []).map((cat:any, i:number) => (
                        <div key={i} className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                <span className="text-[10px] font-bold text-white/40 uppercase group-hover:text-white transition-colors">{cat.name}</span>
                            </div>
                            <span className="text-[10px] font-black text-white">{((cat.value / analytics.categories.reduce((a:any,b:any)=>a+b.value, 0)) * 100).toFixed(0)}%</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* RECENT ACTIVITY */}
      <div className="bg-[#131422] border border-white/5 p-8 rounded-3xl">
        <div className="flex items-center justify-between mb-8">
            <h3 className="text-white font-black uppercase tracking-widest text-xs">Recent Neural Activity</h3>
            <button className="text-[10px] font-black text-purple-500 uppercase tracking-widest hover:text-purple-400 transition-colors">Full Neural Feed</button>
        </div>
        <div className="space-y-6">
            {activities.length > 0 ? activities.map((activity, i) => (
                <div key={i} className="flex items-center justify-between group">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-white/3 border border-white/5 flex items-center justify-center text-white/50 group-hover:bg-purple-500 group-hover:text-white group-hover:border-purple-500 transition-all duration-300">
                            {activity.type.includes('expense') ? <DollarSign className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-white/80 transition-colors uppercase">
                                <span className="text-purple-500 font-black">{activity.actorName || "Unknown Body"}</span> {activity.message}
                            </p>
                            <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-1 italic">{activity.groupName || "Platform Wide"}</p>
                        </div>
                    </div>
                    <span className="text-[10px] font-black text-white/10 italic group-hover:text-white/40">
                        {activity.createdAt ? formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true }) : 'Now'}
                    </span>
                </div>
            )) : (
                <div className="py-10 text-center">
                    <p className="text-white/20 font-black uppercase tracking-widest text-[10px]">No Neural Stimuli Detected</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
