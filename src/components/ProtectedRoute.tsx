"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ 
  children, 
  allowedRoles = ["user", "admin"] 
}: { 
  children: ReactNode, 
  allowedRoles?: ("user" | "admin")[] 
}) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user || !userData) {
        router.push("/login");
      } else if (userData.status === "pending" || userData.status === "rejected") {
        router.push("/login");
      } else if (!allowedRoles.includes(userData.role)) {
        if (userData.role === "admin") {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
      }
    }
  }, [user, userData, loading, router, allowedRoles]);

  if (loading || !user || !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if ((userData.status === "pending" || userData.status === "rejected") || !allowedRoles.includes(userData.role)) {
    return null;
  }

  return <>{children}</>;
}
