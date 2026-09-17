import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  HiTrendingUp,
  HiUsers,
  HiPhone,
  HiCog,
  HiChevronLeft,
  HiChevronRight,
  HiLogout,
  HiMenu,
  HiX,
  HiClock,
  HiBriefcase,
  HiMail,
  HiLockClosed,
  HiPlusCircle,
  HiCreditCard,
  HiUserAdd,
  HiSparkles,
  HiClipboardList,
  HiOutlineBookmark,
} from "react-icons/hi";
import { useAuth } from "../../context/AuthContext";
import NotificationBell from "../common/NotificationBell";
import LanguageDropdown from "../LanguageDropdown";
import useTranslation from "../../hooks/useTranslation";
import { getCurrentSubscription } from "../../services/providerPlanService";
import { FaWhatsapp } from "react-icons/fa";
import { ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { providerAPI } from "../../services/api";

const navItems = [
  {
    label: "Explore Opportunities",
    fallback: "Explore Opportunities",
    path: "/provider/job-for-me",
    icon: HiBriefcase,
  },
  {
    label: "Dashboard",
    fallback: "Dashboard",
    path: "/provider/dashboard",
    icon: HiTrendingUp,
  },
  {
    label: "Edit Profile",
    fallback: "Edit Profile",
    path: "/provider/profile",
    icon: HiCog,
  },
  {
    label: "Career Analysis",
    fallback: "Career Analysis",
    path: "/provider/career-health",
    icon: HiTrendingUp,
  },
  {
    label: "Interview Preparation",
    fallback: "Interview Preparation",
    path: "/provider/grow-with-ai",
    icon: HiSparkles,
  },
  {
    label: "AI Career Coach",
    fallback: "AI Career Coach",
    path: "/provider/ai-career-coach",
    icon: HiSparkles,
  },
  {
    label: "AI Dashboard",
    fallback: "AI Dashboard",
    path: "/provider/ai-tips",
    icon: HiSparkles,
  },
  {
    label: "Resume & Profile Toolkit",
    fallback: "Resume & Profile Toolkit",
    path: "/provider/resume-toolkit",
    icon: HiClipboardList,
  },
  {
    label: "Applied Jobs",
    fallback: "Applied Jobs",
    path: "/provider/applied-jobs",
    icon: HiClipboardList,
  },
  {
    label: "Saved Jobs",
    fallback: "Saved Jobs",
    path: "/provider/saved-jobs",
    icon: HiOutlineBookmark,
  },
  {
    label: "My Plan",
    fallback: "My Plan",
    path: "/provider/my-plan",
    icon: HiPhone,
  },
  /*
  {
    label: "My Refunds",
    fallback: "My Refunds",
    path: "/provider/refunds",
    icon: HiClock,
  },
  */
  {
    label: "Refer & Earn",
    fallback: "Refer & Earn",
    path: "/provider/referrals",
    icon: HiPlusCircle,
  },
  {
    label: "Add Member",
    fallback: "Add Member",
    path: "/provider/add-member",
    icon: HiUserAdd,
  },
  {
    label: "Messages",
    fallback: "Messages",
    path: "/provider/contacted",
    icon: HiMail,
  },
  { label: "Leads", fallback: "Leads", path: "/provider/leads", icon: HiUsers },

  {
    label: "Payment History",
    fallback: "Payment History",
    path: "/provider/history",
    icon: HiCreditCard,
  },
  {
    label: "Wallet",
    fallback: "Wallet",
    path: "/provider/wallet",
    icon: HiCreditCard,
  },
  {
    label: "Payment Settings",
    fallback: "Payment Settings",
    path: "/provider/payout-settings",
    icon: HiCog,
  },
  {
    label: "Support",
    fallback: "Support",
    path: "/provider/support",
    icon: HiCog,
  },
  {
    label: "Change Password",
    fallback: "Change Password",
    path: "/provider/change-password",
    icon: HiLockClosed,
  },
];

const ProviderLayout = ({ children }) => {
  const { user, profile, logout } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showFreelanceModal, setShowFreelanceModal] = useState(false);

  const impersonatorToken = localStorage.getItem("impersonatorToken");
  const isImpersonating = !!impersonatorToken;
  const impersonatorRole = localStorage.getItem("impersonatorRole") || "admin";
  const impersonatorRestriction = localStorage.getItem(
    "impersonatorRestriction",
  );

  const displayedNavItems =
    impersonatorRestriction === "payment"
      ? navItems.filter((item) =>
          [
            "/provider/payout-settings",
            "/provider/wallet",
            "/provider/my-plan",
            "/provider/history",
          ].includes(item.path),
        )
      : impersonatorRestriction === "manager_support"
        ? navItems.filter(
            (item) =>
              item.path === "/provider/profile" ||
              item.path === "/provider/job-for-me" ||
              item.path === "/provider/applied-jobs",
          )
        : navItems;

  const handleRestoreSession = () => {
    if (impersonatorToken) {
      localStorage.setItem("authToken", impersonatorToken);
      localStorage.removeItem("impersonatorToken");
      localStorage.removeItem("impersonatorRole");
      localStorage.removeItem("impersonatorRestriction");
      window.location.href =
        impersonatorRole === "manager"
          ? "/manager/dashboard"
          : "/admin/dashboard";
    }
  };

  const [planTag, setPlanTag] = useState({
    loading: true,
    type: "Free",
    days: 0,
  });

  useEffect(() => {
    let isMounted = true;
    const fetchPlan = async () => {
      try {
        const data = await getCurrentSubscription();
        const sub = data?.subscription || (data?.plan ? null : data);

        if (
          sub &&
          (sub.subscriptionStatus === "active" || sub.status === "active")
        ) {
          const planName =
            sub.planSnapshot?.name ||
            sub.planName ||
            data?.plan?.name ||
            "Paid";
          const isFree =
            sub.planSnapshot?.slug === "free" ||
            String(planName).toLowerCase().includes("free");

          if (isFree) {
            if (isMounted)
              setPlanTag({ loading: false, type: "Free", days: 0 });
            return;
          }

          const expiryDateStr =
            sub.endDate || sub.expiresAt || profile?.boostedUntil;
          let daysLeft = 0;

          if (expiryDateStr) {
            const expiryTime = new Date(expiryDateStr).getTime();
            const nowTime = new Date().getTime();
            daysLeft = Math.max(
              0,
              Math.ceil((expiryTime - nowTime) / (1000 * 60 * 60 * 24)),
            );
          } else if (sub.startDate) {
            const startTime = new Date(sub.startDate).getTime();
            const durationDays = (Number(sub.durationMonths) || 1) * 30;
            const expiryTime = startTime + durationDays * 24 * 60 * 60 * 1000;
            const nowTime = new Date().getTime();
            daysLeft = Math.max(
              0,
              Math.ceil((expiryTime - nowTime) / (1000 * 60 * 60 * 24)),
            );
          }

          if (isMounted) {
            if (daysLeft > 0) {
              setPlanTag({ loading: false, type: planName, days: daysLeft });
            } else {
              setPlanTag({ loading: false, type: "Free", days: 0 });
            }
          }
        } else {
          if (isMounted) setPlanTag({ loading: false, type: "Free", days: 0 });
        }
      } catch (err) {
        if (isMounted) setPlanTag({ loading: false, type: "Free", days: 0 });
      }
    };

    fetchPlan();
    return () => {
      isMounted = false;
    };
  }, [location.pathname, profile?.boostedUntil]);

  const handleLogout = () => {
    if (
      window.lucodeProfileIsDirty &&
      typeof window.lucodeProfileShowWarning === "function"
    ) {
      window.lucodeProfileShowWarning("LOGOUT");
      return;
    }
    logout();
  };

  const handleWhatsappCheckout = async () => {
    try {
      toast.loading("Redirecting to checkout...", { id: "whatsapp-checkout" });
      const { data } = await providerAPI.checkoutWhatsappPlan();
      if (data?.checkout?.url) {
        window.location.href = data.checkout.url;
      } else {
        toast.error("Could not get checkout URL", { id: "whatsapp-checkout" });
      }
    } catch (err) {
      toast.error("Failed to initiate checkout", { id: "whatsapp-checkout" });
    }
  };

  const handleLinkClick = (e, path, callback) => {
    if (
      window.lucodeProfileIsDirty &&
      typeof window.lucodeProfileShowWarning === "function"
    ) {
      e.preventDefault();
      window.lucodeProfileShowWarning(path);
      return;
    }
    if (callback) callback(e);
  };

  const renderSidebarContent = (onNavClick) => (
    <div className="flex flex-col h-full">
      <div
        className={`flex items-center px-4 py-5 border-b border-gray-100 ${collapsed ? "justify-center" : "space-x-3"}`}
      >
        <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shrink-0">
          <HiTrendingUp className="text-white w-4 h-4" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-bold text-gray-800 text-sm">
              {t("provider.panel", "Provider Panel")}
            </span>
            {!planTag.loading && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 mt-0.5 rounded-full w-fit ${planTag.type === "Free" ? "bg-gray-100 text-gray-700" : "bg-emerald-100 text-emerald-700"}`}
              >
                {planTag.type === "Free" ? "Free" : `${planTag.days} Days Left`}
              </span>
            )}
          </div>
        )}
      </div>

      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {displayedNavItems.map((item) => {
          const { label, fallback, path, icon: Icon, subItems } = item;
          const active =
            location.pathname === path ||
            (path && location.pathname.startsWith(path + "/")) ||
            (subItems &&
              subItems.some((sub) => location.pathname === sub.path));

          return (
            <div key={path || label} className="flex flex-col">
              {path ? (
                <Link
                  to={path}
                  onClick={(e) => handleLinkClick(e, path, onNavClick)}
                  title={collapsed ? label : undefined}
                  className={`flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-all group
                    ${
                      active && !subItems
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    }
                    ${collapsed ? "justify-center" : "space-x-3"}
                  `}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 ${active && !subItems ? "text-white" : "text-gray-400 group-hover:text-gray-700"}`}
                  />
                  {!collapsed && <span>{t(label, fallback)}</span>}
                </Link>
              ) : (
                <div
                  title={collapsed ? label : undefined}
                  className={`flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-all group text-gray-800 bg-gray-50
                    ${collapsed ? "justify-center" : "space-x-3"}
                  `}
                >
                  <Icon className="w-5 h-5 shrink-0 text-gray-500" />
                  {!collapsed && (
                    <span className="font-bold">{t(label, fallback)}</span>
                  )}
                </div>
              )}

              {subItems && !collapsed && (
                <div className="ml-8 mt-1 space-y-1 flex flex-col">
                  {subItems.map((sub) => {
                    const subActive = location.pathname === sub.path;
                    return (
                      <Link
                        key={sub.path}
                        to={sub.path}
                        onClick={(e) =>
                          handleLinkClick(e, sub.path, onNavClick)
                        }
                        className={`text-xs px-3 py-2 rounded-md font-medium transition-colors ${
                          subActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                        }`}
                      >
                        {t(sub.label, sub.fallback)}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 px-2 pb-4 border-t border-gray-100 pt-3">
        <button
          onClick={handleLogout}
          title={collapsed ? t("navbar.logout", "Logout") : undefined}
          className={`flex items-center w-full rounded-xl px-3 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 transition-all
            ${collapsed ? "justify-center" : "space-x-3"}
          `}
        >
          <HiLogout className="w-5 h-5 shrink-0" />
          {!collapsed && <span>{t("navbar.logout", "Logout")}</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <div className="flex flex-1">
        {(!isImpersonating || impersonatorRestriction === "payment") && (
          <aside
            className={`hidden md:flex flex-col bg-white border-r border-gray-100 transition-all duration-300 shrink-0 sticky top-16 self-start h-[calc(100vh-4rem)]
            ${collapsed ? "w-16" : "w-56"}
          `}
          >
            {renderSidebarContent()}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition z-10"
            >
              {collapsed ? (
                <HiChevronRight className="w-3 h-3 text-gray-500" />
              ) : (
                <HiChevronLeft className="w-3 h-3 text-gray-500" />
              )}
            </button>
          </aside>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          {isImpersonating && (
            <div className="bg-amber-100 border-b border-amber-200 px-6 py-3 flex items-center justify-between text-amber-900 shadow-sm z-20">
              <div className="flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <div className="font-bold text-sm">
                    {t("Restricted Support View")}
                  </div>
                  <div className="text-xs opacity-80">
                    {t("You are viewing")}
                    {user?.email}
                    {t("'s profile data as a")}
                    {impersonatorRole}
                    {t(". Navigation is restricted to relevant areas.")}
                  </div>
                </div>
              </div>
              <button
                onClick={handleRestoreSession}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm transition"
              >
                {t("Exit & Return to")}
                {impersonatorRole === "manager" ? "Manager" : "Admin"}
                {t("Dashboard")}
              </button>
            </div>
          )}

          {!isImpersonating && (
            <div className="bg-emerald-950 text-white px-6 py-4 flex items-center justify-between shadow-xs select-none">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  {t("Provider Panel")}
                </span>
                <span className="text-slate-500 text-xs">/</span>
                <span className="text-sm font-extrabold text-teal-400 tracking-wide">
                  {(() => {
                    const currentNav =
                      navItems.find(
                        (item) => location.pathname === item.path,
                      ) ||
                      navItems.find((item) =>
                        location.pathname.startsWith(item.path),
                      );
                    return currentNav
                      ? t(currentNav.label, currentNav.fallback)
                      : "Panel";
                  })()}
                </span>
              </div>
              <div className="hidden sm:block text-xs font-bold text-slate-400">
                {t("Active Session")}
              </div>
            </div>
          )}

          <main className="flex-1 overflow-auto p-0 pb-28">{children}</main>
          {profile?.whatsappFreelancePlanActive !== true && (
            <div className="fixed bottom-6 right-6 z-50">
              <button
                onClick={() => navigate('/provider/plans#addons')}
                className="bg-white hover:bg-gray-50 text-gray-900 rounded-full pl-2 pr-5 py-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center gap-3 transition transform hover:scale-105 border border-gray-100 group"
              >
                <div className="w-12 h-12 bg-[#075E54] rounded-full flex items-center justify-center shadow-inner group-hover:bg-[#20bd5a] transition-colors">
                  <FaWhatsapp className="w-7 h-7 text-white" />
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-sm font-extrabold leading-tight text-gray-900">
                    {t("Earn Extra Income")}
                  </div>
                  <div className="text-[11px] font-medium text-gray-500 mt-0.5">
                    {t("Nearby freelance work")}
                    <br />{" "}
                    <span className="font-bold text-gray-700">
                      {t("₹30/month")}
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 ml-1 text-gray-400 group-hover:text-gray-700 transition-colors hidden sm:block" />
              </button>
            </div>
          )}

          {showFreelanceModal && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200 text-center">
                <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mb-4 text-[#075E54] mx-auto shadow-inner">
                  <FaWhatsapp className="w-8 h-8 text-[#075E54]" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-800 mb-2">
                  {t("Earn Extra Income")}
                </h3>
                <p className="text-[14px] text-slate-600 mb-4 leading-relaxed">
                  {t(
                    "Get direct nearby freelance work opportunities and recruiter updates delivered to your WhatsApp.",
                  )}
                </p>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
                  <span className="text-xs uppercase font-bold text-emerald-800 tracking-wider block mb-1">
                    {t("Freelance WhatsApp Facility")}
                  </span>
                  <div className="text-2xl font-black text-emerald-700">
                    ₹1 <span className="text-sm font-bold">{t("per day")}</span>
                  </div>
                  <span className="text-xs text-emerald-600 block mt-1 font-semibold">
                    (
                    {t("Billed at ₹30 / month. Proceeding to payment gateway.")}
                    )
                  </span>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowFreelanceModal(false)}
                    className="flex-1 py-2.5 px-4 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    {t("Cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowFreelanceModal(false);
                      handleWhatsappCheckout();
                    }}
                    className="flex-1 py-2.5 px-4 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5"
                  >
                    {t("Proceed")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProviderLayout;
