"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase/config";
import { collection, query, onSnapshot } from "firebase/firestore";
import { getApprovedUsers, UserBasicInfo, Expense } from "@/lib/firebase/firestore";
import { BarChart, PieChart, TrendingUp, DollarSign, Award, LayoutGrid } from "lucide-react";

export default function AdminAnalyticsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, UserBasicInfo>>({});
  const [groups, setGroups] = useState<any[]>([]);

  useEffect(() => {
    getApprovedUsers().then(list => {
      const map: Record<string, UserBasicInfo> = {};
      list.forEach(u => map[u.uid] = u);
      setUsersMap(map);
    });

    const q = query(collection(db, "expenses"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data: Expense[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Expense));
      setExpenses(data);
    });

    const qGroups = query(collection(db, "groups"));
    const unsubGroups = onSnapshot(qGroups, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setGroups(data);
    });

    return () => {
      unsub();
      unsubGroups();
    };
  }, []);

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  const userSpending: Record<string, number> = {};
  expenses.forEach(e => {
    userSpending[e.paidBy] = (userSpending[e.paidBy] || 0) + e.amount;
  });

  const topSpenderId = Object.keys(userSpending).sort((a,b) => userSpending[b] - userSpending[a])[0];
  const topSpender = topSpenderId ? usersMap[topSpenderId] : null;

  const monthlyData: Record<string, number> = {};
  expenses.forEach(e => {
    if (!e.date) return;
    const month = e.date.substring(0, 7);
    monthlyData[month] = (monthlyData[month] || 0) + e.amount;
  });
  const sortedMonths = Object.keys(monthlyData).sort();
  const maxMonthVal = Math.max(...Object.values(monthlyData), 1);

  const topSpendersArray = Object.entries(userSpending)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const colors = ["#8b5cf6", "#ec4899", "#10b981", "#f59e0b"];

  let cumulativePercent = 0;
  const pieGradients = topSpendersArray.map(([uid, amount], i) => {
    const start = cumulativePercent;
    const size = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
    cumulativePercent += size;
    return `${colors[i]} ${start}% ${cumulativePercent}%`;
  }).join(", ");

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Analytics Overview</h2>
        <p className="text-white/60 text-sm">Visualize spending and settlement patterns</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 border-[#3b82f6]/20 bg-[#3b82f6]/5 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#3b82f6]/10 rounded-full blur-2xl"></div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[#3b82f6]" />
            </div>
            <span className="text-white/60 font-medium">Platform Total</span>
          </div>
          <div className="text-3xl font-bold text-white">₩{Math.round(totalSpent).toLocaleString()}</div>
        </div>

        <div className="glass-card p-6 border-[#10b981]/20 bg-[#10b981]/5 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#10b981]/10 rounded-full blur-2xl"></div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#10b981]/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#10b981]" />
            </div>
            <span className="text-white/60 font-medium">Average / Expense</span>
          </div>
          <div className="text-3xl font-bold text-white">
            ₩{expenses.length > 0 ? Math.round(totalSpent / expenses.length).toLocaleString() : 0}
          </div>
        </div>

        <div className="glass-card p-6 border-[#8b5cf6]/20 bg-[#8b5cf6]/5 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#8b5cf6]/10 rounded-full blur-2xl"></div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#8b5cf6]/20 flex items-center justify-center">
              <Award className="w-5 h-5 text-[#8b5cf6]" />
            </div>
            <span className="text-white/60 font-medium">Top Spender</span>
          </div>
          <div className="text-xl font-bold text-white truncate">{topSpender?.name || "N/A"}</div>
          <div className="text-sm font-medium text-[#8b5cf6] mt-1">₩{Math.round(userSpending[topSpenderId] || 0).toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Line Chart Mock */}
         <div className="glass-panel p-6">
           <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
             <BarChart className="w-5 h-5 text-indigo-400" /> Monthly Spending Trends
           </h3>
           <div className="h-64 flex items-end gap-4 border-b border-l border-white/10 p-4 pt-0">
             {sortedMonths.length === 0 ? (
               <div className="w-full h-full flex items-center justify-center text-white/40 text-sm">No data available</div>
             ) : (
               sortedMonths.map(m => {
                 const heightPct = (monthlyData[m] / maxMonthVal) * 100;
                 return (
                   <div key={m} className="flex-1 flex flex-col items-center gap-2 group relative h-full justify-end">
                     <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                       ₩{Math.round(monthlyData[m]).toLocaleString()}
                     </div>
                     <div className="w-full max-w-[40px] bg-gradient-to-t from-indigo-600/50 to-purple-400/80 rounded-t-sm transition-all group-hover:from-indigo-500 group-hover:to-purple-300" style={{ height: `${heightPct}%`, minHeight: '4px' }}></div>
                     <div className="text-[10px] text-white/40">{m.substring(5, 7)}/{m.substring(2, 4)}</div>
                   </div>
                 )
               })
             )}
           </div>
         </div>

         {/* Pie Chart Mock */}
         <div className="glass-panel p-6">
           <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
             <PieChart className="w-5 h-5 text-pink-400" /> Spending by Top Users
           </h3>
           <div className="flex flex-col md:flex-row items-center gap-8 justify-center h-64">
             {topSpendersArray.length === 0 ? (
               <div className="text-white/40 text-sm h-full flex items-center">No data available</div>
             ) : (
               <>
                 <div 
                   className="w-48 h-48 rounded-full border-4 border-[#1a1b2e] shadow-[0_0_30px_rgba(236,72,153,0.15)] transition-transform hover:scale-105 shrink-0"
                   style={{
                     background: `conic-gradient(${pieGradients.length > 0 ? pieGradients : 'transparent'})`
                   }}
                 />
                 <div className="space-y-4">
                   {topSpendersArray.map(([uid, amt], i) => (
                     <div key={uid} className="flex items-center gap-3">
                       <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: colors[i] }}></div>
                       <div>
                         <div className="text-sm font-medium text-white">{usersMap[uid]?.name || "Unknown"}</div>
                         <div className="text-xs text-white/50">₩{Math.round(amt).toLocaleString()}</div>
                       </div>
                     </div>
                   ))}
                 </div>
               </>
             )}
           </div>
         </div>
      </div>

       {/* Group Breakdown */}
       <div className="glass-panel p-6">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-emerald-400" /> Group-wise Financial Breakdown
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="pb-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Group</th>
                  <th className="pb-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Members</th>
                  <th className="pb-4 text-[10px] font-black text-white/40 uppercase tracking-widest text-right">Total Expenses</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {groups.map(group => {
                  const groupTotal = expenses.filter(e => e.groupId === group.id).reduce((sum, e) => sum + e.amount, 0);
                  return (
                    <tr key={group.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="py-4">
                        <div className="flex items-center gap-1.5 px-3 py-2 hover:bg-white/2 rounded-xl transition-colors cursor-pointer group/item">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 text-[10px] font-black italic">
                            {group.name?.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-xs font-bold text-white uppercase italic">{group.name}</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="text-xs font-bold text-white/40 tracking-widest">{group.memberIds?.length || 0} MEMBERS</span>
                      </td>
                      <td className="py-4 text-right">
                        <span className="text-xs font-black text-white tracking-widest">₩{Math.round(groupTotal).toLocaleString()}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {groups.length === 0 && <p className="text-center py-8 text-white/20 text-xs">No groups found.</p>}
          </div>
       </div>
    </div>
  );
}
