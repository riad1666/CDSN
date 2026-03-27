import { ProtectedRoute } from "@/components/ProtectedRoute";
import { UserHeader } from "@/components/UserHeader";
import { Sidebar } from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={["user", "admin", "superadmin"]}>
      <div className="min-h-screen bg-[#0a0b14] flex">
        <Sidebar />
        <div className="flex-1 ml-20 flex flex-col min-h-screen">
          <UserHeader />
          <main className="flex-1 container mx-auto px-6 py-8 max-w-7xl">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
