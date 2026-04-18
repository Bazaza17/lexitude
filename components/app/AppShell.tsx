"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";
import { Logo } from "@/components/site/Logo";

type NavItem = { to: string; label: string; icon: ReactNode; exact?: boolean };

const navItems: NavItem[] = [
  {
    to: "/history",
    label: "Runs",
    exact: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    to: "/new",
    label: "New audit",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.to || pathname.startsWith("/run/") : pathname.startsWith(item.to);

  return (
    <div className="flex min-h-dvh w-full bg-background text-foreground">
      <aside
        aria-label="Primary navigation"
        className={`${collapsed ? "w-14" : "w-60"} sticky top-0 flex h-dvh shrink-0 flex-col border-r border-border bg-surface/40 transition-[width] duration-200`}
      >
        <div className="flex min-h-14 items-center justify-between border-b border-border px-3">
          <Link
            href="/"
            aria-label="Lexitude home"
            className="flex min-h-10 items-center gap-2 overflow-hidden rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Logo />
            {!collapsed && <span className="text-sm font-semibold tracking-tight">Lexitude</span>}
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:bg-surface-elevated"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d={collapsed ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6"}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 p-2">
          {!collapsed && (
            <div className="mb-2 px-2 pt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Workspace
            </div>
          )}
          {navItems.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.to}
                href={item.to}
                aria-label={collapsed ? item.label : undefined}
                aria-current={active ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                className={`flex min-h-10 items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                  active
                    ? "bg-surface-elevated text-foreground"
                    : "text-muted-foreground hover:bg-surface-elevated/60 hover:text-foreground"
                }`}
              >
                <span aria-hidden="true" className="shrink-0">
                  {item.icon}
                </span>
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && active && (
                  <span
                    aria-hidden="true"
                    className="ml-auto h-1.5 w-1.5 rounded-full bg-foreground/70"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-2">
          {!collapsed && (
            <div className="mt-2 flex items-center gap-2 rounded-md border border-border bg-surface-elevated/40 px-2.5 py-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-xs font-medium">
                LX
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium">Lexitude</div>
                <div className="truncate font-mono text-[10px] text-muted-foreground">
                  eMerge · demo
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
