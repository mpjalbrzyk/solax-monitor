import { Sun } from "lucide-react";
import { RefreshIndicator } from "./refresh-indicator";
import { LogoutButton } from "./logout-button";

export function DashboardHeader({
  recordedAt,
  title,
}: {
  recordedAt: string | null;
  title?: string;
}) {
  return (
    <header className="flex items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-3 lg:hidden">
        <span className="size-9 rounded-xl bg-[var(--pv)]/15 border border-[var(--pv)]/30 flex items-center justify-center">
          <Sun className="size-4 text-[var(--pv)]" />
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">
            Solax Monitor
          </span>
          {title && (
            <span className="text-[11px] text-muted-foreground">{title}</span>
          )}
        </div>
      </div>

      <div className="hidden lg:flex flex-col">
        {title && (
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-2">
        <RefreshIndicator recordedAt={recordedAt} />
        <span className="lg:hidden">
          <LogoutButton variant="icon" />
        </span>
      </div>
    </header>
  );
}
