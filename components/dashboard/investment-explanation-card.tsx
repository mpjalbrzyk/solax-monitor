import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";
import { formatPln } from "@/lib/format";
import type { RoiScenario } from "@/lib/derive/forecasts";

// Wyjaśnienie czemu Realne tempo PGE i Solax tempo dają różne liczby.
// Bez tego user widzący "Realne 9000 zł > Solax 5800 zł" myślał:
// "zielone większe = Realne tempo SZYBSZE"; po prawdzie obie metody są
// powolne, Solax jest po prostu zaniżony przez bug API (cost_pln
// niedoszacowany ~200×).
export function InvestmentExplanationCard({
  installationCostPln,
  subsidyPln,
  scenarios,
}: {
  installationCostPln: number;
  subsidyPln: number;
  scenarios: { real: RoiScenario; solax: RoiScenario };
}) {
  const grossPaid = installationCostPln + subsidyPln;
  const realRate = scenarios.real.annualRatePln;
  const solaxRate = scenarios.solax.annualRatePln;
  const gap = realRate - solaxRate;
  const gapPct = solaxRate > 0 ? Math.round((gap / solaxRate) * 100) : 0;

  return (
    <Card className="glass">
      <CardContent className="px-5 py-4">
        <div className="flex items-start gap-3">
          <div
            className="size-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "var(--brand-100)",
              boxShadow: "inset 0 0 0 1px var(--brand-300)",
            }}
            aria-hidden
          >
            <Info className="size-4" style={{ color: "var(--brand-700)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold tracking-tight mb-1.5">
              Czemu te liczby są różne?
            </h4>
            <p className="text-[11px] text-muted-foreground mb-2">
              Oba scenariusze startują od <strong>daty instalacji</strong>{" "}
              (luty 2023) i są liczone do dziś — ten sam okres,
              różne metody.
            </p>
            <ul className="text-xs text-muted-foreground leading-relaxed space-y-1.5">
              <li>
                <span
                  className="inline-block size-1.5 rounded-full mr-1.5 mb-0.5 align-middle"
                  style={{ background: "var(--brand-600)" }}
                  aria-hidden
                />
                <span className="text-foreground/85 font-medium">
                  Realne tempo (PGE)
                </span>{" "}
                — suma savings z <strong>37 faktur PGE</strong> miesiąc
                po miesiącu (lifetime). Najbliższe prawdy: pieniądze
                które fizycznie nie poszły do PGE.
              </li>
              <li>
                <span
                  className="inline-block size-1.5 rounded-full mr-1.5 mb-0.5 align-middle"
                  style={{ background: "var(--solar-600)" }}
                  aria-hidden
                />
                <span className="text-foreground/85 font-medium">
                  Solax tempo
                </span>{" "}
                — średnia roczna z ostatnich 12 mies. inwertera ×{" "}
                <strong>liczba lat od instalacji</strong>{" "}
                (ekstrapolacja, bo Solax API daje tylko ostatnie 13 mies.
                danych dziennych). Optymistyczne, bo Solax zaniża pobór
                z sieci ~200× (bug API).
              </li>
              {Math.abs(gap) > 100 && (
                <li className="pt-1">
                  Różnica tempa rocznego:{" "}
                  <strong className="text-foreground">
                    {formatPln(gap)}/rok ({gapPct > 0 ? "+" : ""}
                    {gapPct}%)
                  </strong>{" "}
                  — to skala bugu Solax dla Twojej instalacji.
                </li>
              )}
            </ul>
            <p className="text-[11px] text-muted-foreground mt-3 pt-3 border-t border-zinc-200/40 leading-relaxed">
              Brutto wpłacone:{" "}
              <strong className="text-foreground">
                {formatPln(grossPaid)}
              </strong>{" "}
              · dotacja Mój Prąd 4.0:{" "}
              <span style={{ color: "var(--brand-700)" }} className="font-medium">
                −{formatPln(subsidyPln)}
              </span>{" "}
              · netto:{" "}
              <strong className="text-foreground">
                {formatPln(installationCostPln)}
              </strong>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
