export function FooterCopyrightBar() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="border-t border-white/10 py-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 text-sm text-white/52 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <p>© {currentYear} Ascend Nexus Media. All rights reserved.</p>
        <p>Part of the Ascend Nexus creative ecosystem.</p>
      </div>
    </div>
  );
}
