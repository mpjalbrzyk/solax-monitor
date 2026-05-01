"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-config";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Główna nawigacja"
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 px-3 pb-3 pt-2"
    >
      <div className="glass-strong flex items-center justify-around px-1 py-1.5 rounded-2xl overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] transition-all min-w-0 shrink-0",
                active
                  ? "text-[var(--brand)] font-medium bg-[var(--brand-soft)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "size-5 transition-all",
                  active && "drop-shadow-[0_0_4px_var(--brand-glow)]",
                )}
                strokeWidth={active ? 2.4 : 2}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
