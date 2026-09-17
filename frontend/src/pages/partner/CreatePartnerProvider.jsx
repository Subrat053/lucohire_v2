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
  HiBriefcase,
  HiSparkles,
} from "react-icons/hi";
import partnerApi from "../../services/partnerApi";
import useSubmitLock from "../../hooks/useSubmitLock";
import { sanitizePayload } from "../../utils/sanitizePayload";
import CountryPhoneInput from "../../components/common/CountryPhoneInput";


const CreatePartnerProvider = () => {
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

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

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
      const res = await partnerApi.createProvider(cleanForm);
      setCredentials({ email: cleanForm.email, password: res.data.password });
      toast.success("Provider created and payment link sent");
      setForm({ name: "", email: "", phone: "", countryCode: "+91", nationalNumber: "", selectedPlanId: "" });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to create provider");
    }
  });


  const copyCredentials = () => {
    if (credentials) {
      const text = `Login URL: ${window.location.origin}/login\nEmail: ${credentials.email}\nPassword: ${credentials.password}`;
      navigator.clipboard.writeText(text);
      toast.success("Credentials copied to clipboard");
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-br from-purple-50 via-white to-indigo-50 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <div className="relative overflow-hidden rounded-[36px] border border-white/70 bg-white/40 p-8 shadow-2xl shadow-purple-200/40 backdrop-blur-xl sm:p-10">
              <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-purple-400/30 blur-3xl" />
              <div className="absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-indigo-400/20 blur-3xl" />

              <div className="relative z-10">
                <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-300">
                  <HiBriefcase className="h-8 w-8" />
                </div>

                <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-bold text-purple-700 shadow-sm">
                  <HiSparkles />
                  Partner Onboarding
                </span>

                <h1 className="mt-6 text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
                  Create Provider Profile
                </h1>

                <p className="mt-5 max-w-md text-base leading-8 text-slate-600">
                  Onboard a new service provider to your network. They will be automatically linked to your referral dashboard for commissions.
                </p>

                <div className="mt-8 rounded-3xl border border-white/70 bg-white/60 p-6 backdrop-blur-xl">
                  <h3 className="mb-5 flex items-center gap-2 text-lg font-black text-slate-950">
                    <HiCheckCircle className="text-green-500" />
                    What happens next?
                  </h3>

                  <div className="space-y-4">
                    {[
                      "Account is instantly created",
                      "Temporary password generated",
                      "Payment link sent via email",
                      "Referral tracking activated",
                    ].map((step, index) => (
                      <div key={index} className="flex items-center gap-3 text-sm font-medium text-slate-600">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-xs font-black text-purple-700">
                          {index + 1}
                        </span>
                        {step}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="relative overflow-hidden rounded-[36px] border border-white/70 bg-white/70 p-6 shadow-2xl shadow-slate-200/70 backdrop-blur-2xl sm:p-8 lg:p-10">
              <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-purple-300/20 blur-3xl" />

              {credentials ? (
                <div className="relative z-10">
                  <div className="mb-8 text-center">
                    <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                      <HiCheckCircle className="h-11 w-11 text-green-700" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-950">Success!</h2>
                    <p className="mt-2 text-slate-500">Provider account is ready for use.</p>
                  </div>

                  <div className="relative rounded-3xl border-2 border-dashed border-purple-200 bg-purple-50/60 p-6">
                    <button
                      onClick={copyCredentials}
                      className="absolute right-5 top-5 rounded-2xl bg-white p-3 text-purple-600 shadow-sm transition hover:scale-105"
                    >
                      <HiDuplicate className="h-5 w-5" />
                    </button>

                    <div className="space-y-5">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-slate-400">Email Address</p>
                        <p className="mt-1 text-lg font-black text-slate-950">{credentials.email}</p>
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-slate-400">Temporary Password</p>
                        <p className="mt-1 font-mono text-lg font-black text-purple-700">{credentials.password}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    <button
                      onClick={copyCredentials}
                      className="rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 font-black text-white shadow-lg shadow-purple-200 transition hover:-translate-y-0.5"
                    >
                      Copy & Share Credentials
                    </button>
                    <button
                      onClick={() => setCredentials(null)}
                      className="rounded-2xl bg-slate-100 px-6 py-4 font-black text-slate-700 transition hover:bg-slate-200"
                    >
                      Add Another Provider
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={submit} className="relative z-10 space-y-5">
                  {[
                    { icon: HiUser, name: "name", placeholder: "Full name", type: "text", required: true },
                    { icon: HiMail, name: "email", placeholder: "Email address", type: "email", required: true },
                  ].map((field) => {
                    const Icon = field.icon;
                    return (
                      <div key={field.name} className="group relative">
                        <Icon className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition group-focus-within:text-purple-600" />
                        <input
                          name={field.name}
                          type={field.type}
                          value={form[field.name]}
                          onChange={update}
                          placeholder={field.placeholder}
                          required={field.required}
                          className="w-full rounded-3xl border border-white bg-white/80 py-5 pl-14 pr-5 font-semibold text-slate-900 outline-none shadow-sm transition placeholder:text-slate-400 focus:border-purple-200 focus:bg-white focus:ring-4 focus:ring-purple-100"
                        />
                      </div>
                    );
                  })}

                  <div className="relative">
                    <CountryPhoneInput
                      variant="partner-provider"
                      countryCode={form.countryCode}
                      nationalNumber={form.nationalNumber}
                      onChange={handlePhoneChange}
                    />
                  </div>

                  {[
                    { icon: HiTicket, name: "selectedPlanId", placeholder: "Plan ID (optional)", type: "text" },
                  ].map((field) => {
                    const Icon = field.icon;
                    return (
                      <div key={field.name} className="group relative">
                        <Icon className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition group-focus-within:text-purple-600" />
                        <input
                          name={field.name}
                          type={field.type}
                          value={form[field.name]}
                          onChange={update}
                          placeholder={field.placeholder}
                          required={field.required}
                          className="w-full rounded-3xl border border-white bg-white/80 py-5 pl-14 pr-5 font-semibold text-slate-900 outline-none shadow-sm transition placeholder:text-slate-400 focus:border-purple-200 focus:bg-white focus:ring-4 focus:ring-purple-100"
                        />
                      </div>
                    );
                  })}

                  <button
                    disabled={isSubmitting}
                    className="group flex w-full items-center justify-center gap-3 rounded-3xl bg-gradient-to-r from-purple-600 to-indigo-600 py-5 text-lg font-black text-white shadow-xl shadow-purple-200 transition hover:-translate-y-0.5 disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <div className="h-6 w-6 animate-spin rounded-full border-4 border-white/30 border-t-white" />
                    ) : (
                      <>
                        Create Profile
                        <HiArrowRight className="h-6 w-6 transition group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePartnerProvider;