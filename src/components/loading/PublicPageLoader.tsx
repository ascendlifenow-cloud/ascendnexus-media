import { BrandLogo } from "../BrandLogo";

interface PublicPageLoaderProps {
  label?: string;
}

export function PublicPageLoader({ label = "Loading Ascend Nexus Media..." }: PublicPageLoaderProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-anm-page-gradient px-4 pt-24" aria-busy="true" aria-live="polite">
      <div className="relative w-full max-w-sm text-center">
        <div className="absolute inset-0 -z-10 rounded-full bg-anm-purple/20 blur-3xl motion-safe:animate-pulse" aria-hidden="true" />
        <div className="rounded-anm-panel border border-white/10 bg-anm-surface-glass px-6 py-9 shadow-anm-card-glow backdrop-blur-xl">
          <div className="flex justify-center">
            <BrandLogo />
          </div>
          <div className="mx-auto mt-7 h-1.5 max-w-48 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
            <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-anm-blue via-anm-pink to-anm-gold animate-anm-loader" />
          </div>
          <p className="mt-5 text-sm font-semibold text-white/72">{label}</p>
        </div>
      </div>
    </main>
  );
}
