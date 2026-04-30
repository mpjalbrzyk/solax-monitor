import { LoginForm } from "./login-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Wejście" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const params = await searchParams;
  const redirectTo =
    params.redirectTo && params.redirectTo.startsWith("/")
      ? params.redirectTo
      : "/overview";

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="glass-strong w-full max-w-sm">
        <CardContent className="px-6 py-8">
          <h1 className="text-2xl font-semibold tracking-tight mb-1">
            Cześć
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Wpisz e-mail żeby zobaczyć dane instalacji.
          </p>
          <LoginForm redirectTo={redirectTo} />
        </CardContent>
      </Card>
    </main>
  );
}
