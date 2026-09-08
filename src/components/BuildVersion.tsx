import { APP_VERSION } from "@/lib/version";

export function BuildVersion() {
  return (
    <p
      className="pointer-events-none fixed bottom-3 left-3 z-50 rounded-full border border-be-ice/80 bg-white/90 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-be-navy/65 shadow-sm backdrop-blur"
      title="Build number. Increases by 0.0.1 on each update."
    >
      Build {APP_VERSION}
    </p>
  );
}
