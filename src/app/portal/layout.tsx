import { PortalHeader } from "@/components/PortalHeader";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <div className="grid h-dvh max-h-dvh grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
      <PortalHeader username={session.username} />
      <div className="min-h-0 overflow-auto">{children}</div>
    </div>
  );
}
