"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function AdminIndex() {
  const { userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (userData?.role === "superadmin") {
      router.replace("/admin/super");
    } else {
      router.replace("/admin/users");
    }
  }, [userData, loading, router]);

  return (
    <div className="h-screen flex items-center justify-center bg-[#07080d]">
      <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
    </div>
  );
}
