import Link from "next/link";
import {
  ArrowRightStartOnRectangleIcon,
  BuildingStorefrontIcon,
  Squares2X2Icon,
  ViewfinderCircleIcon,
} from "@heroicons/react/24/outline";
import { logout } from "@/app/login/actions";

export function Sidebar({ active }: { active: "dashboard" | "toko" }) {
  const itemClass = (isActive: boolean) =>
    `flex items-center gap-x-3 px-4 py-3 rounded-xl transition-all ${
      isActive
        ? "bg-secondary-container text-on-secondary-container font-bold border-l-4 border-secondary"
        : "text-on-surface-variant hover:text-secondary hover:bg-surface-container-high"
    }`;

  return (
    <aside className="w-[260px] h-screen fixed left-0 top-0 bg-surface-bright border-r border-outline-variant flex flex-col p-5 z-20">
      <div className="flex items-center gap-3 mb-10 mt-2 px-2">
        <ViewfinderCircleIcon className="h-8 w-8 text-secondary" />
        <div>
          <h1 className="text-lg font-semibold text-on-surface">TapReview</h1>
          <p className="text-xs uppercase tracking-wider text-on-surface-variant">
            Management
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        <p className="text-xs uppercase px-4 mb-2 mt-4 text-outline">Menu</p>
        <Link href="/dashboard" className={itemClass(active === "dashboard")}>
          <Squares2X2Icon className="h-5 w-5" />
          <span className="text-sm font-semibold">Dashboard</span>
        </Link>
        <Link href="/dashboard" className={itemClass(active === "toko")}>
          <BuildingStorefrontIcon className="h-5 w-5" />
          <span className="text-sm">Toko</span>
        </Link>
      </nav>

      <div className="mt-6 pt-6 border-t border-outline-variant">
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-x-3 px-4 py-2 text-on-surface-variant hover:text-error transition-colors rounded-xl text-sm"
          >
            <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
