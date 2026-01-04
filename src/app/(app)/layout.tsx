import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MobileNav } from "../../components/MobileNav";
import { Sidebar } from "../../components/Sidebar";
import { Topbar } from "../../components/Topbar";
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
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 px-4 py-6 md:px-8 md:py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 md:gap-8">
          <MobileNav />
          <Topbar />
          {children}
        </div>
      </main>
    </div>
  );
}
