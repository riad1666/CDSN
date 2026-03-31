"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase/config";
import { collection, query, onSnapshot, doc, deleteDoc, orderBy, updateDoc } from "firebase/firestore";
import { format } from "date-fns";
import { Search, Edit, Trash2, DollarSign, ShoppingCart, CheckCircle2, Loader2 } from "lucide-react";
import { getApprovedUsers, UserBasicInfo, Expense } from "@/lib/firebase/firestore";
import toast from "react-hot-toast";
import { useCurrency } from "@/context/CurrencyContext";
interface ShoppingItem {
  id: string;
  title: string;
  items?: { name: string, amount: string }[];
  amount: number;
  addedBy: string;
  date: string;
}

export default function AdminExpensesPage() {
  const { formatPrice } = useCurrency();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [shopping, setShopping] = useState<ShoppingItem[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, UserBasicInfo>>({});
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<'expenses'|'shopping'>('expenses');
  const [fixing, setFixing] = useState(false);

  useEffect(() => {
    getApprovedUsers().then(list => {
      const map: Record<string, UserBasicInfo> = {};
      list.forEach(u => map[u.uid] = u);
      setUsersMap(map);
    });

    const q = query(collection(db, "expenses"), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data: Expense[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Expense));
      setExpenses(data);
    });

    const qShop = query(collection(db, "shopping"), orderBy("date", "desc"));
    const unsubShop = onSnapshot(qShop, (snapshot) => {
      const data: ShoppingItem[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as ShoppingItem));
      setShopping(data);
    });

    return () => { unsub(); unsubShop(); };
  }, []);

  const handleDelete = async (id: string, type: 'expenses'|'shopping') => {
    if (!confirm(`Are you sure you want to delete this ${type === 'shopping' ? 'shopping record' : 'expense'}?`)) return;
    try {
      if (type === 'shopping') {
         await deleteDoc(doc(db, "shopping", id));
         toast.success("Shopping deleted");
      } else {
         await deleteDoc(doc(db, "expenses", id));
         toast.success("Expense deleted");
      }
    } catch(err) {
      toast.error(`Failed to delete ${type}`);
    }
  };

  const fixLegacyExpenses = async () => {
    if (!confirm("This will RE-SPLIT all existing expenses among all CURRENTLY approved normal users. Proceed to fix your balances?")) return;
    setFixing(true);
    try {
      const allUsers = await getApprovedUsers();
      const userUids = allUsers.filter(u => u.role === "user").map(u => u.uid);
      
      if (userUids.length === 0) return toast.error("No approved users found.");

      let count = 0;
      for (const exp of expenses) {
        await updateDoc(doc(db, "expenses", exp.id), { splitBetween: userUids });
        count++;
      }
      toast.success(`Recalculated ${count} expenses among ${userUids.length} residents!`);
    } catch (err) {
      toast.error("Failed to run global sync.");
    } finally {
      setFixing(false);
    }
  };

  const filtered = activeTab === 'expenses' 
    ? expenses.filter(e => e.title.toLowerCase().includes(search.toLowerCase()))
    : shopping.filter(e => e.title.toLowerCase().includes(search.toLowerCase()));
    
  const totalAmount = (activeTab === 'expenses' ? expenses : shopping).reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Expense Management</h2>
          <p className="text-white/60 text-sm">View and manage all shared expenses</p>
        </div>
        <button 
           onClick={fixLegacyExpenses} 
           disabled={fixing}
           className="glass-button py-2 px-4 shadow-none bg-indigo-500/20 text-indigo-300 border-indigo-500/30 flex items-center gap-2 hover:bg-indigo-500/30 transition-all text-xs"
        >
          {fixing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Sync & Full Refresh All Balances
        </button>
      </div>

      <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 w-fit mb-6">
        <button 
           className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'expenses' ? 'bg-primary shadow-lg text-white' : 'text-white/50 hover:text-white'}`}
           onClick={() => setActiveTab('expenses')}
        >
          <DollarSign className="w-4 h-4" /> Shared Expenses
        </button>
        <button 
           className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'shopping' ? 'bg-orange-500 shadow-lg text-white' : 'text-white/50 hover:text-white'}`}
           onClick={() => setActiveTab('shopping')}
        >
          <ShoppingCart className="w-4 h-4" /> Shopping Trips
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`glass-card p-6 border ${activeTab === 'expenses' ? 'border-primary/20 bg-primary/5' : 'border-orange-500/20 bg-orange-500/5'}`}>
          <div className="text-sm font-medium text-white/50 mb-1">{activeTab === 'expenses' ? 'Total Expenses' : 'Total Shopping'}</div>
          <div className={`text-2xl font-bold ${activeTab === 'expenses' ? 'text-white' : 'text-orange-400'}`}>{formatPrice(totalAmount)}</div>
        </div>
        <div className="glass-card p-6 border border-white/5 bg-white/5">
          <div className="text-sm font-medium text-white/50 mb-1">Total Count</div>
          <div className="text-2xl font-bold text-emerald-400">{activeTab === 'expenses' ? expenses.length : shopping.length}</div>
        </div>
      </div>

      <div className="glass-panel p-6 border-white/5">
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-white/40" />
          <input 
            type="text" 
            placeholder="Search expenses by title..." 
            className="w-full glass-input pl-12 bg-white/5 border-white/10"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-white/10 text-white/50 text-xs uppercase tracking-wider">
                <th className="pb-4 font-semibold pl-4">Title</th>
                <th className="pb-4 font-semibold">Amount</th>
                <th className="pb-4 font-semibold">Added By</th>
                <th className="pb-4 font-semibold">Date</th>
                <th className="pb-4 font-semibold text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((item: any) => (
                <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                  <td className="py-4 pl-4 font-medium text-white text-sm">{item.title}</td>
                  <td className="py-4 font-bold text-white">{formatPrice(item.amount)}</td>
                  <td className="py-4 text-white/70 text-sm flex items-center gap-2">
                    {usersMap[activeTab === 'expenses' ? item.paidBy : item.addedBy]?.profileImage ? (
                        <img src={usersMap[activeTab === 'expenses' ? item.paidBy : item.addedBy].profileImage} className="w-6 h-6 rounded-full object-cover" />
                    ) : null}
                    {usersMap[activeTab === 'expenses' ? item.paidBy : item.addedBy]?.name || (activeTab === 'shopping' ? item.addedBy : "Unknown")}
                  </td>
                  <td className="py-4 text-white/70 text-sm">{item.date ? format(new Date(item.date), "yyyy-MM-dd") : "N/A"}</td>
                  <td className="py-4 pr-4">
                    <div className="flex items-center justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <button className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center hover:bg-blue-500/40 hover:scale-110 active:scale-95 transition-all">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(item.id, activeTab)} className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center hover:bg-rose-500/40 hover:scale-110 active:scale-95 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-white/40 text-sm">No expenses found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
