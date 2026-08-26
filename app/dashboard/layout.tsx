import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { TopNav } from "@/components/top-nav";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="ml-[260px] w-[calc(100%-260px)] h-screen overflow-y-auto flex flex-col">
        <TopNav email={user.email ?? ""} />
        <div className="px-12 pb-12 flex-1 max-w-[1600px] w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
