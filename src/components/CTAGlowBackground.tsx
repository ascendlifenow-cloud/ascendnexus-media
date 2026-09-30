export function CTAGlowBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-anm-panel" aria-hidden="true">
      <div className="absolute left-1/2 top-0 h-56 w-[36rem] -translate-x-1/2 rounded-full bg-anm-pink/20 blur-3xl" />
      <div className="absolute bottom-0 left-12 h-40 w-64 rounded-full bg-anm-sunrise/18 blur-3xl" />
      <div className="absolute right-10 top-12 h-44 w-72 rounded-full bg-anm-purple/22 blur-3xl" />
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-black/20" />
    </div>
  );
}
