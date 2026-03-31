"use client";

import { useAuth } from "@/context/AuthContext";
import { subscribeToNotifications } from "@/lib/firebase/firestore";
import { useEffect, useState } from "react";
import { User, LayoutDashboard, Settings, ShieldCheck, Users, BarChart, ShoppingCart, ChefHat, Bell, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const Sidebar = () => {
  const { userData, isSidebarOpen, setSidebarOpen, isCollapsed, setCollapsed } = useAuth();
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

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: "Personal", href: "/personal", icon: <User className="w-5 h-5" /> },
    { label: "Groups", href: "/groups", icon: <Users className="w-5 h-5" /> },
    { label: "Analytics", href: "/analytics", icon: <BarChart className="w-5 h-5" /> },
    { label: "Shopping", href: "/shopping", icon: <ShoppingCart className="w-5 h-5" /> },
    { label: "Cooking", href: "/cooking", icon: <ChefHat className="w-5 h-5" /> },
    { label: "Notifications", href: "/notifications", icon: <Bell className="w-5 h-5" />, badge: unreadNotifs > 0 ? unreadNotifs : 3 },
    { label: "Chat", href: "/chat", icon: <MessageSquare className="w-5 h-5" />, badge: 5 },
    { label: "Settings", href: "/settings", icon: <Settings className="w-5 h-5" /> },
  ];

  const sidebarVariants = {
    open: { x: 0, opacity: 1 },
    closed: { x: "-100%", opacity: 0 }
  };

  const SidebarContent = (
    <motion.aside 
      initial={false}
      animate={{ width: isCollapsed ? 80 : 240 }}
      className="fixed left-0 top-0 h-full flex flex-col py-8 bg-[#10111a] z-50 overflow-y-auto no-scrollbar pt-safe border-r border-white/5"
    >
      
      {/* Brand Logo - Updated for Collapsed State */}
      <div className={`flex items-center mb-10 transition-all duration-300 ${isCollapsed ? "justify-center px-0" : "pl-8 gap-4"}`}>
        <img src="/logo.png" alt="CDSN Logo" className="w-10 h-10 rounded-xl object-contain shadow-lg shadow-primary/10 shrink-0" />
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex flex-col whitespace-nowrap"
            >
              <h1 className="text-xl font-black italic tracking-tighter text-white leading-none">CDS</h1>
              <p className="text-[8px] font-black tracking-[0.2em] text-white/20 uppercase">Convergence Digital Society</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Collapse Toggle - Desktop Only */}
      <button 
        onClick={() => setCollapsed(!isCollapsed)}
        className="hidden lg:flex absolute top-6 -right-3 w-6 h-6 rounded-full bg-primary text-white items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all z-60"
      >
        {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Navigation List */}
      <nav className="flex flex-col gap-1.5 w-full pr-4 flex-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href) && (item.href !== "/dashboard" || pathname === "/dashboard");
          return (
            <Link 
              key={item.label} 
              href={item.href} 
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center pl-8 transition-all group relative overflow-hidden h-14 ${
                isActive 
                ? "text-white" 
                : "text-white/40 hover:text-white/80"
              } ${isCollapsed ? "justify-center pl-0" : "justify-between pr-4"}`}
            >
              {/* Active Indicator Strip */}
              <AnimatePresence>
                {isActive && (
                  <motion.div 
                    layoutId="active-pill"
                    className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-r-2xl -ml-2"
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -10, opacity: 0 }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </AnimatePresence>

              <div className={`flex items-center gap-4 relative z-10 ${isCollapsed ? "justify-center" : ""}`}>
                <span className={`transition-colors duration-300 ${isActive ? "text-white" : "group-hover:text-white"}`}>
                  {item.icon}
                </span>
                {!isCollapsed && (
                  <span className={`text-[13px] tracking-wide uppercase font-bold whitespace-nowrap ${isActive ? "opacity-100" : "opacity-60 group-hover:opacity-100"}`}>
                    {item.label}
                  </span>
                )}
              </div>
              
              {item.badge && !isCollapsed && (
                <div className={`relative z-10 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shadow-md ${
                  isActive ? "bg-white text-primary" : "bg-destructive text-white"
                }`}>
                  {item.badge}
                </div>
              )}
              {item.badge && isCollapsed && (
                <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-destructive z-20 shadow-sm" />
              )}
            </Link>
          );
        })}

        <div className={`w-full my-6 transition-all ${isCollapsed ? "px-4" : "px-8"}`}>
           <div className="w-full h-px bg-white/5" />
        </div>

        {/* Administration Links */}
        {(userData?.role === "superadmin" || userData?.role === "admin") && (
          <div className="flex flex-col gap-1.5">
            <Link href={userData.role === "superadmin" ? "/admin/super" : "/admin"} onClick={() => setSidebarOpen(false)}
              className={`flex items-center pl-8 h-14 transition-all group ${
                pathname.startsWith("/admin") ? "text-white" : "text-white/30 hover:text-white/60"
              } ${isCollapsed ? "justify-center pl-0" : "gap-4 pr-4"}`}
            >
               <ShieldCheck className={`w-5 h-5 ${pathname.startsWith("/admin") ? "text-primary" : "text-white/20"}`} />
               {!isCollapsed && <span className="text-[11px] font-black tracking-[0.15em] uppercase whitespace-nowrap">Control Center</span>}
            </Link>
          </div>
        )}
      </nav>
    </motion.aside>
  );

  return (
    <>
      <motion.div 
        animate={{ width: isCollapsed ? 80 : 240 }}
        transition={{ type: "spring", damping: 20, stiffness: 100 }}
        className="hidden lg:block shrink-0 h-full"
      >
        {SidebarContent}
      </motion.div>

      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 lg:hidden"
            />
            <motion.div
              initial="closed"
              animate="open"
              exit="closed"
              variants={sidebarVariants}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
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

