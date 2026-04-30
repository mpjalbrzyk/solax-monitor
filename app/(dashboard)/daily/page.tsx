import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Dziś" };
export const dynamic = "force-dynamic";

export default function DailyPage() {
  return (
    <>
      <DashboardHeader title="Dziś" recordedAt={null} />
      <Card className="glass">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Wykres 24h produkcji vs zużycia, breakdown dnia. Wkrótce.
        </CardContent>
      </Card>
    </>
  );
}
