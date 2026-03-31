"use client";

import { useAuth } from "@/context/AuthContext";
import { subscribeToUserGroups, Group, subscribeToNotifications } from "@/lib/firebase/firestore";
import { useEffect, useState } from "react";
import { User, LayoutDashboard, Settings, ShieldCheck, LogOut, Users, BarChart, ShoppingCart, ChefHat, Bell, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";

export const Sidebar = () => {
  const { userData, isSidebarOpen, setSidebarOpen } = useAuth();
  const pathname = usePathname();
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => {
    if (userData?.uid) {
      const unsub = subscribeToNotifications(userData.uid, (data) => {
        setUnreadNotifs(data.filter(n => n.status === "unread").length);
      });
      return () => unsub();
    }
  }, [userData?.uid]);

  const handleSignOut = () => {
    signOut(auth);
  };

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: "Personal", href: "/personal", icon: <User className="w-5 h-5" /> },
    { label: "Groups", href: "/groups", icon: <Users className="w-5 h-5" /> },
    { label: "Analytics", href: "/analytics", icon: <BarChart className="w-5 h-5" /> },
    { label: "Shopping", href: "/shopping", icon: <ShoppingCart className="w-5 h-5" /> },
    { label: "Cooking", href: "/cooking", icon: <ChefHat className="w-5 h-5" /> },
    { label: "Notifications", href: "/notifications", icon: <Bell className="w-5 h-5" />, badge: unreadNotifs > 0 ? unreadNotifs : null },
    { label: "Chat", href: "/chat", icon: <MessageSquare className="w-5 h-5" />, badge: 5 }, // Hardcoded 5 to match mockup for now, can be hooked to real unreads
    { label: "Settings", href: "/settings", icon: <Settings className="w-5 h-5" /> },
  ];

  const sidebarVariants = {
    open: { x: 0, opacity: 1 },
    closed: { x: "-100%", opacity: 0 }
  };

  const SidebarContent = (
    <aside className="fixed left-0 top-0 h-full w-64 flex flex-col py-6 bg-background border-r border-white/5 z-50 overflow-y-auto no-scrollbar pt-safe">
      
      {/* Brand Logo - Top Left */}
      <div className="flex items-center gap-3 px-8 mb-10 mt-2">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center">
          <span className="text-white font-black text-sm italic">S</span>
        </div>
        <span className="text-xl font-black text-white tracking-tighter transition-all cursor-default">CDS</span>
      </div>

      {/* Navigation List */}
      <nav className="flex flex-col gap-1 w-full px-4 flex-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href) && (item.href !== "/dashboard" || pathname === "/dashboard");
          return (
            <Link 
              key={item.label} 
              href={item.href} 
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center justify-between px-4 py-3.5 rounded-xl transition-all group ${
                isActive 
                ? "bg-gradient-to-r from-primary to-accent shadow-lg shadow-primary/20 text-white" 
                : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-4">
                <span className={`${isActive ? "text-white" : "text-white/40 group-hover:text-white/80 transition-colors"}`}>
                  {item.icon}
                </span>
                <span className={`text-sm tracking-wide ${isActive ? "font-bold" : "font-medium"}`}>
                  {item.label}
                </span>
              </div>
              {item.badge && (
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  isActive ? "bg-white text-primary" : "bg-destructive text-white"
                }`}>
                  {item.badge}
                </div>
              )}
            </Link>
          );
        })}

        <div className="w-full h-px bg-white/5 my-4" />

        {/* Super Admin Section */}
        {userData?.role === "superadmin" && (
          <Link href="/admin/super" onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${
              pathname.startsWith("/admin/super") ? "bg-destructive/20 text-destructive border border-destructive/20" : "text-destructive/60 hover:bg-destructive/10 hover:text-destructive"
            }`}
          >
             <ShieldCheck className="w-5 h-5" />
             <span className="text-sm font-bold tracking-wide">Control Center</span>
          </Link>
        )}
        
        {/* Admin Section */}
        {userData?.role === "admin" && (
          <Link href="/admin" onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${
              pathname === "/admin" ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/20" : "text-indigo-400/60 hover:bg-indigo-500/10 hover:text-indigo-400"
            }`}
          >
             <ShieldCheck className="w-5 h-5" />
             <span className="text-sm font-bold tracking-wide">Admin Dashboard</span>
          </Link>
        )}
      </nav>
    </aside>
  );

  return (
    <>
      <div className="hidden lg:block w-64 shrink-0">
        {SidebarContent}
      </div>

      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.div
              initial="closed"
              animate="open"
              exit="closed"
              variants={sidebarVariants}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden"
            >
              {SidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
