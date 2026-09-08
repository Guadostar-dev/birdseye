import { PortalHeader } from "@/components/PortalHeader";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <div className="min-h-screen">
      <PortalHeader username={session.username} />
      {children}
    </div>
  );
}
