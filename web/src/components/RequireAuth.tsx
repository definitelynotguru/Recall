"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { AppNav } from "./AppNav";

export function RequireAuth({
  children,
  allowLocal = false,
}: {
  children: React.ReactNode;
  allowLocal?: boolean;
}) {
  const { status } = useAuth();
  const router = useRouter();
  const loading = status === "loading";
  const redirecting = status === "anonymous" && !allowLocal;

  useEffect(() => {
    if (redirecting) {
      router.replace("/login");
    }
  }, [redirecting, router]);

  if (loading || redirecting) {
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
