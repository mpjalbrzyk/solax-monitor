import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileNav } from "@/components/dashboard/mobile-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 w-full">
      <Sidebar />
      <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 sm:py-8 pb-24 lg:pb-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
      <MobileNav />
    </div>
  );
}
