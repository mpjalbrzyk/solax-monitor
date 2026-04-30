import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Finanse" };
export const dynamic = "force-dynamic";

export default function FinancialPage() {
  return (
    <>
      <DashboardHeader title="Finanse" recordedAt={null} />
      <Card className="glass">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Cumulative savings, break-even, prognoza, breakdown autokonsumpcja vs
          eksport. Wkrótce.
        </CardContent>
      </Card>
    </>
  );
}
