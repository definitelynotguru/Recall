"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      router.replace(user ? "/today" : "/login");
    }
  }, [user, loading, router]);

  return (
    <main className="empty-state">
      <p style={{ color: "var(--muted)" }}>Loading…</p>
    </main>
  );
}
