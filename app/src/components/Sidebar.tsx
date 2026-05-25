import { Link, useLocation } from "react-router";
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Pill,
  Settings,
  HeartPulse,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/patients", label: "Patients", icon: Users },
  { path: "/consultation", label: "New Consultation", icon: Stethoscope },
  { path: "/medications", label: "Medications", icon: Pill },
  { path: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] bg-[#F9F9F7] border-r border-[#EDECE8] flex flex-col z-50">
      {/* Logo */}
      <div className="px-4 py-5 flex items-center gap-2">
        <HeartPulse className="w-6 h-6 text-[#7E8F7C]" />
        <span className="font-display text-xl font-normal text-[#2C3A2B]">
          MediLogix
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.path);
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "active text-[#2C3A2B]"
                  : "text-[#9C9B97] hover:text-[#2C3A2B] hover:bg-[rgba(126,143,124,0.04)]"
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-3 border-t border-[#EDECE8]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-[#2C3A2B]">
              {user?.name ?? "Doctor"}
            </div>
            <div className="text-[10px] text-[#9C9B97] capitalize">
              {user?.role ?? "doctor"}
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-md text-[#9C9B97] hover:text-[#C97B7B] hover:bg-[rgba(201,123,123,0.08)] transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
