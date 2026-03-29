"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Users, DollarSign, CheckSquare, ChefHat, Bell, BarChart2, Shield } from "lucide-react";

export function AdminSidebar() {
  const pathname = usePathname();
  const { userData } = useAuth();

  const links = [
    ...(userData?.role === 'superadmin' ? [{ href: "/admin/super", label: "Neural Control", icon: Shield }] : []),
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/expenses", label: "Expenses", icon: DollarSign },
    { href: "/admin/settlements", label: "Settlements", icon: CheckSquare },
    { href: "/admin/cooking", label: "Cooking Schedule", icon: ChefHat },
    { href: "/admin/notices", label: "Notices", icon: Bell },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart2 },
  ];

  return (
    <aside className="w-64 glass-panel rounded-none border-y-0 border-l-0 border-r border-white/5 flex-col hidden lg:flex z-50">
      <div className="h-20 flex items-center px-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Admin Logo" className="w-10 h-10 object-contain" />
          <span className="text-white font-bold text-xl tracking-wide">Admin</span>
        </div>
      </div>
      
      <nav className="flex-1 py-6 px-4 space-y-2">
        {links.map(link => {
          // If superadmin, we might want to consolidate some links or keep them all for oversight
          const isActive = pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}>
              <Icon className="w-5 h-5" />
              <span className="font-medium text-sm">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
