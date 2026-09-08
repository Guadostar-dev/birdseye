import { APP_VERSION } from "@/lib/version";

export function BuildVersion() {
  return (
    <p
      className="pointer-events-none fixed bottom-3 left-3 z-50 rounded-full bg-be-navy px-3 py-1.5 text-xs font-bold tracking-wide text-white shadow-lg"
      title="Build number. Increases by 0.0.1 on each update."
    >
      Build {APP_VERSION}
    </p>
  );
}
