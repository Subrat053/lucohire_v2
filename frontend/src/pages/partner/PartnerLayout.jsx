import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Wallet,
  UserPlus,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  Landmark,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const links = [
  { to: "/partner/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/partner/create-provider", label: "Create Provider", icon: UserPlus },
  { to: "/partner/create-recruiter", label: "Create Recruiter", icon: Users },
  { to: "/partner/support", label: "Support & Chat", icon: MessageSquare },
  { to: "/partner/bank-details", label: "Bank Details", icon: Landmark },
  { to: "/partner/payouts", label: "Payouts", icon: Wallet },
  { to: "/partner/change-password", label: "Change Password", icon: ShieldCheck },
];

const PartnerLayout = ({ children }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const Sidebar = () => (
    <aside className="h-full bg-white border-r border-[#EEE8FA]">
      <div className="p-5 border-b border-[#EEE8FA]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-[#6D28D9] to-[#A855F7] text-white flex items-center justify-center font-black shadow-lg shadow-purple-200">
            SH
          </div>
          <div>
            <h1 className="text-base font-black text-[#17112B]">ServiceHub</h1>
            <p className="text-xs text-[#8B84A3]">Partner Workspace</p>
          </div>
        </div>
      </div>

      <nav className="p-4 space-y-2">
        {links.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.to;

          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`group flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition ${
                active
                  ? "bg-[#7C3AED] text-white shadow-lg shadow-purple-200"
                  : "text-[#6F6783] hover:bg-[#F5F0FF] hover:text-[#7C3AED]"
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon size={18} />
                {item.label}
              </span>
              <ChevronRight
                size={15}
                className={active ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
              />
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-5 left-4 right-4">
        <div className="rounded-3xl bg-[#F8F5FF] border border-[#EEE8FA] p-4">
          <p className="text-xs text-[#8B84A3]">Logged in as</p>
          <p className="text-sm font-black text-[#17112B] truncate">
            {user?.name || "Partner"}
          </p>
          <p className="text-xs text-[#8B84A3] truncate">
            {user?.phone || user?.email}
          </p>
          <button
            onClick={handleLogout}
            className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl bg-white text-[#7C3AED] text-sm font-bold hover:bg-[#7C3AED] hover:text-white transition"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#F8F7FB]">
      <header className="lg:hidden h-16 bg-white border-b border-[#EEE8FA] flex items-center justify-between px-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-[#6D28D9] to-[#A855F7] text-white flex items-center justify-center font-black">
            SH
          </div>
          <div>
            <h1 className="text-sm font-black text-[#17112B]">ServiceHub</h1>
            <p className="text-xs text-[#8B84A3]">Partner Dashboard</p>
          </div>
        </div>

        <button
          onClick={() => setMobileOpen(true)}
          className="w-10 h-10 rounded-2xl bg-[#F5F0FF] text-[#7C3AED] flex items-center justify-center"
        >
          <Menu size={22} />
        </button>
      </header>

      <div className="flex">
        <div className="hidden lg:block fixed left-0 top-0 w-72 h-screen z-30">
          <Sidebar />
        </div>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute left-0 top-0 bottom-0 w-80 max-w-[86vw]">
              <Sidebar />
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-[#F5F0FF] text-[#7C3AED] flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        <main className="w-full lg:pl-72">
          <div className="p-4 sm:p-6 lg:p-8 max-w-400 mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default PartnerLayout;