import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MobileNav } from "../../components/MobileNav";
import { Sidebar } from "../../components/Sidebar";
import { Topbar } from "../../components/Topbar";
import { CommandPalette } from "../../components/CommandPalette";
import { AIAgent } from "../../components/AIAgent";
import { Toaster } from "../../components/ui/Toaster";
import { ClientProviders } from "../../components/ClientProviders";
import { getSessionUserId } from "../../lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const userId = session ? getSessionUserId(session) : null;

  if (!userId) {
    redirect("/login");
  }

  return (
    <ClientProviders>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col m-2 ml-0 md:ml-2">
          <main className="flex flex-1 flex-col bg-card border border-border rounded-lg min-w-0 overflow-hidden">
            <Topbar />
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mx-auto max-w-6xl">
                <MobileNav />
                {children}
              </div>
            </div>
          </main>
        </div>
        <CommandPalette />
        <AIAgent />
        <Toaster />
      </div>
    </ClientProviders>
  );
}
