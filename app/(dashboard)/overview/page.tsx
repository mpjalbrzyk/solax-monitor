import { Sun, Wallet, Zap, Battery, BatteryLow } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard/header";
import { EnergyFlowDiagram } from "@/components/dashboard/energy-flow";
import { KpiTile } from "@/components/dashboard/kpi-tile";
import { AlarmsWidget } from "@/components/dashboard/alarms-widget";
import {
  getActiveInverter,
  getDailyAggregates,
  getLatestDeviceReading,
  getLatestPlantReading,
  getRecentAlarms,
} from "@/lib/data/queries";
import { deriveEnergyFlow, deriveFlowArrows, buildLiveCommentary } from "@/lib/derive";
import { formatKwh, formatPercent, formatPln, formatPower } from "@/lib/format";

export const metadata = { title: "Przegląd" };
export const dynamic = "force-dynamic";

function todayWarsawIso(): string {
  // YYYY-MM-DD in Europe/Warsaw, regardless of server tz.
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(now);
}

function firstOfMonthWarsawIso(): string {
  const today = todayWarsawIso();
  return `${today.slice(0, 7)}-01`;
}

export default async function OverviewPage() {
  const inverter = await getActiveInverter();

  if (!inverter) {
    return (
      <>
        <DashboardHeader title="Przegląd" recordedAt={null} />
        <Card className="glass">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Brak instalacji w bazie. Sprawdź konfigurację Supabase.
          </CardContent>
        </Card>
      </>
    );
  }

  const today = todayWarsawIso();
  const monthStart = firstOfMonthWarsawIso();

  const [plant, inverterDevice, batteryDevice, alarms, dailyRange, todayAgg] =
    await Promise.all([
      getLatestPlantReading(inverter.id),
      getLatestDeviceReading(inverter.id, 1),
      getLatestDeviceReading(inverter.id, 2),
      getRecentAlarms(inverter.id, 30),
      getDailyAggregates(inverter.id, monthStart, today),
      getDailyAggregates(inverter.id, today, today).then((rs) => rs[0] ?? null),
    ]);

  const flow = deriveEnergyFlow(inverterDevice, batteryDevice);
  const arrows = deriveFlowArrows(flow);
  const commentary = buildLiveCommentary({
    flow,
    plant,
    todayAgg,
  });

  const monthlySavings = dailyRange.reduce(
    (sum, d) => sum + (Number(d.savings_pln) || 0),
    0,
  );
  const dailyYield = Number(plant?.daily_yield_kwh ?? todayAgg?.yield_kwh ?? 0);

  return (
    <>
      <DashboardHeader
        title="Przegląd"
        recordedAt={inverterDevice?.recorded_at ?? plant?.recorded_at ?? null}
      />

      <Card className="glass mb-4">
        <CardContent className="py-5 px-5 sm:px-6">
          <p className="text-sm sm:text-base leading-relaxed text-foreground/90">
            {commentary}
          </p>
        </CardContent>
      </Card>

      <div className="mb-4">
        <EnergyFlowDiagram flow={flow} arrows={arrows} />
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KpiTile
          icon={Sun}
          label="Produkcja teraz"
          value={formatPower(flow.pvW)}
          sub={`Dziś ${formatKwh(dailyYield)}`}
          tone="pv"
        />
        <KpiTile
          icon={Zap}
          label="Dom zużywa"
          value={formatPower(flow.loadW)}
          sub={
            flow.gridW < -50
              ? `Pobór z sieci ${formatPower(-flow.gridW)}`
              : flow.gridW > 50
                ? `Eksport ${formatPower(flow.gridW)}`
                : "Bilans zerowy"
          }
          tone={flow.gridW < -50 ? "import" : "export"}
        />
        <KpiTile
          icon={Wallet}
          label="Oszczędności w tym miesiącu"
          value={formatPln(monthlySavings)}
          sub={`${dailyRange.length} dni rozliczonych`}
          tone="savings"
        />
        {flow.hasBattery ? (
          <KpiTile
            icon={Battery}
            label="Bateria"
            value={formatPercent(flow.batterySocPct)}
            sub={
              flow.batteryW != null && flow.batteryW > 50
                ? `Oddaje ${formatPower(flow.batteryW)}`
                : flow.batteryW != null && flow.batteryW < -50
                  ? `Ładuje ${formatPower(-flow.batteryW)}`
                  : "Stoi"
            }
            tone="savings"
          />
        ) : (
          <KpiTile
            icon={BatteryLow}
            label="Bateria"
            value="Brak"
            sub="Falownik bez magazynu"
            tone="neutral"
          />
        )}
      </section>

      <AlarmsWidget alarms={alarms} />
    </>
  );
}
