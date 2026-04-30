import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sun, Battery, Zap, Activity } from "lucide-react";

export default function Home() {
  return (
    <main className="flex flex-1 w-full justify-center px-4 py-12 sm:px-6 sm:py-20">
      <div className="w-full max-w-5xl flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <span className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Solax Monitor
          </span>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
            Pipeline żyje. Dashboard w drodze.
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl">
            Faza 3 w toku — fundament webowy. Auth, overview i wykresy
            dochodzą w kolejnych krokach.
          </p>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[minmax(140px,_auto)]">
          <StatusCard
            icon={<Sun className="size-5 text-[var(--pv)]" />}
            label="Produkcja lifetime"
            value="17,7 MWh"
            sub="od 23.02.2023"
            tone="pv"
          />
          <StatusCard
            icon={<Activity className="size-5 text-[var(--savings)]" />}
            label="Pipeline"
            value="LIVE"
            sub="poll co 5 min"
            tone="savings"
          />
          <StatusCard
            icon={<Battery className="size-5 text-[var(--grid-export)]" />}
            label="Backfill"
            value="395 dni"
            sub="kwie 2025 → kwie 2026"
            tone="export"
          />
          <StatusCard
            icon={<Zap className="size-5 text-[var(--grid-import)]" />}
            label="Break-even"
            value="≈ maj 2026"
            sub="24 000 PLN netto"
            tone="import"
          />
        </section>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Roadmap
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <RoadmapRow status="done" label="Faza 0 · Setup repo + Supabase" />
            <RoadmapRow status="done" label="Faza 1 · Pipeline danych" />
            <RoadmapRow status="done" label="Faza 2 · Backfill historyczny" />
            <RoadmapRow status="active" label="Faza 3 · Dashboard webowy" />
            <RoadmapRow status="pending" label="Faza 4 · Chatbot operacyjny" />
            <RoadmapRow status="pending" label="Faza 5 · Chatbot techniczny (RAG)" />
            <RoadmapRow status="pending" label="Faza 7 · Multi-tenant polish" />
            <RoadmapRow status="pending" label="Faza 6 · Email digest + alerty" />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

type Tone = "pv" | "savings" | "import" | "export";

function StatusCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone: Tone;
}) {
  const toneRing: Record<Tone, string> = {
    pv: "shadow-[inset_0_0_0_1px_oklch(0.92_0.05_60_/_0.5)]",
    savings: "shadow-[inset_0_0_0_1px_oklch(0.92_0.05_155_/_0.5)]",
    import: "shadow-[inset_0_0_0_1px_oklch(0.92_0.05_25_/_0.5)]",
    export: "shadow-[inset_0_0_0_1px_oklch(0.92_0.04_230_/_0.5)]",
  };

  return (
    <Card className={`glass ${toneRing[tone]}`}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}

function RoadmapRow({
  status,
  label,
}: {
  status: "done" | "active" | "pending";
  label: string;
}) {
  const dot = {
    done: "bg-[var(--savings)]",
    active: "bg-[var(--pv)] animate-pulse",
    pending: "bg-zinc-300",
  }[status];

  const textCls = status === "pending" ? "text-muted-foreground" : "";

  return (
    <div className="flex items-center gap-3">
      <span className={`size-2 rounded-full ${dot}`} aria-hidden />
      <span className={textCls}>{label}</span>
    </div>
  );
}
