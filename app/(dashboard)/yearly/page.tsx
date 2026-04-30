import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Rok" };
export const dynamic = "force-dynamic";

export default function YearlyPage() {
  return (
    <>
      <DashboardHeader title="Rok" recordedAt={null} />
      <Card className="glass">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Year-over-year porównanie, sumy roczne, prognoza końca roku. Wkrótce.
        </CardContent>
      </Card>
    </>
  );
}
