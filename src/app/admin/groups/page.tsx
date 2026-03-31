"use client";

import { useState, useEffect } from "react";
import { 
  Layers, 
  Search, 
  Plus, 
  LayoutGrid, 
  Table as TableIcon, 
  Eye, 
  Edit3, 
  Trash2, 
  Users, 
  Clock, 
  History,
  DollarSign
} from "lucide-react";
import { getAllGroups } from "@/lib/firebase/firestore";
import toast from "react-hot-toast";
import { useCurrency } from "@/context/CurrencyContext";

export default function GroupManagementPage() {
  const { formatPrice } = useCurrency();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"card" | "table">("table");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const data = await getAllGroups();
      setGroups(data);
    } catch (e) {
      toast.error("Failed to load clusters");
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = groups.filter(g => 
    g.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    g.ownerId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10 pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight italic uppercase">Groups Management</h1>
          <p className="text-white/30 text-xs font-bold uppercase tracking-widest mt-1">Manage all student groups</p>
        </div>
        <button className="bg-linear-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-[0_8px_20px_rgba(236,72,153,0.3)] hover:scale-105 transition-transform flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create Group
        </button>
      </header>

      {/* FILTERS & TOGGLES */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#131422] p-4 rounded-3xl border border-white/5">
        <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input 
                type="text" 
                placeholder="Search by group name or owner..." 
                className="w-full bg-white/3 border border-white/5 rounded-2xl py-3 pl-11 pr-4 text-xs font-bold text-white placeholder:text-white/20 focus:outline-hidden focus:border-purple-500/50 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        
        <div className="flex bg-black/20 p-1.5 rounded-2xl border border-white/5">
            <button 
                onClick={() => setViewMode("card")}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                    viewMode === "card" ? 'bg-purple-500 text-white shadow-lg' : 'text-white/30 hover:text-white'
                }`}
            >
                <LayoutGrid className="w-3.5 h-3.5" /> Card View
            </button>
            <button 
                onClick={() => setViewMode("table")}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                    viewMode === "table" ? 'bg-purple-500 text-white shadow-lg' : 'text-white/30 hover:text-white'
                }`}
            >
                <TableIcon className="w-3.5 h-3.5" /> Table View
            </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
             <div className="animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full mb-6 mx-auto shadow-[0_0_15px_rgba(168,85,247,0.3)]"></div>
             <p className="text-white/20 font-black uppercase tracking-widest text-[10px]">Scanning Neural Clusters...</p>
        </div>
      ) : viewMode === "table" ? (
        <div className="bg-[#131422] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 bg-black/20">
                            <th className="px-8 py-5 text-left text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Group</th>
                            <th className="px-8 py-5 text-left text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Owner</th>
                            <th className="px-8 py-5 text-left text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Members</th>
                            <th className="px-8 py-5 text-left text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Total Expense</th>
                            <th className="px-8 py-5 text-left text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Last Activity</th>
                            <th className="px-8 py-5 text-right text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredGroups.map((group) => (
                            <tr key={group.id} className="hover:bg-white/3 transition-colors group">
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white/5 border border-white/5 flex items-center justify-center text-white/20 font-black italic">
                                            {group.profileImage ? <img src={group.profileImage} className="w-full h-full object-cover" /> : group.name?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-white font-black text-xs uppercase tracking-tight">{group.name}</p>
                                            <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-1">ID: {group.id.substring(0,8)}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <p className="text-white/60 font-bold text-[10px] tracking-wide uppercase">{group.ownerId?.substring(0,10)}...</p>
                                </td>
                                <td className="px-8 py-5">
                                    <span className="text-[10px] font-black text-purple-400 bg-purple-400/10 px-3 py-1.5 rounded-full border border-purple-400/20 italic">{group.memberIds?.length || 0} members</span>
                                </td>
                                <td className="px-8 py-5">
                                    <p className="text-white font-black text-xs">{formatPrice(group.totalExpense || 0)}</p>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-2 text-white/30 text-[9px] font-black uppercase tracking-widest italic">
                                        <Clock className="w-3 h-3" /> 2 hours ago
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-white/40 hover:text-purple-500 hover:border-purple-500/30 transition-all"><Eye className="w-4 h-4" /></button>
                                        <button className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-white/40 hover:text-purple-500 hover:border-purple-500/30 transition-all"><Edit3 className="w-4 h-4" /></button>
                                        <button className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-white/40 hover:text-rose-500 hover:border-rose-500/30 transition-all"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map((group) => (
                <div key={group.id} className="bg-[#131422] border border-white/5 p-8 rounded-4xl group hover:border-purple-500/30 transition-all relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                         <div className="flex gap-2">
                             <button className="p-2 rounded-lg bg-white/5 hover:bg-purple-500 text-white transition-all"><Edit3 className="w-4 h-4" /></button>
                         </div>
                    </div>

                    <div className="w-16 h-16 rounded-3xl bg-white/3 border border-white/5 mb-6 flex items-center justify-center text-2xl font-black text-white italic shadow-lg">
                        {group.profileImage ? <img src={group.profileImage} className="w-full h-full object-cover rounded-3xl" /> : group.name?.charAt(0)}
                    </div>
                    
                    <h3 className="text-xl font-black text-white italic uppercase tracking-tighter group-hover:text-purple-400 transition-colors">{group.name}</h3>
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mt-1.5 mb-8">Owner: {group.ownerId?.substring(0,10)}...</p>
                    
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-white/3 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-3">
                                <Users className="w-4 h-4 text-purple-500" />
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Members</span>
                            </div>
                            <span className="text-xs font-black text-white">{group.memberIds?.length || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-white/3 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-3">
                                <DollarSign className="w-4 h-4 text-purple-500" />
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Expenses</span>
                            </div>
                            <span className="text-xs font-black text-white">{formatPrice(group.totalExpense || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-white/3 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-3">
                                <History className="w-4 h-4 text-purple-500" />
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Activity</span>
                            </div>
                            <span className="text-[10px] font-black text-white/60 lowercase italic">2h ago</span>
                        </div>
                    </div>
                    
                    <button className="w-full mt-8 bg-white/5 border border-white/5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white/60 hover:bg-purple-500 hover:text-white hover:border-purple-500 transition-all cursor-pointer">
                        Neural Cluster Interface
                    </button>
                </div>
            ))}
        </div>
      )}
    </div>
  );
}
