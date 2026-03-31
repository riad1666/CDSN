"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { UserHeader } from "@/components/UserHeader";
import { Sidebar } from "@/components/Sidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LayoutDashboard, User, ChefHat, MessageSquare, Settings, Bell } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { userData, isCollapsed } = useAuth();
  const router = useRouter();

  const mobileNavItems = [
    { icon: <LayoutDashboard className="w-5 h-5" />, href: "/dashboard", label: "Home" },
    { icon: <User className="w-5 h-5" />, href: "/personal", label: "Budget" },
    { icon: <ChefHat className="w-5 h-5" />, href: "/cooking", label: "Cook" },
    { icon: <MessageSquare className="w-5 h-5" />, href: "/chat", label: "Chat" },
    { icon: <Settings className="w-5 h-5" />, href: "/settings", label: "Profile" },
  ];

  return (
    <ProtectedRoute allowedRoles={["user", "admin", "superadmin"]}>
      <div className="min-h-screen bg-background flex flex-col lg:flex-row">
        <Sidebar />
        
        <motion.div 
          animate={{ marginLeft: isCollapsed ? 80 : 240 }}
          transition={{ type: "spring", damping: 20, stiffness: 100 }}
          className="flex-1 hidden lg:flex flex-col min-h-screen w-full relative"
        >
           <UserHeader />
           
           <main className="flex-1 container mx-auto px-4 md:px-8 py-6 max-w-7xl overflow-x-hidden pb-8">
             <ErrorBoundary>
                 {children}
             </ErrorBoundary>
           </main>
        </motion.div>

        {/* Mobile View Wrapper */}
        <div className="flex-1 lg:hidden flex flex-col min-h-screen w-full relative">
          <UserHeader />
          <main className="flex-1 container mx-auto px-4 md:px-8 py-6 max-w-7xl overflow-x-hidden pb-24">
             <ErrorBoundary>
                 {children}
             </ErrorBoundary>
          </main>


          {/* High-Fidelity Mobile Bottom Nav */}
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2">
             <div className="glass-panel backdrop-blur-2xl bg-background/80 shadow-[0_-10px_40px_rgba(0,0,0,0.4)] flex items-center justify-around p-2 rounded-[2rem] border border-white/10">
                {mobileNavItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link 
                      key={item.href} 
                      href={item.href}
                      className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all relative ${
                        isActive ? 'text-primary scale-110' : 'text-white/30 hover:text-white/60'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute inset-0 bg-primary/10 rounded-2xl blur-md" />
                      )}
                      <div className="relative z-10">{item.icon}</div>
                      <span className="text-[8px] font-black uppercase tracking-widest relative z-10">
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
             </div>
          </nav>
        </div>
      </div>
    </ProtectedRoute>
  );
}
