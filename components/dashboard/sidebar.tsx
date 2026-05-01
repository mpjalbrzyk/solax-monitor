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
    <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen lg:py-6 lg:px-4 lg:gap-1">
      <Link
        href="/overview"
        className="flex items-center gap-2 px-3 py-2 mb-4"
      >
        <span className="size-8 rounded-xl bg-[var(--pv)]/15 border border-[var(--pv)]/30 flex items-center justify-center">
          <Sun className="size-4 text-[var(--pv)]" />
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
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "bg-white/70 text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)] backdrop-blur-sm font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/40",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2">
        <LogoutButton variant="sidebar" />
        <div className="px-3 pb-2 text-[11px] text-muted-foreground">
          Pipeline: <span className="text-foreground">aktywny</span>
          <br />
          Polling co 5 min
        </div>
      </div>
    </aside>
  );
}
