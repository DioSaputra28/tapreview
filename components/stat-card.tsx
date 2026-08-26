export function StatCard({
  variant = "default",
  label,
  value,
  icon,
}: {
  variant?: "primary" | "default";
  label: string;
  value: string | number;
  icon: string;
}) {
  if (variant === "primary") {
    return (
      <div className="bg-primary rounded-2xl p-6 text-white shadow-lg">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-base font-semibold text-white/90">{label}</h3>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-sm">
              {icon}
            </span>
          </div>
        </div>
        <p className="text-4xl font-bold">{value}</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-outline-variant/30">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-base font-semibold text-on-surface">{label}</h3>
        <div className="w-8 h-8 rounded-full border border-outline-variant flex items-center justify-center">
          <span className="material-symbols-outlined text-on-surface-variant text-sm">
            {icon}
          </span>
        </div>
      </div>
      <p className="text-4xl font-bold text-on-surface">{value}</p>
    </div>
  );
}
