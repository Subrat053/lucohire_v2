import { useState } from "react";
import toast from "react-hot-toast";
import {
  HiUser,
  HiMail,
  HiPhone,
  HiTicket,
  HiDuplicate,
  HiCheckCircle,
  HiArrowRight,
  HiUserGroup,
  HiClipboardCheck,
  HiSparkles,
  HiShieldCheck,
} from "react-icons/hi";
import partnerApi from "../../services/partnerApi";
import useSubmitLock from "../../hooks/useSubmitLock";
import { sanitizePayload } from "../../utils/sanitizePayload";
import CountryPhoneInput from "../../components/common/CountryPhoneInput";


const CreatePartnerRecruiter = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    countryCode: "+91",
    nationalNumber: "",
    selectedPlanId: "",
  });

  const [credentials, setCredentials] = useState(null);
  const { isSubmitting, withLock } = useSubmitLock();

  const update = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handlePhoneChange = (phoneData) => {
    setForm((prev) => ({
      ...prev,
      phone: phoneData.fullPhone,
      countryCode: phoneData.countryCode,
      nationalNumber: phoneData.nationalNumber,
    }));
  };


  const submit = withLock(async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();

    try {
      const cleanForm = sanitizePayload(form);
      const res = await partnerApi.createRecruiter(cleanForm);

      setCredentials({
        email: cleanForm.email,
        password: res.data.password,
      });

      toast.success("Recruiter created and payment link sent");

      setForm({
        name: "",
        email: "",
        phone: "",
        countryCode: "+91",
        nationalNumber: "",
        selectedPlanId: "",
      });
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to create recruiter"
      );
    }
  });


  const copyCredentials = () => {
    if (credentials) {
      const text = `Login URL: ${window.location.origin}/login
Email: ${credentials.email}
Password: ${credentials.password}`;

      navigator.clipboard.writeText(text);

      toast.success("Credentials copied to clipboard");
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-0 right-0 w-[420px] h-[420px] bg-violet-200/40 blur-3xl rounded-full" />
      <div className="absolute bottom-0 left-0 w-[320px] h-[320px] bg-blue-200/40 blur-3xl rounded-full" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-14">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
          {/* LEFT SIDE */}
          <div className="space-y-6">
            {/* Hero Card */}
            <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-[#081028] via-[#0f172a] to-[#1e293b] p-8 sm:p-10 text-white shadow-[0_25px_80px_-20px_rgba(15,23,42,0.45)]">
              {/* glow */}
              <div className="absolute -top-20 -right-20 w-72 h-72 bg-violet-500/20 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl" />

              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-white/10 backdrop-blur-md border border-white/10 mb-8">
                  <HiUserGroup className="w-8 h-8 text-white" />
                </div>

                <div className="max-w-md">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 text-sm font-medium text-violet-100 mb-5">
                    <HiSparkles className="w-4 h-4" />
                    Partner Recruitment Portal
                  </div>

                  <h1 className="text-4xl sm:text-5xl font-black leading-tight tracking-tight">
                    Add New
                    <span className="block text-violet-300">
                      Recruiter
                    </span>
                  </h1>

                  <p className="mt-6 text-slate-300 leading-relaxed text-[15px] sm:text-base">
                    Register a new recruiter to your network. They
                    will be linked to your partner account for all
                    future commission tracking.
                  </p>
                </div>

                {/* stats */}
                <div className="grid grid-cols-2 gap-4 mt-10">
                  <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
                    <h4 className="text-3xl font-black">24/7</h4>
                    <p className="text-sm text-slate-300 mt-1">
                      Recruiter Access
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
                    <h4 className="text-3xl font-black">100%</h4>
                    <p className="text-sm text-slate-300 mt-1">
                      Secure Onboarding
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Checklist */}
            <div className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-[32px] p-7 shadow-xl shadow-slate-200/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center">
                  <HiClipboardCheck className="w-6 h-6 text-violet-700" />
                </div>

                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    Onboarding Checklist
                  </h3>
                  <p className="text-sm text-slate-500">
                    Everything included automatically
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  "Instant account activation",
                  "Secure credentials generation",
                  "Email notification with login link",
                  "Lifetime referral association",
                ].map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-violet-50 transition-all duration-300"
                  >
                    <div className="mt-0.5">
                      <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center">
                        <HiShieldCheck className="w-4 h-4 text-white" />
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-slate-800">
                        {item}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div>
            {credentials ? (
              <div className="bg-white/90 backdrop-blur-xl rounded-[36px] border border-white/60 p-8 sm:p-10 shadow-[0_25px_80px_-20px_rgba(15,23,42,0.18)]">
                <div className="text-center">
                  <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-violet-100 to-blue-100 flex items-center justify-center shadow-lg mb-6">
                    <HiCheckCircle className="w-12 h-12 text-violet-700" />
                  </div>

                  <h2 className="text-3xl font-black text-slate-900">
                    Account Created!
                  </h2>

                  <p className="mt-3 text-slate-500 max-w-md mx-auto">
                    The recruiter can now log in using these
                    credentials.
                  </p>
                </div>

                <div className="mt-10 rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-7 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-violet-100 blur-3xl opacity-50" />

                  <div className="relative z-10 space-y-6">
                    <div>
                      <span className="text-xs uppercase tracking-[0.2em] font-bold text-slate-400">
                        Recruiter Email
                      </span>

                      <div className="mt-2 text-lg sm:text-xl font-black text-slate-900 break-all">
                        {credentials.email}
                      </div>
                    </div>

                    <div>
                      <span className="text-xs uppercase tracking-[0.2em] font-bold text-slate-400">
                        One-time Password
                      </span>

                      <div className="mt-2 text-2xl font-black text-violet-700 font-mono">
                        {credentials.password}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={copyCredentials}
                    className="absolute top-5 right-5 w-11 h-11 rounded-xl bg-white shadow-md flex items-center justify-center text-slate-600 hover:text-violet-700 hover:scale-105 transition-all"
                  >
                    <HiDuplicate className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-8 space-y-4">
                  <button
                    onClick={copyCredentials}
                    className="w-full h-14 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-lg hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl shadow-violet-200 flex items-center justify-center gap-2"
                  >
                    <HiDuplicate className="w-5 h-5" />
                    Copy & Securely Share
                  </button>

                  <button
                    onClick={() => setCredentials(null)}
                    className="w-full h-14 rounded-2xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 transition-all"
                  >
                    Register Another Recruiter
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={submit}
                className="bg-white/90 backdrop-blur-xl rounded-[36px] border border-white/60 p-6 sm:p-8 lg:p-10 shadow-[0_25px_80px_-20px_rgba(15,23,42,0.18)]"
              >
                <div className="mb-8">
                  <h2 className="text-3xl font-black text-slate-900">
                    Recruiter Information
                  </h2>

                  <p className="text-slate-500 mt-2">
                    Fill in the recruiter details to continue
                    onboarding.
                  </p>
                </div>

                <div className="space-y-5">
                  {/* Name */}
                  <div className="group">
                    <label className="text-sm font-bold text-slate-700 mb-2 block">
                      Full Name
                    </label>

                    <div className="relative">
                      <HiUser className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-600 transition-all" />

                      <input
                        name="name"
                        value={form.name}
                        onChange={update}
                        placeholder="Recruiter Full Name"
                        required
                        className="w-full h-16 pl-14 pr-5 rounded-2xl border border-slate-200 bg-slate-50/80 focus:bg-white focus:border-violet-300 focus:ring-4 focus:ring-violet-100 outline-none transition-all text-slate-900 font-semibold"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="group">
                    <label className="text-sm font-bold text-slate-700 mb-2 block">
                      Business Email
                    </label>

                    <div className="relative">
                      <HiMail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-600 transition-all" />

                      <input
                        name="email"
                        value={form.email}
                        onChange={update}
                        type="email"
                        placeholder="Business Email"
                        required
                        className="w-full h-16 pl-14 pr-5 rounded-2xl border border-slate-200 bg-slate-50/80 focus:bg-white focus:border-violet-300 focus:ring-4 focus:ring-violet-100 outline-none transition-all text-slate-900 font-semibold"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="group">
                    <label className="text-sm font-bold text-slate-700 mb-2 block">
                      Contact Number
                    </label>

                    <CountryPhoneInput
                      variant="partner-recruiter"
                      countryCode={form.countryCode}
                      nationalNumber={form.nationalNumber}
                      onChange={handlePhoneChange}
                    />
                  </div>

                  {/* Plan ID */}
                  <div className="group">
                    <label className="text-sm font-bold text-slate-700 mb-2 block">
                      Assigned Plan ID
                    </label>

                    <div className="relative">
                      <HiTicket className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-600 transition-all" />

                      <input
                        name="selectedPlanId"
                        value={form.selectedPlanId}
                        onChange={update}
                        placeholder="Assigned Plan ID (optional)"
                        className="w-full h-16 pl-14 pr-5 rounded-2xl border border-slate-200 bg-slate-50/80 focus:bg-white focus:border-violet-300 focus:ring-4 focus:ring-violet-100 outline-none transition-all text-slate-900 font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Button */}
                <button
                  disabled={isSubmitting}
                  className="mt-8 w-full h-16 rounded-2xl bg-gradient-to-r from-[#081028] via-[#111c44] to-[#1b2b68] text-white font-black text-lg shadow-2xl shadow-slate-300 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {isSubmitting ? (
                    <div className="w-6 h-6 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Confirm Registration
                      <HiArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
                  <HiShieldCheck className="w-4 h-4 text-violet-600" />
                  Secure recruiter onboarding & credential generation
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePartnerRecruiter;