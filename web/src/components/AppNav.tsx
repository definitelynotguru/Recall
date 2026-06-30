"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarBlank,
  NoteBlank,
  Gear,
  ClockCounterClockwise,
  SignOut,
} from "@phosphor-icons/react";
import { useAuth } from "./AuthProvider";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/today", label: "Today", icon: CalendarBlank },
  { href: "/notes", label: "Notes", icon: NoteBlank },
  { href: "/history", label: "History", icon: ClockCounterClockwise },
  { href: "/settings", label: "Settings", icon: Gear },
] as const;

export function AppNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Link href="/today" className="brand-mark">
          Recall
        </Link>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`nav-item ${pathname === href || pathname.startsWith(href + "/") ? "active" : ""}`}
          >
            <Icon size={20} weight={pathname === href ? "fill" : "regular"} />
            {label}
          </Link>
        ))}
        <ThemeToggle />
      </nav>

      <div className="sidebar-footer" style={{ marginTop: "auto" }}>
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--parchment-muted)",
            margin: "0 0 12px",
            fontFamily: "var(--font-mono)",
          }}
        >
          {user.email}
        </p>
        <button type="button" className="nav-item" onClick={() => logout()}>
          <SignOut size={20} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
