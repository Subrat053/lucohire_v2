import useTranslation from "../../hooks/useTranslation";
import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  FiEye,
  FiEyeOff,
  FiBriefcase,
  FiMail,
  FiPhone,
  FiUser,
  FiLock,
  FiCheckCircle,
} from "react-icons/fi";
import toast from "react-hot-toast";
import CreatableSelect from "react-select/creatable";
import CountryPhoneInput from "../../components/common/CountryPhoneInput";

const RecruiterDiscovery = () => {
  const { t } = useTranslation();

  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState(
    location.state?.recruiterData || {
      name: "",
      companyName: "",
      email: "",
      phone: "",
      countryCode: "+91",
      nationalNumber: "",
      industry: "",
      password: "",
    },
  );

  const handlePhoneChange = (phoneData) => {
    setFormData((prev) => ({
      ...prev,
      phone: phoneData.fullPhone,
      countryCode: phoneData.countryCode,
      nationalNumber: phoneData.nationalNumber,
    }));
  };

  const industryOptions = [
    { value: "IT/Software", label: t("IT/Software") },
    { value: "Finance", label: t("Finance") },
    { value: "Healthcare", label: t("Healthcare") },
    { value: "Education", label: t("Education") },
    { value: "Manufacturing", label: t("Manufacturing") },
    { value: "Other", label: t("Other") },
  ];

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { name, companyName, email, phone, industry, password } = formData;

    if (!name || !companyName || !email || !phone || !industry || !password) {
      return toast.error("Please fill in all fields to proceed.");
    }

    // Navigate to recruiter-locked passing form state
    navigate("/recruiter-locked", { state: { recruiterData: formData } });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex flex-col md:flex-row w-full max-w-7xl mx-auto items-center py-4 md:p-6 gap-4 md:gap-12 mt-2 md:mt-0">
        {/* Left Side: Value Prop */}
        <div className="flex-1 space-y-4 md:space-y-8 w-full px-4 md:px-0 text-left">
          <div>
            <span className="hidden md:inline-block text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-full text-xs md:text-sm">
              {t("Recruiter Workspace")}
            </span>
            <h1 className="text-[28px] leading-tight md:text-5xl font-extrabold text-gray-900 mt-4 md:mt-6">
              {t("Hire Top Talent,")}
              <br className="hidden md:block" />
              <span className="text-blue-600 md:ml-0 ml-1">
                {t("Faster & Smarter")}
              </span>
            </h1>
            <p className="hidden md:block text-xl text-gray-700 mt-4 leading-relaxed">
              {t(
                "Post a job for free and let our AI match you with the best candidates in your industry instantly.",
              )}
            </p>
          </div>

          <div className="hidden md:block space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-100 text-green-700 rounded-full flex items-center justify-center shrink-0">
                <FiCheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">
                  {t("8.6M+ Active Candidates")}
                </h3>
                <p className="text-gray-500 text-sm">
                  {t("Access a massive pool of verified professionals.")}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                <FiCheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">
                  {t("92% Match Accuracy")}
                </h3>
                <p className="text-gray-500 text-sm">
                  {t("AI ranks and shortlists the best candidates for you.")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Lead Capture Form */}
        <div className="w-full md:w-[500px]">
          <div className="bg-white md:rounded-2xl md:shadow-xl px-5 py-6 md:p-8 md:border border-gray-100">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-6 px-1 md:px-0">
              {t("Create Your Free Account")}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3 md:space-y-5 px-1 md:px-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0 md:mb-1">
                    {t("Your Name")}
                  </label>
                  <div className="relative">
                    <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder={t("John Doe")}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0 md:mb-1">
                    {t("Company Name")}
                  </label>
                  <div className="relative">
                    <FiBriefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      name="companyName"
                      required
                      value={formData.companyName}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder={t("Acme Corp")}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0 md:mb-1">
                  {t("Company Email")}
                </label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder={t("john@acmecorp.com")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0 md:mb-1">
                    {t("Mobile Number")}
                  </label>
                  <div className="relative">
                    <CountryPhoneInput
                      variant="auth"
                      countryCode={formData.countryCode}
                      nationalNumber={formData.nationalNumber}
                      onChange={handlePhoneChange}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0 md:mb-1">
                    {t("Industry")}
                  </label>
                  <CreatableSelect
                    isClearable
                    placeholder={t("Select or type...")}
                    options={industryOptions}
                    value={
                      formData.industry
                        ? { value: formData.industry, label: formData.industry }
                        : null
                    }
                    onChange={(selectedOption) => {
                      setFormData({
                        ...formData,
                        industry: selectedOption ? selectedOption.value : "",
                      });
                    }}
                    formatCreateLabel={(inputValue) => `Add "${inputValue}"`}
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        minHeight: "46px",
                        borderRadius: "0.5rem",
                        borderColor: state.isFocused ? "#3b82f6" : "#e5e7eb",
                        boxShadow: state.isFocused
                          ? "0 0 0 2px rgba(59, 130, 246, 0.2)"
                          : "none",
                        "&:hover": {
                          borderColor: "#3b82f6",
                        },
                      }),
                      valueContainer: (base) => ({
                        ...base,
                        padding: "0 16px",
                      }),
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0 md:mb-1">
                  {t("Password")}
                </label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-10 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder={t("Create a password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 focus:outline-none"
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <div className="pt-2 md:pt-4">
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition"
                >
                  {t("Find Candidates Now")}
                </button>
              </div>

              <p className="text-[11px] md:text-xs text-left md:text-center text-gray-500 mt-4">
                {t('By clicking "Find Candidates Now", you agree to our')}{" "}
                <Link to="/terms" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                  {t("Terms and Conditions")}
                </Link>
              </p>

              <div className="mt-5 md:mt-6 text-left md:text-center">
                <p className="text-sm text-gray-700">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="text-blue-600 font-bold hover:underline"
                  >
                    Login here
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecruiterDiscovery;
