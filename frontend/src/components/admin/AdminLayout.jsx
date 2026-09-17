import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  HiShieldCheck,
  HiUsers,
  HiMail,
  HiBriefcase,
  HiCurrencyRupee,
  HiCog,
  HiPhotograph,
  HiLibrary,
  HiChevronLeft,
  HiChevronRight,
  HiLogout,
  HiMenu,
  HiX,
  HiDocumentText,
  HiShieldExclamation,
  HiCreditCard,
  HiCollection,
  HiGlobe,
  HiUserGroup,
  HiLink,
  HiGift,
  HiLockClosed,
  HiOutlineDocumentText,
  HiQuestionMarkCircle,
  HiInformationCircle,
  HiClipboardList,
  HiDatabase,
  HiTerminal,
} from "react-icons/hi";
import { Activity } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import useTranslation from "../../hooks/useTranslation";
import LanguageDropdown from "../LanguageDropdown";

const navItems = [
  {
    labelKey: "admin.navDashboard",
    fallback: "Dashboard",
    path: "/admin/dashboard",
    icon: HiShieldCheck,
  },
  {
    labelKey: "admin.healthDashboard",
    fallback: "Health & Cost Monitors",
    path: "/admin/health",
    icon: Activity,
    adminOnly: true,
  },
  {
    labelKey: "admin.externalServices",
    fallback: "External Services",
    path: "/admin/external-services",
    icon: HiGlobe,
    adminOnly: true,
  },

  {
    labelKey: "admin.candidates",
    fallback: "Candidates",
    icon: HiUsers,
    subItems: [
      {
        labelKey: "admin.navProviders",
        fallback: "Candidate Management",
        path: "/admin/providers",
      },
      {
        labelKey: "admin.outreachEngine",
        fallback: "Bulk Operations",
        path: "/admin/outreach",
        adminOnly: true,
      },
      {
        labelKey: "admin.profileApprovals",
        fallback: "Verification Queue",
        path: "/admin/profile-photo-approvals",
        adminOnly: true,
      },
      {
        labelKey: "admin.importCandidates",
        fallback: "Import Candidates",
        path: "/admin/import-candidates",
        adminOnly: true,
      },
    ],
  },
  {
    labelKey: "admin.navRecruiters",
    fallback: "Recruiters",
    icon: HiUsers,
    subItems: [
      {
        labelKey: "admin.allRecruiters",
        fallback: "All Recruiters",
        path: "/admin/recruiters",
      },
      {
        labelKey: "admin.recruiterApprovals",
        fallback: "Approval & Management",
        path: "/admin/recruiter-approvals",
        adminOnly: true,
      },
      {
        labelKey: "admin.importRecruiters",
        fallback: "Bulk Operations",
        path: "/admin/import-recruiters",
        adminOnly: true,
      },
    ],
  },
  {
    labelKey: "admin.automatedPipeline",
    fallback: "Unified Data Pipeline",
    path: "/admin/pipeline",
    icon: HiDatabase,
    adminOnly: true,
  },
  {
    labelKey: "admin.seoCommandCenter",
    fallback: "SEO Command Center",
    path: "/admin/seo-command-center",
    icon: HiGlobe,
    adminOnly: true,
  },
  {
    labelKey: "admin.selfHealingCenter",
    fallback: "Self-Healing Center",
    path: "/admin/self-healing",
    icon: HiShieldCheck,
    adminOnly: true,
  },
  {
    labelKey: "admin.crawlers",
    fallback: "Scrapers & Crawlers",
    icon: HiTerminal,
    adminOnly: true,
    subItems: [
      {
        labelKey: "admin.crawlers.single",
        fallback: "Single Scraper",
        path: "/admin/crawlers/single",
      },
      {
        labelKey: "admin.crawlers.bulk",
        fallback: "Bulk Mapping & Upload",
        path: "/admin/crawlers/bulk",
      },
      {
        labelKey: "admin.crawlers.engine",
        fallback: "Nightly Engine",
        path: "/admin/crawlers/engine",
      },
      {
        labelKey: "admin.crawlers.jobs",
        fallback: "Scraped Career Jobs",
        path: "/admin/crawlers/jobs",
      }
    ]
  },
  {
    labelKey: "admin.scrapedVault",
    fallback: "Scraped Data Vault",
    icon: HiTerminal,
    adminOnly: true,
    subItems: [
      {
        labelKey: "admin.scrapedJobs",
        fallback: "Scraped Jobs",
        path: "/admin/scraped-vault/jobs",
      },
      {
        labelKey: "admin.scrapedCandidates",
        fallback: "Scraped Candidates",
        path: "/admin/scraped-vault/candidates",
      },
      {
        labelKey: "admin.scrapedRecruiters",
        fallback: "Scraped Recruiters / Leads",
        path: "/admin/scraped-vault/recruiters",
      },
    ],
  },
  {
    labelKey: "admin.partners",
    fallback: "Partners",
    path: "/admin/partners",
    icon: HiUserGroup,
  },
  {
    labelKey: "admin.managerBankAccounts",
    fallback: "Bank Accounts",
    path: "/admin/manager-bank-accounts",
    icon: HiLibrary,
  },
  {
    labelKey: "admin.partnerPayouts",
    fallback: "Partner Payouts",
    path: "/admin/partner-payouts",
    icon: HiCurrencyRupee,
  },
  {
    labelKey: "admin.referrals",
    fallback: "Referrals",
    path: "/admin/referrals",
    icon: HiLink,
  },
  {
    labelKey: "admin.rewardPool",
    fallback: "Reward Pool",
    path: "/admin/reward-pool",
    icon: HiGift,
  },
  {
    labelKey: "admin.navUsers",
    fallback: "Users",
    path: "/admin/users",
    icon: HiUsers,
  },
  {
    labelKey: "admin.navContactLogs",
    fallback: "Contact Logs",
    path: "/admin/contact-logs",
    icon: HiUsers,
  },
  {
    labelKey: "admin.navEnquiries",
    fallback: "Enquiries",
    path: "/admin/enquiries",
    icon: HiMail,
  },
  {
    labelKey: "admin.portfolioApprovals",
    fallback: "Portfolio Approvals",
    path: "/admin/portfolio-approvals",
    icon: HiLink,
    adminOnly: true,
  },
  {
    labelKey: "admin.navSkills",
    fallback: "Skills",
    path: "/admin/skills",
    icon: HiCollection,
  },
  {
    labelKey: "admin.navJobRoles",
    fallback: "Job Roles",
    path: "/admin/job-roles",
    icon: HiCollection,
  },
  {
    labelKey: "admin.navPlans",
    fallback: "Plans",
    path: "/admin/plans",
    icon: HiCurrencyRupee,
  },
  {
    labelKey: "admin.navCustomPlans",
    fallback: "Custom Plans",
    path: "/admin/custom-plans",
    icon: HiCurrencyRupee,
  },
  {
    labelKey: "admin.navPayments",
    fallback: "Payments",
    path: "/admin/payments",
    icon: HiCreditCard,
  },
  {
    labelKey: "admin.navRefunds",
    fallback: "Refund Requests",
    path: "/admin/refunds",
    icon: HiCreditCard,
  },
  {
    labelKey: "admin.paymentIssues",
    fallback: "Payment Issues",
    path: "/admin/support-issues",
    icon: HiShieldExclamation,
    adminOnly: true,
  },
  {
    labelKey: "admin.payoutRequests",
    fallback: "Payout Requests",
    path: "/admin/withdrawals",
    icon: HiCurrencyRupee,
    adminOnly: true,
  },
  {
    labelKey: "admin.commissionRules",
    fallback: "Commission Rules",
    path: "/admin/commission-settings",
    icon: HiCog,
    adminOnly: true,
  },
  {
    labelKey: "admin.userSubscriptions",
    fallback: "User Subscriptions",
    path: "/admin/provider-subscriptions",
    icon: HiDocumentText,
  },
  {
    labelKey: "admin.navWhatsapp",
    fallback: "WhatsApp",
    path: "/admin/whatsapp",
    icon: FaWhatsapp,
  },
  {
    labelKey: "admin.navCurrency",
    fallback: "Currency",
    path: "/admin/currency",
    icon: HiGlobe,
  },
  {
    labelKey: "admin.navCountries",
    fallback: "Country Config",
    path: "/admin/countries",
    icon: HiGlobe,
  },
  {
    labelKey: "admin.aiOps",
    fallback: "AI Ops",
    path: "/admin/ai",
    icon: HiCog,
    adminOnly: true,
  },

  {
    labelKey: "admin.navSettings",
    fallback: "Settings",
    path: "/admin/settings",
    icon: HiCog,
  },
  {
    labelKey: "admin.navSocials",
    fallback: "Socials",
    path: "/admin/socials",
    icon: HiLink,
  },
  {
    labelKey: "admin.navPageContent",
    fallback: "Page Content",
    path: "/admin/page-content",
    icon: HiDocumentText,
  },
  {
    labelKey: "common.changePassword",
    fallback: "Change Password",
    path: "/admin/change-password",
    icon: HiLockClosed,
  },
  // ─── Logs & Audit ───────────────────────────────────────────────────────────
  {
    labelKey: "admin.otpLogs",
    fallback: "OTP Logs",
    path: "/admin/otp-logs",
    icon: HiShieldCheck,
    adminOnly: true,
  },
  {
    labelKey: "admin.aiResumeLogs",
    fallback: "AI Resume Logs",
    path: "/admin/ai-resume-logs",
    icon: HiClipboardList,
    adminOnly: true,
  },
  {
    labelKey: "admin.candidateUnlockLogs",
    fallback: "Unlock Logs",
    path: "/admin/candidate-unlock-logs",
    icon: HiLockClosed,
    adminOnly: true,
  },
  {
    labelKey: "admin.resumeAccessLogs",
    fallback: "Resume Access Logs",
    path: "/admin/resume-access-logs",
    icon: HiOutlineDocumentText,
    adminOnly: true,
  },
];

const AdminLayout = ({ children }) => {
  const { logout, user: admin } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Track open state of submenus (keyed by labelKey)
  const [openGroups, setOpenGroups] = useState({ "admin.candidates": true });

  const toggleGroup = (key) => {
    // Act like a radio button/accordion: opening one closes the rest.
    // By not spreading ...prev, all other keys become undefined (closed).
    setOpenGroups((prev) => ({
      [key]: !prev[key]
    }));
  };

  const handleLogout = () => {
    logout();
  };

  const renderSidebarContent = (onNavClick) => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div
        className={`flex items-center px-5 py-6 border-b border-white/10 ${collapsed ? "justify-center px-2" : "space-x-3"}`}
      >
        <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
          <HiShieldCheck className="text-white w-5 h-5" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-extrabold text-white text-[15px] tracking-tight leading-tight">
              LucoHire
            </span>
            <span className="font-bold text-emerald-400 text-[9px] tracking-[0.2em] uppercase leading-tight">
              Admin Console
            </span>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 space-y-1 px-3 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const currentRole = admin?.role;

          if (item.subItems) {
            // Group logic
            const groupActive = item.subItems.some(
              (sub) => location.pathname === sub.path,
            );
            const isOpen = openGroups[item.labelKey];
            const GroupIcon = item.icon;

            return (
              <div key={item.labelKey} className="space-y-1">
                <button
                  onClick={() => {
                    if (collapsed) setCollapsed(false);
                    toggleGroup(item.labelKey);
                  }}
                  className={`w-full relative flex items-center justify-between rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-all group overflow-hidden
                    ${groupActive ? "bg-[#062F27]/50 text-emerald-400" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"}
                  `}
                >
                  <div
                    className={`flex items-center ${collapsed ? "justify-center w-full" : "space-x-3"}`}
                  >
                    <GroupIcon
                      className={`w-[18px] h-[18px] shrink-0 ${groupActive ? "text-emerald-400" : "text-gray-500 group-hover:text-gray-400"}`}
                    />
                    {!collapsed && (
                      <span>{t(item.labelKey, item.fallback)}</span>
                    )}
                  </div>
                  {!collapsed && (
                    <HiChevronRight
                      className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                    />
                  )}
                </button>

                {!collapsed && isOpen && (
                  <div className="pl-9 pr-2 space-y-1 mt-1">
                    {item.subItems.map((subItem) => {
                      if (
                        currentRole === "manager" &&
                        !["/admin/providers", "/admin/recruiters"].includes(
                          subItem.path,
                        )
                      )
                        return null;
                      if (subItem.adminOnly && currentRole !== "admin")
                        return null;

                      const active = location.pathname === subItem.path;
                      return (
                        <Link
                          key={subItem.path}
                          to={subItem.path}
                          onClick={onNavClick}
                          className={`flex items-center rounded-lg px-3 py-2 text-[12.5px] font-medium transition-all relative
                            ${active ? "bg-emerald-500/10 text-emerald-400" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"}
                          `}
                        >
                          {active && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] bg-emerald-500 rounded-r-full"></div>
                          )}
                          <span>{t(subItem.labelKey, subItem.fallback)}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // Normal flat item
          if (
            currentRole === "manager" &&
            !["/admin/providers", "/admin/recruiters"].includes(item.path)
          )
            return null;
          if (item.adminOnly && currentRole !== "admin") return null;
          const label = t(item.labelKey, item.fallback);
          const active = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavClick}
              title={collapsed ? label : undefined}
              className={`relative flex items-center rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-all group overflow-hidden
                ${
                  active
                    ? "bg-[#062F27] text-emerald-400"
                    : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                }
                ${collapsed ? "justify-center" : "space-x-3"}
              `}
            >
              {active && !collapsed && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-r-md"></div>
              )}
              <Icon
                className={`w-[18px] h-[18px] shrink-0 ${active ? "text-emerald-400" : "text-gray-500 group-hover:text-gray-400"}`}
              />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="shrink-0 px-3 pb-4">
        <button
          onClick={handleLogout}
          title={collapsed ? t("navbar.logout", "Logout") : undefined}
          className={`flex items-center w-full rounded-lg px-3 py-2.5 text-[13px] font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all
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
    <div className="flex">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-[#0B1320] text-gray-300 transition-all duration-300 shrink-0 sticky top-0 h-screen z-20
        ${collapsed ? "w-16" : "w-[240px]"}
      `}
      >
        {renderSidebarContent()}
        {/* Collapse toggle */}
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

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-64 h-full bg-[#0B1320] text-gray-300 shadow-xl flex flex-col overflow-y-auto">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-3 p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition z-50"
            >
              <HiX className="w-5 h-5" />
            </button>
            {renderSidebarContent(() => setMobileOpen(false))}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Bar */}
        <div className="md:hidden flex items-center justify-between bg-white border-b border-gray-100 px-4 py-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg hover:bg-gray-100"
          >
            <HiMenu className="w-5 h-5 text-gray-700" />
          </button>
          <span className="font-semibold text-gray-800 text-sm">
            {t("admin.panel", "Admin Panel")}
          </span>
          <div className="w-8" />
        </div>

        <main className="flex-1 overflow-auto p-0">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
