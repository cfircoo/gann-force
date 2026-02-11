import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/cot", label: "COT Report" },
  { to: "/sentiment", label: "Sentiment" },
  { to: "/fastbull", label: "FastBull" },
];

export function Navbar() {
  return (
    <nav className="bg-gray-900 text-white px-6 py-3 flex items-center gap-8">
      <h1 className="text-xl font-bold tracking-tight">GannForce</h1>
      <div className="flex gap-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              cn(
                "px-3 py-1.5 rounded text-sm font-medium transition-colors",
                isActive
                  ? "bg-white/15 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              )
            }
          >
            {link.label}
          </NavLink>
        ))}
      </div>
      <span className="ml-auto text-sm text-gray-500">Data & Statistics</span>
    </nav>
  );
}
