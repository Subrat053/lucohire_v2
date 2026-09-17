import useTranslation from "../../hooks/useTranslation";
import React, { useState } from "react";
import { referralAPI } from "../../services/api";
import { toast } from "react-hot-toast";
import { UserPlus, User, Mail, Phone, Sparkles, ArrowRight, Gift, Award } from "lucide-react";

const AddMember = () => {
  const {
    t
  } = useTranslation();

  const [inviteData, setInviteData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "provider",
  });
  const [inviting, setInviting] = useState(false);

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    try {
      await referralAPI.createUserReferral(inviteData);
      toast.success("User invited successfully! Email sent.");
      setInviteData({ name: "", email: "", phone: "", role: "provider" });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to invite user");
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2">
          {/* Title Badge & Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              <UserPlus className="w-3.5 h-3.5" />{t("Referral Program")}</span>
          </div>
          <div className="mb-4">
            <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight mb-2 sm:text-4xl">{t("Add Member")}</h1>
            <p className="text-gray-500 text-sm sm:text-base max-w-2xl">{t(
              "Add new members to thelucohire platform manually. Once they register, they will be mapped directly to your referral profile."
            )}</p>
          </div>

          <div className="grid grid-cols-1 gap-8 items-start">
            {/* Left Column - Form Card */}
            <div className="bg-white rounded-3xl p-4 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.03)] border border-gray-100 transition-all duration-300">
              <div className="flex items-center justify-between mb-1 pb-2 border-b border-gray-50">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{t("Member Details")}</h2>
                  <p className="text-xs text-gray-400">{t("Fill in the fields to send an official onboarding invite link.")}</p>
                </div>
              </div>

              <form onSubmit={handleInvite} className="space-y-2 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                  {/* Full Name */}
                  <div className="relative">
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1 leading-none !min-h-0 !p-0 !block">{t("Full Name *")}</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder={t("e.g. John Doe")}
                        required
                        value={inviteData.name}
                        onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
                        className="w-full pl-11 pr-4 py-2.5 sm:py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-gray-50/50 focus:bg-white transition-all duration-200 shadow-sm placeholder-gray-400 text-gray-800"
                      />
                    </div>
                  </div>

                  {/* Email Address */}
                  <div className="relative">
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1 leading-none !min-h-0 !p-0 !block">{t("Email Address *")}</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        type="email"
                        placeholder={t("name@example.com")}
                        required
                        value={inviteData.email}
                        onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                        className="w-full pl-11 pr-4 py-2.5 sm:py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-gray-50/50 focus:bg-white transition-all duration-200 shadow-sm placeholder-gray-400 text-gray-800"
                      />
                    </div>
                  </div>

                  {/* Phone (Optional) */}
                  <div className="relative">
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1 leading-none !min-h-0 !p-0 !block">{t("Phone Number (Optional)")}</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        type="tel"
                        placeholder={t("e.g. +91 98765 43210")}
                        value={inviteData.phone}
                        onChange={(e) => setInviteData({ ...inviteData, phone: e.target.value })}
                        className="w-full pl-11 pr-4 py-2.5 sm:py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-gray-50/50 focus:bg-white transition-all duration-200 shadow-sm placeholder-gray-400 text-gray-800"
                      />
                    </div>
                  </div>

                  {/* Role Select */}
                  <div className="relative">
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1 leading-none !min-h-0 !p-0 !block">{t("Assign Platform Role *")}</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <select
                        value={inviteData.role}
                        onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                        className="w-full pl-11 pr-10 py-2.5 sm:py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-gray-50/50 focus:bg-white transition-all duration-200 shadow-sm text-gray-800 appearance-none cursor-pointer"
                      >
                        <option value="provider">{t("Service Provider")}</option>
                        <option value="recruiter">{t("Recruiter / Client")}</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={inviting}
                    className="w-full flex items-center justify-center gap-2 py-3 sm:py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-[0_4px_14px_rgba(79,70,229,0.3)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.45)] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed select-none"
                  >
                    {inviting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>{t("Sending Invite...")}</span>
                      </>
                    ) : (
                      <>
                        <span>{t("Add Member")}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        {/* Right Column - Referral Rewards Information */}
        <div className="space-y-6">
          {/* Main Info Gradient Card */}
          <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
            {/* Ambient glows */}
            <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-[-50px] left-[-50px] w-40 h-40 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10">
              <div className='flex items-center gap-2 mb-2'>
                <div className="p-2 bg-white/10 rounded-2xl">
                  <Gift className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold">{t("Invite Rewards")}</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-6 font-normal">{t(
                "Manually register service providers or recruiters to map them directly under your account. Once registered and active, earn instant commissions!"
              )}</p>


              {/* Commission highlight box */}
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-6 transition-all duration-200 hover:bg-white/10">
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-extrabold tracking-tight text-white">40%</span>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">{t("Direct Commission")}</h4>
                    <p className="text-[10px] text-slate-300">{t("Earn 40% on subscription packages purchased by your referred members.")}</p>
                  </div>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">{t("Onboarding Flow")}</h4>
                {[
                  { step: "01", title: "Fill Details", desc: "Enter their name, email, and preferred platform role." },
                  { step: "02", title: "Automated Invite", desc: "Our system sends a customized registration link via email." },
                  { step: "03", title: "Earn Rewards", desc: "Once they register and buy a package, payouts land in your wallet." },
                ].map((s) => (
                  <div key={s.step} className="flex gap-3 items-start">
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-white/5 border border-white/10 w-6 h-6 rounded-lg flex items-center justify-center shrink-0">
                      {s.step}
                    </span>
                    <div>
                      <h5 className="text-xs font-bold text-white">{s.title}</h5>
                      <p className="text-[10px] text-slate-400 leading-normal mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Guidelines info card */}
          <div className="bg-amber-50/50 border border-amber-100 rounded-3xl p-5">
            <div className="flex gap-3">
              <Award className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-900">{t("Verification Guideline")}</h4>
                <p className="text-[11px] text-amber-800 leading-relaxed mt-1">{t(
                  "Ensure the email address is correct and active. Invite links expire in 7 days. Once registered, commissions are paid instantly into your integrated Wallet profile."
                )}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddMember;

