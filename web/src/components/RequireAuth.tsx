"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { AppNav } from "./AppNav";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="app-layout">
        <main className="main-content">
          <div className="skeleton" />
          <div className="skeleton" style={{ width: "70%" }} />
        </main>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <AppNav />
      <main className="main-content">{children}</main>
    </div>
  );
}
