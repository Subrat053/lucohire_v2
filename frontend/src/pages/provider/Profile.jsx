import useTranslation from "../../hooks/useTranslation";
import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { authAPI, providerAPI, aiAPI, profileShareAPI, userAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import RouteLoader from "../../components/common/RouteLoader";
import toast from "react-hot-toast";
import { toAbsoluteMediaUrl } from "../../utils/media";
import { safeReturnPath } from "../../utils/navigation";
import { cacheBustedUrl } from "../../utils/cacheBuster";
import { sanitizePayload } from "../../utils/sanitizePayload";
import useSubmitLock from "../../hooks/useSubmitLock";
import LocationSearch from "../../components/LocationSearch";
import DocumentVerificationStatusCard from "../../components/provider/DocumentVerificationStatusCard";
import AIProfileAssistant from "../../components/provider/AIProfileAssistant";
import AIProfileAutoFillModal from "../../components/provider/AIProfileAutoFillModal";
import ProviderAIChat from "../../components/provider/ProviderAIChat";
import { getAiUsage, uploadResume as uploadResumeAI } from "../../services/providerAIService";
import PortfolioLinksManager from "../../components/common/PortfolioLinksManager";
import { compressImage } from "../../utils/fileCompressionService";
import { validateUploadFile } from "../../utils/fileValidationService";
import SkillSearchSelect from "../../components/common/SkillSearchSelect";
import SmartMultiSelect from "../../components/common/SmartMultiSelect";
import CreatableAutocomplete from "../../components/common/CreatableAutocomplete";
import CountryPhoneInput, { parsePhoneString } from "../../components/common/CountryPhoneInput";
import OtpVerificationModal from "../../components/otp/OtpVerificationModal";
import ClientResumeGenerator from "../../components/provider/ClientResumeGenerator";
import SkillGapReportModal from "../../components/provider/SkillGapReportModal";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "../../config/firebase";
import AdvancedResumeGenerator from "../../components/resume-builder/AdvancedResumeGenerator";
import SkillAutocomplete from "../../components/common/SkillAutocomplete";
import PlatformAutocomplete from "../../components/common/PlatformAutocomplete";
import {
  User as UserIcon,
  Phone as PhoneIcon,
  Sparkles,
  MapPin,
  Globe,
  Calendar,
  Award,
  ShieldCheck,
  Link2,
  Eye,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Info,
  ShieldAlert,
  Plus,
  X,
  UploadCloud,
  Trash2,
  Camera,
  FileText,
  Share2,
  Compass,
  RefreshCw,
  Search,
  Shield,
  CheckCircle,
  ChevronDown,
  Check,
  Briefcase,
  Book,
  Zap,
  Star,
  Mail,
  EyeOff,
  MessageCircle,
  ExternalLink,
} from "lucide-react";

// ─── constants ───────────────────────────────────────────────────────────────
const INDIAN_CITIES = [
  "Delhi",
  "Mumbai",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Ahmedabad",
  "Jaipur",
  "Lucknow",
  "Noida",
  "Gurgaon",
  "Delhi NCR",
  "Surat",
  "Bhopal",
  "Indore",
  "Nagpur",
  "Patna",
  "Chandigarh",
  "Coimbatore",
];
export const ALL_SKILLS = [
  "Electrician",
  "Plumber",
  "Carpenter",
  "Painter",
  "Driver",
  "Cook",
  "Welder",
  "Mason",
  "AC Technician",
  "CCTV Installer",
  "Tiler",
  "Interior Designer",
  "UI/UX Designer",
  "Graphic Designer",
  "Web Developer",
  "Mobile Developer",
  "Content Writer",
  "Digital Marketer",
  "Accountant",
  "Data Entry Operator",
  "Receptionist",
  "Security Guard",
  "Housekeeping",
  "Nurse",
  "Caretaker",
  "Tailor",
  "Beautician",
  "Yoga Trainer",
  "Tutor",
];

const TIER_SKILL_ALLOWLIST = {
  unskilled: new Set([
    "labour",
    "helper plumber",
    "helper electrician",
    "construction helper",
    "cleaning helper",
    "painter helper",
    "carpenter helper",
    "loader",
    "delivery helper",
    "kitchen helper",
  ]),
  "semi-skilled": new Set([
    "plumber",
    "ac mechanic",
    "ac technician",
    "electrician",
    "carpenter",
    "painter",
    "mason",
    "driver",
    "cook",
    "tailor",
    "machine operator",
    "technician",
  ]),
  skilled: new Set([
    "web developer",
    "app developer",
    "digital marketer",
    "seo expert",
    "graphic designer",
    "video editor",
    "content writer",
    "ai developer",
    "cyber security expert",
    "senior electrician",
    "interior designer",
    "project manager",
    "consultant",
  ]),
};

function isSkillAllowedForTier(skill, tier) {
  const normalizedSkill = String(skill || "")
    .trim()
    .toLowerCase();
  const normalizedTier = String(tier || "unskilled")
    .trim()
    .toLowerCase();
  if (!normalizedSkill) return false;
  const allowed = TIER_SKILL_ALLOWLIST[normalizedTier];
  if (!allowed) return true;
  return allowed.has(normalizedSkill);
}
export const ALL_LANGUAGES = [
  "Afrikaans",
  "Albanian",
  "Amharic",
  "Arabic",
  "Armenian",
  "Assamese",
  "Azerbaijani",
  "Bengali",
  "Bhojpuri",
  "Bosnian",
  "Bulgarian",
  "Burmese",
  "Cantonese",
  "Catalan",
  "Cebuano",
  "Chinese (Mandarin)",
  "Croatian",
  "Czech",
  "Danish",
  "Dutch",
  "English",
  "Esperanto",
  "Estonian",
  "Farsi (Persian)",
  "Finnish",
  "French",
  "Galician",
  "Georgian",
  "German",
  "Greek",
  "Gujarati",
  "Hausa",
  "Hebrew",
  "Hindi",
  "Hungarian",
  "Icelandic",
  "Igbo",
  "Indonesian",
  "Irish",
  "Italian",
  "Japanese",
  "Javanese",
  "Kannada",
  "Kazakh",
  "Khmer",
  "Korean",
  "Kurdish",
  "Lao",
  "Latin",
  "Latvian",
  "Lithuanian",
  "Macedonian",
  "Maithili",
  "Malay",
  "Malayalam",
  "Marathi",
  "Mongolian",
  "Nepali",
  "Norwegian",
  "Odia",
  "Pashto",
  "Polish",
  "Portuguese",
  "Punjabi",
  "Romanian",
  "Russian",
  "Sanskrit",
  "Serbian",
  "Sindhi",
  "Sinhala",
  "Slovak",
  "Slovenian",
  "Somali",
  "Spanish",
  "Swahili",
  "Swedish",
  "Tagalog (Filipino)",
  "Tajik",
  "Tamil",
  "Telugu",
  "Thai",
  "Tibetan",
  "Turkish",
  "Ukrainian",
  "Urdu",
  "Uzbek",
  "Vietnamese",
  "Welsh",
  "Yoruba",
  "Zulu",
];

const OCR_TEST_OPTIONS = [
  { value: "document", label: "Document OCR" },
  { value: "text", label: "Text OCR" },
];

function inferExperienceMonths(value) {
  const text = String(value || "")
    .toLowerCase()
    .trim();
  if (!text) return 0;

  let total = 0;
  const yearMatch = text.match(/(\d+)\s*(year|years|saal|sal)/i);
  const monthMatch = text.match(/(\d+)\s*(month|months|mahina|mahine)/i);

  if (yearMatch) total += Number(yearMatch[1]) * 12;
  if (monthMatch) total += Number(monthMatch[1]);

  if (!total) {
    const maybeNumber = Number.parseInt(text, 10);
    if (Number.isFinite(maybeNumber)) {
      total = maybeNumber >= 12 ? maybeNumber : maybeNumber * 12;
    }
  }

  return Number.isFinite(total) ? total : 0;
}

// ─── Chip ────────────────────────────────────────────────────────────────────
const Chip = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 text-sm px-3 py-1 rounded-full shadow-sm">
    {label}
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        className="text-gray-400 hover:text-red-700 transition leading-none text-base"
      >
        ×
      </button>
    )}
  </span>
);

// ─── TagPicker ───────────────────────────────────────────────────────────────
const TagPicker = ({ available, selected, onAdd, onRemove, placeholder }) => {
  const {
    t
  } = useTranslation();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const filtered = available
    .filter((s) => !selected.includes(s))
    .filter((s) => s.toLowerCase().includes(query.toLowerCase()));

  const addCustom = () => {
    const val = query.trim();
    if (val && !selected.includes(val)) {
      onAdd(val);
      setQuery("");
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <div className="flex flex-wrap gap-2 mb-3">
        {selected.map((s) => (
          <Chip key={s} label={s} onRemove={() => onRemove(s)} />
        ))}
      </div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full border border-blue-300 text-blue-600 bg-white text-sm font-medium hover:bg-blue-50 transition"
      >{t("+ Add")}{placeholder}
      </button>
      {open && (
        <div className="relative z-10 mt-1 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-2 border-b">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && (e.preventDefault(), addCustom())
              }
              placeholder={`Search or type ${placeholder}...`}
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <ul className="max-h-48 overflow-y-auto divide-y divide-gray-50">
            {query.trim() &&
              !selected.includes(query.trim()) &&
              !filtered.some(
                (f) => f.toLowerCase() === query.trim().toLowerCase(),
              ) && (
                <li
                  onClick={addCustom}
                  className="px-4 py-2.5 text-sm text-blue-600 cursor-pointer hover:bg-blue-50 border-b"
                >{t("Add “")}{query.trim()}&rdquo;
                </li>
              )}
            {filtered.map((s) => (
              <li
                key={s}
                onClick={() => {
                  onAdd(s);
                  setQuery("");
                  setOpen(false);
                }}
                className="px-4 py-2.5 text-sm text-gray-700 cursor-pointer hover:bg-blue-50"
              >
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// ─── ProviderProfile ─────────────────────────────────────────────────────────
export const PROFILE_TABS = ["Personal", "Details", "Education & Credentials", "Portfolio", "Resume", "Generate Resume", "Preferences"];

const ProviderProfile = () => {
  const {
    t
  } = useTranslation();

  const { user, fetchUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const hasInitialized = useRef(false);

  // Submit lock to prevent duplicate save/upload submissions
  const { isSubmitting: isSaving, withLock: withSaveLock } = useSubmitLock();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [plan, setPlan] = useState("free");
  const [activeTab, setActiveTab] = useState("Personal");
  const [pendingTab, setPendingTab] = useState(null);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [showNewUserWarning, setShowNewUserWarning] = useState(location.state?.isNewUser || false);

  useEffect(() => {
    if (showNewUserWarning) {
      const timer = setTimeout(() => {
        setShowNewUserWarning(false);
      }, 25000);
      return () => clearTimeout(timer);
    }
  }, [showNewUserWarning]);

  const [profileData, setProfileData] = useState(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(null);
  const [completion, setCompletion] = useState(0);
  const [newLink, setNewLink] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [isSuggestingAI, setIsSuggestingAI] = useState(false);
  const [aiMeta, setAiMeta] = useState(null);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [pricingSuggestion, setPricingSuggestion] = useState(null);
  const [documentFile, setDocumentFile] = useState(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [documentVerification, setDocumentVerification] = useState(null);
  const [ocrTestType, setOcrTestType] = useState("document");
  const [ocrTesting, setOcrTesting] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [ocrError, setOcrError] = useState("");
  const [subscriptionSummary, setSubscriptionSummary] = useState(null);
  const [coverageRefreshLoading, setCoverageRefreshLoading] = useState(false);
  const [coverageUpgradeLoading, setCoverageUpgradeLoading] = useState(false);
  const [showResumeGenerator, setShowResumeGenerator] = useState(false);
  const [isSkillGapModalOpen, setIsSkillGapModalOpen] = useState(false);
  const [showErasureModal, setShowErasureModal] = useState(false);
  const [erasureConsent, setErasureConsent] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [aiUsageData, setAiUsageData] = useState({ limits: {}, usage: {} });
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const scrolledHashRef = useRef('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
    
    if (!loading && location.hash && scrolledHashRef.current !== location.hash) {
      setTimeout(() => {
        const el = document.getElementById(location.hash.substring(1));
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          scrolledHashRef.current = location.hash;
        }
      }, 500);
    }
  }, [location.search, location.hash, loading, activeTab]);

  const [form, setForm] = useState({
    designation: "",
    company: "",
    name: "",
    roles: [],
    skills: [],
    locations: [],
    city: "",
    state: "",
    tier: "unskilled",
    experience: "",
    languages: [],
    description: "",
    portfolioLinks: [],
    photo: "",
    whatsappAlerts: true,
    nearestLocation: "",
    latitude: null,
    longitude: null,
    pricing: "",
    pricingType: "",
    location: null,
    profileName: "",
    phone: "",          // full E.164 stored on User
    countryCode: "+91", // derived from phone for the picker
    nationalNumber: "", // national part without dial code
    whatsappNumber: "",
    isWhatsappSameAsMobile: true,
    whatsappCountryCode: "+91",
    whatsappNationalNumber: "",
    noticePeriod: "",
    previousExperience: [],
    education: [],
    projects: [],
    contactVisibility: "both",
    resumeUrl: "",
    pricingReason: "",
    email: "",
  });

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [parsedResumeData, setParsedResumeData] = useState(null);

  const confirmParsedData = () => {
    if (!parsedResumeData) return;
    const pd = parsedResumeData;
    setForm(prev => ({
      ...prev,
      resumeUrl: pd.resumeUrl || prev.resumeUrl,
      profileName: pd.fullName || prev.profileName,
      name: pd.fullName || prev.name,
      description: pd.bio || prev.description,
      skills: pd.skills?.length > 0 ? pd.skills : prev.skills,
      experience: pd.experienceYears || prev.experience,
      city: pd.city || prev.city,
      pricing: pd.pricing || prev.pricing,
      pricingType: pd.pricingType || prev.pricingType,
      pricingReason: pd.pricingReason || prev.pricingReason,
      languages: pd.languages?.length > 0 ? pd.languages : prev.languages,
      education: pd.education?.length > 0 ? pd.education : prev.education,
      previousExperience: pd.previousWork?.length > 0 ? pd.previousWork : prev.previousExperience,
      projects: pd.projects?.length > 0 ? pd.projects : prev.projects,
      email: pd.email || prev.email,
      portfolioLinks: [
        ...(prev.portfolioLinks || []),
        ...(pd.portfolioLinks || []),
        pd.linkedin,
        pd.github
      ].filter(Boolean)
    }));
    setParsedResumeData(null);
    setActiveTab("Personal");
    toast.success("Details auto-filled! Please review and click 'Save Profile'.");
  };
  const [firebaseToken, setFirebaseToken] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [verifyingPhone, setVerifyingPhone] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resendCountdown, setResendCountdown] = 
    useState(0);

  const [isEmailOtpModalOpen, setIsEmailOtpModalOpen] = useState(false);
  const [emailToVerify, setEmailToVerify] = useState("");

  useEffect(() => {
    if (resendCountdown === 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  const handleCancelOtp = () => {
    setIsOtpModalOpen(false);
    setEmailOtp("");
    setFirebaseToken("");
    setConfirmationResult(null);
  };

  const handleShareProfile = async () => {
    if (!user?._id) return;
    const toastId = toast.loading("Generating secure shareable link...");
    try {
      const { data } = await profileShareAPI.generateToken(user._id);
      if (data?.shareUrl) {
        await navigator.clipboard.writeText(data.shareUrl);
        setShareUrl(data.shareUrl);
        setIsShareModalOpen(true);
        toast.success("Shareable link copied to clipboard!", { id: toastId });
      } else {
        toast.error("Failed to generate link.", { id: toastId });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to generate link.", { id: toastId });
    }
  };

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        'profile-recaptcha-container',
        {
          size: 'invisible',
          callback: () => {},
          'expired-callback': () => {
            if (window.recaptchaVerifier) {
              window.recaptchaVerifier.clear();
              window.recaptchaVerifier = null;
            }
          },
        }
      );
    }
    return window.recaptchaVerifier;
  };

  const startFirebaseVerification = async (phoneToVerify) => {
    const cleanPhone = phoneToVerify.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      toast.error("Please enter a valid mobile number");
      return;
    }
    
    let formattedPhone = cleanPhone;
    if (cleanPhone.length === 10) {
      formattedPhone = `+91${cleanPhone}`;
    } else if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      formattedPhone = `+${cleanPhone}`;
    } else {
      formattedPhone = `+${cleanPhone}`;
    }

    try {
      setSendingOtp(true);
      setVerifyingPhone(formattedPhone);
      const verifier = setupRecaptcha();
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      setConfirmationResult(confirmation);
      setIsOtpModalOpen(true);
      toast.success("Verification code sent to your mobile");
    } catch (err) {
      console.error(err);
      
      // Clear recaptcha on error so a fresh one is generated next time
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          console.error("Error clearing recaptcha", e);
        }
        window.recaptchaVerifier = null;
        // Clean up the DOM node content just in case
        const container = document.getElementById('profile-recaptcha-container');
        if (container) container.innerHTML = '';
      }

      if (err.code === 'auth/invalid-app-credential') {
        toast.error("Verification failed (Invalid App Credential). Ensure your domain is authorized in Firebase Console -> Authentication -> Settings -> Authorized Domains.");
      } else if (err.code === 'auth/too-many-requests') {
        toast.error("Too many requests. Please try again later or use a test phone number.");
      } else {
        toast.error("Failed to send OTP. Please try again.");
      }
      setIsOtpModalOpen(false);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;
    const nextPhone = form.phone || (form.countryCode + form.nationalNumber);
    await startFirebaseVerification(nextPhone);
    setResendCountdown(60);
  };

  const handleAiAutoFillApply = (data) => {
    setForm((prev) => ({
      ...prev,
      ...data,
    }));
    toast.success(
      "Profile fields updated from AI! Please review and save your changes.",
    );
  };

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const isDirty = useMemo(() => {
    if (!profileData) return false;

    const areArraysEqual = (a, b) => {
      const arrA = Array.isArray(a) ? a : [];
      const arrB = Array.isArray(b) ? b : [];
      if (arrA.length !== arrB.length) return false;
      const sortedA = [...arrA].sort();
      const sortedB = [...arrB].sort();
      return sortedA.every((val, index) => val === sortedB[index]);
    };

    const arePortfolioLinksEqual = (a, b) => {
      const arrA = Array.isArray(a) ? a : [];
      const arrB = Array.isArray(b) ? b : [];
      if (arrA.length !== arrB.length) return false;

      const serializeLink = (l) => {
        if (!l) return "";
        if (typeof l === "string") return l.toLowerCase();
        return `${l.platform || ""}|${l.url || ""}`.toLowerCase();
      };

      const sortedA = arrA.map(serializeLink).sort();
      const sortedB = arrB.map(serializeLink).sort();
      return sortedA.every((val, index) => val === sortedB[index]);
    };

    let initialLocs = [];
    if (
      Array.isArray(profileData.serviceLocations) &&
      profileData.serviceLocations.length > 0
    ) {
      initialLocs = profileData.serviceLocations
        .map((l) => l.formattedAddress || l.name || String(l))
        .filter(Boolean);
    } else if (
      Array.isArray(profileData.locations) &&
      profileData.locations.length > 0
    ) {
      initialLocs = profileData.locations;
    } else {
      if (profileData.city) initialLocs.push(profileData.city);
      if (profileData.state && profileData.state !== profileData.city)
        initialLocs.push(profileData.state);
    }

    const displayPhoto = profileData.photo || profileData.profilePhoto || "";
    const initialPhoto = toAbsoluteMediaUrl(
      profileData.user?.profilePhotoApproval?.status === "pending" &&
        profileData.user?.profilePhotoApproval?.pendingUrl
        ? profileData.user.profilePhotoApproval.pendingUrl
        : displayPhoto,
    );

    return (
      form.name !== (profileData.user?.name || "") ||
      form.profileName !== (profileData.profileName || "") ||
      form.phone !== (profileData.user?.phone || "") ||
      form.tier !== (profileData.tier || "unskilled") ||
      form.experience !== (profileData.experience || "") ||
      form.description !== (profileData.description || "") ||
      String(form.pricing) !== String(profileData.pricing || "") ||
      form.pricingType !== (profileData.pricingType || "") ||
      form.pricingReason !== (profileData.pricingReason || "") ||
      form.whatsappAlerts !== (profileData.whatsappAlerts !== false) ||
      form.nearestLocation !== (profileData.nearestLocation || "") ||
      form.photo !== initialPhoto ||
      form.workMode !== (profileData.workMode || "") ||
      form.relocationAvailable !== (profileData.relocationAvailable || false) ||
      form.contactVisibility !== (profileData.contactVisibility || "both") ||
      form.noticePeriod !== (profileData.noticePeriod || "") ||
      JSON.stringify(form.jobType || []) !== JSON.stringify(profileData.jobType || []) ||
      JSON.stringify(form.roles || []) !== JSON.stringify(profileData.roles || []) ||
      JSON.stringify(form.previousExperience || []) !== JSON.stringify(profileData.previousExperience || []) ||
      JSON.stringify(form.education || []) !== JSON.stringify(profileData.education || []) ||
      JSON.stringify(form.projects || []) !== JSON.stringify(profileData.projects || []) ||
      !areArraysEqual(form.skills, profileData.skills || []) ||
      !areArraysEqual(
        form.locations
          .map((l) => l.formattedAddress || l.name || String(l))
          .filter(Boolean),
        initialLocs,
      ) ||
      !areArraysEqual(form.languages, profileData.languages || []) ||
      !arePortfolioLinksEqual(
        form.portfolioLinks,
        profileData.portfolioLinks || [],
      )
    );
  }, [form, profileData]);

  const handleTabChange = (newTab) => {
    if (activeTab === newTab) return;
    setActiveTab(newTab);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue =
          "You have unsaved changes on your profile. Are you sure you want to leave?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Setup global window overrides for sidebar interception
    window.lucodeProfileIsDirty = isDirty;
    window.lucodeProfileShowWarning = (pendingPath) => {
      setPendingTab(pendingPath);
      setShowUnsavedWarning(true);
    };

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.lucodeProfileIsDirty = false;
      window.lucodeProfileShowWarning = null;
    };
  }, [isDirty]);

  // Robust Back Button (popstate) block
  const isDirtyRef = useRef(isDirty);
  const lockedRef = useRef(false);

  useEffect(() => {
    isDirtyRef.current = isDirty;
    if (isDirty && !lockedRef.current) {
      window.history.pushState({ profileLocked: true }, '', window.location.href);
      lockedRef.current = true;
    } else if (!isDirty && lockedRef.current) {
      lockedRef.current = false;
      window.history.back(); // Pop the dummy state
    }
  }, [isDirty]);

  useEffect(() => {
    const handlePopState = (e) => {
      if (isDirtyRef.current && lockedRef.current) {
        // The user clicked back, popping the lock state. Show warning.
        setPendingTab('POP_STATE_BACK');
        setShowUnsavedWarning(true);
        // Push the lock state again to keep them trapped until they decide
        window.history.pushState({ profileLocked: true }, '', window.location.href);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (redirectCountdown === null) return;
    if (redirectCountdown === 0) {
      navigate("/provider/plans");
      return;
    }
    const timer = setTimeout(() => {
      setRedirectCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [redirectCountdown, navigate]);

  useEffect(() => {
    const shouldRefreshCoverage =
      location.state?.paymentSuccess || location.state?.refreshSubscription;
    if (!shouldRefreshCoverage) return;

    let isActive = true;

    const refreshCoverage = async () => {
      setCoverageRefreshLoading(true);
      try {
        await fetchProfile();
        if (typeof fetchUser === "function") {
          await fetchUser();
        }
        toast.success(
          "Plan upgraded successfully. Your service coverage has been expanded.",
        );
      } catch (error) {
        toast.error(
          "Subscription refreshed, but the latest limits could not be loaded yet.",
        );
      } finally {
        if (!isActive) return;
        setCoverageRefreshLoading(false);
        navigate(location.pathname, { replace: true, state: {} });
      }
    };

    refreshCoverage();

    return () => {
      isActive = false;
    };
  }, [fetchUser, location.pathname, location.state, navigate]);



  // Calculate max locations allowed by plan
  const maxLocations = (() => {
    return Math.max(
      1,
      Number(
        subscriptionSummary?.allowedPincodes ||
        profileData?.allowedPincodesCount ||
        1
      ),
      Number(
        subscriptionSummary?.allowedCities ||
        profileData?.allowedCitiesCount ||
        1
      )
    );
  })();

  const usedCoverageCount = Math.max(0, form.locations.length || 0);
  const allowedCoverageCount = Math.max(
    1,
    Number(
      subscriptionSummary?.allowedPincodes ||
        profileData?.allowedPincodesCount ||
        1,
    ),
    Number(
      subscriptionSummary?.allowedCities ||
        profileData?.allowedCitiesCount ||
        1,
    ),
  );
  const remainingCoverageCount = Math.max(
    0,
    allowedCoverageCount - usedCoverageCount,
  );
  const isCoverageLocked = usedCoverageCount >= allowedCoverageCount;
  const coveragePlanName =
    subscriptionSummary?.planName || 
    (profileData?.currentPlan === "provider-free-default" ? "Free" : profileData?.currentPlan) || 
    "Free";

  const handleCoverageUpgradeClick = () => {
    if (coverageUpgradeLoading || coverageRefreshLoading) return;

    const returnTo = safeReturnPath("/provider/profile");
    sessionStorage.setItem("paymentReturnTo", returnTo);
    sessionStorage.setItem("paymentReturnSource", "location-coverage-upgrade");
    setCoverageUpgradeLoading(true);

    navigate("/provider/plans", {
      state: {
        returnTo,
        source: "location-coverage-upgrade",
        reason: "coverage-limit-reached",
      },
    });
  };

  const fetchProfile = async () => {
    try {
      const { data } = await providerAPI.getProfile();
      const rawPlan = data.currentPlan || "free";
      setPlan(rawPlan === "provider-free-default" ? "free" : rawPlan);
      setProfileData(data);
      try {
        const subscriptionResponse = await providerAPI.getCurrentSubscription();
        setSubscriptionSummary(subscriptionResponse?.data || null);
      } catch (subscriptionError) {
        setSubscriptionSummary(null);
      }
      setCompletion(data.profileCompletion || 0);

      // Only set initial form state once to prevent browser back button or re-renders from overwriting dirty edits
      if (!hasInitialized.current) {
        let locs = [];
        if (
          Array.isArray(data.serviceLocations) &&
          data.serviceLocations.length > 0
        ) {
          locs = data.serviceLocations;
        } else {
          const sourceLocs =
            Array.isArray(data.locations) && data.locations.length > 0
              ? data.locations
              : [data.city, data.state].filter(Boolean);
          locs = sourceLocs.map((l) => ({
            placeId: "",
            name: typeof l === "string" ? l : l.name || "",
            formattedAddress:
              typeof l === "string" ? l : l.formattedAddress || "",
            isLegacy: true,
          }));
        }

        let displayPhoto = data.photo || data.profilePhoto || "";
        // If there's a pending photo, show that as preview
        if (
          data.user?.profilePhotoApproval?.status === "pending" &&
          data.user?.profilePhotoApproval?.pendingUrl
        ) {
          displayPhoto = data.user.profilePhotoApproval.pendingUrl;
        }

        const rawPhone = data.user?.phone || "";
        const parsedPhone = parsePhoneString(rawPhone);

        const rawWhatsapp = data.user?.whatsappNumber || "";
        const parsedWhatsapp = parsePhoneString(rawWhatsapp);

        const defaultForm = {
          name: data.user?.name || "",
          designation: data.designation || "",
          company: data.company || "",
          roles: data.roles || [],
          skills: data.skills || [],
          locations: locs,
          city: data.city || "",
          state: data.state || "",
          tier: data.tier || "unskilled",
          experience: data.experience || "",
          languages: data.languages || [],
          description: data.description || "",
          portfolioLinks: data.portfolioLinks || [],
          photo: toAbsoluteMediaUrl(displayPhoto),
          whatsappAlerts: data.whatsappAlerts !== false,
          nearestLocation: data.nearestLocation || "",
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null,
          pricing: data.pricing || "",
          pricingType: data.pricingType || "",
          location: data.location || null,
          profileName: data.profileName || "",
          phone: parsedPhone.fullPhone || rawPhone,
          countryCode: parsedPhone.countryCode || "+91",
          nationalNumber: parsedPhone.nationalNumber || "",
          whatsappNumber: parsedWhatsapp.fullPhone || rawWhatsapp,
          isWhatsappSameAsMobile: data.user?.isWhatsappSameAsMobile !== false,
          whatsappCountryCode: parsedWhatsapp.countryCode || "+91",
          whatsappNationalNumber: parsedWhatsapp.nationalNumber || "",
          noticePeriod: data.noticePeriod || "",
          previousExperience: data.previousExperience || [],
          education: data.education || [],
          projects: data.projects || [],
          contactVisibility: data.contactVisibility || "both",
          resumeUrl: data.resumeUrl || "",
          jobType: data.jobType || [],
          workMode: data.workMode || "",
          relocationAvailable: data.relocationAvailable || false,
          pricingReason: data.pricingReason || "",
          email: data.user?.email || "",
          isPublicProfile: Boolean(data.isPublicProfile ?? data.user?.isPublicProfile),
          whatsappConsent: Boolean(data.whatsappConsent ?? data.user?.whatsappConsent),
        };

        setForm(defaultForm);
        setAgreedToTerms(Boolean(data.user?.termsAccepted));

        if (displayPhoto) setPhotoPreview(toAbsoluteMediaUrl(displayPhoto));
        hasInitialized.current = true;
      }
    } catch (err) {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
    // Fetch AI usage limits/current usage silently (non-blocking)
    try {
      const usageRes = await getAiUsage();
      if (usageRes?.data?.success) {
        setAiUsageData({ limits: usageRes.data.limits || {}, usage: usageRes.data.usage || {} });
      }
    } catch (_) { /* ignore */ }
  };

  const addLocation = (loc) => {
    if (!loc) return;
    const normalizedName =
      typeof loc === "string"
        ? loc.trim()
        : (loc.formattedAddress || loc.name || "").trim();
    if (!normalizedName) return;

    // Build the geocoded location object
    const newLoc =
      typeof loc === "string"
        ? {
            placeId: "",
            name: normalizedName,
            formattedAddress: normalizedName,
            isLegacy: true,
          }
        : {
            placeId: loc.placeId || "",
            name: loc.name || "",
            formattedAddress: loc.formattedAddress || "",
            city: loc.city || "",
            state: loc.state || "",
            country: loc.country || "",
            lat: loc.lat ?? loc.latitude ?? null,
            lng: loc.lng ?? loc.longitude ?? null,
            source: loc.source || "google",
          };

    if (
      form.locations.some(
        (l) =>
          (newLoc.placeId && l.placeId === newLoc.placeId) ||
          l.formattedAddress === newLoc.formattedAddress,
      )
    ) {
      return; // Deduplicate
    }

    if (form.locations.length >= maxLocations) {
      toast.error(
        `Your plan allows max ${maxLocations} location${maxLocations > 1 ? "s" : ""}. Upgrade to add more.`
      );
      return;
    }

    setForm((prev) => {
      const updated = [...prev.locations, newLoc];
      return {
        ...prev,
        locations: updated,
        city: updated[0]?.city || updated[0]?.name || "",
        state: "",
      };
    });
  };

  const removeLocation = (loc) => {
    setForm((prev) => {
      const updated = prev.locations.filter(
        (l) =>
          (loc.placeId && l.placeId !== loc.placeId) ||
          (!loc.placeId && l.formattedAddress !== loc.formattedAddress),
      );
      return {
        ...prev,
        locations: updated,
        city: updated[0]?.city || updated[0]?.name || "",
        state: "",
      };
    });
  };

  const maxSkills = subscriptionSummary?.allowedSkills || profileData?.allowedSkillsCount || 1;

  const addSkill = (skill, skillTier) => {
    if (form.skills.length >= maxSkills) {
      setShowUpgradePrompt(true);
      toast.error(`Your plan allows max ${maxSkills} role${maxSkills > 1 ? "s" : ""}. Upgrade to add more.`);
      return;
    }
    const nextForm = { ...form, skills: [...form.skills, skill] };
    if (skillTier) {
      nextForm.tier = skillTier;
    }
    setForm(nextForm);
  };
  const removeSkill = (skill) => {
    const updated = form.skills.filter((s) => s !== skill);
    setForm({ ...form, skills: updated });
    if (updated.length <= maxSkills) {
      setShowUpgradePrompt(false);
    }
  };

  const toggleLanguage = (lang) => {
    const langs = form.languages.includes(lang)
      ? form.languages.filter((l) => l !== lang)
      : [...form.languages, lang];
    setForm({ ...form, languages: langs });
  };

  const handleTierChange = (nextTier) => {
    setForm((prev) => ({
      ...prev,
      tier: nextTier,
      skills: prev.skills.filter((skill) =>
        isSkillAllowedForTier(skill, nextTier),
      ),
    }));
    setAiSuggestion(null);
    setPricingSuggestion(null);
  };

  const handleSuggestAI = async () => {
    setIsSuggestingAI(true);
    try {
      const payload = {
        freeText: form.description || '',
        existingSkills: form.skills ? form.skills.map(s => typeof s === 'object' ? s.name : s) : [],
        existingLanguages: form.languages || [],
        portfolioLinks: form.portfolioLinks || []
      };
      const res = await providerAPI.aiSuggestProfile(payload);
      if (res.data && res.data.description) {
        setForm(prev => ({ ...prev, description: res.data.description }));
        toast.success("AI updated your description successfully!");
      } else {
        toast.error("AI couldn't generate a suggestion right now.");
      }
    } catch (err) {
      console.error("AI Suggest Error:", err);
      toast.error(err?.response?.data?.message || "Failed to generate AI suggestion");
    } finally {
      setIsSuggestingAI(false);
    }
  };

  const handleAISuggest = async () => {
    if (!aiInput.trim()) {
      toast.error("Enter a short profile intro for AI suggestions");
      return;
    }

    setAiLoading(true);
    try {
      const payload = {
        userId: user?._id,
        freeText: aiInput,
        skillLevel: form.tier,
        experience: form.experience,
        selectedSpecialities: form.skills,
        selectedLocations: form.locations,
        preferredLocation:
          form.location || form.locations?.[0] || form.city || "",
        payoutType: form.pricingType || "hourly",
        planContext: {
          skillLevel: form.tier,
          baseSpecialityPrice: Number(form.pricing || 0) || 0,
          demandMultiplier: form.city ? 1.1 : 1,
          locationMultiplier: 1,
        },
      };

      if (import.meta.env.DEV) {
        console.log("[AIProfileAssistant] request payload", payload);
      }

      const { data } = await providerAPI.providerBuilderSuggestion(payload);

      if (import.meta.env.DEV) {
        console.log("[AIProfileAssistant] response payload", data);
      }

      if (!data?.success || !data?.data) {
        throw new Error(data?.message || "Invalid AI response");
      }

      const profile = data.data;
      setAiSuggestion({ ...profile, aiInput });
      setAiMeta({
        headline: profile.title || "",
        category: profile.skillLevel || "",
        detectedLocation:
          profile.suggestedLocations?.[0]?.city ||
          profile.suggestedLocations?.[0]?.formattedAddress ||
          "",
        skills: profile.suggestedSpecialities?.map((item) => item.name) || [],
        suggestedPricingRange: profile.pricing
          ? `₹${profile.pricing.perHour} / ₹${profile.pricing.perDay} / ₹${profile.pricing.perMonth}`
          : "",
        experienceLabel: form.experience || "",
        missingFields: [],
        status: data.source || "ai",
      });
      toast.success("AI suggestion ready for preview");
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error("[AIProfileAssistant] error", err);
      }
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to generate AI suggestions",
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleAISuggestPricing = async () => {
    const activeSkill = form.skills?.[0];
    const activeCity =
      form.city || form.locations?.[0]?.city || form.locations?.[0]?.name;

    if (!activeSkill) {
      toast.error("Please select at least one Speciality first");
      return;
    }
    if (!activeCity) {
      toast.error("Please specify your Location or City first");
      return;
    }

    setAiLoading(true);
    try {
      const { data } = await providerAPI.getPricingSuggestion({
        skill: activeSkill,
        city: activeCity,
        skillLevel: form.tier,
        experience: form.experience,
      });

      if (data?.pricing) {
        setPricingSuggestion(data);
        toast.success("AI pricing suggestion ready for preview");
      } else {
        toast.error(
          "Could not determine suggested pricing. Please set manually.",
        );
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to suggest pricing",
      );
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiSuggestion = () => {
    if (!aiSuggestion) return;

    const suggestedSpecialities = Array.isArray(
      aiSuggestion.suggestedSpecialities,
    )
      ? aiSuggestion.suggestedSpecialities
      : [];
    const suggestedLocations = Array.isArray(aiSuggestion.suggestedLocations)
      ? aiSuggestion.suggestedLocations
      : [];
    const nextMode = aiSuggestion.mode === "append" ? "append" : "replace";

    const nextSkills =
      nextMode === "append"
        ? [
            ...new Set([
              ...form.skills,
              ...suggestedSpecialities.map((item) => item.name),
            ]),
          ]
        : suggestedSpecialities.map((item) => item.name);
    const nextLocations =
      nextMode === "append"
        ? [...form.locations, ...suggestedLocations]
        : suggestedLocations;

    const firstLocation = nextLocations[0] || null;
    const selectedPricingType = form.pricingType || "hourly";
    const pricingValue = aiSuggestion.pricing
      ? String(
          Math.round(
            Number(
              selectedPricingType === "daily"
                ? aiSuggestion.pricing.perDay
                : selectedPricingType === "monthly"
                  ? aiSuggestion.pricing.perMonth
                  : aiSuggestion.pricing.perHour,
            ) || 0,
          ),
        )
      : form.pricing;

    setForm((prev) => ({
      ...prev,
      skills: nextSkills.slice(
        0,
        maxSkills,
      ),
      locations: nextLocations.slice(
        0,
        maxLocations,
      ),
      city: firstLocation?.city || prev.city,
      state: firstLocation?.state || prev.state,
      nearestLocation:
        firstLocation?.formattedAddress ||
        firstLocation?.city ||
        prev.nearestLocation,
      latitude: firstLocation?.lat ?? prev.latitude,
      longitude: firstLocation?.lng ?? prev.longitude,
      pricing: pricingValue,
      pricingType: selectedPricingType,
      description: aiSuggestion.description || prev.description,
    }));

    setAiSuggestion(null);
    setPricingSuggestion(null);
    toast.success("AI suggestion applied to your profile");
  };

  const applyPricingSuggestion = () => {
    if (!pricingSuggestion?.pricing) return;

    const selectedType = form.pricingType || "hourly";
    const amount =
      selectedType === "daily"
        ? pricingSuggestion.pricing.perDay
        : selectedType === "monthly"
          ? pricingSuggestion.pricing.perMonth
          : pricingSuggestion.pricing.perHour;

    setForm((prev) => ({
      ...prev,
      pricing: String(Math.round(Number(amount) || 0)),
      pricingType: selectedType,
    }));
    setPricingSuggestion(null);
    toast.success("AI pricing suggestion applied");
  };

  const handleAISuggestVisibility = () => {
    toast.success(
      "Upgrade your visibility plan for premium placements and direct recruiter leads!",
    );
    const banner = document.getElementById("visibility-banner");
    if (banner) {
      banner.scrollIntoView({ behavior: "smooth", block: "center" });
      banner.classList.add("ring-4", "ring-violet-400", "scale-[1.02]");
      setTimeout(() => {
        banner.classList.remove("ring-4", "ring-violet-400", "scale-[1.02]");
      }, 1500);
    } else {
      navigate("/provider/plans");
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5 MB");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handlePhotoUpload = async () => {
    if (!photoFile) {
      fileInputRef.current?.click();
      return;
    }
    if (uploading) return; // Early guard — already uploading

    // Validate size & MIME type
    const validation = validateUploadFile(photoFile, { maxSizeMB: 5 });
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    setUploading(true);
    let finalFile = photoFile;
    const toastId = toast.loading("Optimizing image...");

    try {
      const compressionResult = await compressImage(photoFile, {
        maxSizeKB: 300,
      });
      if (compressionResult.optimized) {
        finalFile = compressionResult.compressedFile;
        const originalKB = (compressionResult.originalSize / 1024).toFixed(0);
        const compressedKB = (compressionResult.compressedSize / 1024).toFixed(
          0,
        );
        toast.success(
          `Image optimized! Size reduced from ${originalKB}KB to ${compressedKB}KB`,
          { id: toastId },
        );
      } else {
        toast.success("Uploading optimized image...", { id: toastId });
      }
    } catch (compressErr) {
      console.warn("Compression failed, uploading original:", compressErr);
      toast.error("Optimization skipped, uploading original...", {
        id: toastId,
      });
    }

    const fd = new FormData();
    fd.append("profilePhoto", finalFile);
    try {
      const { data } = await providerAPI.uploadProfilePhoto(fd);
      setPhotoFile(null);
      if (data?.url) {
        // Use cache-busted URL so browser doesn't serve stale cached photo
        const absoluteUrl = toAbsoluteMediaUrl(data.url);
        const freshUrl = cacheBustedUrl(absoluteUrl);
        setPhotoPreview(freshUrl);
        setForm((prev) => ({ ...prev, photo: absoluteUrl })); // store clean URL in form
      }
      await fetchUser();
      hasInitialized.current = false;
      await fetchProfile();
      toast.success("Profile photo updated successfully!");
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Photo upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    setPhotoPreview("");
    setPhotoFile(null);
    setForm((f) => ({ ...f, photo: "" }));
    try {
      await providerAPI.deleteProfilePhoto();
      await fetchUser();
      hasInitialized.current = false;
      await fetchProfile();
      toast.success("Photo removed");
    } catch {
      toast.error("Failed to remove photo from server");
    }
  };

  const handleEraseAccount = async () => {
    if (!erasureConsent) {
      toast.error("Please accept the terms to proceed with deletion.");
      return;
    }
    try {
      setIsErasing(true);
      const res = await userAPI.eraseAccount();
      if (res.data.success) {
        toast.success("Account permanently erased.");
        setTimeout(() => {
          window.location.href = "/";
        }, 1500);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to erase account");
      setIsErasing(false);
    }
  };

  const goToError = (tab, id, msg) => {
    if (activeTab !== tab) {
      setActiveTab(tab);
    }
    setTimeout(() => {
      const card = document.getElementById(id);
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        card.classList.add("ring-2", "ring-red-500", "animate-pulse");
        setTimeout(() => card.classList.remove("ring-2", "ring-red-500", "animate-pulse"), 3000);
      }
      toast(msg, { icon: "⚠️", duration: 8000 });
    }, 100);
  };

  const validateForm = () => {
    if (!form.city && form.locations.length === 0) {
      goToError("Personal", "basic-info-card", "Please add at least one service location / city (Location is mandatory)");
      return false;
    }
    if (form.skills.length === 0) {
      goToError("Personal", "role-skills-card", "Please select at least one speciality/skill (Speciality is mandatory)");
      return false;
    }
    if (!form.roles || form.roles.length === 0) {
      goToError("Personal", "role-skills-card", "Please select at least one job role (Job Role is mandatory)");
      return false;
    }
    const nationalDigits = String(form.nationalNumber || "").replace(/\D/g, "");
    if (!nationalDigits || nationalDigits.length < 7) {
      goToError("Personal", "basic-info-card", "Please enter a valid WhatsApp/Contact number (Contact number is mandatory)");
      return false;
    }
    if (form.isWhatsappSameAsMobile === false && form.whatsappNationalNumber) {
      const whatsappDigits = String(form.whatsappNationalNumber || "").replace(/\D/g, "");
      if (whatsappDigits.length < 7) {
        goToError("Personal", "basic-info-card", "Please enter a valid WhatsApp number.");
        return false;
      }
    }
    if (
      !form.tier ||
      !["unskilled", "semi-skilled", "skilled"].includes(form.tier)
    ) {
      goToError("Personal", "role-skills-card", "Please select a skill tier (Skill tier is mandatory)");
      return false;
    }
    if (String(plan).toLowerCase() === "free" && form.roles.length > 1) {
      goToError("Personal", "role-skills-card", "For free plan you can only use one role. Please upgrade your plan or remove extra roles.");
      return false;
    }
    return true;
  };

  const handleSave = withSaveLock(async (e, overrideToken = null, skipRedirect = false) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (!validateForm()) return;
    const nextPhone = form.phone || (form.countryCode + form.nationalNumber);
    const cleanNextPhone = String(nextPhone || "").replace(/\D/g, "");

    const finalToken = overrideToken || firebaseToken;

    setSaving(true);
    try {
      const cleanLocations = form.locations
        .map((l) => l.formattedAddress || l.name || String(l))
        .filter(Boolean);
      const cleanServiceLocations = form.locations.map((l) => ({
        placeId: l.placeId || l.googlePlaceId || "",
        googlePlaceId: l.googlePlaceId || l.placeId || "",
        inputText: l.inputText || l.formattedAddress || l.name || "",
        name: l.name || l.locality || "",
        formattedAddress: l.formattedAddress || "",
        city: l.city || "",
        state: l.state || "",
        country: l.country || "",
        locality: l.locality || l.name || l.city || "",
        postalCode: l.postalCode || "",
        lat: l.lat ?? null,
        lng: l.lng ?? null,
        viewport: l.viewport || null,
        source: l.source || "google",
      }));

      // Build payload and sanitize string fields only
      const rawPayload = {
        name: form.name,
        designation: form.designation,
        company: form.company,
        skills: form.skills,
        roles: form.roles,
        tier: form.tier,
        experience: form.experience,
        city: form.city,
        state: form.state,
        locations: cleanLocations,
        serviceLocations: cleanServiceLocations,
        languages: form.languages,
        description: form.description,
        portfolioLinks: form.portfolioLinks,
        whatsappAlerts: form.whatsappAlerts,
        nearestLocation: form.nearestLocation,
        latitude: form.latitude,
        longitude: form.longitude,
        pricing: form.pricing,
        pricingType: form.pricingType,
        profileName: form.profileName,
        phone: form.phone || (form.countryCode + form.nationalNumber),
        isWhatsappSameAsMobile: form.isWhatsappSameAsMobile !== false,
        noticePeriod: form.noticePeriod,
        previousExperience: form.previousExperience,
        education: form.education,
        contactVisibility: form.contactVisibility,
        email: form.email,
        jobType: form.jobType,
        workMode: form.workMode,
        relocationAvailable: form.relocationAvailable,
        whatsappNumber: form.isWhatsappSameAsMobile !== false ? undefined : (form.whatsappNumber || (form.whatsappCountryCode + form.whatsappNationalNumber)),
        resumeUrl: form.resumeUrl,
        projects: form.projects,
        isPublicProfile: form.isPublicProfile,
        whatsappConsent: form.whatsappConsent,
        termsAccepted: agreedToTerms,
        firebaseToken: finalToken || undefined,
      };
      // sanitizePayload only touches string fields, leaves arrays/numbers intact
      const payload = sanitizePayload(rawPayload);
      // Restore non-string array/object fields after sanitize
      payload.skills = rawPayload.skills;
      payload.roles = rawPayload.roles;
      payload.jobType = rawPayload.jobType;
      payload.previousExperience = rawPayload.previousExperience;
      payload.education = rawPayload.education;
      payload.languages = rawPayload.languages;
      payload.portfolioLinks = rawPayload.portfolioLinks;
      payload.projects = rawPayload.projects;
      payload.locations = rawPayload.locations;
      payload.serviceLocations = rawPayload.serviceLocations;
      payload.contactVisibility = rawPayload.contactVisibility;
      payload.isPublicProfile = rawPayload.isPublicProfile;
      payload.whatsappConsent = rawPayload.whatsappConsent;
      payload.termsAccepted = rawPayload.termsAccepted;

      const { data } = await providerAPI.updateProfile(payload);
      setCompletion(data.profileCompletion || completion);
      toast.success("Profile updated successfully!");
      setIsOtpModalOpen(false);
      setEmailOtp("");
      setFirebaseToken("");
      setConfirmationResult(null);
      hasInitialized.current = false;
      fetchProfile(); // Background fetch, don't block ui

      if (localStorage.getItem('lastResumeHash')) {
        // Refresh resume-toolkit data on next visit by setting a flag
        localStorage.setItem('resumeToolkitRefresh', Date.now().toString());
      }
      
      // Redirect to Explore Opportunities (Job matches) after saving
      if (!skipRedirect) {
        navigate('/provider/job-for-me');
      }
    } catch (err) {
      if (err.response?.data?.upgradeRequired) {
        toast.error(err.response.data.message);
      } else {
        toast.error(err.response?.data?.message || "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  });

  const handleDocumentUpload = async () => {
    if (!documentFile) {
      toast.error("Please choose a document first");
      return;
    }

    // Validate document file size and type constraints
    const validation = validateUploadFile(documentFile, { maxSizeMB: 5 });
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    setUploadingDocument(true);
    let finalFile = documentFile;
    const toastId = toast.loading("Uploading document...");

    // If the document is an image format, optimize it safely to target under 1MB
    if (documentFile.type?.startsWith("image/")) {
      try {
        toast.loading("Optimizing document image...", { id: toastId });
        const compressResult = await compressImage(documentFile, {
          maxSizeKB: 1000,
        });
        if (compressResult.optimized) {
          finalFile = compressResult.compressedFile;
        }
      } catch (err) {
        console.warn("Document image optimization skipped:", err);
      }
    }

    toast.loading("Uploading...", { id: toastId });

    const formData = new FormData();
    formData.append("document", finalFile);

    try {
      const { data } = await providerAPI.uploadDocument(formData);
      setDocumentVerification(data.verification || null);
      setDocumentFile(null);
      toast.success(
        "Document uploaded successfully. OCR verification started.",
        { id: toastId },
      );
      await fetchProfile();
    } catch (err) {
      const msg = err?.response?.data?.message || "Document upload failed";
      toast.error(msg, { id: toastId });
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleOcrTest = async () => {
    if (!documentFile) {
      toast.error("Please choose a document image first");
      return;
    }

    if (!documentFile.type?.startsWith("image/")) {
      toast.error("OCR test supports image files only (JPG/PNG/WEBP)");
      return;
    }

    const formData = new FormData();
    formData.append("image", documentFile);
    setOcrTesting(true);
    setOcrError("");
    setOcrResult(null);

    try {
      const response =
        ocrTestType === "text"
          ? await aiAPI.ocrText(formData)
          : await aiAPI.ocrDocument(formData);

      setOcrResult(response.data?.data || {});
      toast.success("OCR test completed");
    } catch (err) {
      const message = err?.response?.data?.message || "OCR test failed";
      setOcrError(message);
      toast.error(message);
    } finally {
      setOcrTesting(false);
    }
  };

  if (loading) return <RouteLoader />;

  const avatarSrc = photoPreview || form.photo;

  const handleSaveAndResubmit = async () => {
    await handleSave();
    await providerAPI.resubmitProfile();
    toast.success("Profile updated & resubmitted for admin verification!");
    hasInitialized.current = false;
    await fetchProfile();
  };

  return (
    <div className="min-h-screen bg-white py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <form onSubmit={handleSave}>
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-[28px] font-bold text-slate-800 tracking-tight">{t("Edit Profile")}</h1>
              <p className="text-sm text-slate-500 font-medium mt-1">{t("Keep your profile updated to get better job matches")}</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <button
                type="button"
                onClick={handleShareProfile}
                className="py-2.5 px-6 bg-white text-emerald-700 border border-emerald-600 rounded-lg text-sm font-bold hover:bg-emerald-50 transition flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />{t("Share Profile")}</button>
              <button
                type="submit"
                disabled={saving || ((form.isPublicProfile || form.whatsappConsent) && !agreedToTerms)}
                className="py-2.5 px-6 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-600 transition flex items-center justify-center gap-2"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          {/* Tab Navigation - Pill Style */}
          <div className="mb-8 overflow-x-auto hide-scrollbar pb-2 pt-1">
            <div className="flex gap-2.5 min-w-max">
              {PROFILE_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handleTabChange(tab)}
                  className={`py-2 px-6 text-[14.5px] transition-all duration-200 rounded-full border ${
                    activeTab === tab
                      ? "bg-linear-to-r from-emerald-600 to-emerald-500 text-white font-bold border-transparent shadow-md shadow-emerald-500/30 scale-[1.02]"
                      : "bg-white text-emerald-700 font-bold border-emerald-300 shadow-md hover:bg-emerald-50"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {showNewUserWarning && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg shadow-sm">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700 font-medium">
                    Please fill your required details to get accurate job recommendations.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Main Content */}
            <div className={`space-y-6 ${activeTab === "Generate Resume" ? "lg:col-span-12" : "lg:col-span-8"}`}>
              <DocumentVerificationStatusCard 
                verification={documentVerification} 
                profile={profileData}
                onRefresh={fetchProfile}
                onSaveAndResubmit={handleSaveAndResubmit}
                onTabChange={handleTabChange}
              />
              {activeTab === "Personal" && (
                <>
                  <div className="hidden md:block">
                  {/* Basic Information Card */}
                  <div id="basic-info-card" className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col gap-6 relative">
                    <h3 className="font-extrabold text-slate-800 text-lg tracking-tight">{t("Basic Information")}</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                      {/* Profile Photo Upload */}
                      <div className="md:col-span-4 flex flex-col">
                        <p className="text-xs font-semibold text-slate-500 mb-3">{t("Profile Photo")}</p>
                        <div className="w-32 h-32 rounded-full border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center relative mb-4 group cursor-pointer self-center md:self-start" onClick={() => fileInputRef.current?.click()}>
                          {avatarSrc ? (
                            <img
                              src={avatarSrc}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <UserIcon className="w-12 h-12 text-slate-300" />
                          )}
                          <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center backdrop-blur-[2px] transition">
                            <Camera className="w-6 h-6 text-white" />
                          </div>
                          {uploading && (
                            <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-sm">
                              <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin" />
                            </div>
                          )}
                          <div className="absolute bottom-0 right-2 bg-white text-emerald-600 rounded-full p-1.5 shadow border border-slate-200">
                            <Camera className="w-4 h-4" />
                          </div>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoChange}
                          className="hidden"
                        />
                        <div className="text-center md:text-left">
                          <p className="text-[11px] font-semibold text-slate-400">{t("JPG, PNG or WEBP")}</p>
                          <p className="text-[11px] font-semibold text-slate-400 mb-3">{t("Max size 2MB")}</p>
                          {photoFile && (
                            <button
                              type="button"
                              onClick={handlePhotoUpload}
                              disabled={uploading}
                              className="px-4 py-2 rounded-lg bg-[#047857] text-white text-[11px] font-bold hover:bg-emerald-800 transition"
                            >{t("Upload Photo")}</button>
                          )}
                        </div>
                      </div>

                      {/* Inputs Grid */}
                      <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-[13px] font-bold text-slate-700 mb-1.5">{t("Full Name")}</label>
                          <div className="relative">
                            <UserIcon className="absolute left-3 top-[11px] w-[18px] h-[18px] text-slate-400" />
                            <input
                              type="text"
                              value={form.name}
                              onChange={(e) => setForm({ ...form, name: e.target.value, profileName: e.target.value })}
                              placeholder={t("Ananya Sharma")}
                              className="w-full pl-10 pr-4 py-2.5 text-[13px] rounded-lg border border-slate-200 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-700 placeholder:text-slate-400"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[13px] font-bold text-slate-700 mb-1.5">{t("Headline")}</label>
                          <div className="relative">
                            <Briefcase className="absolute left-3 top-[11px] w-[18px] h-[18px] text-slate-400" />
                            <input
                              type="text"
                              value={form.skills?.[0] || ""}
                              onChange={(e) => {
                                const skill = e.target.value;
                                setForm(prev => ({ ...prev, skills: skill ? [skill] : [] }))
                              }}
                              placeholder={t("UI/UX Designer")}
                              className="w-full pl-10 pr-4 py-2.5 text-[13px] rounded-lg border border-slate-200 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-700 placeholder:text-slate-400"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[13px] font-bold text-slate-700 mb-1.5">{t("Email")}</label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-[11px] w-[18px] h-[18px] text-slate-400" />
                            <input
                              type="email"
                              value={form.email || ""}
                              onChange={(e) => setForm({ ...form, email: e.target.value })}
                              disabled={!!profileData?.user?.isEmailVerified}
                              placeholder={t("ananya.sharma@example.com")}
                              className={`w-full pl-10 pr-4 py-2.5 text-[13px] rounded-lg border border-slate-200 outline-none transition text-slate-700 placeholder:text-slate-400 ${
                                profileData?.user?.isEmailVerified ? "bg-slate-50 cursor-not-allowed text-slate-500" : "focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                              }`}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[13px] font-bold text-slate-700 mb-1.5">{t("Phone Number")}</label>
                          <div className="border border-slate-200 rounded-lg [&>div]:border-none [&_input]:text-[13px] focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
                             <CountryPhoneInput
                               variant="profile"
                               countryCode={form.countryCode || "+91"}
                               nationalNumber={form.nationalNumber || ""}
                               onChange={(phoneData) =>
                                 setForm((prev) => ({
                                   ...prev,
                                   countryCode: phoneData.countryCode,
                                   nationalNumber: phoneData.nationalNumber,
                                   phone: phoneData.fullPhone,
                                 }))
                               }
                             />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[13px] font-bold text-slate-700 mb-1.5">{t("Current Location")}</label>
                          <div className="relative border border-slate-200 rounded-lg focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
                            <div className="w-full [&_input]:border-none [&_input]:text-[13px]">
                              <LocationSearch
                                 iconClassName="text-slate-400 w-[18px] h-[18px]"
                                 value={form.city}
                                 onChange={(value) => setForm(prev => ({ ...prev, city: value }))}
                                 onSelect={(item) => {
                                   if(item) setForm(prev => ({ ...prev, city: item.city || item.name || "" }));
                                 }}
                                 placeholder={t("Bengaluru, Karnataka, India")}
                              />
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[13px] font-bold text-slate-700 mb-1.5">{t("LinkedIn Profile (Optional)")}</label>
                          <div className="relative">
                            <Link2 className="absolute left-3 top-[11px] w-[18px] h-[18px] text-slate-400" />
                            <input
                              type="text"
                              value={form.portfolioLinks?.[0]?.url || ""}
                              onChange={(e) => setForm({ ...form, portfolioLinks: e.target.value ? [{ platform: 'LinkedIn', url: e.target.value }] : [] })}
                              placeholder={t("linkedin.com/in/ananyasharma")}
                              className="w-full pl-10 pr-4 py-2.5 text-[13px] rounded-lg border border-slate-200 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-700 placeholder:text-slate-400"
                            />
                          </div>
                        </div>
                        {profileData?.whatsappFreelancePlanActive && (
                          <div>
                            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">{t("Hourly Rate (₹)")}</label>
                            <div className="relative">
                              <span className="absolute left-3 top-[11px] font-bold text-slate-400 text-[13px]">₹</span>
                              <input
                                type="text"
                                value={form.pricing || ""}
                                onChange={(e) => setForm({ ...form, pricing: e.target.value, pricingType: 'hourly' })}
                                placeholder={t("500")}
                                className="w-full pl-7 pr-4 py-2.5 text-[13px] rounded-lg border border-slate-200 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-700 placeholder:text-slate-400"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* About Yourself */}
                    <div id="summary" className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col h-[280px]">
                       <div className="flex items-center gap-2 mb-2">
                         <UserIcon className="w-5 h-5 text-emerald-600" />
                         <h3 className="font-extrabold text-slate-800 text-base tracking-tight">{t("Professional Summary")}</h3>
                       </div>
                       <p className="text-[13px] text-slate-500 mb-4">{t("Write a short summary about yourself")}</p>
                       
                       <div className="relative flex-1 flex flex-col border border-slate-200 rounded-lg p-1 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all bg-white overflow-hidden">
                         <textarea
                           value={form.description}
                           onChange={(e) => setForm({ ...form, description: e.target.value })}
                           placeholder={t(
                             "Passionate UI/UX Designer with 3+ years of experience creating intuitive, user-centered digital experiences. Skilled in user research, wireframing, prototyping and visual design. I love solving complex problems and crafting beautiful, functional products."
                           )}
                           className="w-full h-full px-3 py-2 text-[13px] outline-none resize-none font-medium text-slate-700 bg-transparent scrollbar-thin"
                         />
                         <div className="flex items-center justify-between p-2 pt-0 mt-auto bg-white border-t border-transparent">
                           <span className="text-[11px] text-slate-400 font-medium">
                             {form.description?.length || 0}{t("/ 600 characters")}</span>
                           <button 
                             type="button" 
                             onClick={handleSuggestAI} 
                             disabled={isSuggestingAI}
                             className="text-emerald-700 text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition disabled:opacity-50">
                             {isSuggestingAI ? (
                               <span className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                             ) : (
                               <Sparkles className="w-3.5 h-3.5" />
                             )}
                             {isSuggestingAI ? 'Generating...' : 'Suggest with AI'}
                           </button>
                         </div>
                       </div>
                    </div>

                    {/* Current Job Details */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col h-[280px]">
                       <div className="flex items-center gap-2 mb-6">
                         <Briefcase className="w-5 h-5 text-emerald-600" />
                         <h3 className="font-extrabold text-slate-800 text-base tracking-tight">{t("Current Job Details")}</h3>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-x-4 gap-y-5 flex-1">
                          <div className="col-span-2 sm:col-span-1">
                            <label className="block text-[12px] font-bold text-slate-600 mb-1.5">{t("Current Designation")}</label>
                            <input
                              type="text"
                              value={form.designation}
                              onChange={(e) => setForm({ ...form, designation: e.target.value })}
                              placeholder={t("e.g. UI/UX Designer")}
                              className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-200 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-700 font-medium placeholder:text-slate-400"
                            />
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <label className="block text-[12px] font-bold text-slate-600 mb-1.5">{t("Company (Optional)")}</label>
                            <input
                              type="text"
                              value={form.company}
                              onChange={(e) => setForm({ ...form, company: e.target.value })}
                              placeholder={t("ABC Design Studio")}
                              className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-200 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-700 font-medium placeholder:text-slate-400"
                            />
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <label className="block text-[12px] font-bold text-slate-600 mb-1.5">{t("Experience (Years)")}</label>
                            <CreatableAutocomplete 
                             value={form.experience || ''} 
                             onChange={(val) => {
                               setForm({ ...form, experience: val });
                             }}
                             onBlur={(val) => {
                               if (val === '0' || val.toLowerCase() === 'fresher') {
                                 setForm({ ...form, experience: 'Fresher' });
                               } else if (!isNaN(val) && val.trim() !== '') {
                                 setForm({ ...form, experience: val === '1' ? '1 Year' : `${val} Years` });
                               }
                             }}
                             options={["Fresher", "1 Year", "2 Years", "3 Years", "4 Years", "5 Years", "6 Years", "7 Years", "8 Years", "9 Years", "10+ Years"]}
                             placeholder={t("e.g. 2.5 Years or select Fresher")}
                           />
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <label className="block text-[12px] font-bold text-slate-600 mb-1.5">{t("Notice Period (Days)")}</label>
                            <CreatableAutocomplete 
                              value={form.noticePeriod || ''} 
                              onChange={(val) => {
                                setForm({ ...form, noticePeriod: val });
                              }}
                              onBlur={(val) => {
                                if (val === '0' || val.toLowerCase() === 'immediate') {
                                  setForm({ ...form, noticePeriod: 'Immediate' });
                                } else if (!isNaN(val) && val.trim() !== '') {
                                  setForm({ ...form, noticePeriod: `${val} Days` });
                                }
                              }}
                              options={["Immediate", "15 Days", "30 Days", "45 Days", "60 Days", "90 Days"]}
                              placeholder={t("e.g. 15 Days or select Immediate")}
                            />
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-10">
                    <div className="flex items-center gap-2 mb-2">
                      <PhoneIcon className="w-5 h-5 text-emerald-600" />
                      <h3 className="font-extrabold text-slate-800 text-base tracking-tight">{t("Contact Information")}</h3>
                    </div>
                    <p className="text-[13px] text-slate-500 mb-5">{t("Manage how recruiters can contact you")}</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      {/* Option 1 */}
                      <div className={`relative border rounded-[14px] p-4 cursor-pointer hover:shadow-sm transition-all h-[100px] flex flex-col justify-center ${form.contactVisibility === "both" ? "border-2 border-emerald-500 bg-emerald-50/20" : "border-slate-200 bg-white hover:border-emerald-300"}`} onClick={() => setForm({ ...form, contactVisibility: "both" })}>
                        {form.contactVisibility === "both" && (
                          <div className="absolute -top-2 -right-2 bg-emerald-500 rounded-full text-white p-0.5 shadow-sm">
                             <CheckCircle className="w-4 h-4" />
                          </div>
                        )}
                        <div className={`flex items-center gap-2 mb-1.5 ${form.contactVisibility === "both" ? "text-emerald-800" : "text-slate-700"}`}>
                           <ShieldCheck className={`w-[18px] h-[18px] ${form.contactVisibility === "both" ? "" : "text-slate-400"}`} />
                           <span className="font-bold text-[13px]">{t("Show Phone & Email")}</span>
                        </div>
                        <p className={`text-[11px] font-medium leading-tight pr-2 ${form.contactVisibility === "both" ? "text-emerald-700/80" : "text-slate-500"}`}>{t("Recruiters can see your phone & email")}</p>
                      </div>
                      
                      {/* Option 2 */}
                      <div className={`relative border rounded-[14px] p-4 cursor-pointer hover:shadow-sm transition-all h-[100px] flex flex-col justify-center ${form.contactVisibility === "email_only" ? "border-2 border-emerald-500 bg-emerald-50/20" : "border-slate-200 bg-white hover:border-emerald-300"}`} onClick={() => setForm({ ...form, contactVisibility: "email_only" })}>
                        {form.contactVisibility === "email_only" && (
                          <div className="absolute -top-2 -right-2 bg-emerald-500 rounded-full text-white p-0.5 shadow-sm">
                             <CheckCircle className="w-4 h-4" />
                          </div>
                        )}
                        <div className={`flex items-center gap-2 mb-1.5 ${form.contactVisibility === "email_only" ? "text-emerald-800" : "text-slate-700"}`}>
                           <Mail className={`w-[18px] h-[18px] ${form.contactVisibility === "email_only" ? "" : "text-slate-400"}`} />
                           <span className="font-bold text-[13px]">{t("Show Email Only")}</span>
                        </div>
                        <p className={`text-[11px] font-medium leading-tight pr-2 ${form.contactVisibility === "email_only" ? "text-emerald-700/80" : "text-slate-500"}`}>{t("Recruiters can see your email only")}</p>
                      </div>

                      {/* Option 3 */}
                      <div className={`relative border rounded-[14px] p-4 cursor-pointer hover:shadow-sm transition-all h-[100px] flex flex-col justify-center ${form.contactVisibility === "phone_only" ? "border-2 border-emerald-500 bg-emerald-50/20" : "border-slate-200 bg-white hover:border-emerald-300"}`} onClick={() => setForm({ ...form, contactVisibility: "phone_only" })}>
                        {form.contactVisibility === "phone_only" && (
                          <div className="absolute -top-2 -right-2 bg-emerald-500 rounded-full text-white p-0.5 shadow-sm">
                             <CheckCircle className="w-4 h-4" />
                          </div>
                        )}
                        <div className={`flex items-center gap-2 mb-1.5 ${form.contactVisibility === "phone_only" ? "text-emerald-800" : "text-slate-700"}`}>
                           <PhoneIcon className={`w-[18px] h-[18px] ${form.contactVisibility === "phone_only" ? "" : "text-slate-400"}`} />
                           <span className="font-bold text-[13px]">{t("Show Phone Only")}</span>
                        </div>
                        <p className={`text-[11px] font-medium leading-tight pr-2 ${form.contactVisibility === "phone_only" ? "text-emerald-700/80" : "text-slate-500"}`}>{t("Recruiters can see your phone only")}</p>
                      </div>

                      {/* Option 4 */}
                      <div className={`relative border rounded-[14px] p-4 cursor-pointer hover:shadow-sm transition-all h-[100px] flex flex-col justify-center ${form.contactVisibility === "none" ? "border-2 border-emerald-500 bg-emerald-50/20" : "border-slate-200 bg-white hover:border-emerald-300"}`} onClick={() => setForm({ ...form, contactVisibility: "none" })}>
                        {form.contactVisibility === "none" && (
                          <div className="absolute -top-2 -right-2 bg-emerald-500 rounded-full text-white p-0.5 shadow-sm">
                             <CheckCircle className="w-4 h-4" />
                          </div>
                        )}
                        <div className={`flex items-center gap-2 mb-1.5 ${form.contactVisibility === "none" ? "text-emerald-800" : "text-slate-700"}`}>
                           <EyeOff className={`w-[18px] h-[18px] ${form.contactVisibility === "none" ? "" : "text-slate-400"}`} />
                           <span className="font-bold text-[13px]">{t("Hide All")}</span>
                        </div>
                        <p className={`text-[11px] font-medium leading-tight pr-2 ${form.contactVisibility === "none" ? "text-emerald-700/80" : "text-slate-500"}`}>{t("Recruiters will contact you through LucoHire only")}</p>
                      </div>
                    </div>

                    <div className="mt-8 space-y-4">
                      <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-white hover:border-emerald-300 transition-colors">
                        <div>
                          <h4 className="text-[14px] font-bold text-slate-800">{t("Public SEO Profile")}</h4>
                          <p className="text-[12px] text-slate-500 mt-0.5">{t("Allow your profile to be indexed by search engines and viewed publicly.")}</p>
                        </div>
                        <label className="inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={!!form.isPublicProfile} onChange={(e) => setForm({ ...form, isPublicProfile: e.target.checked })} />
                          <div className="relative w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-white hover:border-emerald-300 transition-colors">
                        <div>
                          <h4 className="text-[14px] font-bold text-slate-800">{t("WhatsApp Contact Consent")}</h4>
                          <p className="text-[12px] text-slate-500 mt-0.5">{t(
                            "Showcase your freelance profile and receive direct calls or WhatsApp enquiries from verified clients—with your consent."
                          )}</p>
                        </div>
                        <label className="inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={!!form.whatsappConsent} 
                            onChange={(e) => setForm({ ...form, whatsappConsent: e.target.checked })}
                          />
                          <div className="relative w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>

                      {/* Terms and Conditions Checkbox */}
                      <div className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50/50 hover:border-emerald-300 transition-colors mt-4">
                        <input
                          type="checkbox"
                          id="termsConsentCheckbox"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer accent-emerald-600 shrink-0"
                        />
                        <label htmlFor="termsConsentCheckbox" className="text-[13px] text-slate-700 font-medium cursor-pointer select-none">
                          {t("I have read and agree to the")}&nbsp;
                          <button
                            type="button"
                            onClick={() => setShowTermsModal(true)}
                            className="text-emerald-600 font-bold underline hover:text-emerald-700"
                          >
                            {t("Terms and Conditions")}
                          </button>
                        </label>
                      </div>
                    </div>
                    </div>
                  </div>

                  {/* MOBILE PERSONAL TAB START */}
                  <div className="md:hidden flex flex-col gap-4">
                    {/* Hero/Header Card */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col items-center text-center relative">
                      <div className="w-24 h-24 rounded-full border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center relative mb-4 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        {avatarSrc ? (
                          <img src={avatarSrc} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-10 h-10 text-slate-300" />
                        )}
                        <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center backdrop-blur-[2px] transition">
                          <Camera className="w-5 h-5 text-white" />
                        </div>
                        {uploading && (
                          <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-sm">
                            <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin" />
                          </div>
                        )}
                        <div className="absolute bottom-0 right-1 bg-white text-emerald-600 rounded-full p-1.5 shadow border border-slate-200">
                          <Camera className="w-3 h-3" />
                        </div>
                      </div>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                      
                      <div className="w-full relative mt-2 mb-3">
                        <input
                          type="text"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value, profileName: e.target.value })}
                          placeholder={t("Full Name")}
                          className="w-full text-center text-lg font-bold text-slate-800 outline-none placeholder:text-slate-400 bg-transparent"
                        />
                      </div>
                      <div className="w-full relative">
                        <input
                          type="text"
                          value={form.skills?.[0] || ""}
                          onChange={(e) => {
                            const skill = e.target.value;
                            setForm(prev => ({ ...prev, skills: skill ? [skill] : [] }))
                          }}
                          placeholder={t("Headline (e.g. UI/UX Designer)")}
                          className="w-full text-center text-sm font-medium text-slate-600 outline-none placeholder:text-slate-400 bg-transparent"
                        />
                      </div>
                    </div>

                    {/* Contact & Location Card */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col gap-4">
                      <div className="flex items-center gap-2 mb-1">
                        <PhoneIcon className="w-4 h-4 text-emerald-600" />
                        <h3 className="font-bold text-slate-800 text-sm tracking-tight">{t("Contact Info")}</h3>
                      </div>
                      
                      <div className="flex flex-col gap-4">
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                          <input
                            type="email"
                            value={form.email || ""}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            disabled={!!profileData?.user?.isEmailVerified}
                            placeholder={t("Email")}
                            className={`w-full pl-9 pr-3 py-2.5 text-[13px] rounded-xl border border-slate-200 outline-none transition text-slate-700 placeholder:text-slate-400 ${
                              profileData?.user?.isEmailVerified ? "bg-slate-50 cursor-not-allowed text-slate-500" : "focus:border-emerald-500"
                            }`}
                          />
                        </div>
                        
                        <div className="border border-slate-200 rounded-xl [&>div]:border-none [&_input]:text-[13px] focus-within:border-emerald-500 overflow-hidden">
                           <CountryPhoneInput
                             variant="profile"
                             countryCode={form.countryCode || "+91"}
                             nationalNumber={form.nationalNumber || ""}
                             onChange={(phoneData) =>
                               setForm((prev) => ({
                                 ...prev,
                                 countryCode: phoneData.countryCode,
                                 nationalNumber: phoneData.nationalNumber,
                                 phone: phoneData.fullPhone,
                               }))
                             }
                           />
                        </div>

                        <div className="relative border border-slate-200 rounded-xl focus-within:border-emerald-500 overflow-hidden">
                          <div className="w-full [&_input]:border-none [&_input]:text-[13px]">
                            <LocationSearch
                               iconClassName="text-slate-400 w-4 h-4"
                               value={form.city}
                               onChange={(value) => setForm(prev => ({ ...prev, city: value }))}
                               onSelect={(item) => {
                                 if(item) setForm(prev => ({ ...prev, city: item.city || item.name || "" }));
                               }}
                               placeholder={t("Current Location")}
                            />
                          </div>
                        </div>

                        <div className="relative">
                          <Link2 className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            value={form.portfolioLinks?.[0]?.url || ""}
                            onChange={(e) => setForm({ ...form, portfolioLinks: e.target.value ? [{ platform: 'LinkedIn', url: e.target.value }] : [] })}
                            placeholder={t("LinkedIn Profile (Optional)")}
                            className="w-full pl-9 pr-3 py-2.5 text-[13px] rounded-xl border border-slate-200 outline-none focus:border-emerald-500 text-slate-700 placeholder:text-slate-400"
                          />
                        </div>

                        {profileData?.whatsappFreelancePlanActive && (
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 font-bold text-slate-400 text-sm">₹</span>
                            <input
                              type="text"
                              value={form.pricing || ""}
                              onChange={(e) => setForm({ ...form, pricing: e.target.value, pricingType: 'hourly' })}
                              placeholder={t("Hourly Rate")}
                              className="w-full pl-7 pr-3 py-2.5 text-[13px] rounded-xl border border-slate-200 outline-none focus:border-emerald-500 text-slate-700 placeholder:text-slate-400"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Professional Summary */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col h-[260px]">
                      <div className="flex items-center gap-2 mb-3">
                        <UserIcon className="w-4 h-4 text-emerald-600" />
                        <h3 className="font-bold text-slate-800 text-sm tracking-tight">{t("Professional Summary")}</h3>
                      </div>
                      
                      <div className="relative flex-1 flex flex-col border border-slate-200 rounded-xl p-1 focus-within:border-emerald-500 overflow-hidden">
                        <textarea
                          value={form.description}
                          onChange={(e) => setForm({ ...form, description: e.target.value })}
                          placeholder={t("Write a short summary about yourself...")}
                          className="w-full h-full px-2 py-2 text-[13px] outline-none resize-none text-slate-700 bg-transparent"
                        />
                        <div className="flex items-center justify-between p-2 pt-1 mt-auto bg-white border-t border-transparent">
                          <span className="text-[10px] text-slate-400 font-medium">
                            {form.description?.length || 0}{t("/ 600")}</span>
                          <button 
                            type="button" 
                            onClick={handleSuggestAI} 
                            disabled={isSuggestingAI}
                            className="text-emerald-700 text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 disabled:opacity-50 transition-colors">
                            {isSuggestingAI ? (
                              <span className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Sparkles className="w-3 h-3" />
                            )}
                            {isSuggestingAI ? 'Generating...' : 'Suggest with AI'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Current Job Details */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col">
                      <div className="flex items-center gap-2 mb-4">
                        <Briefcase className="w-4 h-4 text-emerald-600" />
                        <h3 className="font-bold text-slate-800 text-sm tracking-tight">{t("Current Job Details")}</h3>
                      </div>
                      
                      <div className="flex flex-col gap-4">
                        <div>
                          <input
                            type="text"
                            value={form.designation}
                            onChange={(e) => setForm({ ...form, designation: e.target.value })}
                            placeholder={t("Current Designation")}
                            className="w-full px-3 py-2.5 text-[13px] rounded-xl border border-slate-200 outline-none focus:border-emerald-500 text-slate-700 placeholder:text-slate-400"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={form.company}
                            onChange={(e) => setForm({ ...form, company: e.target.value })}
                            placeholder={t("Company (Optional)")}
                            className="w-full px-3 py-2.5 text-[13px] rounded-xl border border-slate-200 outline-none focus:border-emerald-500 text-slate-700 placeholder:text-slate-400"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <CreatableAutocomplete 
                              value={form.experience || ''} 
                              onChange={(val) => setForm({ ...form, experience: val })}
                              onBlur={(val) => {
                                if (val === '0' || val.toLowerCase() === 'fresher') setForm({ ...form, experience: 'Fresher' });
                                else if (!isNaN(val) && val.trim() !== '') setForm({ ...form, experience: val === '1' ? '1 Year' : `${val} Years` });
                              }}
                              options={["Fresher", "1 Year", "2 Years", "3 Years", "4 Years", "5 Years"]}
                              placeholder={t("Experience")}
                            />
                          </div>
                          <div>
                            <CreatableAutocomplete 
                              value={form.noticePeriod || ''} 
                              onChange={(val) => setForm({ ...form, noticePeriod: val })}
                              onBlur={(val) => {
                                if (val === '0' || val.toLowerCase() === 'immediate') setForm({ ...form, noticePeriod: 'Immediate' });
                                else if (!isNaN(val) && val.trim() !== '') setForm({ ...form, noticePeriod: `${val} Days` });
                              }}
                              options={["Immediate", "15 Days", "30 Days", "60 Days"]}
                              placeholder={t("Notice Period")}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contact Visibility */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                      <h3 className="font-bold text-slate-800 text-sm mb-3">{t("Contact Visibility")}</h3>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className={`relative border rounded-xl p-3 flex flex-col justify-center items-center text-center gap-1 transition-all ${form.contactVisibility === "both" ? "border-emerald-500 bg-emerald-50/20" : "border-slate-200"}`} onClick={() => setForm({ ...form, contactVisibility: "both" })}>
                          <ShieldCheck className={`w-5 h-5 ${form.contactVisibility === "both" ? "text-emerald-600" : "text-slate-400"}`} />
                          <span className="font-bold text-[11px] text-slate-700 leading-tight">{t("Phone & Email")}</span>
                        </div>
                        <div className={`relative border rounded-xl p-3 flex flex-col justify-center items-center text-center gap-1 transition-all ${form.contactVisibility === "email_only" ? "border-emerald-500 bg-emerald-50/20" : "border-slate-200"}`} onClick={() => setForm({ ...form, contactVisibility: "email_only" })}>
                          <Mail className={`w-5 h-5 ${form.contactVisibility === "email_only" ? "text-emerald-600" : "text-slate-400"}`} />
                          <span className="font-bold text-[11px] text-slate-700 leading-tight">{t("Email Only")}</span>
                        </div>
                        <div className={`relative border rounded-xl p-3 flex flex-col justify-center items-center text-center gap-1 transition-all ${form.contactVisibility === "phone_only" ? "border-emerald-500 bg-emerald-50/20" : "border-slate-200"}`} onClick={() => setForm({ ...form, contactVisibility: "phone_only" })}>
                          <PhoneIcon className={`w-5 h-5 ${form.contactVisibility === "phone_only" ? "text-emerald-600" : "text-slate-400"}`} />
                          <span className="font-bold text-[11px] text-slate-700 leading-tight">{t("Phone Only")}</span>
                        </div>
                        <div className={`relative border rounded-xl p-3 flex flex-col justify-center items-center text-center gap-1 transition-all ${form.contactVisibility === "none" ? "border-emerald-500 bg-emerald-50/20" : "border-slate-200"}`} onClick={() => setForm({ ...form, contactVisibility: "none" })}>
                          <EyeOff className={`w-5 h-5 ${form.contactVisibility === "none" ? "text-emerald-600" : "text-slate-400"}`} />
                          <span className="font-bold text-[11px] text-slate-700 leading-tight">{t("Hide All")}</span>
                        </div>
                      </div>
                    </div>

                    {/* Preferences & Toggles */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-8">
                      <div className="flex items-center justify-between p-4 border-b border-slate-100">
                        <div className="pr-4">
                          <h4 className="text-[13px] font-bold text-slate-800">{t("Public SEO Profile")}</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{t("Allow search engines to index your profile.")}</p>
                        </div>
                        <label className="inline-flex items-center cursor-pointer shrink-0">
                          <input type="checkbox" className="sr-only peer" checked={!!form.isPublicProfile} onChange={(e) => setForm({ ...form, isPublicProfile: e.target.checked })} />
                          <div className="relative w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 border-b border-slate-100">
                        <div className="pr-4">
                          <h4 className="text-[13px] font-bold text-slate-800">{t("WhatsApp Consent")}</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{t("Receive direct enquiries from clients.")}</p>
                        </div>
                        <label className="inline-flex items-center cursor-pointer shrink-0">
                          <input type="checkbox" className="sr-only peer" checked={!!form.whatsappConsent} onChange={(e) => setForm({ ...form, whatsappConsent: e.target.checked })} />
                          <div className="relative w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>

                      <div className="flex items-center gap-3 p-4 bg-slate-50/50">
                        <input
                          type="checkbox"
                          id="termsConsentCheckboxMobile"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 shrink-0"
                        />
                        <label htmlFor="termsConsentCheckboxMobile" className="text-[12px] text-slate-700 font-medium cursor-pointer select-none">
                          {t("I have read and agree to the")}&nbsp;
                          <button
                            type="button"
                            onClick={() => setShowTermsModal(true)}
                            className="text-emerald-600 font-bold underline hover:text-emerald-700 transition-colors"
                          >
                            {t("Terms & Conditions")}
                          </button>
                        </label>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === "Details" && (
                <div className="space-y-6">
                  {/* Current Work & Notice Period */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
                     <div className="flex items-center gap-2 mb-4">
                       <Briefcase className="w-5 h-5 text-emerald-600" />
                       <h3 className="font-extrabold text-slate-800 text-base tracking-tight">{t("Current Work Details")}</h3>
                     </div>
                     <p className="text-[13px] text-slate-500 mb-4">{t("Where are you currently working and what is your notice period?")}</p>
                     
                     <div className="grid grid-cols-2 gap-4">
                       <div className="col-span-2 sm:col-span-1">
                         <label className="block text-[12px] font-bold text-slate-600 mb-1.5">{t("Experience (Years)")}</label>
                         <CreatableAutocomplete 
                           value={form.experience || ''} 
                           onChange={(val) => {
                             setForm({ ...form, experience: val });
                           }}
                           onBlur={(val) => {
                             if (val === '0' || val.toLowerCase() === 'fresher') {
                               setForm({ ...form, experience: 'Fresher' });
                             } else if (!isNaN(val) && val.trim() !== '') {
                               setForm({ ...form, experience: val === '1' ? '1 Year' : `${val} Years` });
                             }
                           }}
                           options={["Fresher", "1 Year", "2 Years", "3 Years", "4 Years", "5 Years", "6 Years", "7 Years", "8 Years", "9 Years", "10+ Years"]}
                           placeholder={t("e.g. 2.5 Years or select Fresher")}
                         />
                       </div>
                       <div className="col-span-2 sm:col-span-1">
                         <label className="block text-[12px] font-bold text-slate-600 mb-1.5">{t("Notice Period (Days)")}</label>
                          <CreatableAutocomplete 
                            value={form.noticePeriod || ''} 
                            onChange={(val) => {
                              setForm({ ...form, noticePeriod: val });
                            }}
                            onBlur={(val) => {
                              if (val === '0' || val.toLowerCase() === 'immediate') {
                                setForm({ ...form, noticePeriod: 'Immediate' });
                              } else if (!isNaN(val) && val.trim() !== '') {
                                setForm({ ...form, noticePeriod: `${val} Days` });
                              }
                            }}
                            options={["Immediate", "15 Days", "30 Days", "45 Days", "60 Days", "90 Days"]}
                            placeholder={t("e.g. 15 Days or select Immediate")}
                          />
                       </div>

                       {form.experience !== 'Fresher' && (
                         <>
                           <div className="col-span-2 sm:col-span-1">
                             <label className="block text-[12px] font-bold text-slate-600 mb-1.5">{t("Current Designation / Role")}</label>
                             <CreatableAutocomplete 
                               value={form.designation || ''} 
                               onChange={(val) => setForm({ ...form, designation: val })}
                               options={[
                                 "Frontend Developer", "Backend Developer", "Full Stack Developer", 
                                 "UI/UX Designer", "Graphic Designer", "Product Manager", 
                                 "Project Manager", "Data Scientist", "Data Analyst", 
                                 "DevOps Engineer", "QA Engineer", "Mobile Developer (Android)", 
                                 "Mobile Developer (iOS)", "Software Engineer", "Marketing Specialist"
                               ]}
                               placeholder={t("e.g. UI/UX Designer")}
                             />
                           </div>
                           <div className="col-span-2 sm:col-span-1">
                             <label className="block text-[12px] font-bold text-slate-600 mb-1.5">{t("Company")}</label>
                             <input type="text" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-200 outline-none focus:border-emerald-500" placeholder={t("e.g. ABC Studio")} />
                           </div>
                           <div className="col-span-2">
                             <label className="block text-[12px] font-bold text-slate-600 mb-1.5">{t("What work have you done in this company?")}</label>
                             <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-200 outline-none focus:border-emerald-500 resize-none h-24" placeholder={t("Describe your responsibilities and achievements...")} />
                           </div>
                         </>
                       )}
                     </div>
                  </div>

                  {/* Roles Section */}
                  <div id="role-skills-card" className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
                     <div className="flex items-center gap-2 mb-4">
                       <h3 className="font-extrabold text-slate-800 text-base tracking-tight">{t("Roles")}</h3>
                     </div>
                     <p className="text-[13px] text-slate-500 mb-4">{t(`Add roles relevant to your profession (e.g. Developer, Designer). Your plan allows up to ${subscriptionSummary?.planSnapshot?.maxSkills || profileData?.allowedSkillsCount || 1} role${(subscriptionSummary?.planSnapshot?.maxSkills || profileData?.allowedSkillsCount || 1) > 1 ? 's' : ''}.`)}</p>
                     
                     <div className="flex flex-col gap-4">
                       <SkillAutocomplete 
                         placeholder={t("Add a role (e.g. Frontend Developer)")}
                         onAddSkill={(role) => {
                           if (!form.roles.includes(role)) {
                             setForm({ ...form, roles: [...form.roles, role] });
                           }
                         }}
                       />
                       <div className="flex flex-wrap gap-2">
                         {form.roles.map((role, i) => (
                           <div key={i} className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-full text-xs font-semibold">
                             {role}
                             <button type="button" onClick={() => setForm({ ...form, roles: form.roles.filter(r => r !== role) })} className="hover:text-indigo-900">
                               &times;
                             </button>
                           </div>
                         ))}
                       </div>
                     </div>
                  </div>

                  {/* Skills Section */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
                     <div className="flex items-center gap-2 mb-4">
                       <h3 className="font-extrabold text-slate-800 text-base tracking-tight">{t("Skills")}</h3>
                     </div>
                     <p className="text-[13px] text-slate-500 mb-4">{t(`Add specific skills (e.g. React, Node.js). Your plan allows up to ${subscriptionSummary?.planSnapshot?.maxSkills || profileData?.allowedSkillsCount || 1} skill${(subscriptionSummary?.planSnapshot?.maxSkills || profileData?.allowedSkillsCount || 1) > 1 ? 's' : ''}.`)}</p>
                     
                     <div className="flex flex-col gap-4">
                       <SkillAutocomplete 
                         placeholder={t("Add a skill (e.g. React, JavaScript)")}
                         onAddSkill={(skill) => {
                           if (!form.skills.includes(skill)) {
                             setForm({ ...form, skills: [...form.skills, skill] });
                           }
                         }}
                       />
                       <div className="flex flex-wrap gap-2">
                         {form.skills.map((skill, i) => (
                           <div key={i} className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-semibold">
                             {skill}
                             <button type="button" onClick={() => setForm({ ...form, skills: form.skills.filter(s => s !== skill) })} className="hover:text-emerald-900">
                               &times;
                             </button>
                           </div>
                         ))}
                       </div>
                     </div>
                  </div>

                  {/* Experience Section */}
                  <div id="experience" className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
                     <div className="flex items-center gap-2 mb-4">
                       <h3 className="font-extrabold text-slate-800 text-base tracking-tight">{t("Previous Work Experience")}</h3>
                     </div>
                     <p className="text-[13px] text-slate-500 mb-4">{t("Where have you previously worked?")}</p>
                     
                     <div className="space-y-4">
                       {form.previousExperience?.map((exp, i) => (
                         <div key={i} className="relative grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border border-slate-100 rounded-xl bg-slate-50">
                           <button type="button" onClick={() => setForm({ ...form, previousExperience: form.previousExperience.filter((_, idx) => idx !== i) })} className="absolute top-3 right-3 sm:top-4 sm:right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all text-xl shadow-sm hover:shadow-md" aria-label="Remove">&times;</button>
                           
                           <div className="sm:col-span-1">
                             <label className="block text-[12px] font-bold text-slate-600 mb-1.5">{t("Company Name")}</label>
                             <input type="text" value={exp.company} onChange={(e) => { const nx = [...form.previousExperience]; nx[i].company = e.target.value; setForm({ ...form, previousExperience: nx }); }} className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-200 outline-none focus:border-emerald-500" placeholder={t("Company Name")} />
                           </div>
                           <div className="sm:col-span-1">
                             <label className="block text-[12px] font-bold text-slate-600 mb-1.5">{t("Designation / Role")}</label>
                             <input type="text" value={exp.role} onChange={(e) => { const nx = [...form.previousExperience]; nx[i].role = e.target.value; setForm({ ...form, previousExperience: nx }); }} className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-200 outline-none focus:border-emerald-500" placeholder={t("e.g. Senior Designer")} />
                           </div>
                           <div className="sm:col-span-1">
                             <label className="block text-[12px] font-bold text-slate-600 mb-1.5">{t("Duration")}</label>
                             <input type="text" value={exp.duration} onChange={(e) => { const nx = [...form.previousExperience]; nx[i].duration = e.target.value; setForm({ ...form, previousExperience: nx }); }} className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-200 outline-none focus:border-emerald-500" placeholder={t("e.g. 2020 - 2022")} />
                           </div>
                           <div className="sm:col-span-2">
                             <label className="block text-[12px] font-bold text-slate-600 mb-1.5">{t("Description (Optional)")}</label>
                             <input type="text" value={exp.description} onChange={(e) => { const nx = [...form.previousExperience]; nx[i].description = e.target.value; setForm({ ...form, previousExperience: nx }); }} className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-200 outline-none focus:border-emerald-500" placeholder={t("Brief description")} />
                           </div>
                         </div>
                       ))}
                       <button type="button" onClick={() => setForm({ ...form, previousExperience: [...(form.previousExperience || []), { company: '', role: '', duration: '', description: '' }] })} className="text-emerald-600 text-[13px] font-bold py-2 hover:text-emerald-700 flex items-center gap-1">{t("+ Add Experience")}</button>
                     </div>
                  </div>

                  {/* Projects Section */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
                     <div className="flex items-center gap-2 mb-4">
                       <h3 className="font-extrabold text-slate-800 text-base tracking-tight">{t("Projects")}</h3>
                     </div>
                     <p className="text-[13px] text-slate-500 mb-4">{t(
                       "Add your notable technical or design projects."
                     )}</p>
                     
                     <div className="space-y-4">
                       {form.projects?.map((proj, i) => (
                         <div key={i} className="border border-slate-200 rounded-xl p-4 pr-14 sm:pr-16 relative bg-slate-50">
                           <button type="button" onClick={() => setForm({ ...form, projects: form.projects.filter((_, idx) => idx !== i) })} className="absolute top-3 right-3 sm:top-4 sm:right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all text-xl shadow-sm hover:shadow-md" aria-label="Remove">&times;</button>
                           <div className="grid grid-cols-2 gap-4">
                             <div className="col-span-2">
                               <label className="block text-[12px] font-bold text-slate-600 mb-1.5">{t("Project Name")}</label>
                               <input type="text" value={proj.name || ''} onChange={(e) => { const nx = [...(form.projects || [])]; nx[i].name = e.target.value; setForm({ ...form, projects: nx }); }} className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-200 outline-none focus:border-emerald-500" placeholder={t("e.g. E-Commerce Dashboard")} />
                             </div>
                             <div className="col-span-2">
                               <label className="block text-[12px] font-bold text-slate-600 mb-1.5">{t("GitHub or Live Project Link (Optional)")}</label>
                               <input type="text" value={proj.link || ''} onChange={(e) => { const nx = [...(form.projects || [])]; nx[i].link = e.target.value; setForm({ ...form, projects: nx }); }} className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-200 outline-none focus:border-emerald-500" placeholder={t("e.g. https://github.com/... or https://...")} />
                             </div>
                             <div className="col-span-2">
                               <label className="block text-[12px] font-bold text-slate-600 mb-1.5">{t("Description")}</label>
                               <textarea value={proj.description || ''} onChange={(e) => { const nx = [...(form.projects || [])]; nx[i].description = e.target.value; setForm({ ...form, projects: nx }); }} className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-200 outline-none focus:border-emerald-500 resize-none h-20" placeholder={t("Briefly describe what you built, technologies used, and your role.")} />
                             </div>
                             <div className="col-span-2 flex items-center gap-2">
                               <input type="checkbox" id={`visibleForAll-${i}`} checked={proj.visibleForAll !== false} onChange={(e) => { const nx = [...(form.projects || [])]; nx[i].visibleForAll = e.target.checked; setForm({ ...form, projects: nx }); }} className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500" />
                               <label htmlFor={`visibleForAll-${i}`} className="text-[13px] font-medium text-slate-700">{t("Make this project visible for all recruiters and viewers")}</label>
                             </div>
                           </div>
                         </div>
                       ))}
                       <div className="flex items-center justify-between mt-2 border-t border-slate-100 pt-4">
                         <button type="button" onClick={() => setForm({ ...form, projects: [...(form.projects || []), { name: '', link: '', description: '', visibleForAll: true }] })} className="text-emerald-600 text-[13px] font-bold py-2 hover:text-emerald-700 flex items-center gap-1">{t("+ Add Project")}</button>
                         <button type="button" onClick={handleSave} disabled={saving} className="text-white text-[13px] font-bold py-2 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-1">{saving ? t("Saving...") : t("Save Projects")}</button>
                       </div>
                     </div>
                  </div>

                </div>
              )}

              {activeTab === "Education & Credentials" && (
                <div className="space-y-6">
                  {/* Education Section */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
                     <div className="flex items-center gap-2 mb-4">
                       <h3 className="font-extrabold text-slate-800 text-base tracking-tight">{t("Education")}</h3>
                     </div>
                     <p className="text-[13px] text-slate-500 mb-4">{t("Add your educational background.")}</p>
                     
                     <div className="space-y-4">
                       {form.education?.map((edu, i) => (
                         <div key={i} className="border border-slate-200 rounded-xl p-4 pr-14 sm:pr-16 relative">
                           <button type="button" onClick={() => setForm({ ...form, education: form.education.filter((_, idx) => idx !== i) })} className="absolute top-3 right-3 sm:top-4 sm:right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all text-xl shadow-sm hover:shadow-md" aria-label="Remove">&times;</button>
                           <div className="grid grid-cols-2 gap-4">
                             <div>
                               <label className="block text-[12px] font-bold text-slate-600 mb-1.5">{t("Institution")}</label>
                               <input type="text" value={edu.institution} onChange={(e) => { const nx = [...form.education]; nx[i].institution = e.target.value; setForm({ ...form, education: nx }); }} className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-200 outline-none focus:border-emerald-500" placeholder={t("University / College")} />
                             </div>
                             <div>
                               <label className="block text-[12px] font-bold text-slate-600 mb-1.5">{t("Degree")}</label>
                               <input type="text" value={edu.degree} onChange={(e) => { const nx = [...form.education]; nx[i].degree = e.target.value; setForm({ ...form, education: nx }); }} className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-200 outline-none focus:border-emerald-500" placeholder={t("e.g. B.Tech")} />
                             </div>
                             <div>
                               <label className="block text-[12px] font-bold text-slate-600 mb-1.5">{t("Year")}</label>
                               <input type="text" value={edu.year} onChange={(e) => { const nx = [...form.education]; nx[i].year = e.target.value; setForm({ ...form, education: nx }); }} className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-200 outline-none focus:border-emerald-500" placeholder={t("e.g. 2018 - 2022")} />
                             </div>
                             <div>
                               <label className="block text-[12px] font-bold text-slate-600 mb-1.5">{t("Grade (GPA/%)")}</label>
                               <input type="text" value={edu.grade || ''} onChange={(e) => { const nx = [...form.education]; nx[i].grade = e.target.value; setForm({ ...form, education: nx }); }} className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-200 outline-none focus:border-emerald-500" placeholder={t("e.g. 8.5 CGPA or 85%")} />
                             </div>
                           </div>
                         </div>
                       ))}
                       <button type="button" onClick={() => setForm({ ...form, education: [...(form.education || []), { institution: '', degree: '', year: '', grade: '' }] })} className="text-emerald-600 text-[13px] font-bold py-2 hover:text-emerald-700 flex items-center gap-1">{t("+ Add Education")}</button>
                     </div>
                  </div>

                 {/* Certifications Section */}
                 <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col mt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="font-extrabold text-slate-800 text-base tracking-tight">{t("Certifications")}</h3>
                    </div>
                    <p className="text-[13px] text-slate-500 mb-4">{t("Add your professional certifications or licenses.")}</p>
                    
                    <div className="space-y-4">
                      {form.certifications?.map((cert, i) => (
                        <div key={i} className="border border-slate-200 rounded-xl p-4 pr-14 sm:pr-16 relative">
                          <button type="button" onClick={() => setForm({ ...form, certifications: form.certifications.filter((_, idx) => idx !== i) })} className="absolute top-3 right-3 sm:top-4 sm:right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all text-xl shadow-sm hover:shadow-md" aria-label="Remove">&times;</button>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[12px] font-bold text-slate-600 mb-1.5">{t("Certification Name")}</label>
                              <input type="text" value={cert.name || ''} onChange={(e) => { const nx = [...(form.certifications || [])]; nx[i].name = e.target.value; setForm({ ...form, certifications: nx }); }} className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-200 outline-none focus:border-emerald-500" placeholder={t("e.g. AWS Certified Developer")} />
                            </div>
                            <div>
                              <label className="block text-[12px] font-bold text-slate-600 mb-1.5">{t("Issuer")}</label>
                              <input type="text" value={cert.issuer || ''} onChange={(e) => { const nx = [...(form.certifications || [])]; nx[i].issuer = e.target.value; setForm({ ...form, certifications: nx }); }} className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-200 outline-none focus:border-emerald-500" placeholder={t("e.g. Amazon Web Services")} />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-[12px] font-bold text-slate-600 mb-1.5">{t("Date / Year")}</label>
                              <input type="text" value={cert.date || ''} onChange={(e) => { const nx = [...(form.certifications || [])]; nx[i].date = e.target.value; setForm({ ...form, certifications: nx }); }} className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-200 outline-none focus:border-emerald-500" placeholder={t("e.g. 2023 or Valid till 2025")} />
                            </div>
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={() => setForm({ ...form, certifications: [...(form.certifications || []), { name: '', issuer: '', date: '' }] })} className="text-emerald-600 text-[13px] font-bold py-2 hover:text-emerald-700 flex items-center gap-1">{t("+ Add Certification")}</button>
                    </div>
                 </div>

                 {/* Achievements Section */}
                 <div id="achievements" className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col mt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="font-extrabold text-slate-800 text-base tracking-tight">{t("Achievements")}</h3>
                    </div>
                    <p className="text-[13px] text-slate-500 mb-4">{t("Add your notable achievements, awards, or recognitions.")}</p>
                    
                    <div className="space-y-4">
                      {form.achievements?.map((ach, i) => (
                        <div key={i} className="border border-slate-200 rounded-xl p-4 pr-14 sm:pr-16 relative">
                          <button type="button" onClick={() => setForm({ ...form, achievements: form.achievements.filter((_, idx) => idx !== i) })} className="absolute top-3 right-3 sm:top-4 sm:right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all text-xl shadow-sm hover:shadow-md" aria-label="Remove">&times;</button>
                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <label className="block text-[12px] font-bold text-slate-600 mb-1.5">{t("Title")}</label>
                              <input type="text" value={ach.title || ''} onChange={(e) => { const nx = [...(form.achievements || [])]; nx[i].title = e.target.value; setForm({ ...form, achievements: nx }); }} className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-200 outline-none focus:border-emerald-500" placeholder={t("e.g. Employee of the Year")} />
                            </div>
                            <div>
                              <label className="block text-[12px] font-bold text-slate-600 mb-1.5">{t("Description (Optional)")}</label>
                              <textarea value={ach.description || ''} onChange={(e) => { const nx = [...(form.achievements || [])]; nx[i].description = e.target.value; setForm({ ...form, achievements: nx }); }} className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-200 outline-none focus:border-emerald-500 resize-none h-20" placeholder={t("Briefly describe the achievement...")} />
                            </div>
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={() => setForm({ ...form, achievements: [...(form.achievements || []), { title: '', description: '' }] })} className="text-emerald-600 text-[13px] font-bold py-2 hover:text-emerald-700 flex items-center gap-1">{t("+ Add Achievement")}</button>
                    </div>
                 </div>
                </div>
              )}

              {activeTab === "Portfolio" && (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
                     <div className="flex items-center gap-2 mb-4">
                       <h3 className="font-extrabold text-slate-800 text-base tracking-tight">{t("Portfolio Links")}</h3>
                     </div>
                     <p className="text-[13px] text-slate-500 mb-4">{t(
                       "Add your portfolio links (e.g. GitHub, Behance, Dribbble). They will be reviewed by our team."
                     )}</p>
                     
                     <div className="space-y-4">
                       {form.portfolioLinks?.map((link, i) => (
                         <div key={i} className="border border-slate-200 rounded-xl p-4 pr-14 sm:pr-16 relative">
                           <button type="button" onClick={() => setForm({ ...form, portfolioLinks: form.portfolioLinks.filter((_, idx) => idx !== i) })} className="absolute top-3 right-3 sm:top-4 sm:right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all text-xl shadow-sm hover:shadow-md" aria-label="Remove">&times;</button>
                           
                           {link.status && link.status !== 'pending' && (
                             <div className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 inline-block rounded mb-3 ${link.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                               {link.status === 'approved' ? 'Approved' : 'Rejected'}
                               {link.status === 'rejected' && link.rejectionReason && ` - ${link.rejectionReason}`}
                             </div>
                           )}
                           {(!link.status || link.status === 'pending') && (
                             <div className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 inline-block rounded mb-3 bg-amber-100 text-amber-700">{t("Pending Approval")}</div>
                           )}

                           <div className="grid grid-cols-2 gap-4">
                             <div className="col-span-2 md:col-span-1">
                               <label className="block text-[12px] font-bold text-slate-600 mb-1.5">{t("Platform")}</label>
                               <PlatformAutocomplete 
                                 value={link.platform || ''} 
                                 onChange={(val) => { 
                                   const nx = [...(form.portfolioLinks || [])]; 
                                   nx[i].platform = val; 
                                   setForm({ ...form, portfolioLinks: nx }); 
                                 }} 
                                 placeholder={t("e.g. GitHub, Behance")} 
                               />
                             </div>
                             <div className="col-span-2 md:col-span-1">
                               <label className="block text-[12px] font-bold text-slate-600 mb-1.5">{t("URL")}</label>
                               <input type="text" value={link.url || ''} onChange={(e) => { const nx = [...(form.portfolioLinks || [])]; nx[i].url = e.target.value; setForm({ ...form, portfolioLinks: nx }); }} className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-200 outline-none focus:border-emerald-500" placeholder={t("https://...")} />
                             </div>
                           </div>
                         </div>
                       ))}
                       <button type="button" onClick={() => setForm({ ...form, portfolioLinks: [...(form.portfolioLinks || []), { platform: '', url: '', status: 'pending' }] })} className="text-emerald-600 text-[13px] font-bold py-2 hover:text-emerald-700 flex items-center gap-1">{t("+ Add Portfolio Link")}</button>
                     </div>
                  </div>
                </div>
              )}



              {activeTab === "Resume" && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-extrabold text-slate-800 text-base tracking-tight">{t("Resume Upload")}</h3>
                  </div>
                  <p className="text-[13px] text-slate-500 mb-6">{t(
                    "Upload your latest resume to help recruiters understand your profile better."
                  )}</p>
                  
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer group relative">
                    <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <UploadCloud className="w-5 h-5 text-emerald-600" />
                    </div>
                    <p className="text-[14px] font-bold text-slate-700 mb-1">{t("Click to upload or drag and drop")}</p>
                    <p className="text-[12px] text-slate-500">{t("PDF, DOC, or DOCX (Max 5MB)")}</p>
                    <input type="file" className="hidden" accept=".pdf,.doc,.docx" onClick={(e) => { e.target.value = null; }} onChange={async (e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        if (file.size > 5 * 1024 * 1024) return toast.error("File must be under 5MB");
                        const toastId = toast.loading("Uploading and parsing resume with AI...");
                        try {
                          const fd = new FormData();
                          fd.append("resume", file);
                          const response = await uploadResumeAI(fd);
                          const data = response.data || response;
                          
                          if (data.fileHash) {
                            localStorage.setItem('lastResumeHash', data.fileHash);
                          }
                          
                          const pd = data.data || {};
                          setParsedResumeData(pd);
                          toast.success("Resume parsed successfully! Extracting details...", { id: toastId, duration: 3000 });
                          
                          // The backend now auto-applies missing details directly to the profile.
                          // Wait a moment for background DB saves then fetch profile again to update the UI
                          setTimeout(() => {
                            fetchProfile();
                          }, 1500);
                        } catch (err) {
                          toast.error(err?.response?.data?.message || "Resume parsing failed", { id: toastId });
                        }
                      }
                    }} id="resume-upload" />
                    <label htmlFor="resume-upload" className="absolute inset-0 cursor-pointer"></label>
                  </div>
                  
                  {form.resumeUrl && (
                    <div className="mt-6 border border-slate-200 rounded-lg p-4 flex items-center justify-between bg-slate-50/50">
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-rose-500" />
                        <div>
                          <p className="text-[13px] font-bold text-slate-800 break-all" title={decodeURIComponent(form.resumeUrl.split('/').pop())}>
                            {decodeURIComponent(form.resumeUrl.split('/').pop().replace(/-\d+(\.[a-zA-Z0-9]+)$/, '$1')) || t("Current Resume")}
                          </p>
                          <p className="text-[11px] text-slate-500">{t("Uploaded successfully")}</p>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const toastId = toast.loading(t('Loading preview...'));
                            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
                            const apiBase = import.meta.env.VITE_API_URL || '/api';
                            const res = await fetch(`${apiBase}/provider/profile/resume/preview`, {
                              headers: { Authorization: `Bearer ${token}` }
                            });
                            if (!res.ok) {
                              const err = await res.json().catch(() => ({}));
                              throw new Error(err.message || `Server error ${res.status}`);
                            }
                            const blob = await res.blob();
                            const blobUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
                            window.open(blobUrl, '_blank');
                            setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
                            toast.dismiss(toastId);
                          } catch (err) {
                            toast.dismiss();
                            toast.error(err.message || t('Failed to load resume preview'));
                          }
                        }}
                        className="px-3 py-2 sm:px-4 sm:py-2 text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors flex items-center gap-2 font-bold text-[12px] sm:text-[13px] shrink-0"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('View Resume')}</span>
                        <span className="sm:hidden">{t('View')}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "Generate Resume" && (
                <AdvancedResumeGenerator profileData={form} />
              )}

              {activeTab === "Preferences" && (
                <div className="space-y-6">
                  <div id="rate-payout-card" className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="font-extrabold text-slate-800 text-base tracking-tight">{t("Job Preferences")}</h3>
                    </div>
                    <p className="text-[13px] text-slate-500 mb-6">{t("Let recruiters know what kind of opportunities you are looking for.")}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Job Type */}
                      <div>
                        <label className="block text-[12px] font-bold text-slate-600 mb-2">{t("Preferred Job Type")}</label>
                        <div className="flex flex-wrap gap-2">
                          {["Full Time", "Part Time", "Contract", "Freelance", "Internship"].map(type => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => {
                                const currentTypes = form.jobType || [];
                                const newTypes = currentTypes.includes(type) 
                                  ? currentTypes.filter(t => t !== type)
                                  : [...currentTypes, type];
                                setForm({ ...form, jobType: newTypes });
                              }}
                              className={`px-3 py-1.5 text-[12px] font-bold rounded-full border transition-colors ${
                                (form.jobType || []).includes(type)
                                  ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Work Mode */}
                      <div>
                        <label className="block text-[12px] font-bold text-slate-600 mb-2">{t("Work Mode")}</label>
                        <div className="flex flex-wrap gap-2">
                          {["Remote", "Hybrid", "On-site"].map(mode => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => {
                                const currentModes = form.workMode || [];
                                // For backwards compatibility, if it's a string, convert it
                                const currentArray = Array.isArray(currentModes) ? currentModes : [currentModes].filter(Boolean);
                                const newModes = currentArray.includes(mode)
                                  ? currentArray.filter(m => m !== mode)
                                  : [...currentArray, mode];
                                setForm({ ...form, workMode: newModes });
                              }}
                              className={`px-3 py-1.5 text-[12px] font-bold rounded-full border transition-colors ${
                                (Array.isArray(form.workMode) ? form.workMode : [form.workMode]).includes(mode)
                                  ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                              }`}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Expected Compensation */}
                      <div>
                        <label className="block text-[12px] font-bold text-slate-600 mb-1.5">{t("Expected Salary/Compensation")}</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={form.pricing || ""}
                            onChange={(e) => setForm({ ...form, pricing: e.target.value })}
                            className="flex-1 px-3 py-2 text-[13px] rounded-lg border border-slate-200 outline-none focus:border-emerald-500"
                            placeholder={t("e.g. 80000")}
                          />
                          <select
                            value={form.pricingType || ""}
                            onChange={(e) => setForm({ ...form, pricingType: e.target.value })}
                            className="w-32 px-3 py-2 text-[13px] rounded-lg border border-slate-200 outline-none focus:border-emerald-500 bg-slate-50"
                          >
                            <option value="">{t("Unit")}</option>
                            <option value="hourly">{t("Hourly")}</option>
                            <option value="daily">{t("Daily")}</option>
                            <option value="monthly">{t("Monthly")}</option>
                            <option value="fixed">{t("Fixed")}</option>
                          </select>
                        </div>
                      </div>

                      {/* Relocation */}
                      <div>
                        <label className="block text-[12px] font-bold text-slate-600 mb-1.5">{t("Willing to Relocate?")}</label>
                        <select
                          value={form.relocationAvailable ? "Yes" : "No"}
                          onChange={(e) => setForm({ ...form, relocationAvailable: e.target.value === "Yes" })}
                          className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-200 outline-none focus:border-emerald-500"
                        >
                          <option value="No">{t("No")}</option>
                          <option value="Yes">{t("Yes")}</option>
                        </select>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Navigation */}
              {activeTab !== "Generate Resume" && (
                <div className="mt-8 flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      const idx = PROFILE_TABS.indexOf(activeTab);
                      if (idx > 0) handleTabChange(PROFILE_TABS[idx - 1]);
                    }}
                    disabled={PROFILE_TABS.indexOf(activeTab) === 0}
                    className="px-5 py-2.5 rounded-xl text-[14px] font-bold text-slate-600 hover:bg-slate-50 border border-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {t("Previous")}
                  </button>
                  {PROFILE_TABS.indexOf(activeTab) < PROFILE_TABS.length - 1 ? (
                    <button
                      type="button"
                      disabled={(form.isPublicProfile || form.whatsappConsent) && !agreedToTerms}
                      onClick={() => {
                        const idx = PROFILE_TABS.indexOf(activeTab);
                        if (idx < PROFILE_TABS.length - 1) handleTabChange(PROFILE_TABS[idx + 1]);
                      }}
                      className="px-6 py-2.5 rounded-xl text-[14px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-600 shadow-sm transition-all active:scale-95 flex items-center gap-2"
                    >
                      {t("Next")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving || ((form.isPublicProfile || form.whatsappConsent) && !agreedToTerms)}
                      className="px-6 py-2.5 rounded-xl text-[14px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-600 shadow-sm transition-all active:scale-95 flex items-center gap-2"
                    >
                      {saving ? t("Saving...") : t("Save Profile")}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right Sidebar (span 4) */}
            {activeTab !== "Generate Resume" && (
              <div className="lg:col-span-4 space-y-6">
                

                {/* AI Tip Card */}
                <div className="bg-emerald-50/70 rounded-2xl p-6 border border-emerald-100 shadow-sm relative overflow-hidden">
                   <div className="flex items-center gap-2 mb-3 relative z-10">
                     <Sparkles className="w-5 h-5 text-emerald-600" />
                     <h3 className="font-bold text-emerald-900 text-[15px]">{t("AI Tip")}</h3>
                   </div>
                   <p className="text-[13px] text-emerald-800 font-medium mb-4 relative z-10 leading-relaxed pr-2">{t(
                     "Profiles with complete information get 3X more profile views and better matches."
                   )}</p>
                   
                   <div className="bg-white/80 p-4 rounded-xl border border-emerald-100 relative z-10">
                     <p className="text-[12px] font-bold text-emerald-900 mb-1">{t("Tip to improve your profile")}</p>
                     <p className="text-[12px] text-emerald-700/80 mb-4 leading-relaxed font-medium">{t(
                       "Add your portfolio link to increase your chances of getting noticed by recruiters."
                     )}</p>
                     <button type="button" onClick={() => handleTabChange("Portfolio")} className="bg-white px-4 py-2 rounded-lg text-emerald-700 text-[12px] font-bold border border-emerald-200 hover:bg-emerald-50 transition flex items-center justify-center w-max gap-2 shadow-sm">{t("Add Portfolio Link")}<Link2 className="w-3.5 h-3.5" />
                     </button>
                   </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                 <h3 className="font-extrabold text-slate-800 text-base tracking-tight mb-3">{t("Quick Actions")}</h3>
                 <div className="flex flex-col">
                   <button type="button" onClick={handleShareProfile} className="flex items-center justify-between py-3.5 border-b border-slate-100 hover:bg-slate-50 -mx-6 px-6 transition-colors group">
                     <div className="flex items-center gap-3">
                       <Eye className="w-[18px] h-[18px] text-slate-400 group-hover:text-emerald-600 transition-colors" />
                       <span className="text-[13px] font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{t("Share Profile")}</span>
                     </div>
                     <ChevronDown className="w-4 h-4 text-slate-300 transform -rotate-90 group-hover:text-emerald-600 transition-colors" />
                   </button>
                   <button type="button" onClick={() => handleTabChange("Generate Resume")} className="flex items-center justify-between py-3.5 border-b border-slate-100 hover:bg-slate-50 -mx-6 px-6 transition-colors group">
                     <div className="flex items-center gap-3">
                       <FileText className="w-[18px] h-[18px] text-slate-400 group-hover:text-emerald-600 transition-colors" />
                       <span className="text-[13px] font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{t("Download Resume")}</span>
                     </div>
                     <ChevronDown className="w-4 h-4 text-slate-300 transform -rotate-90 group-hover:text-emerald-600 transition-colors" />
                   </button>
                   <button type="button" onClick={() => handleTabChange("Portfolio")} className="flex items-center justify-between py-3.5 border-b border-slate-100 hover:bg-slate-50 -mx-6 px-6 transition-colors group">
                     <div className="flex items-center gap-3">
                       <Briefcase className="w-[18px] h-[18px] text-slate-400 group-hover:text-emerald-600 transition-colors" />
                       <span className="text-[13px] font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{t("Manage Portfolio")}</span>
                     </div>
                     <ChevronDown className="w-4 h-4 text-slate-300 transform -rotate-90 group-hover:text-emerald-600 transition-colors" />
                   </button>
                   <button type="button" onClick={() => setShowErasureModal(true)} className="flex items-center justify-between py-3.5 hover:bg-red-50 -mx-6 px-6 transition-colors group">
                     <div className="flex items-center gap-3">
                       <Trash2 className="w-[18px] h-[18px] text-red-400 group-hover:text-red-600 transition-colors" />
                       <span className="text-[13px] font-bold text-red-700 group-hover:text-red-700 transition-colors">{t("Delete Account")}</span>
                     </div>
                     <ChevronDown className="w-4 h-4 text-slate-300 transform -rotate-90 group-hover:text-red-600 transition-colors" />
                   </button>
                 </div>
              </div>
            </div>
            )}
          </div>
        </form>
      </div>
      {isOtpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          {/* Glass backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={handleCancelOtp}
          />
          
          {/* Modal Container */}
          <div className="relative font-bold bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-sm w-full text-center overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            {/* Decorative glow */}
            <div className="absolute -top-10 -left-10 w-24 h-24 bg-violet-400/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-indigo-400/20 rounded-full blur-2xl pointer-events-none" />

            <div className="relative">
              {/* Icon */}
              <div className="mx-auto w-12 h-12 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>

              <h3 className="text-base font-semibold text-slate-800 tracking-tight">{t("Verify Mobile Number")}</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed font-normal">{t("We sent a 6-digit verification code to")} <strong className="text-slate-800 font-medium">{verifyingPhone || "your mobile number"}</strong>{t(". Enter it below to save your profile.")}</p>

              {/* Input */}
              <div className="my-5">
                <input
                  type="text"
                  maxLength={6}
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder={t("Enter 6-digit OTP")}
                  className="w-full text-center tracking-widest text-lg font-medium py-2.5 px-4 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-100 outline-none bg-slate-50/50 shadow-inner transition placeholder:tracking-normal placeholder:font-normal placeholder:text-xs placeholder:text-slate-400"
                />
              </div>

              {/* Resend */}
              <div className="mb-5">
                {resendCountdown > 0 ? (
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{t("Resend code in")} <span className="text-violet-600 font-semibold">{resendCountdown}{t("s")}</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={sendingOtp}
                    className="text-[10px] font-semibold text-violet-600 hover:text-violet-700 uppercase tracking-wider underline outline-none"
                  >{t("Resend Code")}</button>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCancelOtp}
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium text-xs transition active:scale-95 outline-none"
                >{t("Cancel")}</button>
                <button
                  type="button"
                  onClick={async () => {
                    if (emailOtp.length !== 6) {
                      toast.error("Please enter a 6-digit OTP");
                      return;
                    }
                    if (!confirmationResult) {
                      toast.error("Verification session expired. Please resend OTP.");
                      return;
                    }
                    setSaving(true);
                    try {
                      const result = await confirmationResult.confirm(emailOtp);
                      const token = await result.user.getIdToken(true);
                      setFirebaseToken(token);
                      toast.success("Phone verified!");
                      // Use a timeout to allow the state to update, then trigger handleSave
                      setTimeout(() => handleSave(null, token), 100);
                    } catch (err) {
                      toast.error("Invalid or expired OTP");
                      setSaving(false);
                    }
                  }}
                  disabled={saving || emailOtp.length !== 6}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-extrabold py-2 rounded-xl shadow-md transition active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-xs flex items-center justify-center gap-1.5 outline-none"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{t("Saving...")}</span>
                    </>
                  ) : (
                    <span>{t("Confirm")}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Recaptcha Container */}
      <div id="profile-recaptcha-container"></div>
      {/* Erasure Modal */}
      {showErasureModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-red-100 animate-fadeIn">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <ShieldAlert className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-2">{t("Permanent Data Erasure")}</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">{t(
                "This action is irreversible. All your data, including profiles, matches, leads, jobs, resumes, and communications, will be wiped out."
              )}</p>

              <div className="w-full bg-red-50 p-4 rounded-xl text-left border border-red-100 mb-6 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-700 mt-0.5 shrink-0" />
                  <span className="text-xs font-semibold text-red-800">{t("All data removed. No backup available.")}</span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-700 mt-0.5 shrink-0" />
                  <span className="text-xs font-semibold text-red-800">{t("No storage maintained on our servers.")}</span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-700 mt-0.5 shrink-0" />
                  <span className="text-xs font-semibold text-red-800">{t("Lucohire is not responsible for data loss.")}</span>
                </div>
              </div>

              <label className="flex items-start gap-3 w-full mb-6 cursor-pointer group text-left">
                <input
                  type="checkbox"
                  checked={erasureConsent}
                  onChange={(e) => setErasureConsent(e.target.checked)}
                  className="mt-1 shrink-0 cursor-pointer rounded text-red-600 focus:ring-red-500"
                />
                <span className="text-[11px] text-slate-600 font-medium select-none group-hover:text-slate-800 transition-colors leading-tight">{t(
                  "I understand that clicking confirm will permanently wipe out all my data from the Lucohire network immediately for legal compliance."
                )}</span>
              </label>

              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setShowErasureModal(false)}
                  disabled={isErasing}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs transition active:scale-95 disabled:opacity-50"
                >{t("Cancel")}</button>
                <button
                  type="button"
                  onClick={handleEraseAccount}
                  disabled={!erasureConsent || isErasing}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl shadow-[0_4px_10px_rgba(220,38,38,0.3)] transition active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-xs flex items-center justify-center gap-1.5"
                >
                  {isErasing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{t("Erasing...")}</span>
                    </>
                  ) : (
                    <span>{t("Confirm Deletion")}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Share Profile Modal */}
      {isShareModalOpen && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => setIsShareModalOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 relative overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsShareModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 bg-slate-100 hover:text-slate-800 hover:bg-slate-200 p-2 rounded-full transition-all outline-none z-10 shadow-sm flex items-center justify-center"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mb-4">
                <Share2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-slate-800 tracking-tight">{t("Share Your Profile")}</h3>
              <p className="text-xs text-slate-400 font-semibold mt-1 mb-6">{t(
                "Spread the word! Copy the link or share it directly to your social networks."
              )}</p>

              {/* Share Channels Grid */}
              <div className="grid grid-cols-3 gap-4 w-full mb-6">
                {/* WhatsApp */}
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent("Check out my professional profile on Lucohire: " + shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-100 hover:border-violet-100 hover:bg-violet-50/30 transition-all duration-200 group"
                >
                  <div className="w-10 h-10 rounded-full bg-[#075E54]/10 text-[#075E54] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436.002 9.858-4.41 9.86-9.85.001-2.636-1.02-5.115-2.875-6.973-1.854-1.859-4.326-2.882-6.966-2.883-5.438 0-9.862 4.412-9.865 9.853-.001 1.765.46 3.49 1.336 5.01l-.988 3.6 3.693-.968zm10.741-6.98c-.28-.14-1.65-.815-1.905-.907-.255-.093-.44-.139-.626.14-.185.28-.718.907-.88 1.092-.163.186-.325.21-.605.07-.28-.14-1.18-.435-2.247-1.388-.83-.74-1.388-1.653-1.55-1.93-.163-.28-.018-.43.122-.57.126-.127.28-.326.42-.489.14-.163.186-.28.28-.465.093-.186.046-.35-.023-.49-.07-.14-.626-1.507-.858-2.065-.226-.54-.452-.465-.626-.475-.162-.008-.348-.01-.533-.01-.186 0-.488.07-.743.35-.255.28-.975.953-.975 2.326 0 1.373 1 2.7 1.14 2.885.14.186 1.967 3.003 4.76 4.21.665.286 1.184.457 1.587.585.67.213 1.277.183 1.757.11.536-.08 1.65-.674 1.884-1.326.233-.652.233-1.21.163-1.325-.07-.11-.255-.21-.536-.35z" />
                    </svg>
                  </div>
                  <span className="text-[10px] text-slate-650 font-bold">{t("WhatsApp")}</span>
                </a>

                {/* Facebook */}
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-100 hover:border-violet-100 hover:bg-violet-50/30 transition-all duration-200 group"
                >
                  <div className="w-10 h-10 rounded-full bg-[#1877F2]/10 text-[#1877F2] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </div>
                  <span className="text-[10px] text-slate-650 font-bold">{t("Facebook")}</span>
                </a>

                {/* Twitter / X */}
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent("Check out my professional profile on Lucohire:")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-100 hover:border-violet-100 hover:bg-violet-50/30 transition-all duration-200 group"
                >
                  <div className="w-10 h-10 rounded-full bg-[#000000]/10 text-slate-800 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </div>
                  <span className="text-[10px] text-slate-650 font-bold">{t("Twitter / X")}</span>
                </a>

                {/* LinkedIn */}
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-100 hover:border-violet-100 hover:bg-violet-50/30 transition-all duration-200 group"
                >
                  <div className="w-10 h-10 rounded-full bg-[#0A66C2]/10 text-[#0A66C2] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M22.23 0H1.77C.8 0 0 .77 0 1.72v20.56C0 23.23.8 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.2 0 22.23 0zM7.12 20.45H3.56V9H7.12v11.45zM5.34 7.43c-1.14 0-2.06-.92-2.06-2.06 0-1.14.92-2.06 2.06-2.06 1.14 0 2.06.92 2.06 2.06 0 1.14-.92 2.06-2.06 2.06zm15.11 13.02h-3.56v-5.6c0-1.34-.03-3.05-1.86-3.05-1.86 0-2.14 1.45-2.14 2.95v5.7H9.33V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29z" />
                    </svg>
                  </div>
                  <span className="text-[10px] text-slate-650 font-bold">{t("LinkedIn")}</span>
                </a>

                {/* Telegram */}
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent("Check out my professional profile on Lucohire:")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-100 hover:border-violet-100 hover:bg-violet-50/30 transition-all duration-200 group"
                >
                  <div className="w-10 h-10 rounded-full bg-[#0088cc]/10 text-[#0088cc] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M11.944 0C5.344 0 0 5.344 0 11.944c0 6.6 5.344 11.944 11.944 11.944 6.6 0 11.944-5.344 11.944-11.944C23.888 5.344 18.544 0 11.944 0zm5.836 8.261l-1.9 8.95c-.14.64-.52.8-.06.54l-2.9-2.14-1.4 1.35c-.15.15-.28.27-.57.27l.2-2.95 5.37-4.85c.23-.2-.05-.31-.36-.1l-6.64 4.18-2.86-.9c-.62-.2-.63-.62.13-.92l11.16-4.3c.52-.2.97.11.83.92z" />
                    </svg>
                  </div>
                  <span className="text-[10px] text-slate-650 font-bold">{t("Telegram")}</span>
                </a>

                {/* Instagram (Tips) */}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    toast.success("Link copied! Paste it in your Instagram bio or story.");
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-100 hover:border-violet-100 hover:bg-violet-50/30 transition-all duration-200 group w-full outline-none"
                >
                  <div className="w-10 h-10 rounded-full bg-[#E1306C]/10 text-[#E1306C] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                    </svg>
                  </div>
                  <span className="text-[10px] text-slate-650 font-bold">{t("Instagram")}</span>
                </button>
              </div>

              {/* Copy Link Input box */}
              <div className="w-full flex items-center gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-100 shadow-inner">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-transparent text-xs font-semibold text-slate-700 outline-none px-2 select-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    toast.success("Link copied!");
                  }}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition active:scale-95 shrink-0"
                >{t("Copy")}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Terms and Conditions Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-800">
                  {t("Terms and Conditions")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-600 leading-relaxed">
              <h4 className="font-bold text-slate-800 text-base">1. Candidate Agreement & Terms</h4>
              <p>By registering and using Lucohire, you agree to provide accurate, current, and complete profile information. You maintain control over your contact visibility settings at all times.</p>

              <h4 className="font-bold text-slate-800 text-base">2. Contact Visibility & SEO Options</h4>
              <p>Public SEO profiles allow search engines to index public details. Optional features such as direct WhatsApp contact require candidate consent and carry additional charges (₹1 per day) billed via subscription plans.</p>

              <h4 className="font-bold text-slate-800 text-base">3. Privacy & Data Use</h4>
              <p>Lucohire respects candidate privacy. Your contact details will only be disclosed according to your chosen preferences (Show Phone & Email, Show Email Only, Show Phone Only, or Hide All).</p>

              <h4 className="font-bold text-slate-800 text-base">4. Account Erasure</h4>
              <p>Candidates can permanently wipe their account data at any time under settings in compliance with privacy laws.</p>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1"
              >
                {t("Open Full Page")} <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => {
                  setAgreedToTerms(true);
                  setShowTermsModal(false);
                }}
                className="py-2 px-5 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 transition-colors"
              >
                {t("I Agree & Close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Parsed Resume Data Review Modal */}
      {parsedResumeData && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />{t("Review Parsed Details")}</h3>
              <button onClick={() => setParsedResumeData(null)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              <div className="space-y-6">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-2"><UserIcon className="w-4 h-4 text-slate-400" />{t("Personal Info")}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t("Full Name")}</p>
                      <input 
                        type="text" 
                        value={parsedResumeData.fullName || ''} 
                        onChange={(e) => setParsedResumeData({...parsedResumeData, fullName: e.target.value})}
                        className="w-full px-3 py-2 text-sm font-semibold text-slate-800 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                        placeholder={t("Not found")}
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t("City")}</p>
                      <input 
                        type="text" 
                        value={parsedResumeData.city || ''} 
                        onChange={(e) => setParsedResumeData({...parsedResumeData, city: e.target.value})}
                        className="w-full px-3 py-2 text-sm font-semibold text-slate-800 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                        placeholder={t("Not found")}
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t("Email")}</p>
                      <input 
                        type="text" 
                        value={parsedResumeData.email || ''} 
                        onChange={(e) => setParsedResumeData({...parsedResumeData, email: e.target.value})}
                        className="w-full px-3 py-2 text-sm font-semibold text-slate-800 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                        placeholder={t("Not found")}
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t("LinkedIn")}</p>
                      <input 
                        type="text" 
                        value={parsedResumeData.linkedin || ''} 
                        onChange={(e) => setParsedResumeData({...parsedResumeData, linkedin: e.target.value})}
                        className="w-full px-3 py-2 text-sm font-semibold text-slate-800 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                        placeholder={t("Not found")}
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t("GitHub")}</p>
                      <input 
                        type="text" 
                        value={parsedResumeData.github || ''} 
                        onChange={(e) => setParsedResumeData({...parsedResumeData, github: e.target.value})}
                        className="w-full px-3 py-2 text-sm font-semibold text-slate-800 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                        placeholder={t("Not found")}
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t("Bio / Summary")}</p>
                      <textarea 
                        value={parsedResumeData.bio || ''} 
                        onChange={(e) => setParsedResumeData({...parsedResumeData, bio: e.target.value})}
                        className="w-full px-3 py-2 text-sm text-slate-700 leading-relaxed border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all min-h-[80px] resize-y"
                        placeholder={t("Not found")}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-2"><Briefcase className="w-4 h-4 text-slate-400" />{t("Professional Details")}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t("Experience")}</p>
                      <input 
                        type="text" 
                        value={parsedResumeData.experienceYears || ''} 
                        onChange={(e) => setParsedResumeData({...parsedResumeData, experienceYears: e.target.value})}
                        className="w-full px-3 py-2 text-sm font-semibold text-slate-800 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                        placeholder={t("Not found")}
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t("Suggested Pricing")}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">₹</span>
                        <input 
                          type="number" 
                          value={parsedResumeData.pricing || ''} 
                          onChange={(e) => setParsedResumeData({...parsedResumeData, pricing: e.target.value})}
                          className="w-full px-3 py-2 text-sm font-semibold text-emerald-700 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                          placeholder={t("0")}
                        />
                      </div>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">{t("Skills")}<span className="text-xs font-normal text-slate-400 normal-case">{t("(comma separated)")}</span>
                      </p>
                      <input
                        type="text"
                        value={(parsedResumeData.skills || []).join(', ')}
                        onChange={(e) => setParsedResumeData({...parsedResumeData, skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                        className="w-full px-3 py-2 text-sm font-semibold text-indigo-700 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                        placeholder={t("Skill 1, Skill 2")}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-2"><Book className="w-4 h-4 text-slate-400" />{t("Experience & Education")}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">{t("Previous Work")}</p>
                      {parsedResumeData.previousWork?.length > 0 ? parsedResumeData.previousWork.map((w, i) => (
                        <div key={i} className="mb-3 last:mb-0 border border-slate-100 p-2 rounded-lg relative">
                          <input type="text" value={w.role || w.designation || ''} onChange={e => { const nw = [...parsedResumeData.previousWork]; nw[i].role = e.target.value; setParsedResumeData({...parsedResumeData, previousWork: nw}); }} className="w-full text-sm font-bold text-slate-800 bg-transparent outline-none border-b border-slate-200 focus:border-indigo-400 mb-1" placeholder={t("Role / Designation")} />
                          <input type="text" value={w.company} onChange={e => { const nw = [...parsedResumeData.previousWork]; nw[i].company = e.target.value; setParsedResumeData({...parsedResumeData, previousWork: nw}); }} className="w-full text-[13px] text-slate-500 bg-transparent outline-none border-b border-slate-200 focus:border-indigo-400" placeholder={t("Company")} />
                        </div>
                      )) : <p className="text-sm text-slate-400 italic">{t("Not found")}</p>}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">{t("Education")}</p>
                      {parsedResumeData.education?.length > 0 ? parsedResumeData.education.map((e, i) => (
                        <div key={i} className="mb-3 last:mb-0 border border-slate-100 p-2 rounded-lg relative">
                          <input type="text" value={e.degree} onChange={ev => { const ne = [...parsedResumeData.education]; ne[i].degree = ev.target.value; setParsedResumeData({...parsedResumeData, education: ne}); }} className="w-full text-sm font-bold text-slate-800 bg-transparent outline-none border-b border-slate-200 focus:border-indigo-400 mb-1" placeholder={t("Degree")} />
                          <input type="text" value={e.institution} onChange={ev => { const ne = [...parsedResumeData.education]; ne[i].institution = ev.target.value; setParsedResumeData({...parsedResumeData, education: ne}); }} className="w-full text-[13px] text-slate-500 bg-transparent outline-none border-b border-slate-200 focus:border-indigo-400" placeholder={t("Institution")} />
                        </div>
                      )) : <p className="text-sm text-slate-400 italic">{t("Not found")}</p>}
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-2"><Book className="w-4 h-4 text-slate-400" />{t("Projects & Links")}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">{t("Projects")}</p>
                      {parsedResumeData.projects?.length > 0 ? parsedResumeData.projects.map((p, i) => (
                        <div key={i} className="mb-3 last:mb-0 border border-slate-100 p-2 rounded-lg relative">
                          <input type="text" value={p.name || ''} onChange={ev => { const np = [...parsedResumeData.projects]; np[i].name = ev.target.value; setParsedResumeData({...parsedResumeData, projects: np}); }} className="w-full text-sm font-bold text-slate-800 bg-transparent outline-none border-b border-slate-200 focus:border-indigo-400 mb-1" placeholder={t("Project Name")} />
                          <input type="text" value={p.link || ''} onChange={ev => { const np = [...parsedResumeData.projects]; np[i].link = ev.target.value; setParsedResumeData({...parsedResumeData, projects: np}); }} className="w-full text-[13px] text-emerald-600 bg-transparent outline-none border-b border-slate-200 focus:border-indigo-400 mb-2" placeholder={t("Project Link")} />
                          <textarea value={p.description || ''} onChange={ev => { const np = [...parsedResumeData.projects]; np[i].description = ev.target.value; setParsedResumeData({...parsedResumeData, projects: np}); }} className="w-full text-[12px] text-slate-600 bg-transparent outline-none border border-slate-200 rounded p-1.5 focus:border-indigo-400 resize-none h-16" placeholder={t("Project Description")} />
                        </div>
                      )) : <p className="text-sm text-slate-400 italic">{t("Not found")}</p>}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-between">{t("Portfolio Links")}<span className="text-xs font-normal text-slate-400 normal-case">{t("(comma separated)")}</span>
                      </p>
                      <textarea
                        value={(parsedResumeData.portfolioLinks || []).join(', ')}
                        onChange={(e) => setParsedResumeData({...parsedResumeData, portfolioLinks: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                        className="w-full px-3 py-2 text-sm font-semibold text-emerald-700 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all min-h-[80px]"
                        placeholder={t("Link 1, Link 2")}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 flex justify-end gap-3 shrink-0 bg-white">
              <button onClick={() => setParsedResumeData(null)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">{t("Cancel")}</button>
              <button onClick={confirmParsedData} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm flex items-center gap-2">
                <Check className="w-4 h-4" />{t("Confirm & Auto-fill Profile")}</button>
            </div>
          </div>
        </div>
      )}
      {/* Unsaved Changes Warning Modal for Sidebar Links */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold text-slate-800 mb-2">{t("Unsaved Changes")}</h3>
            <p className="text-[14px] text-slate-600 mb-6">
              {t("You have unsaved changes on your profile. Please choose how you want to proceed.")}
            </p>
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setShowUnsavedWarning(false);
                  setPendingTab(null);
                }}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200 order-3 sm:order-1 disabled:opacity-50"
              >
                {t("Keep Editing")}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setShowUnsavedWarning(false);
                  window.lucodeProfileIsDirty = false;
                  
                  fetchProfile(); // run in background, don't block UI

                  if (pendingTab === 'POP_STATE_BACK') {
                    window.history.back();
                  } else if (pendingTab === 'LOGOUT') {
                    if (typeof window.lucodeAuthLogout === 'function') window.lucodeAuthLogout();
                  } else if (pendingTab?.startsWith("tab:")) {
                    setActiveTab(pendingTab.replace("tab:", ""));
                  } else {
                    navigate(pendingTab);
                  }
                  setPendingTab(null);
                  window.scrollTo(0, 0);
                }}
                className="px-4 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors order-2 sm:order-2 disabled:opacity-50"
              >
                {t("Discard")}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  if (validateForm()) {
                    window.lucodeProfileIsDirty = false;
                    setShowUnsavedWarning(false);
                    
                    // Trigger save in background and skip redirect
                    handleSave(e, null, true).catch(() => {});
                    
                    // Navigate immediately
                    if (pendingTab === 'POP_STATE_BACK') {
                      window.history.back();
                    } else if (pendingTab === 'LOGOUT') {
                      if (typeof window.lucodeAuthLogout === 'function') window.lucodeAuthLogout();
                    } else if (pendingTab?.startsWith("tab:")) {
                      setActiveTab(pendingTab.replace("tab:", ""));
                    } else {
                      navigate(pendingTab);
                    }
                    setPendingTab(null);
                    window.scrollTo(0, 0);
                  } else {
                    // Validation failed (goToError handled the UI), just close the modal so they can fix it
                    setShowUnsavedWarning(false);
                    setPendingTab(null);
                  }
                }}
                className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors order-1 sm:order-3"
              >
                {t("Save & Leave")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderProfile;
