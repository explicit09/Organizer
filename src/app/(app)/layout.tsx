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
        {/* Sidebar - Desktop only */}
        <Sidebar />
        
        {/* Main Content Area */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Topbar */}
          <Topbar />
          
          {/* Page Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="page-container">
              {/* Mobile Navigation */}
              <MobileNav />
              {children}
            </div>
          </main>
        </div>
        
        {/* Overlays */}
        <CommandPalette />
        <AIAgent />
        <Toaster />
      </div>
    </ClientProviders>
  );
}
