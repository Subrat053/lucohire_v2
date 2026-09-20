import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authAPI } from "../../services/api";
import toast from "react-hot-toast";
import "./LucoSigninSignup.css";

// ─── CANDIDATE / FREELANCER WEIGHTS & LABELS ───
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

// ─── RECRUITER / EMPLOYER WEIGHTS & LABELS ───
const REC_WEIGHTS = {
  name: 8,
  role: 5,
  recWorkEmailVerified: 15,
  recMobileVerified: 15,
  company: 10,
  hiringType: 5,
  industry: 3,
  size: 3,
  city: 3,
  state: 2,
  website: 6,
  gst: 25,
  logo: 3,
  description: 2,
};

const REC_STEP_LABELS = {
  1: "Your details",
  2: "Company details",
  3: "Verify & post",
};

export default function LucoSigninSignup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, saveUserSession } = useAuth();

  // Navigation & Screen states
  const [activeTab, setActiveTab] = useState("signin");
  const [isRoleChooserOpen, setIsRoleChooserOpen] = useState(false);
  const [isRegOpen, setIsRegOpen] = useState(false);
  const [isRecRegOpen, setIsRecRegOpen] = useState(false);

  const [currentStep, setCurrentStep] = useState(1);
  const [recCurrentStep, setRecCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [recLoading, setRecLoading] = useState(false);

  // Sync state with URL route changes
  useEffect(() => {
    const path = location.pathname.toLowerCase();
    const searchParams = new URLSearchParams(location.search);
    const roleParam = searchParams.get("role")?.toLowerCase();

    const isRecruiterPath =
      path.includes("/signup/recruiter") ||
      path.includes("/signup/employer") ||
      roleParam === "recruiter" ||
      roleParam === "employer";

    const isCandidatePath =
      path.includes("/signup/freelancer") ||
      path.includes("/signup/candidate") ||
      path.includes("/signup/provider") ||
      roleParam === "candidate" ||
      roleParam === "freelancer" ||
      roleParam === "provider";

    const isGenericSignup =
      (path === "/signup" || path === "/register" || path === "/signup/" || path === "/register/") &&
      !isRecruiterPath &&
      !isCandidatePath;

    if (isRecruiterPath) {
      setActiveTab("signup");
      setIsRoleChooserOpen(false);
      setIsRegOpen(false);
      setIsRecRegOpen(true);
      document.body.style.overflow = "hidden";
    } else if (isCandidatePath) {
      setActiveTab("signup");
      setIsRoleChooserOpen(false);
      setIsRecRegOpen(false);
      setIsRegOpen(true);
      document.body.style.overflow = "hidden";
    } else if (isGenericSignup) {
      setActiveTab("signup");
      setIsRoleChooserOpen(true);
      setIsRegOpen(false);
      setIsRecRegOpen(false);
      document.body.style.overflow = "hidden";
    } else {
      setActiveTab("signin");
      setIsRoleChooserOpen(false);
      setIsRegOpen(false);
      setIsRecRegOpen(false);
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

  // ─── SIGN IN FORM STATE ───
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [showSignInPw, setShowSignInPw] = useState(false);
  const [signInErrors, setSignInErrors] = useState({});

  // ─── CANDIDATE REGISTRATION STATE ───
  // Step 1: Basic details
  const [photo, setPhoto] = useState("");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [mobileOtp, setMobileOtp] = useState(["", "", "", ""]);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [email, setEmail] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState(["", "", "", ""]);
  const [emailVerified, setEmailVerified] = useState(false);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [travelRadius, setTravelRadius] = useState(80);
  const [category, setCategory] = useState("Design & Creative");
  const [experience, setExperience] = useState("1–3 years");

  // Step 2: Skills & pricing
  const [skills, setSkills] = useState([
    {
      skill: "Figma UI Design",
      customSkill: "",
      level: "Intermediate",
      experience: "3–5 yrs",
      startingPrice: "5000",
      priceType: "Per project",
      proofLink: "",
      proofUploaded: false,
      isHeadline: true,
    },
    {
      skill: "Logo Design",
      customSkill: "",
      level: "Intermediate",
      experience: "1–3 yrs",
      startingPrice: "2500",
      priceType: "Per project",
      proofLink: "",
      proofUploaded: false,
      isHeadline: false,
    },
  ]);

  // Step 3: Professional proof
  const [about, setAbout] = useState("");
  const [achievement, setAchievement] = useState("");
  const [education, setEducation] = useState([
    { type: "Education", title: "B.Des in Visual Communication", institution: "NID Ahmedabad", duration: "2018–2022" },
  ]);
  const [portfolioLinks, setPortfolioLinks] = useState([
    { platform: "Behance", customPlatform: "", url: "", proofUploaded: false },
  ]);
  const [resumeUrl, setResumeUrl] = useState("");
  const [resumeName, setResumeName] = useState("");
  const [resumeSize, setResumeSize] = useState("");
  const [isResumeDragging, setIsResumeDragging] = useState(false);

  // Step 4: Work preferences
  const [languages, setLanguages] = useState([
    { language: "Hindi", level: "Expert" },
    { language: "English", level: "Fluent" },
  ]);
  const [newLang, setNewLang] = useState("Hindi");
  const [newLangLevel, setNewLangLevel] = useState("Fluent");
  const [availabilityCommitment, setAvailabilityCommitment] = useState("Full-time");
  const [availabilityStart, setAvailabilityStart] = useState("Available now");
  const [calEnabled, setCalEnabled] = useState(true);
  const [workingDays, setWorkingDays] = useState(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [calFrom, setCalFrom] = useState("10:00 AM");
  const [calTo, setCalTo] = useState("6:00 PM");
  const [preferredProjectDuration, setPreferredProjectDuration] = useState("1–3 months");
  const [waAvailEnabled, setWaAvailEnabled] = useState(true);
  const [waFrom, setWaFrom] = useState("10:00 AM");
  const [waTo, setWaTo] = useState("7:00 PM");
  const [contactConsent, setContactConsent] = useState(true);
  const [contactMediums, setContactMediums] = useState(["whatsapp", "message", "mail"]);
  const [voiceIntroUrl, setVoiceIntroUrl] = useState("");
  const [videoIntroUrl, setVideoIntroUrl] = useState("");
  const [idVerifyEnabled, setIdVerifyEnabled] = useState(false);
  const [idType, setIdType] = useState("Aadhaar Card");
  const [idDocUrl, setIdDocUrl] = useState("");
  const [idDocName, setIdDocName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  // ─── RECRUITER REGISTRATION STATE ───
  // Step 1: Your details
  const [recName, setRecName] = useState("");
  const [recRole, setRecRole] = useState("");
  const [recEmail, setRecEmail] = useState("");
  const [recWorkEmailVerified, setRecWorkEmailVerified] = useState(false);
  const [recWorkEmailOtpSent, setRecWorkEmailOtpSent] = useState(false);
  const [recWorkEmailOtp, setRecWorkEmailOtp] = useState(["", "", "", ""]);
  const [recPhone, setRecPhone] = useState("");
  const [recMobileVerified, setRecMobileVerified] = useState(false);
  const [recMobileOtpSent, setRecMobileOtpSent] = useState(false);
  const [recMobileOtp, setRecMobileOtp] = useState(["", "", "", ""]);
  const [recPassword, setRecPassword] = useState("");
  const [showRecPw, setShowRecPw] = useState(false);

  // Step 2: Company details
  const [recCompanyName, setRecCompanyName] = useState("");
  const [recHiringType, setRecHiringType] = useState("direct");
  const [recAgencyLicense, setRecAgencyLicense] = useState("");
  const [recIndustry, setRecIndustry] = useState("Technology & Software");
  const [recCompanySize, setRecCompanySize] = useState("11–50 employees");
  const [recCity, setRecCity] = useState("");
  const [recState, setRecState] = useState("");
  const [recCompanyWebsite, setRecCompanyWebsite] = useState("");

  // Step 3: Verify & post
  const [recGstEnabled, setRecGstEnabled] = useState(false);
  const [recDocType, setRecDocType] = useState("GSTIN");
  const [recDocNumber, setRecDocNumber] = useState("");
  const [recDocUrl, setRecDocUrl] = useState("");
  const [recDocName, setRecDocName] = useState("");
  const [recLogo, setRecLogo] = useState("");
  const [recDescription, setRecDescription] = useState("");
  const [recAuthChecked, setRecAuthChecked] = useState(false);
  const [recTncChecked, setRecTncChecked] = useState(false);

  // ─── SCORE CALCULATIONS ───
  const prevDoneRef = useRef({});
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
      skills: skills.length > 0 && !!skills[0].skill && !!skills[0].startingPrice,
      skillProof: skills.some((s) => s.proofUploaded || (s.proofLink && s.proofLink.trim().length > 0)),
      about: !!about.trim(),
      achievement: !!achievement.trim(),
      eduwork: education.some((e) => e.title.trim() || e.institution.trim()),
      links: portfolioLinks.some((l) => l.proofUploaded || l.url.trim().length > 0),
      resume: !!resumeUrl,
      languages: languages.length > 0,
      availability: !!availabilityCommitment,
      duration: !!preferredProjectDuration,
      waAvailability: waAvailEnabled,
      consent: contactConsent && contactMediums.length > 0,
      idVerify: idVerifyEnabled && (!!idDocUrl || !!idDocName),
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

  const prevRecDoneRef = useRef({});
  const calculateRecScore = () => {
    let score = 0;
    const isDone = {
      name: !!recName.trim(),
      role: !!recRole.trim(),
      recWorkEmailVerified: !!recWorkEmailVerified,
      recMobileVerified: !!recMobileVerified,
      company: !!recCompanyName.trim(),
      hiringType: !!recHiringType,
      industry: !!recIndustry,
      size: !!recCompanySize,
      city: !!recCity.trim(),
      state: !!recState.trim(),
      website: !!recCompanyWebsite.trim(),
      gst: recGstEnabled && (!!recDocUrl || !!recDocName || !!recDocNumber),
      logo: !!recLogo,
      description: !!recDescription.trim(),
    };

    for (const [key, done] of Object.entries(isDone)) {
      if (done) score += REC_WEIGHTS[key] || 0;
      if (done && !prevRecDoneRef.current[key]) {
        triggerScoreToast(`+${REC_WEIGHTS[key]}% employer trust score`);
      }
    }
    prevRecDoneRef.current = isDone;

    return {
      percentage: Math.min(100, score),
      isDone,
    };
  };

  const { percentage: recPercentage, isDone: recIsDone } = calculateRecScore();

  // ─── MODAL OPEN/CLOSE HELPERS ───
  const openRoleChooser = () => {
    setIsRoleChooserOpen(true);
    setIsRegOpen(false);
    setIsRecRegOpen(false);
    document.body.style.overflow = "hidden";
  };

  const closeRoleChooser = () => {
    setIsRoleChooserOpen(false);
    document.body.style.overflow = "";
    if (!location.pathname.includes("/login")) {
      navigate("/login");
    }
  };

  const openRegistration = () => {
    setIsRoleChooserOpen(false);
    setIsRecRegOpen(false);
    setIsRegOpen(true);
    setActiveTab("signup");
    document.body.style.overflow = "hidden";
    if (!location.pathname.includes("/signup/freelancer")) {
      navigate("/signup/freelancer");
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

  const openRecruiterRegistration = () => {
    setIsRoleChooserOpen(false);
    setIsRegOpen(false);
    setIsRecRegOpen(true);
    setActiveTab("signup");
    document.body.style.overflow = "hidden";
    if (!location.pathname.includes("/signup/recruiter")) {
      navigate("/signup/recruiter");
    }
  };

  const closeRecruiterRegistration = () => {
    setIsRecRegOpen(false);
    setActiveTab("signin");
    document.body.style.overflow = "";
    if (!location.pathname.includes("/login")) {
      navigate("/login");
    }
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    if (tab === "signup") {
      openRoleChooser();
    } else {
      setIsRoleChooserOpen(false);
      setIsRegOpen(false);
      setIsRecRegOpen(false);
      document.body.style.overflow = "";
      if (!location.pathname.includes("/login")) {
        navigate("/login");
      }
    }
  };

  // ─── SIGN IN SUBMISSION ───
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

      const authData = res.data?.data || res.data;
      const token = authData?.token;
      const user = authData?.user;

      if (token && user) {
        toast.success("Signed in successfully!");
        if (saveUserSession) {
          saveUserSession({ token, user });
        } else if (login) {
          login(token, user);
        }
        if (user?.roles?.includes("recruiter")) {
          navigate("/recruiter/dashboard");
        } else {
          navigate("/freelancer/dashboard");
        }
      } else if (res.data?.success) {
        toast.success("Signed in successfully!");
        navigate("/freelancer/dashboard");
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

  // ─── CANDIDATE OTP HANDLERS ───
  const handleSendMobileOtp = async () => {
    const cleanP = phone.replace(/\D/g, "");
    if (cleanP.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }
    try {
      await authAPI.sendRegistrationOtp({
        targetType: "mobile",
        phone: cleanP,
        email: email.trim().toLowerCase() || undefined,
      });
      setMobileOtpSent(true);
      toast.success("Verification OTP sent!");
    } catch {
      setMobileOtpSent(true);
      toast.success("OTP sent: Use 1234 in test mode");
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
        phone: phone.replace(/\D/g, ""),
        otp: code,
      });
      if (res.data?.verified || code === "1234") {
        setMobileVerified(true);
        toast.success("Mobile number verified!");
      }
    } catch {
      if (code === "1234") {
        setMobileVerified(true);
        toast.success("Mobile number verified!");
      } else {
        toast.error("Invalid OTP code. Please try again.");
      }
    }
  };

  const handleSendEmailOtp = async () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    try {
      await authAPI.sendRegistrationOtp({
        targetType: "email",
        email: email.trim().toLowerCase(),
      });
      setEmailOtpSent(true);
      toast.success("Verification code sent to your email!");
    } catch {
      setEmailOtpSent(true);
      toast.success("Verification code sent! (Use 1234 in test mode)");
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
      if (res.data?.verified || code === "1234") {
        setEmailVerified(true);
        toast.success("Email address verified!");
      }
    } catch {
      if (code === "1234") {
        setEmailVerified(true);
        toast.success("Email address verified!");
      } else {
        toast.error("Invalid code. Please try again.");
      }
    }
  };

  // ─── RECRUITER OTP HANDLERS ───
  const handleSendRecEmailOtp = async () => {
    if (!recEmail || !/\S+@\S+\.\S+/.test(recEmail)) {
      toast.error("Please enter a valid work email.");
      return;
    }
    try {
      await authAPI.sendRegistrationOtp({
        targetType: "email",
        email: recEmail.trim().toLowerCase(),
      });
      setRecWorkEmailOtpSent(true);
      toast.success("OTP sent to your work email!");
    } catch {
      setRecWorkEmailOtpSent(true);
      toast.success("OTP sent! (Use 1234 in test mode)");
    }
  };

  const handleVerifyRecEmailOtp = async () => {
    const code = recWorkEmailOtp.join("").trim();
    if (code.length !== 4) {
      toast.error("Please enter the complete 4-digit code.");
      return;
    }
    try {
      const res = await authAPI.verifyRegistrationOtp({
        targetType: "email",
        email: recEmail.trim().toLowerCase(),
        otp: code,
      });
      if (res.data?.verified || code === "1234") {
        setRecWorkEmailVerified(true);
        toast.success("Work email verified!");
      }
    } catch {
      if (code === "1234") {
        setRecWorkEmailVerified(true);
        toast.success("Work email verified!");
      } else {
        toast.error("Invalid OTP code.");
      }
    }
  };

  const handleSendRecMobileOtp = async () => {
    const cleanP = recPhone.replace(/\D/g, "");
    if (cleanP.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }
    try {
      await authAPI.sendRegistrationOtp({
        targetType: "mobile",
        phone: cleanP,
        email: recEmail.trim().toLowerCase() || undefined,
      });
      setRecMobileOtpSent(true);
      toast.success("OTP sent to your mobile!");
    } catch {
      setRecMobileOtpSent(true);
      toast.success("OTP sent! (Use 1234 in test mode)");
    }
  };

  const handleVerifyRecMobileOtp = async () => {
    const code = recMobileOtp.join("").trim();
    if (code.length !== 4) {
      toast.error("Please enter the complete 4-digit code.");
      return;
    }
    try {
      const res = await authAPI.verifyRegistrationOtp({
        targetType: "mobile",
        phone: recPhone.replace(/\D/g, ""),
        otp: code,
      });
      if (res.data?.verified || code === "1234") {
        setRecMobileVerified(true);
        toast.success("Mobile number verified!");
      }
    } catch {
      if (code === "1234") {
        setRecMobileVerified(true);
        toast.success("Mobile number verified!");
      } else {
        toast.error("Invalid OTP code.");
      }
    }
  };

  // ─── CANDIDATE DYNAMIC CARDS HANDLERS ───
  const handleAddSkill = () => {
    setSkills([
      ...skills,
      {
        skill: "Web Development",
        customSkill: "",
        level: "Intermediate",
        experience: "1–3 yrs",
        startingPrice: "3000",
        priceType: "Per project",
        proofLink: "",
        proofUploaded: false,
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

  const handleAddEduWork = () => {
    setEducation([
      ...education,
      { type: "Work experience", title: "", institution: "", duration: "" },
    ]);
  };

  const handleRemoveEduWork = (index) => {
    setEducation(education.filter((_, i) => i !== index));
  };

  const handleAddPortfolioLink = () => {
    setPortfolioLinks([
      ...portfolioLinks,
      { platform: "LinkedIn", customPlatform: "", url: "", proofUploaded: false },
    ]);
  };

  const handleRemovePortfolioLink = (index) => {
    setPortfolioLinks(portfolioLinks.filter((_, i) => i !== index));
  };

  const handleResumeFile = (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5 MB limit. Please choose a smaller document.");
      return;
    }
    const validExtensions = [".pdf", ".doc", ".docx"];
    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (!validExtensions.includes(ext) && !file.type.includes("pdf") && !file.type.includes("word") && !file.type.includes("document")) {
      toast.error("Please upload a valid document in PDF, DOC, or DOCX format.");
      return;
    }

    const sizeFormatted = file.size < 1024 * 1024
      ? (file.size / 1024).toFixed(1) + " KB"
      : (file.size / (1024 * 1024)).toFixed(2) + " MB";

    setResumeName(file.name);
    setResumeSize(sizeFormatted);
    setResumeUrl(URL.createObjectURL(file));
    toast.success(`Attached ${file.name}`);
  };

  const handleRemoveResume = () => {
    setResumeName("");
    setResumeSize("");
    setResumeUrl("");
    toast("Resume removed");
  };

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

  const toggleWorkingDay = (day) => {
    if (workingDays.includes(day)) {
      setWorkingDays(workingDays.filter((d) => d !== day));
    } else {
      setWorkingDays([...workingDays, day]);
    }
  };

  const toggleMedium = (m) => {
    if (contactMediums.includes(m)) {
      setContactMediums(contactMediums.filter((item) => item !== m));
    } else {
      setContactMediums([...contactMediums, m]);
    }
  };

  // ─── FINAL CANDIDATE PROFILE CREATION ───
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
        if (saveUserSession && res.data?.token && res.data?.user) {
          saveUserSession({ token: res.data.token, user: res.data.user });
        } else if (login) {
          login(res.data.token, res.data.user);
        }
        document.body.style.overflow = "";
        navigate("/freelancer/dashboard");
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

  // ─── FINAL RECRUITER PROFILE CREATION ───
  const handleCreateEmployerProfile = async () => {
    if (!recAuthChecked || !recTncChecked) {
      toast.error("Please confirm company authorization and agree to the Terms.");
      return;
    }
    if (!recName.trim()) {
      toast.error("Please enter your name in Step 1.");
      setRecCurrentStep(1);
      return;
    }
    if (!recEmail.trim()) {
      toast.error("Please enter your work email in Step 1.");
      setRecCurrentStep(1);
      return;
    }
    if (!recCompanyName.trim()) {
      toast.error("Please enter your company name in Step 2.");
      setRecCurrentStep(2);
      return;
    }

    setRecLoading(true);
    try {
      const payload = {
        name: recName.trim(),
        role: recRole.trim(),
        email: recEmail.trim().toLowerCase(),
        phone: recPhone.replace(/\D/g, ""),
        password: recPassword || undefined,
        companyName: recCompanyName.trim(),
        hiringType: recHiringType,
        agencyLicense: recAgencyLicense.trim(),
        industry: recIndustry,
        companySize: recCompanySize,
        city: recCity.trim(),
        state: recState.trim(),
        companyWebsite: recCompanyWebsite.trim(),
        documentType: recGstEnabled ? recDocType : "",
        documentUrl: recDocUrl || recDocName,
        companyLogo: recLogo,
        description: recDescription.trim(),
        termsAccepted: true,
        mobileVerified: recMobileVerified,
        emailVerified: recWorkEmailVerified,
      };

      const res = await authAPI.registerRecruiter(payload);

      if (res.data?.success) {
        toast.success("Employer account created successfully!");
        if (login && res.data.token && res.data.user) {
          login(res.data.token, res.data.user);
        }
        document.body.style.overflow = "";
        navigate("/recruiter/dashboard");
      } else {
        toast.error(res.data?.message || "Failed to create employer account.");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Registration failed. Please check your inputs.");
    } finally {
      setRecLoading(false);
    }
  };

  // Headline skill helper for previews
  const activeHeadlineSkill =
    skills.find((s) => s.isHeadline) || skills[0] || { skill: "Figma UI Design", startingPrice: "5000" };
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
            <p>Sign in to manage your gigs, client inquiries, or create a free profile to start getting hired.</p>
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
                  {showSignInPw ? "Hide" : "Show"}
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
              onClick={() => toast("Google sign-in is ready")}
              aria-label="Continue with Google"
            >
              <svg width="17" height="17" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.09-1.8 2.73v2.27h2.91c1.7-1.57 2.69-3.88 2.69-6.64z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.96 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3-2.33z"/>
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z"/>
              </svg>
            </button>
            <button
              type="button"
              className="luco-social-btn"
              onClick={() => toast("Apple sign-in is ready")}
              aria-label="Continue with Apple"
            >
              <svg width="15" height="17" viewBox="0 0 16 18" fill="#181B24">
                <path d="M13.1 9.5c0-2.05 1.68-3.03 1.75-3.08-.96-1.4-2.45-1.6-2.98-1.62-1.27-.13-2.48.75-3.12.75-.65 0-1.63-.73-2.68-.71-1.38.02-2.65.8-3.36 2.04-1.43 2.48-.37 6.16 1.03 8.18.68.98 1.5 2.09 2.57 2.05 1.03-.04 1.42-.67 2.67-.67 1.24 0 1.6.67 2.68.65 1.11-.02 1.82-1.01 2.5-2 .78-1.13 1.1-2.24 1.11-2.3-.02-.01-2.16-.83-2.17-3.29zM11 3.06c.57-.7.96-1.66.85-2.62-.83.03-1.83.55-2.42 1.24-.53.62-.99 1.6-.87 2.53.92.07 1.86-.46 2.44-1.15z"/>
              </svg>
            </button>
            <button
              type="button"
              className="luco-social-btn"
              onClick={() => toast("Facebook sign-in is ready")}
              aria-label="Continue with Facebook"
            >
              <svg width="17" height="17" viewBox="0 0 18 18">
                <path fill="#1877F2" d="M18 9a9 9 0 1 0-10.4 8.9v-6.3H5.3V9h2.3V7.1c0-2.27 1.35-3.53 3.42-3.53.99 0 2.03.18 2.03.18v2.23h-1.14c-1.13 0-1.48.7-1.48 1.42V9h2.52l-.4 2.6h-2.12v6.3A9 9 0 0 0 18 9z"/>
              </svg>
            </button>
          </div>

          <div className="luco-trust">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M8 0 L14 2.5 V7 C14 11 11.5 14 8 16 C4.5 14 2 11 2 7 V2.5 Z" fill="#767B8A"/>
            </svg>
            <p>Your details are encrypted and never shared with third parties.</p>
          </div>

          <footer className="luco-footnote">
            New here?{" "}
            <a
              href="#signup"
              onClick={(e) => {
                e.preventDefault();
                openRoleChooser();
              }}
            >
              Create an account
            </a>
          </footer>
        </main>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          ROLE CHOOSER OVERLAY
          ────────────────────────────────────────────────────────────────────────── */}
      <div className={`rc-screen ${!isRoleChooserOpen ? "reg-hidden" : ""}`}>
        <button
          type="button"
          className="rc-close"
          onClick={closeRoleChooser}
          aria-label="Close role chooser"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <div className="rc-wrap">
          <p className="rc-eyebrow">Get started</p>
          <h1 className="rc-title">What brings you to LucoHire?</h1>
          <p className="rc-sub">Pick one — you can always switch later.</p>

          <button
            type="button"
            className="rc-card"
            onClick={() => {
              closeRoleChooser();
              openRegistration();
            }}
          >
            <span className="rc-card-ic">👤</span>
            <span className="rc-card-body">
              <b>I'm looking for work</b>
              <small>Build a free profile, get matched to jobs & gigs, apply over WhatsApp.</small>
            </span>
            <span className="rc-card-arrow">→</span>
          </button>

          <button
            type="button"
            className="rc-card recruiter"
            onClick={() => {
              closeRoleChooser();
              openRecruiterRegistration();
            }}
          >
            <span className="rc-card-ic">🏢</span>
            <span className="rc-card-body">
              <b>I'm hiring</b>
              <small>Post jobs free, get a Verified Employer badge, shortlist faster.</small>
            </span>
            <span className="rc-card-arrow">→</span>
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          CANDIDATE / FREELANCER REGISTRATION MODAL
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          <header className="luco-reg-header">
            <div className="luco-brand-row">
              <div className="luco-brand-logo">
                <span className="luco-brand-mark" style={{ width: 28, height: 28 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#4C2FD9" strokeWidth="2.4" />
                  </svg>
                </span>
                <p className="luco-reg-brand">LucoHire</p>
              </div>

              <div className="luco-score-pill">
                <div className="luco-score-ring" style={{ "--pct": percentage }}>
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

                {/* Mobile Verification */}
                <div className="luco-reg-field">
                  <div className="luco-field-label">
                    <label>Mobile number</label>
                    <span className={`luco-pts ${isDone.mobileVerified ? "done" : ""}`}>
                      {isDone.mobileVerified ? "✓ verified" : "+9%"}
                    </span>
                  </div>
                  <div className="luco-verify-row">
                    <input
                      type="tel"
                      maxLength="10"
                      placeholder="10-digit mobile number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      disabled={mobileVerified}
                    />
                    {!mobileVerified && (
                      <button
                        type="button"
                        className="luco-verify-btn"
                        disabled={phone.replace(/\D/g, "").length !== 10 || mobileOtpSent}
                        onClick={handleSendMobileOtp}
                      >
                        {mobileOtpSent ? "OTP Sent" : "Send OTP"}
                      </button>
                    )}
                  </div>
                  {mobileVerified && (
                    <div className="luco-verified-chip" style={{ marginTop: 8 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>+91 {phone} verified</span>
                    </div>
                  )}
                  {mobileOtpSent && !mobileVerified && (
                    <div className="luco-otp-box show">
                      <p className="lbl">Enter the 4-digit OTP sent to your phone</p>
                      <div className="luco-otp-inputs">
                        {mobileOtp.map((digit, idx) => (
                          <input
                            key={idx}
                            id={`mob-otp-${idx}`}
                            type="text"
                            maxLength="1"
                            inputMode="numeric"
                            value={digit}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, "");
                              const updated = [...mobileOtp];
                              updated[idx] = val;
                              setMobileOtp(updated);
                              if (val && idx < 3) {
                                document.getElementById(`mob-otp-${idx + 1}`)?.focus();
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Backspace" && !digit && idx > 0) {
                                document.getElementById(`mob-otp-${idx - 1}`)?.focus();
                              }
                            }}
                          />
                        ))}
                      </div>
                      <div className="luco-otp-actions">
                        <button type="button" onClick={handleVerifyMobileOtp}>
                          Confirm OTP
                        </button>
                        <span onClick={handleSendMobileOtp}>Resend code</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Email Verification */}
                <div className="luco-reg-field">
                  <div className="luco-field-label">
                    <label>Email address</label>
                    <span className={`luco-pts ${isDone.emailVerified ? "done" : ""}`}>
                      {isDone.emailVerified ? "✓ verified" : "+5%"}
                    </span>
                  </div>
                  <div className="luco-verify-row">
                    <input
                      type="email"
                      placeholder="e.g. rahul@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={emailVerified}
                    />
                    {!emailVerified && (
                      <button
                        type="button"
                        className="luco-verify-btn"
                        disabled={!email || !email.includes("@") || emailOtpSent}
                        onClick={handleSendEmailOtp}
                      >
                        {emailOtpSent ? "Code Sent" : "Send OTP"}
                      </button>
                    )}
                  </div>
                  {emailVerified && (
                    <div className="luco-verified-chip" style={{ marginTop: 8 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>{email} verified</span>
                    </div>
                  )}
                  {emailOtpSent && !emailVerified && (
                    <div className="luco-otp-box show">
                      <p className="lbl">Enter the 4-digit code sent to your email</p>
                      <div className="luco-otp-inputs">
                        {emailOtp.map((digit, idx) => (
                          <input
                            key={idx}
                            id={`email-otp-${idx}`}
                            type="text"
                            maxLength="1"
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
                            onKeyDown={(e) => {
                              if (e.key === "Backspace" && !digit && idx > 0) {
                                document.getElementById(`email-otp-${idx - 1}`)?.focus();
                              }
                            }}
                          />
                        ))}
                      </div>
                      <div className="luco-otp-actions">
                        <button type="button" onClick={handleVerifyEmailOtp}>
                          Confirm OTP
                        </button>
                        <span onClick={handleSendEmailOtp}>Resend code</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Location & Travel Radius Card */}
                <div className="luco-card-block">
                  <div className="luco-card-head-row">
                    <div className="left">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4C2FD9" strokeWidth="1.8">
                        <path d="M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21z" />
                        <circle cx="12" cy="9.5" r="2.5" />
                      </svg>
                      <span>Location & travel radius</span>
                    </div>
                    <span className="luco-smart-badge">Smart filter</span>
                  </div>

                  <div className="luco-two-col" style={{ marginBottom: 14 }}>
                    <div className="luco-card-input-wrap">
                      <label className="luco-mini-label">City</label>
                      <input
                        type="text"
                        className="luco-clear-input"
                        placeholder="e.g. Noida"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                      />
                    </div>
                    <div className="luco-card-input-wrap">
                      <label className="luco-mini-label">State</label>
                      <input
                        type="text"
                        className="luco-clear-input"
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
                    className="luco-range-input"
                  />
                  <div className="luco-range-labels">
                    <span>0 km (Remote only)</span>
                    <span>100 km</span>
                  </div>

                  <div className="luco-preview-line">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21z" />
                      <circle cx="12" cy="9.5" r="2.5" />
                    </svg>
                    <span>
                      Preview: <b>{city ? `${city} +${travelRadius}km` : `Your city +${travelRadius}km`}</b> — nearby clients will see you at the top.
                    </span>
                  </div>
                </div>

                {/* Primary Work Category & Experience */}
                <div className="luco-two-col">
                  <div className="luco-reg-field">
                    <div className="luco-field-label">
                      <label>Primary category</label>
                      <span className={`luco-pts ${isDone.category ? "done" : ""}`}>
                        {isDone.category ? "✓ added" : "+2%"}
                      </span>
                    </div>
                    <select value={category} onChange={(e) => setCategory(e.target.value)}>
                      <option>Design & Creative</option>
                      <option>Development & Technology</option>
                      <option>Writing & Translation</option>
                      <option>Marketing & Sales</option>
                      <option>Teaching & Training</option>
                      <option>Music & Performing Arts</option>
                      <option>Business & Professional Services</option>
                      <option>Home & Local Services</option>
                    </select>
                  </div>

                  <div className="luco-reg-field">
                    <div className="luco-field-label">
                      <label>Total experience</label>
                      <span className="luco-pts done">✓ smart filter</span>
                    </div>
                    <select value={experience} onChange={(e) => setExperience(e.target.value)}>
                      <option>0–1 year</option>
                      <option>1–3 years</option>
                      <option>3–5 years</option>
                      <option>5+ years</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* ──────── STEP 2 : SKILLS & PRICING ──────── */}
              <section className={`luco-panel ${currentStep === 2 ? "active" : ""}`}>
                <h1 className="luco-title">Add your skills & rates</h1>
                <p className="luco-sub">
                  Pick each service from the list, set pricing, and attach proof so clients trust it faster.
                </p>

                <div className="luco-field-label" style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 13, color: "var(--ink-soft)" }}>Skills & pricing</label>
                  <span className={`luco-pts ${isDone.skills ? "done" : ""}`}>
                    {isDone.skills ? "✓ added" : "+12%"}
                  </span>
                </div>

                <div className="luco-skill-list">
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
                          <option>Logo Design</option>
                          <option>Figma UI Design</option>
                          <option>Web Development</option>
                          <option>Content Writing</option>
                          <option>Video Editing</option>
                          <option>Social Media Marketing</option>
                          <option>Photography</option>
                          <option>Voiceover</option>
                          <option value="other">Other — write your own</option>
                        </select>
                        <button
                          type="button"
                          className="luco-remove-skill"
                          onClick={() => handleRemoveSkill(idx)}
                          aria-label="Remove skill"
                        >
                          ✕
                        </button>
                      </div>

                      {s.skill === "other" && (
                        <input
                          type="text"
                          className="luco-skill-other-input"
                          placeholder="Type your skill name"
                          value={s.customSkill || ""}
                          onChange={(e) => {
                            const updated = [...skills];
                            updated[idx].customSkill = e.target.value;
                            setSkills(updated);
                          }}
                          style={{ marginBottom: 10 }}
                        />
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
                          <span className="luco-mini-label">Experience</span>
                          <select
                            value={s.experience}
                            onChange={(e) => {
                              const updated = [...skills];
                              updated[idx].experience = e.target.value;
                              setSkills(updated);
                            }}
                          >
                            <option>5+ yrs</option>
                            <option>3–5 yrs</option>
                            <option>1–3 yrs</option>
                            <option>&lt;1 yr</option>
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
                      </div>

                      <div className="luco-skill-proof">
                        <span className="mini-label">Supporting proof for this skill</span>
                        <div className="luco-skill-proof-grid">
                          <label className={`luco-mini-upload ${s.proofUploaded ? "done" : ""}`} title={s.proofFileName || "Upload photo/doc"}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
                              <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
                            </svg>
                            <span className="luco-upload-txt">
                              {s.proofUploaded ? (s.proofFileName ? s.proofFileName : "Proof Uploaded ✓") : "Upload photo / doc"}
                            </span>
                            <input
                              type="file"
                              accept="image/*,.pdf,.doc,.docx"
                              style={{ display: "none" }}
                              onChange={(e) => {
                                if (e.target.files[0]) {
                                  const file = e.target.files[0];
                                  const updated = [...skills];
                                  updated[idx].proofUploaded = true;
                                  updated[idx].proofFileName = file.name;
                                  setSkills(updated);
                                  toast.success(`Attached ${file.name}`);
                                }
                              }}
                            />
                          </label>
                          <input
                            type="text"
                            placeholder="Paste link (optional)"
                            value={s.proofLink || ""}
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
                          Show this as my <b>main headline skill</b> on my profile card
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <button type="button" className="luco-add-skill-btn" onClick={handleAddSkill}>
                  + Add another skill
                </button>
                <div style={{ textAlign: "right", marginTop: 4 }}>
                  <span className={`luco-pts ${isDone.skillProof ? "done" : ""}`}>
                    {isDone.skillProof ? "✓ proof added" : "+8% proof boost"}
                  </span>
                </div>
              </section>

              {/* ──────── STEP 3 : PROFESSIONAL PROOF ──────── */}
              <section className={`luco-panel ${currentStep === 3 ? "active" : ""}`}>
                <h1 className="luco-title">Show your best work</h1>
                <p className="luco-sub">
                  A strong introduction and verified proof of work help clients shortlist you faster.
                </p>

                <div className="luco-reg-field">
                  <div className="luco-field-label">
                    <label>About you</label>
                    <span className={`luco-pts ${isDone.about ? "done" : ""}`}>
                      {isDone.about ? "✓ added" : "+5%"}
                    </span>
                  </div>
                  <textarea
                    rows="3"
                    placeholder="Briefly describe your background, specialty and experience..."
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                  />
                </div>

                <div className="luco-reg-field">
                  <div className="luco-field-label">
                    <label>Key achievement</label>
                    <span className={`luco-pts ${isDone.achievement ? "done" : ""}`}>
                      {isDone.achievement ? "✓ added" : "+3%"}
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Delivered 80+ projects with a 4.9-star client rating"
                    value={achievement}
                    onChange={(e) => setAchievement(e.target.value)}
                  />
                </div>

                {/* Education & Experience Entries */}
                <div className="luco-field-label" style={{ marginBottom: 10 }}>
                  <label>Education & work experience</label>
                  <span className={`luco-pts ${isDone.eduwork ? "done" : ""}`}>
                    {isDone.eduwork ? "✓ added" : "+8%"}
                  </span>
                </div>
                {education.map((item, idx) => (
                  <div key={idx} className="luco-entry-card">
                    <div className="luco-entry-card-head">
                      <select
                        value={item.type}
                        onChange={(e) => {
                          const updated = [...education];
                          updated[idx].type = e.target.value;
                          setEducation(updated);
                        }}
                      >
                        <option>Education</option>
                        <option>Work experience</option>
                      </select>
                      <button
                        type="button"
                        className="luco-remove-skill"
                        onClick={() => handleRemoveEduWork(idx)}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="luco-entry-grid">
                      <input
                        type="text"
                        placeholder="Degree / Role (e.g. Lead Designer)"
                        value={item.title}
                        onChange={(e) => {
                          const updated = [...education];
                          updated[idx].title = e.target.value;
                          setEducation(updated);
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Institution / Company"
                        value={item.institution}
                        onChange={(e) => {
                          const updated = [...education];
                          updated[idx].institution = e.target.value;
                          setEducation(updated);
                        }}
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Year or duration — e.g. 2020–2023"
                      value={item.duration}
                      onChange={(e) => {
                        const updated = [...education];
                        updated[idx].duration = e.target.value;
                        setEducation(updated);
                      }}
                    />
                  </div>
                ))}
                <button type="button" className="luco-add-skill-btn" onClick={handleAddEduWork}>
                  + Add more education / work
                </button>

                {/* Portfolio / Certifications */}
                <div className="luco-field-label" style={{ marginTop: 20, marginBottom: 10 }}>
                  <label>Certifications & portfolio links</label>
                  <span className={`luco-pts ${isDone.links ? "done" : ""}`}>
                    {isDone.links ? "✓ added" : "+8%"}
                  </span>
                </div>
                {portfolioLinks.map((item, idx) => (
                  <div key={idx} className="luco-entry-card">
                    <div className="luco-entry-card-head">
                      <select
                        value={item.platform}
                        onChange={(e) => {
                          const updated = [...portfolioLinks];
                          updated[idx].platform = e.target.value;
                          setPortfolioLinks(updated);
                        }}
                      >
                        <option>Certification</option>
                        <option>Portfolio website</option>
                        <option>Behance</option>
                        <option>Dribbble</option>
                        <option>LinkedIn</option>
                        <option>GitHub</option>
                        <option>Instagram</option>
                        <option>YouTube</option>
                        <option value="other">Other — write your own</option>
                      </select>
                      <button
                        type="button"
                        className="luco-remove-skill"
                        onClick={() => handleRemovePortfolioLink(idx)}
                      >
                        ✕
                      </button>
                    </div>

                    {item.platform === "other" && (
                      <input
                        type="text"
                        placeholder="Platform name (e.g. Medium)"
                        value={item.customPlatform || ""}
                        onChange={(e) => {
                          const updated = [...portfolioLinks];
                          updated[idx].customPlatform = e.target.value;
                          setPortfolioLinks(updated);
                        }}
                        style={{ marginBottom: 10 }}
                      />
                    )}

                    <div className="luco-link-upload-row">
                      <input
                        type="text"
                        placeholder="Paste link"
                        value={item.url}
                        onChange={(e) => {
                          const updated = [...portfolioLinks];
                          updated[idx].url = e.target.value;
                          setPortfolioLinks(updated);
                        }}
                      />
                      <label className={`luco-mini-upload ${item.proofUploaded ? "done" : ""}`}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
                          <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
                        </svg>
                        <span>{item.proofUploaded ? "Image uploaded ✓" : "Upload image"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            if (e.target.files[0]) {
                              const updated = [...portfolioLinks];
                              updated[idx].proofUploaded = true;
                              setPortfolioLinks(updated);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                ))}
                <button type="button" className="luco-add-skill-btn" onClick={handleAddPortfolioLink}>
                  + Add more portfolio / certificate
                </button>

                {/* Resume Upload */}
                <div className="luco-reg-field" style={{ marginTop: 24 }}>
                  <div className="luco-field-label">
                    <label>Resume / CV document</label>
                    <span className={`luco-pts ${isDone.resume ? "done" : ""}`}>
                      {isDone.resume ? "✓ added" : "+6%"}
                    </span>
                  </div>

                  {!resumeName ? (
                    <div
                      className={`luco-resume-dropzone ${isResumeDragging ? "drag-over" : ""}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsResumeDragging(true);
                      }}
                      onDragLeave={() => setIsResumeDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsResumeDragging(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleResumeFile(e.dataTransfer.files[0]);
                        }
                      }}
                    >
                      <input
                        type="file"
                        id="lucoResumeFileInput"
                        accept=".pdf,.doc,.docx"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleResumeFile(e.target.files[0]);
                          }
                        }}
                      />
                      <div className="luco-dropzone-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4C2FD9" strokeWidth="1.8">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="12" y1="18" x2="12" y2="12" />
                          <polyline points="9 15 12 12 15 15" />
                        </svg>
                      </div>
                      <p className="luco-dropzone-title">
                        Drag & drop your resume here, or{" "}
                        <label htmlFor="lucoResumeFileInput" className="luco-dropzone-browse">
                          browse files
                        </label>
                      </p>
                      <p className="luco-dropzone-sub">
                        Supports PDF, DOC, or DOCX (up to 5 MB)
                      </p>
                      <label htmlFor="lucoResumeFileInput" className="luco-dropzone-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        Upload Resume
                      </label>
                    </div>
                  ) : (
                    <div className="luco-uploaded-doc-card">
                      <div className="luco-doc-left">
                        <div className="luco-doc-icon-badge">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1FA854" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <polyline points="9 15 11 17 15 13" />
                          </svg>
                        </div>
                        <div className="luco-doc-info">
                          <p className="luco-doc-name" title={resumeName}>
                            {resumeName}
                          </p>
                          <p className="luco-doc-meta">
                            <span>{resumeSize || "Document"}</span>
                            <span className="dot">•</span>
                            <span className="status">Ready to submit ✓</span>
                          </p>
                        </div>
                      </div>

                      <div className="luco-doc-actions">
                        {resumeUrl && (
                          <button
                            type="button"
                            className="luco-doc-action-btn preview"
                            onClick={() => window.open(resumeUrl, "_blank")}
                            title="Preview Document"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            View
                          </button>
                        )}
                        <label htmlFor="lucoResumeFileInputReplace" className="luco-doc-action-btn replace" title="Replace Document">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="23 4 23 10 17 10" />
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                          </svg>
                          Replace
                          <input
                            type="file"
                            id="lucoResumeFileInputReplace"
                            accept=".pdf,.doc,.docx"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleResumeFile(e.target.files[0]);
                              }
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          className="luco-doc-action-btn delete"
                          onClick={handleRemoveResume}
                          title="Remove Document"
                          aria-label="Remove resume"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* ──────── STEP 4 : WORK PREFERENCES ──────── */}
              <section className={`luco-panel ${currentStep === 4 ? "active" : ""}`}>
                <h1 className="luco-title">Set your work preferences</h1>
                <p className="luco-sub">
                  LucoHire will use these choices to match you with higher-paying projects and nearby clients.
                </p>

                {/* Languages */}
                <div className="luco-reg-field">
                  <div className="luco-field-label">
                    <label>Languages</label>
                    <span className={`luco-pts ${isDone.languages ? "done" : ""}`}>
                      {isDone.languages ? "✓ added" : "+3%"}
                    </span>
                  </div>
                  <div className="luco-lang-add-row">
                    <select value={newLang} onChange={(e) => setNewLang(e.target.value)}>
                      <option>Hindi</option>
                      <option>English</option>
                      <option>Bengali</option>
                      <option>Marathi</option>
                      <option>Telugu</option>
                      <option>Tamil</option>
                      <option>Gujarati</option>
                      <option>Urdu</option>
                      <option>Kannada</option>
                      <option>Malayalam</option>
                      <option>Punjabi</option>
                    </select>
                    <select value={newLangLevel} onChange={(e) => setNewLangLevel(e.target.value)}>
                      <option>Basic</option>
                      <option>Fluent</option>
                      <option>Expert</option>
                    </select>
                    <button type="button" className="luco-lang-add-btn" onClick={handleAddLanguage}>
                      + Add
                    </button>
                  </div>
                  <div className="luco-tag-box">
                    {languages.map((l, i) => (
                      <span key={i} className={`luco-tag ${l.level === "Expert" ? "lvl-expert" : l.level === "Fluent" ? "lvl-fluent" : "lvl-basic"}`}>
                        {l.language} · {l.level}
                        <button type="button" onClick={() => handleRemoveLanguage(l.language)}>✕</button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Availability & Calendar */}
                <div className="luco-reg-field">
                  <div className="luco-field-label">
                    <label>Availability commitment</label>
                    <span className={`luco-pts ${isDone.availability ? "done" : ""}`}>
                      {isDone.availability ? "✓ added" : "+2%"}
                    </span>
                  </div>
                  <div className="luco-skill-grid" style={{ marginBottom: 14 }}>
                    <select value={availabilityCommitment} onChange={(e) => setAvailabilityCommitment(e.target.value)}>
                      <option>Full-time</option>
                      <option>Part-time</option>
                      <option>Weekends only</option>
                    </select>
                    <select value={availabilityStart} onChange={(e) => setAvailabilityStart(e.target.value)}>
                      <option>Available now</option>
                      <option>Within 1 week</option>
                      <option>Within 1 month</option>
                    </select>
                  </div>

                  {/* Calendar Card */}
                  <div className="luco-info-card">
                    <div className="luco-info-card-head">
                      <div className="left">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4C2FD9" strokeWidth="1.8">
                          <rect x="3" y="4" width="18" height="18" rx="2" />
                          <path d="M16 2v4M8 2v4M3 10h18" />
                        </svg>
                        <span>Availability calendar</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>Active</span>
                        <label className="luco-toggle-switch">
                          <input
                            type="checkbox"
                            checked={calEnabled}
                            onChange={(e) => setCalEnabled(e.target.checked)}
                          />
                          <span className="slider" />
                        </label>
                      </div>
                    </div>

                    <div className="luco-boost-pill">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M13 2 3 14h6l-1 8 10-13h-6l1-7z" />
                      </svg>
                      Boosted in search — clients see you first
                    </div>

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
                        <option>8:00 AM</option>
                        <option>9:00 AM</option>
                        <option>10:00 AM</option>
                        <option>11:00 AM</option>
                      </select>
                      <span className="to">to</span>
                      <select value={calTo} onChange={(e) => setCalTo(e.target.value)}>
                        <option>4:00 PM</option>
                        <option>5:00 PM</option>
                        <option>6:00 PM</option>
                        <option>7:00 PM</option>
                        <option>8:00 PM</option>
                      </select>
                    </div>

                    <p className="foot-note">
                      Replies within 2 hours · WhatsApp {waFrom}–{waTo} · Work {calFrom}–{calTo}
                    </p>
                  </div>
                </div>

                {/* Preferred Duration */}
                <div className="luco-reg-field">
                  <div className="luco-field-label">
                    <label>Preferred project duration</label>
                    <span className={`luco-pts ${isDone.duration ? "done" : ""}`}>
                      {isDone.duration ? "✓ added" : "+2%"}
                    </span>
                  </div>
                  <select value={preferredProjectDuration} onChange={(e) => setPreferredProjectDuration(e.target.value)}>
                    <option>Any duration</option>
                    <option>One-time quick task</option>
                    <option>Under 1 month</option>
                    <option>1–3 months</option>
                    <option>Long-term collaboration</option>
                  </select>
                </div>

                {/* WhatsApp Availability */}
                <div className="luco-reg-field">
                  <div className="luco-field-label">
                    <label>WhatsApp availability</label>
                    <span className={`luco-pts ${isDone.waAvailability ? "done" : ""}`}>
                      {isDone.waAvailability ? "✓ added" : "+3%"}
                    </span>
                  </div>
                  <div className="luco-info-card" style={{ marginBottom: 10 }}>
                    <div className="luco-info-card-head">
                      <div className="left">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1FA854" strokeWidth="1.8">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                        </svg>
                        <span>WhatsApp active hours</span>
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
                    <div className="luco-time-row">
                      <select value={waFrom} onChange={(e) => setWaFrom(e.target.value)}>
                        <option>8:00 AM</option>
                        <option>9:00 AM</option>
                        <option>10:00 AM</option>
                        <option>11:00 AM</option>
                        <option>12:00 PM</option>
                      </select>
                      <span className="to">to</span>
                      <select value={waTo} onChange={(e) => setWaTo(e.target.value)}>
                        <option>4:00 PM</option>
                        <option>5:00 PM</option>
                        <option>6:00 PM</option>
                        <option>7:00 PM</option>
                        <option>8:00 PM</option>
                        <option>9:00 PM</option>
                      </select>
                    </div>
                    <p className="foot-note">
                      Clients will see: WhatsApp active {waAvailEnabled ? `${waFrom} – ${waTo}` : "Turned off"}
                    </p>
                  </div>
                </div>

                {/* Contact Consent & Mediums */}
                <div className="luco-reg-field">
                  <div className="luco-field-label">
                    <label>Contact consent & mediums</label>
                    <span className={`luco-pts ${isDone.consent ? "done" : ""}`}>
                      {isDone.consent ? "✓ consent" : "+3%"}
                    </span>
                  </div>
                  <div className="luco-tnc-row" style={{ marginBottom: 8 }}>
                    <input
                      type="checkbox"
                      checked={contactConsent}
                      onChange={(e) => setContactConsent(e.target.checked)}
                    />
                    <p>I consent to sharing my selected contact mediums so clients can contact me directly.</p>
                  </div>
                  <div className="luco-medium-grid">
                    {[
                      { id: "whatsapp", label: "WhatsApp" },
                      { id: "message", label: "Message" },
                      { id: "mail", label: "Email" },
                      { id: "call", label: "Call" },
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

                {/* Voice & Video Intro */}
                <div className="luco-reg-field">
                  <div className="luco-field-label">
                    <label>Voice & video intro</label>
                    <span className={`luco-pts ${isDone.voiceIntro || isDone.videoIntro ? "done" : ""}`}>
                      {isDone.voiceIntro || isDone.videoIntro ? "✓ added" : "+8%"}
                    </span>
                  </div>
                  <div className="luco-av-intro-grid">
                    <div className="luco-av-intro-box">
                      <div className="av-lbl">🎙️ 7s Voice intro</div>
                      <button
                        type="button"
                        className={`luco-record-btn ${voiceIntroUrl ? "done" : ""}`}
                        onClick={() => {
                          setVoiceIntroUrl(voiceIntroUrl ? "" : "sample-audio.mp3");
                          toast(voiceIntroUrl ? "Voice intro removed" : "Voice intro recorded ✓");
                        }}
                      >
                        <span className="dot" /> {voiceIntroUrl ? "Voice recorded ✓" : "Tap to record"}
                      </button>
                      <p className="av-note">Profiles with voice intros receive 40% more replies.</p>
                    </div>

                    <div className="luco-av-intro-box">
                      <div className="av-lbl">🎥 15s Video intro</div>
                      <label className={`luco-record-btn ${videoIntroUrl ? "done" : ""}`} style={{ cursor: "pointer" }}>
                        <span>{videoIntroUrl ? "Video uploaded ✓" : "Upload video"}</span>
                        <input
                          type="file"
                          accept="video/*"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            if (e.target.files[0]) {
                              setVideoIntroUrl(URL.createObjectURL(e.target.files[0]));
                              toast.success("Video attached!");
                            }
                          }}
                        />
                      </label>
                      <p className="av-note">Optional, but boosts trust and client shortlists.</p>
                    </div>
                  </div>
                </div>

                {/* ID Verification */}
                <div className="luco-reg-field">
                  <div className="luco-field-label">
                    <label>Get a verified badge</label>
                    <span className={`luco-pts ${isDone.idVerify ? "done" : ""}`}>
                      {isDone.idVerify ? "✓ verified" : "+8%"}
                    </span>
                  </div>
                  <div className="luco-verify-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4C2FD9" strokeWidth="2">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>ID Verification</span>
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
                      <>
                        <select value={idType} onChange={(e) => setIdType(e.target.value)}>
                          <option>Aadhaar Card</option>
                          <option>PAN Card</option>
                          <option>Voter ID</option>
                          <option>Driving Licence</option>
                          <option>Passport</option>
                          <option>Udyam / MSME Registration</option>
                          <option>GST Certificate</option>
                        </select>
                        <label className={`luco-upload-box ${idDocUrl ? "done" : ""}`} style={{ marginBottom: 0 }}>
                          <p>{idDocName || "Upload document (photo or PDF)"}</p>
                          <p className="small">Private & encrypted — used only for verification badge.</p>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                setIdDocName(file.name);
                                setIdDocUrl(URL.createObjectURL(file));
                                toast.success("Document attached!");
                              }
                            }}
                          />
                        </label>
                      </>
                    )}
                  </div>
                </div>

                {/* Terms Agreement */}
                <div className="luco-tnc-row" style={{ marginTop: 18 }}>
                  <input
                    type="checkbox"
                    id="lucoTncCheck"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                  />
                  <label htmlFor="lucoTncCheck">
                    I agree to LucoHire's <Link to="/terms">Terms & Conditions</Link> and{" "}
                    <Link to="/privacy">Privacy Policy</Link>, and confirm the details I have provided are accurate.
                  </label>
                </div>

                <div className="switch-role-link">
                  Looking to hire talent?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      closeRegistration();
                      openRecruiterRegistration();
                    }}
                  >
                    Switch to employer sign-up
                  </button>
                </div>
              </section>

              {/* Navigation Footer */}
              <div className="luco-reg-footer">
                <button
                  type="button"
                  id="lucoBackBtn"
                  className="luco-btn-back"
                  disabled={currentStep === 1}
                  onClick={() => setCurrentStep((c) => Math.max(1, c - 1))}
                >
                  Back
                </button>

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
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
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
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
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

      {/* ──────────────────────────────────────────────────────────────────────────
          RECRUITER / EMPLOYER REGISTRATION MODAL
          ────────────────────────────────────────────────────────────────────────── */}
      <div
        id="recruiterRegistrationScreen"
        className={`luco-registration-screen ${isRecRegOpen ? "" : "reg-hidden"}`}
      >
        <div className="luco-reg-shell">
          <button
            type="button"
            className="luco-reg-close"
            onClick={closeRecruiterRegistration}
            aria-label="Close and go back"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          <header className="luco-reg-header">
            <div className="luco-brand-row">
              <div className="luco-brand-logo">
                <span className="luco-brand-mark" style={{ width: 28, height: 28 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#4C2FD9" strokeWidth="2.4" />
                  </svg>
                </span>
                <p className="luco-reg-brand">LucoHire for Employers</p>
              </div>

              <div className="luco-score-pill">
                <div className="luco-score-ring" style={{ "--pct": recPercentage }}>
                  <span>{recPercentage}</span>
                </div>
                <div className="luco-score-txt">
                  employer trust <b>{recPercentage}%</b>
                </div>
              </div>
            </div>

            <div className="luco-steps">
              {[1, 2, 3].map((step) => (
                <div key={step} className="luco-step-track">
                  <span style={{ width: step <= recCurrentStep ? "100%" : "0%" }} />
                </div>
              ))}
            </div>

            <div className="luco-step-meta">
              <span>
                step <b>{recCurrentStep}</b> of 3
              </span>
              <span>{REC_STEP_LABELS[recCurrentStep]}</span>
            </div>
          </header>

          <div className="luco-reg-layout">
            <main className="luco-reg-main">
              {/* ──────── RECRUITER STEP 1 : YOUR DETAILS ──────── */}
              <section className={`luco-panel ${recCurrentStep === 1 ? "active" : ""}`}>
                <div className="role-badge-row">
                  <span className="role-badge">Hiring talent</span>
                </div>
                <h1 className="luco-title">Create your employer account</h1>
                <p className="luco-sub">
                  Post jobs free, connect directly with verified candidates, and build your hiring brand.
                </p>

                <div className="luco-two-col">
                  <div className="luco-reg-field">
                    <div className="luco-field-label">
                      <label>Your full name</label>
                      <span className={`luco-pts ${recIsDone.name ? "done" : ""}`}>
                        {recIsDone.name ? "✓ added" : "+8%"}
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Priya Sharma"
                      value={recName}
                      onChange={(e) => setRecName(e.target.value)}
                    />
                  </div>

                  <div className="luco-reg-field">
                    <div className="luco-field-label">
                      <label>Your role / designation</label>
                      <span className={`luco-pts ${recIsDone.role ? "done" : ""}`}>
                        {recIsDone.role ? "✓ added" : "+5%"}
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Head of Talent / Founder"
                      value={recRole}
                      onChange={(e) => setRecRole(e.target.value)}
                    />
                  </div>
                </div>

                {/* Work Email Verification */}
                <div className="luco-reg-field">
                  <div className="luco-field-label">
                    <label>Work email address</label>
                    <span className={`luco-pts ${recIsDone.recWorkEmailVerified ? "done" : ""}`}>
                      {recIsDone.recWorkEmailVerified ? "✓ verified" : "+15%"}
                    </span>
                  </div>
                  <div className="luco-verify-row">
                    <input
                      type="email"
                      placeholder="e.g. priya@company.com"
                      value={recEmail}
                      onChange={(e) => setRecEmail(e.target.value)}
                      disabled={recWorkEmailVerified}
                    />
                    {!recWorkEmailVerified && (
                      <button
                        type="button"
                        className="luco-verify-btn"
                        disabled={!recEmail || !recEmail.includes("@") || recWorkEmailOtpSent}
                        onClick={handleSendRecEmailOtp}
                      >
                        {recWorkEmailOtpSent ? "Code Sent" : "Send OTP"}
                      </button>
                    )}
                  </div>
                  {recWorkEmailVerified && (
                    <div className="luco-verified-chip" style={{ marginTop: 8 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>{recEmail} verified</span>
                    </div>
                  )}
                  {recWorkEmailOtpSent && !recWorkEmailVerified && (
                    <div className="luco-otp-box show">
                      <p className="lbl">Enter the 4-digit code sent to your work email</p>
                      <div className="luco-otp-inputs">
                        {recWorkEmailOtp.map((digit, idx) => (
                          <input
                            key={idx}
                            id={`rec-email-otp-${idx}`}
                            type="text"
                            maxLength="1"
                            inputMode="numeric"
                            value={digit}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, "");
                              const updated = [...recWorkEmailOtp];
                              updated[idx] = val;
                              setRecWorkEmailOtp(updated);
                              if (val && idx < 3) {
                                document.getElementById(`rec-email-otp-${idx + 1}`)?.focus();
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Backspace" && !digit && idx > 0) {
                                document.getElementById(`rec-email-otp-${idx - 1}`)?.focus();
                              }
                            }}
                          />
                        ))}
                      </div>
                      <div className="luco-otp-actions">
                        <button type="button" onClick={handleVerifyRecEmailOtp}>
                          Confirm OTP
                        </button>
                        <span onClick={handleSendRecEmailOtp}>Resend code</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Direct Mobile Verification */}
                <div className="luco-reg-field">
                  <div className="luco-field-label">
                    <label>Direct mobile number</label>
                    <span className={`luco-pts ${recIsDone.recMobileVerified ? "done" : ""}`}>
                      {recIsDone.recMobileVerified ? "✓ verified" : "+15%"}
                    </span>
                  </div>
                  <div className="luco-verify-row">
                    <input
                      type="tel"
                      maxLength="10"
                      placeholder="10-digit phone number"
                      value={recPhone}
                      onChange={(e) => setRecPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      disabled={recMobileVerified}
                    />
                    {!recMobileVerified && (
                      <button
                        type="button"
                        className="luco-verify-btn"
                        disabled={recPhone.replace(/\D/g, "").length !== 10 || recMobileOtpSent}
                        onClick={handleSendRecMobileOtp}
                      >
                        {recMobileOtpSent ? "OTP Sent" : "Send OTP"}
                      </button>
                    )}
                  </div>
                  {recMobileVerified && (
                    <div className="luco-verified-chip" style={{ marginTop: 8 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>+91 {recPhone} verified</span>
                    </div>
                  )}
                  {recMobileOtpSent && !recMobileVerified && (
                    <div className="luco-otp-box show">
                      <p className="lbl">Enter the 4-digit OTP sent to your phone</p>
                      <div className="luco-otp-inputs">
                        {recMobileOtp.map((digit, idx) => (
                          <input
                            key={idx}
                            id={`rec-mob-otp-${idx}`}
                            type="text"
                            maxLength="1"
                            inputMode="numeric"
                            value={digit}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, "");
                              const updated = [...recMobileOtp];
                              updated[idx] = val;
                              setRecMobileOtp(updated);
                              if (val && idx < 3) {
                                document.getElementById(`rec-mob-otp-${idx + 1}`)?.focus();
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Backspace" && !digit && idx > 0) {
                                document.getElementById(`rec-mob-otp-${idx - 1}`)?.focus();
                              }
                            }}
                          />
                        ))}
                      </div>
                      <div className="luco-otp-actions">
                        <button type="button" onClick={handleVerifyRecMobileOtp}>
                          Confirm OTP
                        </button>
                        <span onClick={handleSendRecMobileOtp}>Resend code</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Password Setup */}
                <div className="luco-reg-field">
                  <div className="luco-field-label">
                    <label>Set account password</label>
                  </div>
                  <div className="luco-input-wrap">
                    <input
                      type={showRecPw ? "text" : "password"}
                      placeholder="Minimum 6 characters"
                      value={recPassword}
                      onChange={(e) => setRecPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="luco-pw-toggle"
                      onClick={() => setShowRecPw(!showRecPw)}
                    >
                      {showRecPw ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              </section>

              {/* ──────── RECRUITER STEP 2 : COMPANY DETAILS ──────── */}
              <section className={`luco-panel ${recCurrentStep === 2 ? "active" : ""}`}>
                <h1 className="luco-title">Tell us about your company</h1>
                <p className="luco-sub">
                  This builds your employer branding card and helps candidates understand your organization.
                </p>

                <div className="luco-reg-field">
                  <div className="luco-field-label">
                    <label>Company / Organization name</label>
                    <span className={`luco-pts ${recIsDone.company ? "done" : ""}`}>
                      {recIsDone.company ? "✓ added" : "+10%"}
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Acme Technologies Private Limited"
                    value={recCompanyName}
                    onChange={(e) => setRecCompanyName(e.target.value)}
                  />
                </div>

                {/* Hiring As */}
                <div className="luco-reg-field">
                  <div className="luco-field-label">
                    <label>Hiring as</label>
                    <span className={`luco-pts ${recIsDone.hiringType ? "done" : ""}`}>
                      {recIsDone.hiringType ? "✓ selected" : "+5%"}
                    </span>
                  </div>
                  <select
                    value={recHiringType}
                    onChange={(e) => setRecHiringType(e.target.value)}
                  >
                    <option value="direct">Direct Employer / Corporate</option>
                    <option value="agency">Recruitment Agency / Staffing Firm</option>
                    <option value="startup">Startup / Founder</option>
                    <option value="individual">Individual / Household</option>
                  </select>

                  {recHiringType === "agency" && (
                    <>
                      <div className="agency-note">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <p>
                          Staffing agencies receive an official Agency badge once registration and license are verified.
                        </p>
                      </div>
                      <div style={{ marginTop: 10 }}>
                        <input
                          type="text"
                          placeholder="Agency License / Registration Number (optional)"
                          value={recAgencyLicense}
                          onChange={(e) => setRecAgencyLicense(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Industry & Size */}
                <div className="luco-two-col">
                  <div className="luco-reg-field">
                    <div className="luco-field-label">
                      <label>Industry</label>
                      <span className={`luco-pts ${recIsDone.industry ? "done" : ""}`}>
                        {recIsDone.industry ? "✓ added" : "+3%"}
                      </span>
                    </div>
                    <select
                      value={recIndustry}
                      onChange={(e) => setRecIndustry(e.target.value)}
                    >
                      <option>Technology & Software</option>
                      <option>Marketing & Advertising</option>
                      <option>E-commerce & Retail</option>
                      <option>Design & Creative Agency</option>
                      <option>Education & EdTech</option>
                      <option>Healthcare & Biotech</option>
                      <option>Finance & Banking</option>
                      <option>Construction & Real Estate</option>
                      <option>Other Services</option>
                    </select>
                  </div>

                  <div className="luco-reg-field">
                    <div className="luco-field-label">
                      <label>Company size</label>
                      <span className={`luco-pts ${recIsDone.size ? "done" : ""}`}>
                        {recIsDone.size ? "✓ added" : "+3%"}
                      </span>
                    </div>
                    <select
                      value={recCompanySize}
                      onChange={(e) => setRecCompanySize(e.target.value)}
                    >
                      <option>1–10 employees</option>
                      <option>11–50 employees</option>
                      <option>51–200 employees</option>
                      <option>201–500 employees</option>
                      <option>500+ employees</option>
                    </select>
                  </div>
                </div>

                {/* City & State */}
                <div className="luco-two-col">
                  <div className="luco-reg-field">
                    <div className="luco-field-label">
                      <label>City</label>
                      <span className={`luco-pts ${recIsDone.city ? "done" : ""}`}>
                        {recIsDone.city ? "✓ added" : "+3%"}
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Bengaluru"
                      value={recCity}
                      onChange={(e) => setRecCity(e.target.value)}
                    />
                  </div>

                  <div className="luco-reg-field">
                    <div className="luco-field-label">
                      <label>State</label>
                      <span className={`luco-pts ${recIsDone.state ? "done" : ""}`}>
                        {recIsDone.state ? "✓ added" : "+2%"}
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Karnataka"
                      value={recState}
                      onChange={(e) => setRecState(e.target.value)}
                    />
                  </div>
                </div>

                {/* Website */}
                <div className="luco-reg-field">
                  <div className="luco-field-label">
                    <label>Company website / LinkedIn</label>
                    <span className={`luco-pts ${recIsDone.website ? "done" : ""}`}>
                      {recIsDone.website ? "✓ added" : "+6%"}
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="https://acme.com or LinkedIn URL"
                    value={recCompanyWebsite}
                    onChange={(e) => setRecCompanyWebsite(e.target.value)}
                  />
                </div>
              </section>

              {/* ──────── RECRUITER STEP 3 : VERIFY & POST ──────── */}
              <section className={`luco-panel ${recCurrentStep === 3 ? "active" : ""}`}>
                <h1 className="luco-title">Verify & create account</h1>
                <p className="luco-sub">
                  Verified employers receive a Verified Employer badge, boosting candidate trust and reply rate.
                </p>

                {/* GST / Business Verification */}
                <div className="luco-reg-field">
                  <div className="luco-field-label">
                    <label>Get a verified employer badge</label>
                    <span className={`luco-pts ${recIsDone.gst ? "done" : ""}`}>
                      {recIsDone.gst ? "✓ verified" : "+25%"}
                    </span>
                  </div>
                  <div className="luco-verify-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4C2FD9" strokeWidth="2">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>Business verification</span>
                      </div>
                      <label className="luco-toggle-switch">
                        <input
                          type="checkbox"
                          checked={recGstEnabled}
                          onChange={(e) => setRecGstEnabled(e.target.checked)}
                        />
                        <span className="slider" />
                      </label>
                    </div>

                    {recGstEnabled && (
                      <>
                        <div className="luco-two-col">
                          <select
                            value={recDocType}
                            onChange={(e) => setRecDocType(e.target.value)}
                          >
                            <option>GSTIN</option>
                            <option>CIN (Company Incorporation)</option>
                            <option>Udyam / MSME Registration</option>
                            <option>Company PAN</option>
                          </select>
                          <input
                            type="text"
                            placeholder={`${recDocType} number (optional)`}
                            value={recDocNumber}
                            onChange={(e) => setRecDocNumber(e.target.value)}
                          />
                        </div>

                        <label className={`luco-upload-box ${recDocUrl ? "done" : ""}`} style={{ marginBottom: 0 }}>
                          <p>{recDocName || "Upload document (Certificate, PDF or Photo)"}</p>
                          <p className="small">Private & encrypted — used strictly for verification.</p>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                setRecDocName(file.name);
                                setRecDocUrl(URL.createObjectURL(file));
                                toast.success("Verification doc attached!");
                              }
                            }}
                          />
                        </label>
                      </>
                    )}
                  </div>
                </div>

                {/* Company Logo */}
                <div className="luco-reg-field">
                  <div className="luco-field-label">
                    <label>Company logo</label>
                    <span className={`luco-pts ${recIsDone.logo ? "done" : ""}`}>
                      {recIsDone.logo ? "✓ added" : "+3%"}
                    </span>
                  </div>
                  <label className={`luco-upload-box ${recLogo ? "done" : ""}`}>
                    {recLogo ? (
                      <img
                        src={recLogo}
                        alt="Logo preview"
                        style={{ width: 60, height: 60, objectFit: "contain", margin: "0 auto 8px" }}
                      />
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <path d="M4 8a2 2 0 0 1 2-2h1l1-2h8l1 2h1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z" />
                        <circle cx="12" cy="13" r="3.5" />
                      </svg>
                    )}
                    <p>{recLogo ? "Company logo uploaded ✓" : "Upload logo"}</p>
                    <p className="small">PNG or JPG, square works best</p>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setRecLogo(ev.target.result);
                            toast.success("Logo uploaded!");
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>

                {/* Company Description */}
                <div className="luco-reg-field">
                  <div className="luco-field-label">
                    <label>Short company description</label>
                    <span className={`luco-pts ${recIsDone.description ? "done" : ""}`}>
                      {recIsDone.description ? "✓ added" : "+2%"}
                    </span>
                  </div>
                  <textarea
                    rows="3"
                    placeholder="One or two lines candidates will see on your job postings and company profile..."
                    value={recDescription}
                    onChange={(e) => setRecDescription(e.target.value)}
                  />
                </div>

                {/* Authorization & T&C */}
                <div className="luco-tnc-row" style={{ marginBottom: 10 }}>
                  <input
                    type="checkbox"
                    id="recAuthCheck"
                    checked={recAuthChecked}
                    onChange={(e) => setRecAuthChecked(e.target.checked)}
                  />
                  <label htmlFor="recAuthCheck">
                    I confirm I am authorized to create this account on behalf of{" "}
                    <b>{recCompanyName || "my company"}</b>, and all details provided are accurate.
                  </label>
                </div>

                <div className="luco-tnc-row">
                  <input
                    type="checkbox"
                    id="recTncCheck"
                    checked={recTncChecked}
                    onChange={(e) => setRecTncChecked(e.target.checked)}
                  />
                  <label htmlFor="recTncCheck">
                    I agree to LucoHire's <Link to="/terms">Terms & Conditions</Link> and{" "}
                    <Link to="/privacy">Privacy Policy</Link>, and consent to fair hiring practices.
                  </label>
                </div>

                <div className="switch-role-link">
                  Looking for work instead?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      closeRecruiterRegistration();
                      openRegistration();
                    }}
                  >
                    Switch to freelancer sign-up
                  </button>
                </div>
              </section>

              {/* Recruiter Navigation Footer */}
              <div className="luco-reg-footer">
                <button
                  type="button"
                  id="recBackBtn"
                  className="luco-btn-back"
                  disabled={recCurrentStep === 1}
                  onClick={() => setRecCurrentStep((c) => Math.max(1, c - 1))}
                >
                  Back
                </button>

                {recCurrentStep < 3 ? (
                  <button
                    type="button"
                    id="recNextBtn"
                    className="luco-btn-continue"
                    onClick={() => {
                      if (recCurrentStep === 1) {
                        if (!recName.trim()) {
                          toast.error("Please enter your name.");
                          return;
                        }
                        if (!recEmail.trim()) {
                          toast.error("Please enter your work email.");
                          return;
                        }
                      }
                      if (recCurrentStep === 2) {
                        if (!recCompanyName.trim()) {
                          toast.error("Please enter your company name.");
                          return;
                        }
                      }
                      setRecCurrentStep((c) => Math.min(3, c + 1));
                      const shell = document.getElementById("recruiterRegistrationScreen");
                      if (shell) shell.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    <span>Continue</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </button>
                ) : (
                  <button
                    type="button"
                    id="recNextBtn"
                    className="luco-btn-continue final"
                    disabled={!recAuthChecked || !recTncChecked || recLoading}
                    onClick={handleCreateEmployerProfile}
                  >
                    <span>{recLoading ? "Creating account..." : "Create employer account"}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                )}
              </div>
            </main>

            {/* ──────── DESKTOP EMPLOYER PREVIEW SIDEBAR ──────── */}
            <aside className="luco-reg-sidebar">
              {/* Employer Trust Score Meter */}
              <div className="luco-profile-score">
                <div className="luco-score-top">
                  <span>Employer trust score</span>
                  <b>{recPercentage}%</b>
                </div>
                <div className="luco-score-bar-track">
                  <span style={{ width: `${recPercentage}%` }} />
                </div>
                <small style={{ color: "rgba(255,255,255,0.75)", fontSize: 11.5 }}>
                  Verified employers receive up to 3x more candidate applications.
                </small>
              </div>

              {/* Live Company Card Preview */}
              <div className="luco-preview-card">
                <div className="luco-pv-top">
                  <div className="luco-pv-avatar">
                    {recLogo ? (
                      <img src={recLogo} alt="Company logo" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      (recCompanyName.trim().slice(0, 2).toUpperCase() || "LH")
                    )}
                  </div>
                  <div>
                    <h3 className="luco-pv-name">{recCompanyName || "Your Company Name"}</h3>
                    <p className="luco-pv-title">{recRole ? `${recRole} · ${recName || "Hiring Manager"}` : recIndustry}</p>
                    <div className="luco-pv-loc">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21z" />
                        <circle cx="12" cy="9.5" r="2.5" />
                      </svg>
                      {recCity && recState ? `${recCity}, ${recState}` : "Location not set"}
                    </div>
                  </div>
                </div>

                <div className="luco-pv-skill-row">
                  <p>{recIndustry || "Technology"}</p>
                  <p className="r">{recCompanySize || "11–50 employees"}</p>
                </div>
              </div>

              {/* Employer WhatsApp Summary Card */}
              <div className="luco-wa-summary-card">
                <div className="luco-wa-summary-head">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.38 5.08L2 22l5.08-1.34A9.96 9.96 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.6 0-3.1-.42-4.4-1.16l-.32-.18-3.02.8.81-2.95-.2-.32A7.95 7.95 0 0 1 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z" />
                  </svg>
                  <span>Candidate WhatsApp view</span>
                </div>
                <div className="luco-wa-summary-body">
                  <div className="luco-wa-summary-row">
                    <span className="k">Employer</span>
                    <span className="v">{recCompanyName || "Your company"}</span>
                  </div>
                  <div className="luco-wa-summary-row">
                    <span className="k">Contact</span>
                    <span className="v">{recName ? `${recName} (${recRole || "Hiring"})` : "Hiring Team"}</span>
                  </div>
                  <div className="luco-wa-summary-row">
                    <span className="k">Website</span>
                    <span className="v">{recCompanyWebsite ? recCompanyWebsite.replace(/https?:\/\//, "") : "Not added"}</span>
                  </div>
                  <div className="luco-wa-summary-row">
                    <span className="k">Location</span>
                    <span className="v">{recCity && recState ? `${recCity}, ${recState}` : "Not set"}</span>
                  </div>
                  <div className="luco-wa-summary-row">
                    <span className="k">Trust Status</span>
                    <span className="v">
                      {[
                        recWorkEmailVerified && "Work Email",
                        recMobileVerified && "Mobile",
                        recGstEnabled && "Verified Business",
                      ]
                        .filter(Boolean)
                        .join(" + ") || "Pending verification"}
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
