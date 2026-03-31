"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { UserHeader } from "@/components/UserHeader";
import { Sidebar } from "@/components/Sidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={["user", "admin", "superadmin"]}>
      <div className="min-h-screen bg-background flex">
        <Sidebar />
        <div className="flex-1 lg:ml-64 flex flex-col min-h-screen w-full">
          <UserHeader />
          <main className="flex-1 container mx-auto px-4 md:px-8 py-6 max-w-7xl overflow-x-hidden">
            <ErrorBoundary>
                {children}
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
