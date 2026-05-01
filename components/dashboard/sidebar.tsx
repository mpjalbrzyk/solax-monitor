"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun } from "lucide-react";
import { NAV_ITEMS } from "./nav-config";
import { LogoutButton } from "./logout-button";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen lg:py-6 lg:px-4 lg:gap-1 lg:border-r lg:border-black/[0.04]"
      style={{ background: "var(--bg-gradient-sidebar)" }}
    >
      <Link
        href="/overview"
        className="flex items-center gap-2 px-3 py-2 mb-4 group"
      >
        <span
          className="size-8 rounded-xl flex items-center justify-center transition-shadow group-hover:shadow-[0_0_16px_var(--solar-glow)]"
          style={{
            background: "var(--solar-100)",
            border: "1px solid var(--solar-300)",
          }}
        >
          <Sun className="size-4" style={{ color: "var(--solar-600)" }} />
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">
            Solax Monitor
          </span>
          <span className="text-[11px] text-muted-foreground">
            7,7 kWp · Ząbki
          </span>
        </div>
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                active
                  ? "font-semibold"
                  : "text-slate-700 hover:text-slate-900 hover:bg-white/50",
              )}
              style={
                active
                  ? {
                      background:
                        "linear-gradient(90deg, var(--solar-100) 0%, rgba(254, 243, 199, 0.3) 100%)",
                      color: "var(--solar-800)",
                    }
                  : undefined
              }
            >
              <span
                className={cn(
                  "flex items-center justify-center size-7 rounded-md transition-all",
                  !active && "group-hover:bg-white/40",
                )}
                style={
                  active
                    ? {
                        background: "var(--solar-100)",
                        boxShadow: "inset 0 0 0 1px var(--solar-300)",
                      }
                    : undefined
                }
              >
                <Icon
                  className="size-4 transition-colors"
                  style={active ? { color: "var(--solar-600)" } : undefined}
                  strokeWidth={active ? 2.4 : 2}
                />
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2">
        <LogoutButton variant="sidebar" />
        <div className="px-3 pb-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-1.5 rounded-full animate-pulse"
              style={{
                background: "var(--brand-500)",
                boxShadow: "0 0 6px var(--brand-glow)",
              }}
            />
            Pipeline aktywny
          </span>
          <br />
          Polling co 5 min
        </div>
      </div>
    </aside>
  );
}
