import { ProtectedRoute } from "@/components/ProtectedRoute";
import { UserHeader } from "@/components/UserHeader";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={["user", "admin"]}>
      <div className="min-h-screen bg-transparent">
        <UserHeader />
        <main className="container mx-auto px-4 py-8 max-w-7xl">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
