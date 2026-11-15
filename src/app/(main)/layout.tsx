import type { ReactNode } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/layout/nav-bar";
import { CurrentUserProvider } from "@/components/providers/current-user-provider";
import { getCurrentProfile } from "@/lib/data/profile";

export default async function MainLayout({ children }: { children: ReactNode }) {
  await connection();
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  return (
    <CurrentUserProvider profile={profile}>
      <NavBar />
      <main className="mx-auto w-full max-w-[640px] flex-1 px-4 py-6">
        {children}
      </main>
    </CurrentUserProvider>
  );
}
