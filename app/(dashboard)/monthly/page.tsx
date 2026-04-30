import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Miesiąc" };
export const dynamic = "force-dynamic";

export default function MonthlyPage() {
  return (
    <>
      <DashboardHeader title="Miesiąc" recordedAt={null} />
      <Card className="glass">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Bar chart dni miesiąca, top dni produkcji, kumulatywne kWh. Wkrótce.
        </CardContent>
      </Card>
    </>
  );
}
