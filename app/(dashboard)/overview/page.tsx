import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Przegląd" };
export const dynamic = "force-dynamic";

export default function OverviewPage() {
  return (
    <>
      <DashboardHeader title="Przegląd" recordedAt={null} />
      <Card className="glass">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Dane na żywo, kafelki KPI, energy flow i live commentary dochodzą w
          następnym pushu.
        </CardContent>
      </Card>
    </>
  );
}
