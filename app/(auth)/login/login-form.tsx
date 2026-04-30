"use client";

import { useActionState } from "react";
import { Sun, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = { error: null, email: "" };

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="email" className="text-sm font-medium">
          Adres e-mail
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          required
          defaultValue={state.email}
          placeholder="ty@example.com"
          className="bg-white/70"
        />
      </div>

      {state.error && (
        <div className="text-sm text-[var(--grid-import)]" role="alert">
          {state.error}
        </div>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sprawdzam..." : (
          <span className="inline-flex items-center gap-2">
            Wejdź
            <ArrowRight className="size-4" />
          </span>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Dostęp tylko dla wybranych adresów (rodzina). Bez hasła, bez magic
        linka — wpisujesz swój e-mail i wchodzisz.
      </p>

      <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
        <span className="size-7 rounded-lg bg-[var(--pv)]/15 border border-[var(--pv)]/30 flex items-center justify-center">
          <Sun className="size-3.5 text-[var(--pv)]" />
        </span>
        <span>Solax Monitor · 8 kWp Ząbki</span>
      </div>
    </form>
  );
}
