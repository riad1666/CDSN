"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { 
  LayoutDashboard, 
  Users, 
  Layers, 
  MessageSquare, 
  BarChart3, 
  Activity, 
  Bell, 
  Settings,
  Shield
} from "lucide-react";

export function AdminSidebar() {
  const pathname = usePathname();
  const { userData } = useAuth();

  const links = [
    { href: "/admin/overview", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/groups", label: "Groups", icon: Layers },
    { href: "/admin/chats", label: "Chats", icon: MessageSquare },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/activity", label: "Activity", icon: Activity },
    { href: "/admin/notifications", label: "Notifications", icon: Bell },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#0a0b14] border-r border-white/5 flex-col hidden lg:flex h-screen sticky top-0 shrink-0">
      <div className="h-20 flex items-center px-8 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-linear-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.4)]">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-black text-xl tracking-tight leading-none uppercase italic">CDS Admin</span>
        </div>
      </div>
      
      <nav className="flex-1 py-10 px-6 space-y-1.5 overflow-y-auto no-scrollbar">
        {links.map(link => {
          const isActive = pathname === link.href || (link.href !== "/admin/overview" && pathname.startsWith(link.href));
          const Icon = link.icon;
          return (
            <Link 
                key={link.href} 
                href={link.href} 
                className={`flex items-center gap-3.5 px-5 py-3.5 rounded-2xl transition-all duration-300 font-bold text-[10px] uppercase tracking-widest ${
                    isActive 
                    ? 'bg-linear-to-r from-purple-500 to-pink-500 text-white shadow-[0_8px_20px_rgba(236,72,153,0.3)]' 
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-current'}`} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-8 border-t border-white/5 bg-black/20">
        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Authority</p>
            <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mt-1 italic">God Mode Active</p>
        </div>
      </div>
    </aside>
  );
}
