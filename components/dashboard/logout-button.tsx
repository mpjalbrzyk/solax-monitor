"use client";

import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/(auth)/login/actions";

export function LogoutButton({
  variant = "sidebar",
}: {
  variant?: "sidebar" | "icon";
}) {
  if (variant === "icon") {
    return (
      <form action={logoutAction}>
        <button
          type="submit"
          aria-label="Wyloguj"
          className="size-9 rounded-xl bg-white/55 hover:bg-white/75 border border-white/40 backdrop-blur-sm inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="size-4" />
        </button>
      </form>
    );
  }

  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/40 transition-colors"
      >
        <LogOut className="size-4" />
        Wyloguj
      </button>
    </form>
  );
}
