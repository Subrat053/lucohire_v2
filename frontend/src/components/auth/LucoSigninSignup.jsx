import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authAPI } from "../../services/api";
import toast from "react-hot-toast";
import "./LucoSigninSignup.css";

const WEIGHTS = {
  photo: 5,
  name: 4,
  title: 3,
  mobileVerified: 9,
  emailVerified: 5,
  location: 5,
  category: 2,
  experience: 2,
  skills: 12,
  skillProof: 8,
  about: 5,
  achievement: 3,
  eduwork: 8,
  links: 8,
  resume: 6,
  languages: 3,
  availability: 2,
  duration: 2,
  waAvailability: 3,
  consent: 3,
  idVerify: 8,
  voiceIntro: 4,
  videoIntro: 4,
};

const STEP_LABELS = {
  1: "Basic details",
  2: "Skills & pricing",
  3: "Professional proof",
  4: "Work preferences",
};

export default function LucoSigninSignup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Route awareness: open registration if path is /signup or /register or query ?register=true
  const isSignupPath =
    location.pathname.includes("/signup") ||
    location.pathname.includes("/register") ||
    new URLSearchParams(location.search).get("register") === "true";

  // Mode & Step state
  const [activeTab, setActiveTab] = useState(isSignupPath ? "signup" : "signin");
  const [isRegOpen, setIsRegOpen] = useState(isSignupPath);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Sync state with URL route changes
  useEffect(() => {
    const isSignup =
      location.pathname.includes("/signup") ||
      location.pathname.includes("/register") ||
      new URLSearchParams(location.search).get("register") === "true";

    if (isSignup) {
      setActiveTab("signup");
      setIsRegOpen(true);
      document.body.style.overflow = "hidden";
    } else {
      setActiveTab("signin");
      setIsRegOpen(false);
      document.body.style.overflow = "";
    }
  }, [location.pathname, location.search]);

  // Clean up body overflow when unmounting
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Floating score toast state
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);
  const toastTimeoutRef = useRef(null);

  const triggerScoreToast = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setShowToast(false), 1600);
  };

  // Sign In Form State
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [showSignInPw, setShowSignInPw] = useState(false);
  const [signInErrors, setSignInErrors] = useState({});

  // Registration Form State
  // Step 1: Basic details
  const [photo, setPhoto] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [mobileOtp, setMobileOtp] = useState(["", "", "", ""]);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [mobileToken, setMobileToken] = useState("");
  const [email, setEmail] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState(["", "", "", ""]);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailToken, setEmailToken] = useState("");
  const [password, setPassword] = useState("");
  const [showRegPw, setShowRegPw] = useState(false);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [travelRadius, setTravelRadius] = useState(80);
  const [category, setCategory] = useState("UI/UX Design");
  const [experience, setExperience] = useState("1–3 years");

  // Step 2: Skills & pricing
  const [skills, setSkills] = useState([
    {
      skill: "UI/UX Design",
      customSkill: "",
      level: "Expert",
      startingPrice: "5000",
      priceType: "Per project",
      proofLink: "",
      isHeadline: true,
    },
  ]);

  // Step 3: Professional proof
  const [about, setAbout] = useState("");
  const [achievement, setAchievement] = useState("");
  const [education, setEducation] = useState([
    { type: "Education", title: "", institution: "", duration: "" },
  ]);
  const [portfolioLinks, setPortfolioLinks] = useState([
    { platform: "Behance", customPlatform: "", url: "" },
  ]);
  const [resumeUrl, setResumeUrl] = useState("");
  const [resumeName, setResumeName] = useState("");

  // Step 4: Work preferences
  const [languages, setLanguages] = useState([
    { language: "English", level: "Fluent" },
    { language: "Hindi", level: "Fluent" },
  ]);
  const [newLang, setNewLang] = useState("English");
  const [newLangLevel, setNewLangLevel] = useState("Fluent");
  const [availabilityCommitment, setAvailabilityCommitment] = useState("Full-time");
  const [availabilityStart, setAvailabilityStart] = useState("Available now");
  const [calEnabled, setCalEnabled] = useState(true);
  const [workingDays, setWorkingDays] = useState(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [calFrom, setCalFrom] = useState("10:00 AM");
  const [calTo, setCalTo] = useState("6:00 PM");
  const [preferredProjectDuration, setPreferredProjectDuration] = useState("Medium-term (1–3 months)");
  const [waAvailEnabled, setWaAvailEnabled] = useState(true);
  const [waFrom, setWaFrom] = useState("10:00 AM");
  const [waTo, setWaTo] = useState("7:00 PM");
  const [contactConsent, setContactConsent] = useState(true);
  const [contactMediums, setContactMediums] = useState(["message", "mail", "call"]);
  const [voiceIntroUrl, setVoiceIntroUrl] = useState("");
  const [videoIntroUrl, setVideoIntroUrl] = useState("");
  const [idVerifyEnabled, setIdVerifyEnabled] = useState(false);
  const [idType, setIdType] = useState("Aadhaar Card");
  const [idDocUrl, setIdDocUrl] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Track previous completion state for toasts
  const prevDoneRef = useRef({});

  // Real-time calculation of profile completion percentage
  const calculateScore = () => {
    let score = 0;
    const isDone = {
      photo: !!photo,
      name: !!name.trim(),
      title: !!title.trim(),
      mobileVerified: !!mobileVerified,
      emailVerified: !!emailVerified,
      location: !!(city.trim() && state.trim()),
      category: !!category.trim(),
      experience: !!experience.trim(),
      skills: skills.length > 0 && !!skills[0].skill,
      skillProof: skills.some((s) => s.proofLink && s.proofLink.trim().length > 0),
      about: !!about.trim(),
      achievement: !!achievement.trim(),
      eduwork: education.some((e) => e.title.trim() || e.institution.trim()),
      links: portfolioLinks.some((l) => l.url.trim().length > 0),
      resume: !!resumeUrl,
      languages: languages.length > 0,
      availability: !!availabilityCommitment,
      duration: !!preferredProjectDuration,
      waAvailability: waAvailEnabled,
      consent: contactConsent && contactMediums.length > 0,
      idVerify: idVerifyEnabled && !!idDocUrl,
      voiceIntro: !!voiceIntroUrl,
      videoIntro: !!videoIntroUrl,
    };

    for (const [key, done] of Object.entries(isDone)) {
      if (done) score += WEIGHTS[key] || 0;
      if (done && !prevDoneRef.current[key]) {
        triggerScoreToast(`+${WEIGHTS[key]}% profile score`);
      }
    }
    prevDoneRef.current = isDone;

    return {
      percentage: Math.min(100, score),
      isDone,
    };
  };

  const { percentage, isDone } = calculateScore();

  // Switch tabs
  const handleTabClick = (tab) => {
    setActiveTab(tab);
    if (tab === "signup") {
      setIsRegOpen(true);
      document.body.style.overflow = "hidden";
      if (!location.pathname.includes("/signup")) {
        navigate("/signup");
      }
    } else {
      setIsRegOpen(false);
      document.body.style.overflow = "";
      if (!location.pathname.includes("/login")) {
        navigate("/login");
      }
    }
  };

  const closeRegistration = () => {
    setIsRegOpen(false);
    setActiveTab("signin");
    document.body.style.overflow = "";
    if (!location.pathname.includes("/login")) {
      navigate("/login");
    }
  };

  const openRegistration = () => {
    setIsRegOpen(true);
    setActiveTab("signup");
    document.body.style.overflow = "hidden";
    if (!location.pathname.includes("/signup")) {
      navigate("/signup");
    }
  };

  // Sign In Handler
  const handleSignIn = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!signInEmail || !/\S+@\S+\.\S+/.test(signInEmail)) {
      errors.email = "Enter a valid email address.";
    }
    if (!signInPassword || signInPassword.length < 6) {
      errors.password = "Password must be at least 6 characters.";
    }
    setSignInErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const res = await authAPI.login({
        email: signInEmail.trim().toLowerCase(),
        password: signInPassword,
      });

      if (res.data?.success || res.data?.token) {
        toast.success("Signed in successfully!");
        if (login) {
          login(res.data.token, res.data.user);
        }
        navigate("/provider/dashboard");
      } else {
        toast.error(res.data?.message || "Sign in failed.");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  // Unified OTP Handlers (Delivered via Email)
  const handleSendMobileOtp = async () => {
    if (!phone || phone.replace(/\D/g, "").length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      toast.error("Please enter your email first to receive the verification OTP.");
      return;
    }

    try {
      const res = await authAPI.sendRegistrationOtp({
        targetType: "mobile",
        phone: phone.replace(/\D/g, ""),
        email: email.trim().toLowerCase(),
      });
      setMobileOtpSent(true);
      toast.success(res.data?.message || "OTP sent to your email!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send mobile verification OTP.");
    }
  };

  const handleVerifyMobileOtp = async () => {
    const code = mobileOtp.join("").trim();
    if (code.length !== 4) {
      toast.error("Please enter the complete 4-digit code.");
      return;
    }

    try {
      const res = await authAPI.verifyRegistrationOtp({
        targetType: "mobile",
        email: email.trim().toLowerCase(),
        phone: phone.replace(/\D/g, ""),
        otp: code,
      });
      if (res.data?.verified) {
        setMobileVerified(true);
        setMobileToken(res.data?.verificationToken || "");
        toast.success("Mobile number verified successfully!");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid OTP. Please try again.");
    }
  };

  const handleSendEmailOtp = async () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    try {
      const res = await authAPI.sendRegistrationOtp({
        targetType: "email",
        email: email.trim().toLowerCase(),
      });
      setEmailOtpSent(true);
      toast.success(res.data?.message || "Verification code sent to your email!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send email verification OTP.");
    }
  };

  const handleVerifyEmailOtp = async () => {
    const code = emailOtp.join("").trim();
    if (code.length !== 4) {
      toast.error("Please enter the complete 4-digit code.");
      return;
    }

    try {
      const res = await authAPI.verifyRegistrationOtp({
        targetType: "email",
        email: email.trim().toLowerCase(),
        otp: code,
      });
      if (res.data?.verified) {
        setEmailVerified(true);
        setEmailToken(res.data?.verificationToken || "");
        toast.success("Email address verified successfully!");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid OTP. Please try again.");
    }
  };

  // Skill Card Handlers
  const handleAddSkill = () => {
    setSkills([
      ...skills,
      {
        skill: "Web Development",
        customSkill: "",
        level: "Intermediate",
        startingPrice: "3000",
        priceType: "Per project",
        proofLink: "",
        isHeadline: false,
      },
    ]);
  };

  const handleRemoveSkill = (index) => {
    if (skills.length <= 1) {
      toast.error("You must have at least one skill.");
      return;
    }
    const updated = skills.filter((_, i) => i !== index);
    if (!updated.some((s) => s.isHeadline) && updated.length > 0) {
      updated[0].isHeadline = true;
    }
    setSkills(updated);
  };

  const handleHeadlineChange = (index) => {
    const updated = skills.map((s, i) => ({
      ...s,
      isHeadline: i === index,
    }));
    setSkills(updated);
  };

  // Language Tag Handlers
  const handleAddLanguage = () => {
    if (languages.some((l) => l.language.toLowerCase() === newLang.toLowerCase())) {
      toast.error("Language already added.");
      return;
    }
    setLanguages([...languages, { language: newLang, level: newLangLevel }]);
  };

  const handleRemoveLanguage = (lang) => {
    setLanguages(languages.filter((l) => l.language !== lang));
  };

  // Availability Days Handler
  const toggleWorkingDay = (day) => {
    if (workingDays.includes(day)) {
      setWorkingDays(workingDays.filter((d) => d !== day));
    } else {
      setWorkingDays([...workingDays, day]);
    }
  };

  // Contact Mediums Handler
  const toggleMedium = (m) => {
    if (contactMediums.includes(m)) {
      setContactMediums(contactMediums.filter((item) => item !== m));
    } else {
      setContactMediums([...contactMediums, m]);
    }
  };

  // Final Registration Submission
  const handleCreateProfile = async () => {
    if (!termsAccepted) {
      toast.error("Please agree to the Terms of Service to proceed.");
      return;
    }
    if (!name.trim()) {
      toast.error("Please enter your name in Step 1.");
      setCurrentStep(1);
      return;
    }
    if (!email.trim()) {
      toast.error("Please enter your email in Step 1.");
      setCurrentStep(1);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.replace(/\D/g, ""),
        password: password || undefined,
        photo,
        professionalTitle: title.trim(),
        city: city.trim(),
        state: state.trim(),
        travelRadius,
        category,
        experience,
        skills: skills.map((s) => (s.skill === "other" ? s.customSkill : s.skill)),
        pricingEntries: skills.map((s) => ({
          skill: s.skill === "other" ? s.customSkill : s.skill,
          skillLevel: s.level,
          startingPrice: parseFloat(s.startingPrice) || 0,
          priceType: s.priceType,
          proofLink: s.proofLink,
          isHeadline: s.isHeadline,
        })),
        headlineSkill:
          skills.find((s) => s.isHeadline)?.skill === "other"
            ? skills.find((s) => s.isHeadline)?.customSkill
            : skills.find((s) => s.isHeadline)?.skill || skills[0]?.skill || "",
        about: about.trim(),
        achievement: achievement.trim(),
        education,
        portfolioLinks,
        resumeUrl,
        languages: languages.map((l) => l.language),
        languageEntries: languages,
        availability: availabilityCommitment,
        workHours: {
          enabled: calEnabled,
          days: workingDays,
          from: calFrom,
          to: calTo,
        },
        preferredProjectDuration,
        whatsappAvailability: {
          enabled: waAvailEnabled,
          from: waFrom,
          to: waTo,
        },
        contactConsent,
        contactMediums,
        voiceIntroUrl,
        videoIntroUrl,
        idVerification: {
          enabled: idVerifyEnabled,
          idType,
          documentUrl: idDocUrl,
          status: idVerifyEnabled ? "pending" : "none",
        },
        termsAccepted: true,
        mobileVerified,
        emailVerified,
      };

      const res = await authAPI.registerFreelancer(payload);

      if (res.data?.success) {
        toast.success("Profile created successfully!");
        if (login && res.data.token && res.data.user) {
          login(res.data.token, res.data.user);
        }
        document.body.style.overflow = "";
        navigate("/provider/dashboard");
      } else {
        toast.error(res.data?.message || "Failed to create profile.");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Registration failed. Please check your inputs.");
    } finally {
      setLoading(false);
    }
  };

  // Headline skill helper for previews
  const activeHeadlineSkill =
    skills.find((s) => s.isHeadline) || skills[0] || { skill: "UI Designer", startingPrice: "5000" };
  const headlineSkillName =
    activeHeadlineSkill.skill === "other"
      ? activeHeadlineSkill.customSkill || "Custom Skill"
      : activeHeadlineSkill.skill;

  const initials =
    name.trim().length > 0
      ? name
          .trim()
          .split(/\s+/)
          .map((w) => w[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()
      : "RK";

  return (
    <div className="luco-auth-page">
      {/* Floating Score Toast */}
      <div className={`luco-score-toast ${showToast ? "show" : ""}`}>
        {toastMsg}
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          SIGN IN SCREEN (Responsive Desktop Two-Column & Mobile View)
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="luco-screen">
        <header className="luco-hero">
          <div className="luco-brand">
            <span className="luco-brand-mark">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="#4C2FD9"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="luco-brand-name">LucoHire</span>
          </div>

          <div className="luco-hero-content">
            <h1>Find Work & Hire Top Freelancers</h1>
            <p>Sign in to manage your client inquiries, work pipeline and verified profile.</p>
          </div>

          <div className="luco-hero-perks">
            <div className="luco-hero-perk-item">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Verified talent badges & direct WhatsApp leads</span>
            </div>
            <div className="luco-hero-perk-item">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Instant client inquiries without commission deduction</span>
            </div>
          </div>
        </header>

        <main className="luco-sheet">
          <nav className="luco-tabs" aria-label="Sign in or register tabs">
            <button
              type="button"
              className={`luco-tab ${activeTab === "signin" ? "active" : ""}`}
              onClick={() => handleTabClick("signin")}
            >
              Sign in
            </button>
            <button
              type="button"
              className={`luco-tab ${activeTab === "signup" ? "active" : ""}`}
              onClick={() => handleTabClick("signup")}
            >
              Create account
            </button>
          </nav>

          <form className="luco-form" onSubmit={handleSignIn} noValidate>
            <div className={`luco-field ${signInErrors.email ? "error" : ""}`}>
              <label htmlFor="luco-email">Email address</label>
              <div className="luco-input-wrap">
                <input
                  type="email"
                  id="luco-email"
                  placeholder="e.g. rahul@example.com"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              {signInErrors.email && (
                <span className="luco-field-msg">{signInErrors.email}</span>
              )}
            </div>

            <div className={`luco-field ${signInErrors.password ? "error" : ""}`}>
              <label htmlFor="luco-password">Password</label>
              <div className="luco-input-wrap">
                <input
                  type={showSignInPw ? "text" : "password"}
                  id="luco-password"
                  placeholder="Your password"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="luco-pw-toggle"
                  onClick={() => setShowSignInPw(!showSignInPw)}
                  aria-label={showSignInPw ? "Hide password" : "Show password"}
                >
                  {showSignInPw ? (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                      <span>Hide</span>
                    </>
                  ) : (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      <span>Show</span>
                    </>
                  )}
                </button>
              </div>
              {signInErrors.password && (
                <span className="luco-field-msg">{signInErrors.password}</span>
              )}
            </div>

            <div className="luco-row-between">
              <a
                href="/forgot-password"
                className="luco-link-quiet"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/forgot-password");
                }}
              >
                Forgot password?
              </a>
            </div>

            <button type="submit" className="luco-submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="luco-divider">or continue with</div>

          <div className="luco-socials">
            <button
              type="button"
              className="luco-social-btn"
              onClick={() => toast("Google OAuth login")}
              aria-label="Continue with Google"
            >
              <svg width="17" height="17" viewBox="0 0 18 18">
                <path
                  fill="#4285F4"
                  d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.09-1.8 2.73v2.27h2.91c1.7-1.57 2.69-3.88 2.69-6.64z"
                />
                <path
                  fill="#34A853"
                  d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z"
                />
                <path
                  fill="#FBBC05"
                  d="M3.96 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3-2.33z"
                />
                <path
                  fill="#EA4335"
                  d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z"
                />
              </svg>
            </button>
            <button
              type="button"
              className="luco-social-btn"
              onClick={() => toast("Apple OAuth login")}
              aria-label="Continue with Apple"
            >
              <svg width="15" height="17" viewBox="0 0 16 18" fill="#181B24">
                <path d="M13.1 9.5c0-2.05 1.68-3.03 1.75-3.08-.96-1.4-2.45-1.6-2.98-1.62-1.27-.13-2.48.75-3.12.75-.65 0-1.63-.73-2.68-.71-1.38.02-2.65.8-3.36 2.04-1.43 2.48-.37 6.16 1.03 8.18.68.98 1.5 2.09 2.57 2.05 1.03-.04 1.42-.67 2.67-.67 1.24 0 1.6.67 2.68.65 1.11-.02 1.82-1.01 2.5-2 .78-1.13 1.1-2.24 1.11-2.3-.02-.01-2.16-.83-2.17-3.29zM11 3.06c.57-.7.96-1.66.85-2.62-.83.03-1.83.55-2.42 1.24-.53.62-.99 1.6-.87 2.53.92.07 1.86-.46 2.44-1.15z" />
              </svg>
            </button>
            <button
              type="button"
              className="luco-social-btn"
              onClick={() => toast("Facebook OAuth login")}
              aria-label="Continue with Facebook"
            >
              <svg width="17" height="17" viewBox="0 0 18 18">
                <path
                  fill="#1877F2"
                  d="M18 9a9 9 0 1 0-10.4 8.9v-6.3H5.3V9h2.3V7.1c0-2.27 1.35-3.53 3.42-3.53.99 0 2.03.18 2.03.18v2.23h-1.14c-1.13 0-1.48.7-1.48 1.42V9h2.52l-.4 2.6h-2.12v6.3A9 9 0 0 0 18 9z"
                />
              </svg>
            </button>
          </div>

          <div className="luco-trust">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 0 L14 2.5 V7 C14 11 11.5 14 8 16 C4.5 14 2 11 2 7 V2.5 Z"
                fill="#767B8A"
              />
            </svg>
            <p>Your details are encrypted and never shared with third parties.</p>
          </div>

          <footer className="luco-footnote">
            New here?{" "}
            <Link
              to="/signup"
              onClick={(e) => {
                e.preventDefault();
                openRegistration();
              }}
            >
              Create an account
            </Link>
          </footer>
        </main>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          REGISTRATION MODAL (Desktop Responsive Split Screen & Mobile Sheet)
          ────────────────────────────────────────────────────────────────────────── */}
      <div
        id="registrationScreen"
        className={`luco-registration-screen ${isRegOpen ? "" : "reg-hidden"}`}
      >
        <div className="luco-reg-shell">
          <button
            type="button"
            className="luco-reg-close"
            onClick={closeRegistration}
            aria-label="Close and go back"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          <header className="luco-reg-header">
            <div className="luco-brand-row">
              <div className="luco-brand-logo">
                <span className="luco-brand-mark" style={{ width: 28, height: 28 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                      stroke="#4C2FD9"
                      strokeWidth="2.4"
                    />
                  </svg>
                </span>
                <p className="luco-reg-brand">LucoHire</p>
              </div>

              <div className="luco-score-pill">
                <div
                  className="luco-score-ring"
                  style={{ "--pct": percentage }}
                >
                  <span>{percentage}</span>
                </div>
                <div className="luco-score-txt">
                  profile <b>{percentage}%</b> ready
                </div>
              </div>
            </div>

            <div className="luco-steps">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="luco-step-track">
                  <span style={{ width: step <= currentStep ? "100%" : "0%" }} />
                </div>
              ))}
            </div>

            <div className="luco-step-meta">
              <span>
                step <b>{currentStep}</b> of 4
              </span>
              <span>{STEP_LABELS[currentStep]}</span>
            </div>
          </header>

          <div className="luco-reg-layout">
            <main className="luco-reg-main">
              {/* ──────── STEP 1 : BASIC DETAILS ──────── */}
              <section className={`luco-panel ${currentStep === 1 ? "active" : ""}`}>
                <h1 className="luco-title">Create your freelancer profile</h1>
                <p className="luco-sub">
                  Register free and let clients discover your skills, experience and availability.
                </p>

                {/* Profile Photo */}
                <div className="luco-photo-row">
                  <label htmlFor="lucoPhotoInput" className={`luco-photo-circle ${photo ? "done" : ""}`}>
                    {photo ? (
                      <img src={photo} alt="Profile preview" />
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <path d="M4 8a2 2 0 0 1 2-2h1l1-2h8l1 2h1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z" />
                        <circle cx="12" cy="13" r="3.5" />
                      </svg>
                    )}
                  </label>
                  <input
                    type="file"
                    id="lucoPhotoInput"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setPhoto(ev.target.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <div className="txt">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <p className="t1">Add profile photo</p>
                      <span className={`luco-pts ${isDone.photo ? "done" : ""}`}>
                        {isDone.photo ? "✓ added" : "+5%"}
                      </span>
                    </div>
                    <p className="t2">A clear photo helps clients trust your profile</p>
                  </div>
                </div>

                {/* Full Name & Professional Title */}
                <div className="luco-two-col">
                  <div className="luco-reg-field">
                    <div className="luco-field-label">
                      <label>Full name</label>
                      <span className={`luco-pts ${isDone.name ? "done" : ""}`}>
                        {isDone.name ? "✓ added" : "+4%"}
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Kumar"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="luco-reg-field">
                    <div className="luco-field-label">
                      <label>Professional title</label>
                      <span className={`luco-pts ${isDone.title ? "done" : ""}`}>
                        {isDone.title ? "✓ added" : "+3%"}
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. UI Designer & Brand Specialist"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                </div>

                {/* Mobile Number with Email-Only OTP */}
                <div className="luco-reg-field">
                  <div className="luco-field-label">
                    <label>Mobile number</label>
                    <span className={`luco-pts ${mobileVerified ? "done" : ""}`}>
                      {mobileVerified ? "✓ verified" : "+9%"}
                    </span>
                  </div>
                  {mobileVerified ? (
                    <div className="luco-verified-chip">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Mobile verified (+91 {phone})
                    </div>
                  ) : (
                    <>
                      <div className="luco-verify-row">
                        <input
                          type="tel"
                          maxLength={10}
                          placeholder="10-digit mobile number"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                        <button
                          type="button"
                          className="luco-verify-btn"
                          disabled={phone.replace(/\D/g, "").length !== 10}
                          onClick={handleSendMobileOtp}
                        >
                          Send OTP
                        </button>
                      </div>

                      {mobileOtpSent && (
                        <div className="luco-otp-box">
                          <p className="lbl">Enter 4-digit code to verify your mobile</p>
                          <div className="luco-otp-notice">
                            SMS delivery is temporarily routed via email. Your 4-digit code was sent to <b>{email || "your email"}</b>.
                          </div>
                          <div className="luco-otp-inputs">
                            {mobileOtp.map((digit, idx) => (
                              <input
                                key={idx}
                                id={`mobile-otp-${idx}`}
                                type="text"
                                maxLength={1}
                                inputMode="numeric"
                                value={digit}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9]/g, "");
                                  const updated = [...mobileOtp];
                                  updated[idx] = val;
                                  setMobileOtp(updated);
                                  if (val && idx < 3) {
                                    document.getElementById(`mobile-otp-${idx + 1}`)?.focus();
                                  }
                                }}
                              />
                            ))}
                          </div>
                          <div className="luco-otp-actions">
                            <button type="button" onClick={handleVerifyMobileOtp}>
                              Confirm
                            </button>
                            <span onClick={handleSendMobileOtp}>Resend OTP</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Email Address with Email OTP */}
                <div className="luco-reg-field">
                  <div className="luco-field-label">
                    <label>Email address</label>
                    <span className={`luco-pts ${emailVerified ? "done" : ""}`}>
                      {emailVerified ? "✓ verified" : "+5%"}
                    </span>
                  </div>
                  {emailVerified ? (
                    <div className="luco-verified-chip">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Email verified ({email})
                    </div>
                  ) : (
                    <>
                      <div className="luco-verify-row">
                        <input
                          type="email"
                          placeholder="e.g. rahul@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                        <button
                          type="button"
                          className="luco-verify-btn"
                          disabled={!email.includes("@") || !email.includes(".")}
                          onClick={handleSendEmailOtp}
                        >
                          Send OTP
                        </button>
                      </div>

                      {emailOtpSent && (
                        <div className="luco-otp-box">
                          <p className="lbl">Enter 4-digit code sent to your email</p>
                          <div className="luco-otp-inputs">
                            {emailOtp.map((digit, idx) => (
                              <input
                                key={idx}
                                id={`email-otp-${idx}`}
                                type="text"
                                maxLength={1}
                                inputMode="numeric"
                                value={digit}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9]/g, "");
                                  const updated = [...emailOtp];
                                  updated[idx] = val;
                                  setEmailOtp(updated);
                                  if (val && idx < 3) {
                                    document.getElementById(`email-otp-${idx + 1}`)?.focus();
                                  }
                                }}
                              />
                            ))}
                          </div>
                          <div className="luco-otp-actions">
                            <button type="button" onClick={handleVerifyEmailOtp}>
                              Confirm
                            </button>
                            <span onClick={handleSendEmailOtp}>Resend OTP</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Password field */}
                <div className="luco-reg-field">
                  <div className="luco-field-label">
                    <label htmlFor="reg-password">Password</label>
                    <span className={`luco-pts ${password.length >= 6 ? "done" : ""}`}>
                      {password.length >= 6 ? "✓ min 6 chars" : "Min 6 characters"}
                    </span>
                  </div>
                  <div className="luco-input-wrap">
                    <input
                      id="reg-password"
                      type={showRegPw ? "text" : "password"}
                      placeholder="Create a password (min 6 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="luco-pw-toggle"
                      onClick={() => setShowRegPw(!showRegPw)}
                      aria-label={showRegPw ? "Hide password" : "Show password"}
                    >
                      {showRegPw ? (
                        <>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                          <span>Hide</span>
                        </>
                      ) : (
                        <>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          <span>Show</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Location & Travel Radius Block */}
                <div className="luco-card-block">
                  <div className="luco-card-head-row">
                    <div className="left">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21z" />
                        <circle cx="12" cy="9.5" r="2.5" />
                      </svg>
                      Location & travel radius
                    </div>
                    <span className="luco-smart-badge">Smart filter</span>
                  </div>

                  <div className="luco-two-col" style={{ marginBottom: 14 }}>
                    <div>
                      <span className="luco-mini-label">City</span>
                      <input
                        type="text"
                        placeholder="e.g. Noida"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                      />
                    </div>
                    <div>
                      <span className="luco-mini-label">State</span>
                      <input
                        type="text"
                        placeholder="e.g. Uttar Pradesh"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="luco-range-head">
                    <span>Willing to travel</span>
                    <span className="luco-range-val-pill">{travelRadius} km</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={travelRadius}
                    onChange={(e) => setTravelRadius(Number(e.target.value))}
                  />
                  <div className="luco-range-labels">
                    <span>0 km (remote only)</span>
                    <span>50 km</span>
                    <span>100 km (metro area)</span>
                  </div>

                  <div className="luco-preview-line">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <span>
                      Preview: <b>{city ? `${city} +${travelRadius}km` : `Your city +${travelRadius}km`}</b> — nearby clients will see you at the top.
                    </span>
                  </div>
                </div>

                {/* Primary Category & Experience */}
                <div className="luco-two-col">
                  <div className="luco-reg-field">
                    <div className="luco-field-label">
                      <label>Primary work category</label>
                      <span className={`luco-pts ${isDone.category ? "done" : ""}`}>
                        {isDone.category ? "✓ added" : "+2%"}
                      </span>
                    </div>
                    <select value={category} onChange={(e) => setCategory(e.target.value)}>
                      <option>UI/UX Design</option>
                      <option>Web Development</option>
                      <option>Graphic Design</option>
                      <option>Content Writing</option>
                      <option>Digital Marketing</option>
                      <option>Video Editing</option>
                      <option>Mobile App Dev</option>
                      <option>Other Services</option>
                    </select>
                  </div>

                  <div className="luco-reg-field">
                    <div className="luco-field-label">
                      <label>Total experience</label>
                      <span className={`luco-pts ${isDone.experience ? "done" : ""}`}>
                        {isDone.experience ? "✓ added" : "+2%"}
                      </span>
                    </div>
                    <select value={experience} onChange={(e) => setExperience(e.target.value)}>
                      <option>Fresher / Beginner</option>
                      <option>1–3 years</option>
                      <option>3–5 years</option>
                      <option>5–8 years</option>
                      <option>8+ years (Senior / Lead)</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* ──────── STEP 2 : SKILLS & PRICING ──────── */}
              <section className={`luco-panel ${currentStep === 2 ? "active" : ""}`}>
                <h1 className="luco-title">Add your skills</h1>
                <p className="luco-sub">
                  Highlight your top competencies, starting rates and proof of work.
                </p>

                <div className="luco-field-label" style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 13, color: "var(--ink-soft)" }}>Skills & pricing cards</label>
                  <span className={`luco-pts ${isDone.skills ? "done" : ""}`}>
                    {isDone.skills ? "✓ added" : "+12%"}
                  </span>
                </div>

                {skills.map((s, idx) => (
                  <div key={idx} className="luco-skill-card">
                    <div className="luco-skill-card-head">
                      <select
                        value={s.skill}
                        onChange={(e) => {
                          const updated = [...skills];
                          updated[idx].skill = e.target.value;
                          setSkills(updated);
                        }}
                      >
                        <option>UI/UX Design</option>
                        <option>Figma & Prototyping</option>
                        <option>Web Development</option>
                        <option>React / Node.js</option>
                        <option>Logo & Brand Identity</option>
                        <option>SEO & Performance</option>
                        <option>Mobile App UI</option>
                        <option value="other">Other skill...</option>
                      </select>
                      {skills.length > 1 && (
                        <button
                          type="button"
                          className="luco-remove-btn"
                          onClick={() => handleRemoveSkill(idx)}
                          aria-label="Remove skill"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {s.skill === "other" && (
                      <div style={{ marginBottom: 12 }}>
                        <input
                          type="text"
                          placeholder="Type custom skill name"
                          value={s.customSkill}
                          onChange={(e) => {
                            const updated = [...skills];
                            updated[idx].customSkill = e.target.value;
                            setSkills(updated);
                          }}
                        />
                      </div>
                    )}

                    <div className="luco-skill-grid">
                      <div>
                        <span className="luco-mini-label">Skill level</span>
                        <select
                          value={s.level}
                          onChange={(e) => {
                            const updated = [...skills];
                            updated[idx].level = e.target.value;
                            setSkills(updated);
                          }}
                        >
                          <option>Expert</option>
                          <option>Intermediate</option>
                          <option>Beginner</option>
                        </select>
                      </div>

                      <div>
                        <span className="luco-mini-label">Starting price</span>
                        <div className="luco-rate-input">
                          <span>₹</span>
                          <input
                            type="number"
                            placeholder="Amount"
                            value={s.startingPrice}
                            onChange={(e) => {
                              const updated = [...skills];
                              updated[idx].startingPrice = e.target.value;
                              setSkills(updated);
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <span className="luco-mini-label">Price type</span>
                        <select
                          value={s.priceType}
                          onChange={(e) => {
                            const updated = [...skills];
                            updated[idx].priceType = e.target.value;
                            setSkills(updated);
                          }}
                        >
                          <option>Per project</option>
                          <option>Per hour</option>
                          <option>Per day</option>
                          <option>Negotiable</option>
                        </select>
                      </div>

                      <div>
                        <span className="luco-mini-label">Proof link (optional)</span>
                        <input
                          type="text"
                          placeholder="Paste a portfolio / project link"
                          value={s.proofLink}
                          onChange={(e) => {
                            const updated = [...skills];
                            updated[idx].proofLink = e.target.value;
                            setSkills(updated);
                          }}
                        />
                      </div>
                    </div>

                    <div className="luco-headline-row">
                      <input
                        type="checkbox"
                        checked={s.isHeadline}
                        onChange={() => handleHeadlineChange(idx)}
                      />
                      <span>
                        <b>Headline skill:</b> This appears prominently on your public card and in client search results.
                      </span>
                    </div>
                  </div>
                ))}

                <button type="button" className="luco-add-btn" onClick={handleAddSkill}>
                  + Add another skill
                </button>
              </section>

              {/* ──────── STEP 3 : PROFESSIONAL PROOF ──────── */}
              <section className={`luco-panel ${currentStep === 3 ? "active" : ""}`}>
                <h1 className="luco-title">Show your best work</h1>
                <p className="luco-sub">
                  Give clients confidence with your bio, key achievements and credentials.
                </p>

                {/* About You */}
                <div className="luco-reg-field">
                  <div className="luco-field-label">
                    <label>About you</label>
                    <span className={`luco-pts ${isDone.about ? "done" : ""}`}>
                      {isDone.about ? "✓ added" : "+5%"}
                    </span>
                  </div>
                  <textarea
                    placeholder="Briefly describe your experience, design philosophy, and the work you do..."
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                  />
                </div>

                {/* Key Achievement */}
                <div className="luco-reg-field">
                  <div className="luco-field-label">
                    <label>Key achievement</label>
                    <span className={`luco-pts ${isDone.achievement ? "done" : ""}`}>
                      {isDone.achievement ? "✓ added" : "+3%"}
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Completed 80+ projects with 5-star rating on Upwork"
                    value={achievement}
                    onChange={(e) => setAchievement(e.target.value)}
                  />
                </div>

                {/* Education & Work Experience */}
                <div className="luco-field-label" style={{ marginBottom: 8 }}>
                  <label>Education & work experience</label>
                  <span className={`luco-pts ${isDone.eduwork ? "done" : ""}`}>
                    {isDone.eduwork ? "✓ added" : "+8%"}
                  </span>
                </div>

                {education.map((e, idx) => (
                  <div key={idx} className="luco-entry-card">
                    <div className="luco-entry-card-head">
                      <select
                        value={e.type}
                        onChange={(ev) => {
                          const updated = [...education];
                          updated[idx].type = ev.target.value;
                          setEducation(updated);
                        }}
                      >
                        <option>Education</option>
                        <option>Work Experience</option>
                      </select>
                      {education.length > 1 && (
                        <button
                          type="button"
                          className="luco-remove-btn"
                          onClick={() => setEducation(education.filter((_, i) => i !== idx))}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="luco-two-col">
                      <input
                        type="text"
                        placeholder="Degree / Role — e.g. B.Des or Senior UI Designer"
                        value={e.title}
                        onChange={(ev) => {
                          const updated = [...education];
                          updated[idx].title = ev.target.value;
                          setEducation(updated);
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Institution / Company — e.g. NID or Google"
                        value={e.institution}
                        onChange={(ev) => {
                          const updated = [...education];
                          updated[idx].institution = ev.target.value;
                          setEducation(updated);
                        }}
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className="luco-add-btn"
                  onClick={() =>
                    setEducation([
                      ...education,
                      { type: "Work Experience", title: "", institution: "", duration: "" },
                    ])
                  }
                >
                  + Add education or work experience
                </button>

                {/* Certifications & Portfolio Links */}
                <div className="luco-field-label" style={{ marginTop: 16, marginBottom: 8 }}>
                  <label>Certifications & portfolio links</label>
                  <span className={`luco-pts ${isDone.links ? "done" : ""}`}>
                    {isDone.links ? "✓ added" : "+8%"}
                  </span>
                </div>

                {portfolioLinks.map((l, idx) => (
                  <div key={idx} className="luco-entry-card">
                    <div className="luco-entry-card-head">
                      <select
                        value={l.platform}
                        onChange={(ev) => {
                          const updated = [...portfolioLinks];
                          updated[idx].platform = ev.target.value;
                          setPortfolioLinks(updated);
                        }}
                      >
                        <option>Behance</option>
                        <option>Dribbble</option>
                        <option>GitHub</option>
                        <option>LinkedIn</option>
                        <option>Personal Website</option>
                        <option value="other">Other link...</option>
                      </select>
                      {portfolioLinks.length > 1 && (
                        <button
                          type="button"
                          className="luco-remove-btn"
                          onClick={() => setPortfolioLinks(portfolioLinks.filter((_, i) => i !== idx))}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder="Paste link URL (e.g. https://behance.net/username)"
                      value={l.url}
                      onChange={(ev) => {
                        const updated = [...portfolioLinks];
                        updated[idx].url = ev.target.value;
                        setPortfolioLinks(updated);
                      }}
                    />
                  </div>
                ))}

                <button
                  type="button"
                  className="luco-add-btn"
                  onClick={() =>
                    setPortfolioLinks([...portfolioLinks, { platform: "Dribbble", url: "" }])
                  }
                >
                  + Add another portfolio link
                </button>

                {/* Resume Upload Box */}
                <div className="luco-field-label" style={{ marginTop: 16 }}>
                  <label>Resume (PDF / Doc)</label>
                  <span className={`luco-pts ${isDone.resume ? "done" : ""}`}>
                    {isDone.resume ? "✓ added" : "+6%"}
                  </span>
                </div>

                <label
                  htmlFor="lucoResumeInput"
                  className={`luco-upload-box ${resumeUrl ? "done" : ""}`}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  <p>{resumeName ? `Uploaded: ${resumeName}` : "Click to upload your resume"}</p>
                  <p className="small">PDF or DOCX format (Max 5MB)</p>
                </label>
                <input
                  type="file"
                  id="lucoResumeInput"
                  accept=".pdf,.doc,.docx"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setResumeName(file.name);
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        setResumeUrl(ev.target.result);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </section>

              {/* ──────── STEP 4 : WORK PREFERENCES ──────── */}
              <section className={`luco-panel ${currentStep === 4 ? "active" : ""}`}>
                <h1 className="luco-title">Set your work preferences</h1>
                <p className="luco-sub">
                  Configure your working hours, contact preferences and trust verification.
                </p>

                {/* Languages */}
                <div className="luco-reg-field">
                  <div className="luco-field-label">
                    <label>Languages you speak</label>
                    <span className={`luco-pts ${isDone.languages ? "done" : ""}`}>
                      {isDone.languages ? "✓ added" : "+3%"}
                    </span>
                  </div>

                  <div className="luco-lang-add-row">
                    <select value={newLang} onChange={(e) => setNewLang(e.target.value)}>
                      <option>English</option>
                      <option>Hindi</option>
                      <option>Bengali</option>
                      <option>Telugu</option>
                      <option>Marathi</option>
                      <option>Tamil</option>
                      <option>Gujarati</option>
                      <option>Kannada</option>
                      <option>Malayalam</option>
                      <option>Punjabi</option>
                    </select>

                    <select value={newLangLevel} onChange={(e) => setNewLangLevel(e.target.value)}>
                      <option>Fluent</option>
                      <option>Native</option>
                      <option>Basic</option>
                    </select>

                    <button type="button" className="luco-lang-add-btn" onClick={handleAddLanguage}>
                      Add
                    </button>
                  </div>

                  <div className="luco-tag-box">
                    {languages.map((l, idx) => (
                      <span key={idx} className="luco-tag">
                        {l.language} · {l.level}
                        <button type="button" onClick={() => handleRemoveLanguage(l.language)}>
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Availability */}
                <div className="luco-two-col">
                  <div className="luco-reg-field">
                    <div className="luco-field-label">
                      <label>Availability</label>
                      <span className={`luco-pts ${isDone.availability ? "done" : ""}`}>
                        {isDone.availability ? "✓ added" : "+2%"}
                      </span>
                    </div>
                    <select
                      value={availabilityCommitment}
                      onChange={(e) => setAvailabilityCommitment(e.target.value)}
                    >
                      <option>Full-time</option>
                      <option>Part-time</option>
                      <option>Weekends only</option>
                    </select>
                  </div>

                  <div className="luco-reg-field">
                    <div className="luco-field-label">
                      <label>Start timeline</label>
                    </div>
                    <select
                      value={availabilityStart}
                      onChange={(e) => setAvailabilityStart(e.target.value)}
                    >
                      <option>Available now</option>
                      <option>Within 1 week</option>
                      <option>Within 1 month</option>
                    </select>
                  </div>
                </div>

                {/* Working Days & Work Hours */}
                <div className="luco-card-block">
                  <div className="luco-card-head-row">
                    <div className="left">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      Working schedule
                    </div>
                    <label className="luco-toggle-switch">
                      <input
                        type="checkbox"
                        checked={calEnabled}
                        onChange={(e) => setCalEnabled(e.target.checked)}
                      />
                      <span className="slider" />
                    </label>
                  </div>

                  {calEnabled && (
                    <>
                      <span className="luco-mini-label">Active work days</span>
                      <div className="luco-day-pills">
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                          <div
                            key={day}
                            className={`luco-day-pill ${workingDays.includes(day) ? "active" : ""}`}
                            onClick={() => toggleWorkingDay(day)}
                          >
                            {day}
                          </div>
                        ))}
                      </div>

                      <div className="luco-time-row">
                        <select value={calFrom} onChange={(e) => setCalFrom(e.target.value)}>
                          <option>09:00 AM</option>
                          <option>10:00 AM</option>
                          <option>11:00 AM</option>
                        </select>
                        <span className="to">to</span>
                        <select value={calTo} onChange={(e) => setCalTo(e.target.value)}>
                          <option>05:00 PM</option>
                          <option>06:00 PM</option>
                          <option>07:00 PM</option>
                          <option>08:00 PM</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>

                {/* Preferred Duration */}
                <div className="luco-reg-field">
                  <div className="luco-field-label">
                    <label>Preferred project duration</label>
                    <span className={`luco-pts ${isDone.duration ? "done" : ""}`}>
                      {isDone.duration ? "✓ added" : "+2%"}
                    </span>
                  </div>
                  <select
                    value={preferredProjectDuration}
                    onChange={(e) => setPreferredProjectDuration(e.target.value)}
                  >
                    <option>Short-term (&lt; 1 month)</option>
                    <option>Medium-term (1–3 months)</option>
                    <option>Long-term (3+ months)</option>
                    <option>Any duration</option>
                  </select>
                </div>

                {/* WhatsApp Availability */}
                <div className="luco-card-block">
                  <div className="luco-card-head-row">
                    <div className="left">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                      </svg>
                      WhatsApp availability
                    </div>
                    <label className="luco-toggle-switch">
                      <input
                        type="checkbox"
                        checked={waAvailEnabled}
                        onChange={(e) => setWaAvailEnabled(e.target.checked)}
                      />
                      <span className="slider" />
                    </label>
                  </div>

                  {waAvailEnabled && (
                    <div className="luco-time-row">
                      <select value={waFrom} onChange={(e) => setWaFrom(e.target.value)}>
                        <option>09:00 AM</option>
                        <option>10:00 AM</option>
                        <option>11:00 AM</option>
                      </select>
                      <span className="to">to</span>
                      <select value={waTo} onChange={(e) => setWaTo(e.target.value)}>
                        <option>06:00 PM</option>
                        <option>07:00 PM</option>
                        <option>08:00 PM</option>
                        <option>09:00 PM</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Contact Consent & Mediums */}
                <div className="luco-reg-field">
                  <div className="luco-field-label">
                    <label>Contact mediums allowed</label>
                    <span className={`luco-pts ${isDone.consent ? "done" : ""}`}>
                      {isDone.consent ? "✓ added" : "+3%"}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <input
                      type="checkbox"
                      id="consentCheck"
                      checked={contactConsent}
                      onChange={(e) => setContactConsent(e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: "var(--teal)" }}
                    />
                    <label htmlFor="consentCheck" style={{ fontSize: 13, color: "var(--ink)" }}>
                      I agree to receive job inquiries directly from verified clients
                    </label>
                  </div>

                  <div className="luco-medium-grid">
                    {[
                      { id: "message", label: "WhatsApp / Chat" },
                      { id: "mail", label: "Email" },
                      { id: "call", label: "Phone call" },
                    ].map((m) => (
                      <div
                        key={m.id}
                        className={`luco-medium-chip ${contactMediums.includes(m.id) ? "active" : ""}`}
                        onClick={() => toggleMedium(m.id)}
                      >
                        {m.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Audio & Video Intro */}
                <div className="luco-field-label" style={{ marginTop: 14 }}>
                  <label>Voice & video intro</label>
                  <span className="hint">Optional · 2x client views</span>
                </div>
                <div className="luco-av-intro-grid">
                  <div className="luco-av-intro-box">
                    <span className="av-lbl">🎙️ Voice intro</span>
                    <button
                      type="button"
                      className={`luco-record-btn ${voiceIntroUrl ? "done" : ""}`}
                      onClick={() => {
                        setVoiceIntroUrl("voice_intro_recorded.mp3");
                        toast.success("Voice sample recorded!");
                      }}
                    >
                      {voiceIntroUrl ? "✓ Voice intro added" : "Record 30s voice intro"}
                    </button>
                  </div>

                  <div className="luco-av-intro-box">
                    <span className="av-lbl">🎥 Video intro</span>
                    <button
                      type="button"
                      className={`luco-record-btn ${videoIntroUrl ? "done" : ""}`}
                      onClick={() => {
                        setVideoIntroUrl("video_intro_uploaded.mp4");
                        toast.success("Video sample uploaded!");
                      }}
                    >
                      {videoIntroUrl ? "✓ Video intro added" : "Upload short intro video"}
                    </button>
                  </div>
                </div>

                {/* ID Verification Badge */}
                <div className="luco-verify-card" style={{ marginTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong style={{ fontSize: 14, color: "var(--teal-deep)" }}>Get a verified badge</strong>
                      <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "var(--ink-soft)" }}>
                        Aadhaar / PAN — verified badge + top search placement
                      </p>
                    </div>
                    <label className="luco-toggle-switch">
                      <input
                        type="checkbox"
                        checked={idVerifyEnabled}
                        onChange={(e) => setIdVerifyEnabled(e.target.checked)}
                      />
                      <span className="slider" />
                    </label>
                  </div>

                  {idVerifyEnabled && (
                    <div style={{ marginTop: 8 }}>
                      <select value={idType} onChange={(e) => setIdType(e.target.value)}>
                        <option>Aadhaar Card</option>
                        <option>PAN Card</option>
                        <option>Driving License</option>
                        <option>Passport</option>
                      </select>
                      <button
                        type="button"
                        className="luco-add-btn"
                        style={{ marginTop: 10, background: "#fff" }}
                        onClick={() => {
                          setIdDocUrl("id_proof_document.pdf");
                          toast.success("Document attached for verification.");
                        }}
                      >
                        {idDocUrl ? "✓ Document attached" : "Upload ID Document"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Terms and Conditions */}
                <div className="luco-tnc-row">
                  <input
                    type="checkbox"
                    id="tncAgree"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                  />
                  <p>
                    I agree to the <a href="/terms">Terms of Service</a> and{" "}
                    <a href="/privacy">Privacy Policy</a> of LucoHire.
                  </p>
                </div>
              </section>

              {/* Form Navigation Actions (Directly under the active form) */}
              <div className="luco-form-actions">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    id="lucoBackBtn"
                    className="luco-btn-back"
                    onClick={() => {
                      setCurrentStep((c) => Math.max(1, c - 1));
                      const shell = document.getElementById("registrationScreen");
                      if (shell) shell.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="19" y1="12" x2="5" y2="12" />
                      <polyline points="12 19 5 12 12 5" />
                    </svg>
                    <span>Back</span>
                  </button>
                ) : (
                  <div />
                )}

                {currentStep < 4 ? (
                  <button
                    type="button"
                    id="lucoNextBtn"
                    className="luco-btn-continue"
                    onClick={() => {
                      if (currentStep === 1) {
                        if (!name.trim()) {
                          toast.error("Please enter your name.");
                          return;
                        }
                        if (!email.trim()) {
                          toast.error("Please enter your email.");
                          return;
                        }
                      }
                      setCurrentStep((c) => Math.min(4, c + 1));
                      const shell = document.getElementById("registrationScreen");
                      if (shell) shell.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    <span>Continue</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </button>
                ) : (
                  <button
                    type="button"
                    id="lucoNextBtn"
                    className="luco-btn-continue final"
                    disabled={!termsAccepted || loading}
                    onClick={handleCreateProfile}
                  >
                    <span>{loading ? "Creating profile..." : "Create my profile"}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                )}
              </div>
            </main>

            {/* ──────── DESKTOP REAL-TIME PREVIEW SIDEBAR ──────── */}
            <aside className="luco-reg-sidebar">
              {/* Profile Score Meter */}
              <div className="luco-profile-score">
                <div className="luco-score-top">
                  <span>Profile strength</span>
                  <b>{percentage}%</b>
                </div>
                <div className="luco-score-bar-track">
                  <span style={{ width: `${percentage}%` }} />
                </div>
                <small style={{ color: "rgba(255,255,255,0.75)", fontSize: 11.5 }}>
                  Profiles with 80%+ receive 3x more direct client inquiries.
                </small>
              </div>

              {/* Live Freelancer Card Preview */}
              <div className="luco-preview-card">
                <div className="luco-pv-top">
                  <div className="luco-pv-avatar">
                    {photo ? <img src={photo} alt="avatar" /> : initials}
                  </div>
                  <div>
                    <h3 className="luco-pv-name">{name || "Your name"}</h3>
                    <p className="luco-pv-title">{title || "Your professional title"}</p>
                    <div className="luco-pv-loc">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21z" />
                        <circle cx="12" cy="9.5" r="2.5" />
                      </svg>
                      {city && state ? `${city}, ${state}` : "City not set yet"}
                    </div>
                  </div>
                </div>

                <div className="luco-pv-skill-row">
                  <p>{headlineSkillName}</p>
                  <p className="r">₹{activeHeadlineSkill.startingPrice || "5000"}</p>
                </div>
              </div>

              {/* WhatsApp Profile Summary Card */}
              <div className="luco-wa-summary-card">
                <div className="luco-wa-summary-head">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.38 5.08L2 22l5.08-1.34A9.96 9.96 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.6 0-3.1-.42-4.4-1.16l-.32-.18-3.02.8.81-2.95-.2-.32A7.95 7.95 0 0 1 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z" />
                  </svg>
                  <span>WhatsApp profile card</span>
                </div>
                <div className="luco-wa-summary-body">
                  <div className="luco-wa-summary-row">
                    <span className="k">Name</span>
                    <span className="v">{name || "Your name"}</span>
                  </div>
                  <div className="luco-wa-summary-row">
                    <span className="k">Headline skill</span>
                    <span className="v">{headlineSkillName}</span>
                  </div>
                  <div className="luco-wa-summary-row">
                    <span className="k">Starting rate</span>
                    <span className="v">
                      ₹{activeHeadlineSkill.startingPrice || "—"} / {activeHeadlineSkill.priceType || "project"}
                    </span>
                  </div>
                  <div className="luco-wa-summary-row">
                    <span className="k">Location</span>
                    <span className="v">{city && state ? `${city}, ${state}` : "City not set"}</span>
                  </div>
                  <div className="luco-wa-summary-row">
                    <span className="k">Languages</span>
                    <span className="v">{languages.map((l) => l.language).join(", ") || "Hindi, English"}</span>
                  </div>
                  <div className="luco-wa-summary-row">
                    <span className="k">WhatsApp active</span>
                    <span className="v">{waAvailEnabled ? `${waFrom} – ${waTo}` : "Turned off"}</span>
                  </div>
                  <div className="luco-wa-summary-row">
                    <span className="k">Verified</span>
                    <span className="v">
                      {[
                        mobileVerified && "Mobile",
                        emailVerified && "Email",
                        idVerifyEnabled && "ID",
                      ]
                        .filter(Boolean)
                        .join(" + ") || "In progress"}
                    </span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
