import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, Sparkles, ShieldCheck, Zap, HelpCircle } from "lucide-react";
import { planAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "../components/common/LoadingSpinner";
import useTranslation from "../hooks/useTranslation";
import Seo from "../components/common/Seo";

const PricingPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();

  const initialTab = searchParams.get("tab") === "recruiter" || searchParams.get("role") === "recruiter"
    ? "recruiter"
    : "provider";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState('monthly');

  // For recruiter tab: filter to the selected billing cycle, dedup by name
  const displayedPlans = activeTab === 'recruiter'
    ? plans.filter(p => (p.billingCycle || 'monthly') === billingPeriod)
    : plans;

  useEffect(() => {
    const tab = searchParams.get("tab") || searchParams.get("role");
    if (tab === "recruiter") {
      setActiveTab("recruiter");
    } else if (tab === "provider" || tab === "candidate") {
      setActiveTab("provider");
    }
  }, [searchParams]);

  useEffect(() => {
    fetchPlans();
  }, [activeTab]);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const { data } = await planAPI.getPlansByAudience(activeTab);
      if (Array.isArray(data)) {
        setPlans(data);
      }
    } catch (err) {
      console.error("Failed to fetch plans:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCtaClick = (plan) => {
    if (!isAuthenticated) {
      navigate("/signup");
      return;
    }

    const currentRole = user?.activeRole || user?.role;
    if (activeTab === "provider") {
      if (currentRole === "provider") {
        navigate("/provider/plans");
      } else {
        navigate("/profile/" + user?._id);
      }
    } else if (activeTab === "recruiter") {
      if (currentRole === "recruiter") {
        navigate("/recruiter/plans");
      } else {
        navigate("/profile/" + user?._id);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-12 md:py-20 font-sans">
      <Seo
        title={t("plans.seoTitle", "Pricing Plans")}
        description={t("plans.seoDescription", "Choose the best plan to boost your hires or service leads with transparent rates and premium features.")}
        canonicalPath="/pricing"
      />

      <div className="max-w-360 mx-auto px-6 lg:px-8 relative">
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-16 lg:translate-x-8 xl:translate-x-12">
          <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-600 text-[11px] font-bold tracking-wider uppercase px-3 py-1.5 rounded-full mb-4">
            <Sparkles className="w-3.5 h-3.5" /> {t("plans.headerTag", "Flexible & Transparent")}
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight">
            {t("plans.titleText", "Pricing plans for everyone")}
          </h1>
          <p className="mt-4 text-base md:text-lg text-gray-500 leading-relaxed">
            {t("plans.subtitleText", "Connect, hire, and grow your business with our clear pay-as-you-go and monthly subscription plans.")}
          </p>

          {/* Toggle Tabs */}
          <div className="mt-6 flex justify-center">
            <div className="relative bg-white border border-gray-100 rounded-2xl p-1.5 flex gap-1 shadow-sm max-w-md w-full">
              <button
                onClick={() => setActiveTab("provider")}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 ${
                  activeTab === "provider"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {t("plans.providerTab", "Service Providers")}
              </button>
              <button
                onClick={() => setActiveTab("recruiter")}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 ${
                  activeTab === "recruiter"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {t("plans.recruiterTab", "Recruiters & Clients")}
              </button>
            </div>
          </div>
        </div>


        {/* Plans Display */}
        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="flex flex-col gap-6 w-full">
            {/* WhatsApp Plan - Top Left Small Card */}
            {(() => {
              const waPlan = plans.find(p => p.name.toLowerCase().includes('whatsapp'));
              if (!waPlan) return null;
              
              return (
                <div className="lg:absolute lg:left-6 lg:top-0 lg:w-72 xl:w-80 flex justify-center w-full z-10">
                  <div 
                    onClick={() => {
                      const grid = document.getElementById('pricing-grid');
                      if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="w-full max-w-sm lg:max-w-none bg-linear-to-br from-green-50 to-emerald-50/90 backdrop-blur-sm border border-green-200 rounded-3xl p-5 flex flex-col items-start gap-3 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-10 h-10 rounded-xl bg-green-100 text-green-700 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-5 h-5" /> 
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 leading-tight">
                        {waPlan.name}
                      </h3>
                    </div>
                    <p className="text-xs text-green-700/80">
                      {waPlan.description || "Get exclusive freelance job alerts on WhatsApp"}
                    </p>
                    <div className="w-full flex items-center justify-between mt-1">
                      <div>
                        <div className="text-2xl font-extrabold text-gray-900 flex items-end gap-1">
                          ₹30 <span className="text-xs font-medium text-gray-500 mb-1">/mo</span>
                        </div>
                        <div className="text-[10px] font-bold text-green-700 uppercase tracking-wider mt-0.5">
                          OR ₹1 per day
                        </div>
                      </div>
                      <button
                        id={`cta-btn-${waPlan._id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCtaClick(waPlan);
                        }}
                        className="bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-green-800 transition-colors shadow-sm shadow-green-600/20"
                      >
                        Subscribe
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}



            <div id="pricing-grid" className={`grid grid-cols-1 md:grid-cols-2 ${displayedPlans.filter(p => !p.name.toLowerCase().includes('whatsapp')).length === 3 ? 'lg:grid-cols-3' : displayedPlans.filter(p => !p.name.toLowerCase().includes('whatsapp')).length === 4 ? 'lg:grid-cols-4 xl:grid-cols-4' : 'xl:grid-cols-5'} gap-4 lg:gap-6 xl:gap-8 items-stretch max-w-7xl mx-auto w-full pb-20`}>
              {displayedPlans.filter(p => !p.name.toLowerCase().includes('whatsapp')).map((p, idx) => {
                const isFree = Number(p.price) === 0;
                const filteredPlans = displayedPlans.filter(plan => !plan.name.toLowerCase().includes('whatsapp'));
                const filteredIdx = filteredPlans.findIndex(plan => plan._id === p._id);
                const isPopular = p.isPopular;

                return (
                <div
                  key={p._id}
                  onClick={(e) => {
                    if (e.target.closest('button')) return;
                    const btn = document.getElementById(`cta-btn-${p._id}`);
                    if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className={`relative cursor-pointer flex flex-col justify-between rounded-3xl p-5 md:p-6 lg:p-7 border transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:border-blue-500 ${
                    isPopular
                      ? "bg-slate-900 text-white border-slate-900 shadow-[0_20px_50px_rgba(15,23,42,0.15)] ring-2 ring-blue-500/20"
                      : "bg-white border-slate-200 shadow-sm text-gray-800"
                  }`}
                >
                  <div>
                    {/* Icon Header */}
                    <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-2xl flex items-center justify-center mb-5 lg:mb-6 ${
                      isPopular ? "bg-white/10 text-blue-700" : "bg-blue-50 text-blue-600"
                    }`}>
                      {isPopular ? <Zap className="w-5 h-5 lg:w-6 lg:h-6" /> : <ShieldCheck className="w-5 h-5 lg:w-6 lg:h-6" />}
                    </div>

                    {/* Plan Name & Price */}
                    <h3 className={`text-lg lg:text-xl font-bold tracking-tight ${isPopular ? "text-white" : "text-gray-900"}`}>
                      {p.name}
                    </h3>
                    
                    <div className="mt-3 lg:mt-4 flex items-baseline gap-1.5">
                      <span className={`text-3xl lg:text-4xl font-extrabold tracking-tight ${isPopular ? "text-white" : "text-gray-900"}`}>
                        {isFree ? '₹0' : `₹${Number(p.price).toLocaleString('en-IN')}`}
                      </span>
                      {!isFree && (
                        <span className={`text-[10px] lg:text-xs ${isPopular ? "text-gray-400" : "text-gray-500"}`}>
                          /{p.billingCycle === 'yearly' ? 'year' : p.billingCycle === 'quarterly' ? 'quarter' : 'month'}
                        </span>
                      )}
                    </div>
                    
                    <p className={`mt-2 text-xs lg:text-sm leading-relaxed ${isPopular ? "text-gray-400" : "text-gray-500"}`}>
                      {p.description || (isFree ? 'For new recruiters' : 'For growing teams')}
                    </p>

                    {/* Metadata */}
                    <div className="flex flex-col items-center text-center space-y-3 mb-6">
                      {p.metadata?.bestFor && (
                        <div className="text-sm">
                          <span className={isPopular ? "text-gray-400" : "text-gray-500"}>Best for:</span><br/>
                          <span className={`font-semibold ${isPopular ? "text-white" : "text-gray-900"}`}>{p.metadata.bestFor}</span>
                        </div>
                      )}
                      {p.metadata?.hireLimitText && (
                        <div className={`text-xs ${isPopular ? "text-gray-300" : "text-gray-700"}`}>
                          {p.metadata.hireLimitText}
                        </div>
                      )}
                      {p.metadata?.saveHoursText && (
                        <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                          isPopular ? "bg-blue-900/50 text-blue-300 border border-blue-800" : "bg-orange-50 text-orange-600 border border-orange-100"
                        }`}>
                          <Sparkles className="w-3.5 h-3.5" />
                          {p.metadata.saveHoursText}
                        </div>
                      )}
                    </div>

                    {/* Features List */}
                    <div className={`border-t mb-6 ${isPopular ? "border-white/10" : "border-gray-100"}`} />

                    <ul className="space-y-3.5">
                      {(p.features || []).map((perk, perkIdx) => (
                        <li key={perkIdx} className="flex items-start gap-2.5 text-sm">
                          <Check className={`w-4 h-4 mt-0.5 shrink-0 ${
                            isPopular ? "text-blue-700" : "text-emerald-500"
                          }`} />
                          <span className={isPopular ? "text-gray-300" : "text-gray-700"}>
                            {perk}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA Button */}
                  <div className="mt-8">
                    <button
                      id={`cta-btn-${p._id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCtaClick(p);
                      }}
                      className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${
                        p.planType === 'custom'
                          ? "bg-gray-900 text-white hover:bg-black"
                          : isPopular
                          ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20"
                          : p.name.toLowerCase().includes('business')
                          ? "bg-orange-500 text-white hover:bg-orange-600"
                          : isFree
                          ? "bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100"
                          : "bg-[#4a24ba] text-white hover:bg-[#381a91]"
                      }`}
                    >
                      {p.planType === 'custom' ? 'Contact Sales' : isFree ? 'Get Started' : 'Choose Plan'}
                    </button>
                  </div>

                </div>
                );
              })}
            </div>
          </div>
        )}

        {/* FAQs / Help Section */}
        <div className="mt-24 max-w-4xl mx-auto border border-gray-100 rounded-3xl bg-white p-8 shadow-xs">
          <div className="flex items-center gap-2 mb-6">
            <HelpCircle className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-bold text-gray-900">{t("plans.faqHeader", "Pricing & Plans FAQ")}</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-bold text-gray-800 mb-1.5">{t("plans.faq1Q", "Can I upgrade or downgrade later?")}</h4>
              <p className="text-gray-500 leading-relaxed">
                {t("plans.faq1A", "Yes! You can change or cancel your subscription plan at any time through your dashboard page.")}
              </p>
            </div>
            <div>
              <h4 className="font-bold text-gray-800 mb-1.5">{t("plans.faq2Q", "Are there any hidden setup fees?")}</h4>
              <p className="text-gray-500 leading-relaxed">
                {t("plans.faq2A", "No hidden fees. You pay only the list price of the plan plus applicable government GST taxes.")}
              </p>
            </div>
            <div>
              <h4 className="font-bold text-gray-800 mb-1.5">{t("plans.faq3Q", "How do pay-per-unlock credits work?")}</h4>
              <p className="text-gray-500 leading-relaxed">
                {t("plans.faq3A", "Unlocking lets you contact matches directly. Each plan provides a specific amount of unlocks resetting monthly.")}
              </p>
            </div>
            <div>
              <h4 className="font-bold text-gray-800 mb-1.5">{t("plans.faq4Q", "What payment methods are supported?")}</h4>
              <p className="text-gray-500 leading-relaxed">
                {t("plans.faq4A", "We support credit/debit cards, UPI, net banking, and Razorpay/Stripe payment gateways.")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
