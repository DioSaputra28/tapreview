export function TopNav({ email }: { email: string }) {
  return (
    <header className="flex justify-between items-center w-full px-12 py-6 bg-transparent z-10 sticky top-0 backdrop-blur-sm">
      <div className="relative w-96">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
          search
        </span>
        <input
          className="w-full bg-surface-container-lowest border border-outline-variant rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-secondary focus:outline-none"
          placeholder="Cari toko"
          type="text"
        />
      </div>
      <div className="flex items-center gap-3 border-l border-outline-variant pl-6">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">
          <span className="material-symbols-outlined">person</span>
        </div>
        <p className="hidden lg:block text-sm font-semibold text-on-surface">
          {email}
        </p>
      </div>
    </header>
  );
}
