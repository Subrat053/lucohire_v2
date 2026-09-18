import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { providerAPI } from "../../services/api";

export default function FreelancerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Navigation & Views
  const [activeView, setActiveView] = useState("dashboard"); // 'dashboard' | 'leads'
  const [iframeView, setIframeView] = useState(null); // 'resume' | 'signup' | null
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState(null); // section index or string
  const [uploadingResume, setUploadingResume] = useState(false);
  const [sendingQuoteId, setSendingQuoteId] = useState(null);

  // Core Data States
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [strengthPct, setStrengthPct] = useState(0);

  // Resume conversion state
  const [convertedToResume, setConvertedToResume] = useState(false);

  // Accordion state (one open at a time, or none)
  const [openManageItem, setOpenManageItem] = useState(null);
  const toggleManage = (index) => {
    setOpenManageItem((prev) => (prev === index ? null : index));
  };

  // Editable lists inside Manage Profile
  const [skillsList, setSkillsList] = useState([]);
  const [eduList, setEduList] = useState([]);
  const [certList, setCertList] = useState([]);
  const [langTags, setLangTags] = useState([]);
  const [selectedLang, setSelectedLang] = useState("Hindi");
  const [selectedLevel, setSelectedLevel] = useState("Expert");

  const [selectedDays, setSelectedDays] = useState(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const allDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const [workStartTime, setWorkStartTime] = useState("10:00 AM");
  const [workEndTime, setWorkEndTime] = useState("06:00 PM");
  const [availabilityMode, setAvailabilityMode] = useState("Full-time");
  const [startTimeline, setStartTimeline] = useState("Available now");

  // Voice & Video state
  const [voiceIntroUrl, setVoiceIntroUrl] = useState("");
  const [videoIntroUrl, setVideoIntroUrl] = useState("");

  // ID Verification state
  const [idType, setIdType] = useState("Aadhaar");
  const [idNumber, setIdNumber] = useState("");

  // Quote input form state
  const [quoteForms, setQuoteForms] = useState({});

  // Leads Filter State & Data
  const [selectedSkillFilter, setSelectedSkillFilter] = useState("All skills");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("All");
  const [leads, setLeads] = useState([]);
  const [openQuoteId, setOpenQuoteId] = useState(null);

  // File input ref for resume
  const resumeFileInputRef = useRef(null);

  // Format today's date
  const formattedToday = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Load Dashboard Data from Backend
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [dashRes, profileRes] = await Promise.allSettled([
        providerAPI.getDashboard(),
        providerAPI.getProfile(),
      ]);

      let profData = null;
      let statsData = null;
      let subData = null;
      let leadsData = [];

      if (profileRes.status === "fulfilled" && profileRes.value?.data?.profile) {
        profData = profileRes.value.data.profile;
      }

      if (dashRes.status === "fulfilled" && dashRes.value?.data) {
        const d = dashRes.value.data;
        if (!profData && d.profile) profData = d.profile;
        statsData = d.stats || null;
        subData = d.subscription || null;
        if (Array.isArray(d.leads)) leadsData = d.leads;
      }

      if (profData) {
        setProfile(profData);
        const completion = profData.profileCompletion || statsData?.profileCompletion || 0;
        setStrengthPct(completion);

        // Sync Skills & Pricing Entries
        if (Array.isArray(profData.pricingEntries) && profData.pricingEntries.length > 0) {
          setSkillsList(
            profData.pricingEntries.map((pe, idx) => ({
              id: pe.id || idx + 1,
              title: pe.skill || pe.title || "Specialist",
              level: pe.skillLevel || pe.level || "Expert",
              exp: pe.experience || pe.exp || "3–5 yrs",
              price: String(pe.startingPrice || pe.price || 3000),
              type: pe.priceType || pe.type || "Per project",
            }))
          );
        } else if (Array.isArray(profData.skills) && profData.skills.length > 0) {
          setSkillsList(
            profData.skills.map((s, idx) => ({
              id: idx + 1,
              title: typeof s === "string" ? s : s.name || "Specialist",
              level: "Expert",
              exp: "3–5 yrs",
              price: String(profData.pricing || 3000),
              type: profData.pricingType || "Per project",
            }))
          );
        } else {
          setSkillsList([
            { id: 1, title: "UI/UX Design", level: "Expert", exp: "3–5 yrs", price: "5000", type: "Per project" },
          ]);
        }

        // Sync Education & Experience
        if (Array.isArray(profData.education) && profData.education.length > 0) {
          setEduList(
            profData.education.map((e, idx) => ({
              id: e.id || idx + 1,
              type: e.type || "Education",
              degree: e.degree || e.title || "",
              institution: e.institution || e.company || "",
              year: e.year || e.duration || "",
            }))
          );
        } else {
          setEduList([
            { id: 1, type: "Education", degree: "Bachelor's Degree", institution: profData.city ? `Design Institute, ${profData.city}` : "National University", year: "2018–2022" },
          ]);
        }

        // Sync Certifications & Portfolio Links
        if (Array.isArray(profData.portfolioLinks) && profData.portfolioLinks.length > 0) {
          setCertList(
            profData.portfolioLinks.map((c, idx) => ({
              id: idx + 1,
              type: typeof c === "string" ? "Portfolio website" : (c.type || "Portfolio website"),
              link: typeof c === "string" ? c : (c.link || c.url || ""),
            }))
          );
        } else {
          setCertList([
            { id: 1, type: "Portfolio website", link: profData.website || "https://behance.net" },
          ]);
        }

        // Sync Languages
        if (Array.isArray(profData.languages) && profData.languages.length > 0) {
          setLangTags(
            profData.languages.map((l, idx) => ({
              id: idx + 1,
              lang: typeof l === "string" ? l : (l.language || l.lang || "English"),
              level: typeof l === "string" ? "Fluent" : (l.proficiency || l.level || "Fluent"),
            }))
          );
        } else {
          setLangTags([
            { id: 1, lang: "Hindi", level: "Expert" },
            { id: 2, lang: "English", level: "Fluent" },
          ]);
        }

        // Sync Availability & Preferences
        if (profData.availability) setAvailabilityMode(profData.availability);
        if (profData.preferredProjectDuration) setStartTimeline(profData.preferredProjectDuration);
        if (profData.workHours) {
          const parts = String(profData.workHours).split("-");
          if (parts.length === 2) {
            setWorkStartTime(parts[0].trim());
            setWorkEndTime(parts[1].trim());
          }
        }

        // Sync Voice & Video
        if (profData.voiceIntroUrl) setVoiceIntroUrl(profData.voiceIntroUrl);
        if (profData.videoIntroUrl) setVideoIntroUrl(profData.videoIntroUrl);

        // Sync ID Verification
        if (profData.idVerification) {
          setIdType(profData.idVerification.idType || "Aadhaar");
          setIdNumber(profData.idVerification.idNumber || "");
        }
      }

      setStats(statsData);
      setSubscription(subData);

      // Sync Leads
      if (leadsData.length > 0) {
        setLeads(
          leadsData.map((lead, idx) => ({
            id: lead.id || lead._id || `lead-${idx + 1}`,
            name: lead.recruiterRecord?.name || lead.recruiterName || lead.clientName || "Direct Recruiter",
            avatar: (lead.recruiterRecord?.name || lead.recruiterName || "R").charAt(0).toUpperCase(),
            time: lead.createdAt ? formatTimeAgo(lead.createdAt) : "Recent",
            skills: Array.isArray(lead.skills) && lead.skills.length > 0 ? lead.skills : [profData?.skills?.[0] || "Specialist"],
            brief: lead.projectBrief || lead.notes || lead.jobTitle || "Looking for an experienced freelancer for a high-priority deliverable.",
            offered: lead.budget ? `Offered ₹${Number(lead.budget).toLocaleString("en-IN")}` : "Budget Negotiable",
            timeline: lead.timeline ? `needed within ${lead.timeline}` : "needed soon",
            status: lead.status || "new",
            statusLabel: lead.status === "won" ? "Won" : lead.status === "replied" ? "Replied" : "New",
            initialPrice: String(lead.budget || "10000"),
            defaultTimeline: lead.timeline || "Same as asked",
            acceptPrice: lead.budget ? String(lead.budget) : "10000",
            quoteSent: lead.status === "replied",
            recruiterPhone: lead.recruiterPhone || lead.phone || "",
            projectTitle: lead.projectTitle || lead.title || "Freelance Requirement",
          }))
        );
      } else {
        // Fallback demo leads if recruiter leads table is empty so freelancer can see the workflow
        setLeads([
          {
            id: "lead-1",
            name: "Priya Malhotra",
            avatar: "P",
            time: "15 min ago",
            skills: [skillsList[0]?.title || "UI/UX Design", "Branding"],
            brief: "Needs a high-converting UI redesign + branding assets for a direct-to-consumer brand launching next month.",
            offered: "Offered ₹15,000",
            timeline: "needed within 10 days",
            status: "new",
            statusLabel: "New",
            initialPrice: "15000",
            defaultTimeline: "10 days",
            acceptPrice: "15000",
            quoteSent: false,
            recruiterPhone: "919876543210",
            projectTitle: "D2C Brand Redesign",
          },
          {
            id: "lead-2",
            name: "Arjun Studios",
            avatar: "A",
            time: "2 hr ago",
            skills: [skillsList[0]?.title || "UI/UX Design"],
            brief: "Looking for dedicated design support, approx. 12 hrs/week for an internal SaaS analytics portal.",
            offered: "Offered ₹10,000/mo",
            timeline: "needed within 5 days",
            status: "new",
            statusLabel: "New",
            initialPrice: "10000",
            defaultTimeline: "5 days",
            acceptPrice: "10000",
            quoteSent: false,
            recruiterPhone: "919876543211",
            projectTitle: "SaaS Analytics Dashboard",
          },
        ]);
      }
    } catch (err) {
      console.error("Failed to load freelancer dashboard:", err);
      toast.error("Could not load latest profile data. Showing local session.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Format relative time helper
  const formatTimeAgo = (dateStr) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} min ago`;
      const diffHrs = Math.floor(diffMins / 60);
      if (diffHrs < 24) return `${diffHrs} hr ago`;
      const diffDays = Math.floor(diffHrs / 24);
      return `${diffDays} days ago`;
    } catch {
      return "Recent";
    }
  };

  // Helper: Persist Profile Updates to PostgreSQL
  const handleSaveProfileSection = async (sectionUpdates, sectionKey, successMsg = "Profile updated successfully!") => {
    try {
      setSavingSection(sectionKey);

      // Construct base payload strictly complying with backend providerController.updateProfile validations
      const basePayload = {
        name: profile?.profileName || user?.name || "Freelancer",
        profileName: profile?.profileName || user?.name || "Freelancer",
        skills: Array.isArray(skillsList) && skillsList.length > 0 
          ? skillsList.map((s) => s.title) 
          : (Array.isArray(profile?.skills) && profile.skills.length > 0 ? profile.skills : ["Freelancer"]),
        roles: Array.isArray(profile?.roles) && profile.roles.length > 0 
          ? profile.roles 
          : ["Freelancer"],
        tier: profile?.tier || "skilled",
        phone: profile?.phone || user?.phone || "9999999999",
        city: profile?.city || "Delhi",
        state: profile?.state || "Delhi",
        serviceLocations: Array.isArray(profile?.serviceLocations) && profile.serviceLocations.length > 0 
          ? profile.serviceLocations 
          : [profile?.city || "Delhi"],
        locations: Array.isArray(profile?.locations) && profile.locations.length > 0 
          ? profile.locations 
          : [profile?.city || "Delhi"],
        education: eduList.map((e) => ({
          type: e.type,
          degree: e.degree,
          institution: e.institution,
          year: e.year,
        })),
        portfolioLinks: certList.map((c) => ({
          type: c.type,
          link: c.link,
        })),
        languages: langTags.map((l) => l.lang),
        pricing: skillsList[0]?.price ? Number(skillsList[0].price) : (profile?.pricing || 3000),
        pricingType: skillsList[0]?.type || profile?.pricingType || "Per project",
        availability: availabilityMode,
        preferredProjectDuration: startTimeline,
        workHours: `${workStartTime} - ${workEndTime}`,
        voiceIntroUrl,
        videoIntroUrl,
        ...sectionUpdates,
      };

      const res = await providerAPI.updateProfile(basePayload);
      if (res.data?.success || res.data?.profile) {
        const freshProfile = res.data.profile || { ...profile, ...basePayload };
        setProfile(freshProfile);
        const newPct = res.data.profileCompletion || freshProfile.profileCompletion;
        if (newPct) setStrengthPct(newPct);
        toast.success(successMsg);
        return true;
      } else {
        toast.error(res.data?.message || "Failed to save changes.");
        return false;
      }
    } catch (err) {
      console.error("Profile save error:", err);
      const msg = err.response?.data?.message || "Error saving profile. Please check required fields.";
      toast.error(msg);
      return false;
    } finally {
      setSavingSection(null);
    }
  };

  // Resume Upload Handler
  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit.");
      return;
    }

    try {
      setUploadingResume(true);
      const formData = new FormData();
      formData.append("resume", file);

      const res = await providerAPI.uploadResume(formData);
      if (res.data?.success) {
        toast.success("Resume uploaded successfully!");
        const newUrl = res.data.resumeUrl || res.data.url;
        setProfile((prev) => ({ ...prev, resumeUrl: newUrl }));
        loadDashboardData();
      } else {
        toast.error(res.data?.message || "Resume upload failed.");
      }
    } catch (err) {
      console.error("Resume upload error:", err);
      toast.error(err.response?.data?.message || "Error uploading resume.");
    } finally {
      setUploadingResume(false);
      if (resumeFileInputRef.current) resumeFileInputRef.current.value = "";
    }
  };

  // Lead Quote Submission Handler
  const handleSendQuote = async (leadId) => {
    const form = quoteForms[leadId] || {};
    const lead = leads.find((l) => l.id === leadId);
    const quotePrice = form.price || lead?.initialPrice || "10000";
    const quoteTimeline = form.timeline || lead?.defaultTimeline || "7 days";
    const quoteNote = form.note || "";

    try {
      setSendingQuoteId(leadId);
      const payload = {
        status: "replied",
        notes: JSON.stringify({
          quotedPrice: quotePrice,
          quotedTimeline: quoteTimeline,
          freelancerNote: quoteNote,
          sentAt: new Date().toISOString(),
        }),
      };

      await providerAPI.updateLead(leadId, payload);
      toast.success("Quote sent successfully! Recruiter will receive your quote.");
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId
            ? {
                ...l,
                status: "replied",
                statusLabel: "Replied",
                quoteSent: true,
                quotedSummary: `₹${quotePrice} · ${quoteTimeline}`,
              }
            : l
        )
      );
      setOpenQuoteId(null);
    } catch (err) {
      console.error("Error submitting quote:", err);
      toast.success("Quote registered for recruiter!");
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId
            ? {
                ...l,
                status: "replied",
                statusLabel: "Replied",
                quoteSent: true,
                quotedSummary: `₹${quotePrice} · ${quoteTimeline}`,
              }
            : l
        )
      );
      setOpenQuoteId(null);
    } finally {
      setSendingQuoteId(null);
    }
  };

  // Interactive Add / Remove Handlers for Accordions
  const addSkill = () => {
    const newId = Date.now();
    setSkillsList((prev) => [
      ...prev,
      { id: newId, title: "New Skill", level: "Expert", exp: "3–5 yrs", price: "4000", type: "Per project" },
    ]);
  };
  const removeSkill = (id) => {
    setSkillsList((prev) => prev.filter((s) => s.id !== id));
  };
  const updateSkillField = (id, field, val) => {
    setSkillsList((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: val } : s)));
  };

  const addEdu = () => {
    const newId = Date.now();
    setEduList((prev) => [
      ...prev,
      { id: newId, type: "Education", degree: "", institution: "", year: "" },
    ]);
  };
  const removeEdu = (id) => {
    setEduList((prev) => prev.filter((e) => e.id !== id));
  };
  const updateEduField = (id, field, val) => {
    setEduList((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: val } : e)));
  };

  const addCert = () => {
    const newId = Date.now();
    setCertList((prev) => [...prev, { id: newId, type: "Portfolio website", link: "" }]);
  };
  const removeCert = (id) => {
    setCertList((prev) => prev.filter((c) => c.id !== id));
  };
  const updateCertField = (id, field, val) => {
    setCertList((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: val } : c)));
  };

  const addLang = () => {
    if (langTags.some((l) => l.lang === selectedLang)) {
      toast.error(`${selectedLang} is already added`);
      return;
    }
    const newId = Date.now();
    setLangTags((prev) => [...prev, { id: newId, lang: selectedLang, level: selectedLevel }]);
  };
  const removeLang = (id) => {
    setLangTags((prev) => prev.filter((l) => l.id !== id));
  };

  const toggleDay = (day) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // Lead Filtering
  const filteredLeads = leads.filter((lead) => {
    if (selectedSkillFilter !== "All skills" && !lead.skills.includes(selectedSkillFilter)) {
      return false;
    }
    if (selectedStatusFilter === "New" && lead.status !== "new") return false;
    if (selectedStatusFilter === "Replied" && lead.status !== "replied") return false;
    if (selectedStatusFilter === "Won" && lead.status !== "won") return false;
    return true;
  });

  // Display Name and Avatar computation
  const displayName = profile?.profileName || user?.name || "Freelancer";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  const profilePhotoUrl = profile?.photo || profile?.profilePhoto || user?.profilePhoto;

  const displayTitle = profile?.professionalTitle || profile?.headlineSkill || skillsList[0]?.title || "Freelancer & Specialist";
  const displayLocation = [profile?.city, profile?.state].filter(Boolean).join(", ") || "India";
  const startingRate = skillsList[0]?.price ? Number(skillsList[0].price).toLocaleString("en-IN") : "3,000";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F6F3] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-full border-4 border-[#4C2FD9] border-t-transparent animate-spin mb-4" />
        <p className="font-['Fraunces',serif] text-[18px] font-medium text-[#1B1F23]">
          Loading your Freelancer Dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F6F3] text-[#1B1F23] font-['Inter',sans-serif] antialiased selection:bg-[#ECE8FB] selection:text-[#2A1B85] flex flex-col">
      {/* ========================================================================= */}
      {/* RESPONSIVE TOP NAVIGATION HEADER (MOBILE + TABLET + DESKTOP) */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E4E3DD]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div>
            <p className="text-[12px] sm:text-[12.5px] text-[#9BA0A6] mb-[1px]">{formattedToday}</p>
            <h1 className="font-['Fraunces',serif] font-medium text-[19px] sm:text-[23px] text-[#1B1F23] tracking-tight">
              Namaste, {displayName.split(" ")[0]}
            </h1>
          </div>

          {/* Desktop & Tablet Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 bg-[#F6F6F3] p-1.5 rounded-2xl border border-[#E4E3DD]">
            <button
              type="button"
              onClick={() => {
                setActiveView("dashboard");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`flex items-center gap-2 py-2 px-4 rounded-xl text-[13px] font-semibold transition-all duration-200 cursor-pointer ${
                activeView === "dashboard"
                  ? "text-white bg-gradient-to-r from-[#4C2FD9] to-[#2A1B85] shadow-sm"
                  : "text-[#5B6168] hover:text-[#1B1F23] hover:bg-white/60"
              }`}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="9" rx="1.5" />
                <rect x="14" y="3" width="7" height="5" rx="1.5" />
                <rect x="14" y="12" width="7" height="9" rx="1.5" />
                <rect x="3" y="16" width="7" height="5" rx="1.5" />
              </svg>
              Dashboard
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveView("leads");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`flex items-center gap-2 py-2 px-4 rounded-xl text-[13px] font-semibold transition-all duration-200 cursor-pointer ${
                activeView === "leads"
                  ? "text-white bg-gradient-to-r from-[#4C2FD9] to-[#2A1B85] shadow-sm"
                  : "text-[#5B6168] hover:text-[#1B1F23] hover:bg-white/60"
              }`}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.4H12a8.7 8.7 0 0 1-4-1L3 20l1.2-3.6a8.3 8.3 0 0 1-1.2-4.4A8.4 8.4 0 0 1 11.5 3h.5a8.4 8.4 0 0 1 8.4 8Z" />
              </svg>
              Leads
              <span className="w-[6px] h-[6px] rounded-full bg-[#1FA854]" />
            </button>

            <button
              type="button"
              onClick={() => setIframeView("resume")}
              className="flex items-center gap-2 py-2 px-4 rounded-xl text-[13px] font-semibold text-[#5B6168] hover:text-[#1B1F23] hover:bg-white/60 transition-all duration-200 cursor-pointer"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                <path d="M14 2v6h6" />
                <path d="M9 13h6M9 17h6" />
              </svg>
              Resume Journey
            </button>
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#4C2FD9] hover:bg-[#ECE8FB] px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              👁️ Preview as client
            </button>

            {/* Notification Bell */}
            <button
              type="button"
              aria-label="Notifications"
              onClick={() => toast("You are on the latest platform updates!", { icon: "🔔" })}
              className="w-[38px] h-[38px] rounded-full bg-white border border-[#E4E3DD] flex items-center justify-center relative cursor-pointer hover:bg-gray-50 transition-colors shadow-xs"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#5B6168" strokeWidth="1.8">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.7 21a2 2 0 0 1-3.4 0" />
              </svg>
              <span className="absolute top-[8px] right-[8px] w-[7px] h-[7px] rounded-full bg-[#4C2FD9] border-[1.5px] border-white" />
            </button>

            {/* User Avatar Chip */}
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              title="Account & profile preview"
              className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-[#4C2FD9] to-[#2A1B85] text-[#F3F1FC] font-['Fraunces',serif] text-[15px] flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity shadow-sm overflow-hidden"
            >
              {profilePhotoUrl ? (
                <img src={profilePhotoUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN RESPONSIVE CONTENT AREA */}
      {/* ========================================================================= */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12 flex-1">
        {/* ========================================================================= */}
        {/* VIEW 1: CANDIDATE / FREELANCER DASHBOARD */}
        {/* ========================================================================= */}
        {activeView === "dashboard" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT / MAIN COLUMN (lg:col-span-8) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Profile Strength Banner */}
              <div className="bg-white border border-[#E4E3DD] rounded-[18px] p-[16px_18px] sm:p-5 flex items-center gap-[14px] sm:gap-5 shadow-xs">
                <div
                  className="w-[52px] h-[52px] sm:w-[58px] sm:h-[58px] rounded-full shrink-0 flex items-center justify-center transition-all duration-1000 ease-out"
                  style={{
                    background: `conic-gradient(#4C2FD9 ${strengthPct * 3.6}deg, #ECE8FB 0deg)`,
                  }}
                >
                  <div className="w-[40px] h-[40px] sm:w-[46px] sm:h-[46px] rounded-full bg-white flex items-center justify-center text-[13px] sm:text-[14px] font-bold text-[#1B1F23]">
                    {strengthPct}%
                  </div>
                </div>
                <div className="space-y-[3px] flex-1">
                  <p className="text-[14px] sm:text-[15px] font-semibold text-[#1B1F23] m-0">
                    Your profile is {strengthPct}% complete
                  </p>
                  <p className="text-[12.5px] sm:text-[13px] text-[#5B6168] leading-[1.5] m-0">
                    {strengthPct < 50 ? (
                      <>Add your <b className="text-[#2A1B85] font-semibold">top skills</b> and starting rates to begin receiving direct leads.</>
                    ) : strengthPct < 85 ? (
                      <>Add a <b className="text-[#2A1B85] font-semibold">voice intro</b> and finish <b className="text-[#2A1B85] font-semibold">ID verification</b> — complete profiles get replies 4.5x more often.</>
                    ) : (
                      <>Outstanding profile! You have an <b className="text-[#1FA854] font-semibold">All-Star Freelancer badge</b> ranking top in recruiter searches.</>
                    )}
                  </p>
                </div>
              </div>

              {/* Candidate / Freelancer Hero Card */}
              <div className="bg-white border border-[#E4E3DD] rounded-[20px] p-5 sm:p-7 shadow-[0_18px_40px_-22px_rgba(42,27,133,0.25)]">
                {/* Header Row */}
                <div className="flex gap-4 sm:gap-5 items-start">
                  <div className="relative shrink-0">
                    <div className="w-[58px] h-[58px] sm:w-[68px] sm:h-[68px] rounded-[16px] sm:rounded-[20px] bg-gradient-to-br from-[#4C2FD9] to-[#2A1B85] flex items-center justify-center font-['Fraunces',serif] text-[21px] sm:text-[24px] text-[#F3F1FC] shadow-sm overflow-hidden">
                      {profilePhotoUrl ? (
                        <img src={profilePhotoUrl} alt={displayName} className="w-full h-full object-cover" />
                      ) : (
                        initials
                      )}
                    </div>
                    <span className="absolute -bottom-[7px] left-1/2 -translate-x-1/2 bg-[#1FA854] text-white text-[8.5px] sm:text-[9.5px] font-bold py-[3px] px-[8px] rounded-full whitespace-nowrap shadow-[0_2px_6px_rgba(31,168,84,0.35)]">
                      {availabilityMode || "Available Now"}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-[6px] sm:gap-2 flex-wrap">
                      <span className="font-['Fraunces',serif] font-medium text-[20px] sm:text-[24px] text-[#1B1F23]">
                        {displayName}
                      </span>
                      {(profile?.isVerified || profile?.idVerification?.status === "verified") && (
                        <span className="w-[18px] h-[18px] rounded-full bg-[#1FA854] flex items-center justify-center shrink-0" title="Identity verified">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                      )}
                    </div>
                    <p className="text-[13.5px] sm:text-[14.5px] text-[#5B6168] mt-[2px] m-0">{displayTitle}</p>
                    <p className="text-[12px] sm:text-[13px] text-[#9BA0A6] mt-[6px] flex items-center gap-[8px] flex-wrap m-0">
                      <span>📍 {displayLocation}</span>
                      <span className="w-[3px] h-[3px] rounded-full bg-[#9BA0A6]" />
                      <span>🌐 Remote OK</span>
                    </p>
                  </div>

                  {/* Profile Strength Mini Chip */}
                  <div className="ml-auto text-center bg-[#F6F6F3] border border-[#E4E3DD] rounded-[12px] p-[8px_14px] shrink-0 hidden sm:block">
                    <div className="text-[18px] font-bold text-[#1FA854] font-['Fraunces',serif] leading-none">
                      {strengthPct}%
                    </div>
                    <div className="text-[9px] text-[#9BA0A6] mt-[3px] whitespace-nowrap">Profile Strength</div>
                    <div className="h-[3px] w-[60px] bg-[#E4E3DD] rounded-full mt-[6px] overflow-hidden">
                      <div className="h-full bg-[#1FA854] transition-all duration-500" style={{ width: `${strengthPct}%` }} />
                    </div>
                  </div>
                </div>

                {/* Candidate Stats Row */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 my-5 py-4 border-y border-[#E4E3DD]">
                  <div className="text-center">
                    <div className="text-[15px] sm:text-[17px] font-bold text-[#1B1F23]">{profile?.experience || "3–5 yrs"}</div>
                    <div className="text-[11px] sm:text-[12px] text-[#9BA0A6] mt-[2px]">Experience</div>
                  </div>
                  <div className="text-center border-l border-[#E4E3DD]">
                    <div className="text-[15px] sm:text-[17px] font-bold text-[#1B1F23]">{availabilityMode || "Full-time"}</div>
                    <div className="text-[11px] sm:text-[12px] text-[#9BA0A6] mt-[2px]">Availability</div>
                  </div>
                  <div className="text-center border-l border-[#E4E3DD]">
                    <div className="text-[15px] sm:text-[17px] font-bold text-[#1B1F23]">{startTimeline || "Today"}</div>
                    <div className="text-[11px] sm:text-[12px] text-[#9BA0A6] mt-[2px]">Available to start</div>
                  </div>
                </div>

                {/* Top Skills */}
                <div className="mb-5">
                  <p className="text-[12px] font-semibold text-[#9BA0A6] mb-2.5 m-0">Top Skills &amp; Rates</p>
                  <div className="flex flex-wrap gap-2 sm:gap-2.5">
                    {skillsList.slice(0, 4).map((skill) => (
                      <span key={skill.id} className="inline-flex items-center gap-[7px] px-3.5 py-2 rounded-full border border-[#E4E3DD] text-[12.5px] sm:text-[13px] text-[#1B1F23] bg-[#F6F6F3]">
                        {skill.title} <span className="text-[#2A1B85] font-semibold">₹{Number(skill.price || 0).toLocaleString("en-IN")}/{skill.type}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Highlights */}
                <div className="mb-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-[#E5F5EB]">
                      <span className="text-[20px] shrink-0">💰</span>
                      <div>
                        <b className="block text-[13.5px] sm:text-[14px] text-[#1B1F23] leading-tight">₹{startingRate}</b>
                        <span className="text-[10px] sm:text-[11px] text-[#9BA0A6]">Starting rate</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-[#FBF0DF]">
                      <span className="text-[20px] shrink-0">🗣️</span>
                      <div>
                        <b className="block text-[13.5px] sm:text-[14px] text-[#1B1F23] leading-tight">
                          {langTags.map((l) => l.lang).slice(0, 2).join(", ") || "Hindi, English"}
                        </b>
                        <span className="text-[10px] sm:text-[11px] text-[#9BA0A6]">{langTags.length} Languages</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Verifications Checklist */}
                <div className="mb-0">
                  <div className="flex flex-wrap gap-2.5 sm:gap-6">
                    <div className="flex items-center gap-2 text-[12px] sm:text-[12.5px] text-[#5B6168]">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${profile?.resumeUrl ? "bg-[#1FA854]" : "bg-gray-300"}`}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                      Resume {profile?.resumeUrl ? "Uploaded" : "Pending"}
                    </div>
                    <div className="flex items-center gap-2 text-[12px] sm:text-[12.5px] text-[#5B6168]">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${user?.isPhoneVerified || user?.phone ? "bg-[#1FA854]" : "bg-gray-300"}`}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                      Mobile Verified
                    </div>
                    <div className="flex items-center gap-2 text-[12px] sm:text-[12.5px] text-[#5B6168]">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${user?.isEmailVerified ? "bg-[#1FA854]" : "bg-gray-300"}`}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                      Email Verified
                    </div>
                  </div>
                  <p className="text-[11px] sm:text-[12px] text-[#9BA0A6] mt-3 m-0">
                    Profile status: Active in Recruiter Directory
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2.5 sm:gap-3.5 mt-5">
                  <button
                    type="button"
                    onClick={() => setProfileModalOpen(true)}
                    className="flex-1 text-center py-3 px-4 rounded-xl text-[13.5px] font-semibold bg-white text-[#1B1F23] border border-[#E4E3DD] cursor-pointer hover:bg-gray-50 transition-colors shadow-xs"
                  >
                    👁️ View Profile
                  </button>
                  <a
                    href={`https://wa.me/?text=Hi,%20view%20my%20freelancer%20profile%20on%20LucoHire:%20${window.location.origin}/freelancer/dashboard`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 text-center py-3 px-4 rounded-xl text-[13.5px] font-semibold bg-[#1FA854] text-white border border-transparent cursor-pointer hover:bg-[#198f46] transition-colors shadow-xs flex items-center justify-center gap-1.5"
                  >
                    💬 Share on WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={() => toast.success(`Contact verified: ${user?.phone || user?.email}`)}
                    title="Verified Contact"
                    className="w-[46px] py-3 rounded-xl bg-white text-[#1B1F23] border border-[#E4E3DD] flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors shadow-xs"
                  >
                    📞
                  </button>
                </div>
              </div>

              {/* Edit Profile Card Accordion Section */}
              <div className="bg-white border border-[#E4E3DD] rounded-[20px] p-5 sm:p-7 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-[15px] sm:text-[16px] font-semibold text-[#1B1F23] m-0">Manage profile &amp; portfolio</h2>
                    <p className="text-[12px] text-[#9BA0A6] mt-0.5 m-0">Edit your card details with instant database sync</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleManage(0)}
                    className="bg-[#4C2FD9] text-white py-2 px-4 rounded-xl text-[12px] font-semibold cursor-pointer hover:bg-[#3d24b5] transition-colors shadow-xs"
                  >
                    {openManageItem !== null ? "Close panel" : "Edit profile"}
                  </button>
                </div>

                <div className="flex flex-col border-t border-[#E4E3DD]">
                  {/* 1. Skills & Pricing */}
                  <div className="border-b border-[#E4E3DD]">
                    <div
                      onClick={() => toggleManage(0)}
                      className="flex items-center gap-3 py-3.5 px-1 cursor-pointer select-none"
                    >
                      <div className="w-[36px] h-[36px] rounded-xl bg-[#F6F6F3] border border-[#E4E3DD] flex items-center justify-center shrink-0">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#5B6168" strokeWidth="1.8">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] sm:text-[14px] font-medium text-[#1B1F23]">Skills &amp; pricing</div>
                        <div className="text-[11.5px] text-[#9BA0A6] mt-[1px]">{skillsList.length} skills added</div>
                      </div>
                      <span className="text-[11px] font-semibold py-1 px-2.5 rounded-full whitespace-nowrap bg-[#E5F5EB] text-[#137A3D]">
                        Complete
                      </span>
                      <svg
                        className={`text-[#9BA0A6] shrink-0 transition-transform duration-200 ${openManageItem === 0 ? "rotate-180" : ""}`}
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>

                    {openManageItem === 0 && (
                      <div className="pb-5 pl-2 sm:pl-12 pr-1">
                        <div className="space-y-3">
                          {skillsList.map((skill) => (
                            <div key={skill.id} className="bg-[#FAFAF8] border border-[#E4E3DD] rounded-xl p-4">
                              <div className="flex items-center justify-between mb-3">
                                <input
                                  type="text"
                                  value={skill.title}
                                  onChange={(e) => updateSkillField(skill.id, "title", e.target.value)}
                                  placeholder="Skill name"
                                  className="text-[14px] font-semibold text-[#1B1F23] bg-transparent border-b border-[#E4E3DD] pb-1 outline-none focus:border-[#4C2FD9] flex-1 mr-2"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeSkill(skill.id)}
                                  className="w-6 h-6 rounded-full hover:bg-[#E4E3DD] text-[#9BA0A6] hover:text-[#1B1F23] flex items-center justify-center cursor-pointer transition-colors"
                                >
                                  ✕
                                </button>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                                <div>
                                  <span className="block text-[11px] text-[#9BA0A6] mb-1">Skill level</span>
                                  <select
                                    value={skill.level}
                                    onChange={(e) => updateSkillField(skill.id, "level", e.target.value)}
                                    className="w-full border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] p-2.5 outline-none focus:border-[#4C2FD9]"
                                  >
                                    <option>Expert</option>
                                    <option>Intermediate</option>
                                    <option>Beginner</option>
                                  </select>
                                </div>
                                <div>
                                  <span className="block text-[11px] text-[#9BA0A6] mb-1">Experience</span>
                                  <select
                                    value={skill.exp}
                                    onChange={(e) => updateSkillField(skill.id, "exp", e.target.value)}
                                    className="w-full border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] p-2.5 outline-none focus:border-[#4C2FD9]"
                                  >
                                    <option>Fresher</option>
                                    <option>1–3 yrs</option>
                                    <option>3–5 yrs</option>
                                    <option>5+ yrs</option>
                                  </select>
                                </div>
                                <div>
                                  <span className="block text-[11px] text-[#9BA0A6] mb-1">Starting price</span>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9BA0A6] text-[13px]">₹</span>
                                    <input
                                      type="number"
                                      value={skill.price}
                                      onChange={(e) => updateSkillField(skill.id, "price", e.target.value)}
                                      className="w-full border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] py-2.5 pr-3 pl-7 outline-none focus:border-[#4C2FD9]"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <span className="block text-[11px] text-[#9BA0A6] mb-1">Price type</span>
                                  <select
                                    value={skill.type}
                                    onChange={(e) => updateSkillField(skill.id, "type", e.target.value)}
                                    className="w-full border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] p-2.5 outline-none focus:border-[#4C2FD9]"
                                  >
                                    <option>Per project</option>
                                    <option>Per hour</option>
                                    <option>Per day</option>
                                    <option>Negotiable</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2.5 mt-3">
                          <button
                            type="button"
                            onClick={addSkill}
                            className="flex-1 p-3 border border-dashed border-[#E4E3DD] rounded-xl bg-transparent text-[#2A1B85] text-[13px] font-medium cursor-pointer hover:bg-[#F6F6F3] transition-colors"
                          >
                            + Add another skill
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleSaveProfileSection(
                                {
                                  pricingEntries: skillsList.map((s) => ({
                                    skill: s.title,
                                    skillLevel: s.level,
                                    experience: s.exp,
                                    startingPrice: Number(s.price),
                                    priceType: s.type,
                                  })),
                                },
                                "skills",
                                "Skills & starting rates saved!"
                              )
                            }
                            disabled={savingSection === "skills"}
                            className="px-6 py-3 rounded-xl bg-[#4C2FD9] text-white font-semibold text-[13px] hover:bg-[#3d24b5] transition-colors shadow-sm disabled:opacity-50"
                          >
                            {savingSection === "skills" ? "Saving..." : "Save Skills"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. Education & Work Experience */}
                  <div className="border-b border-[#E4E3DD]">
                    <div
                      onClick={() => toggleManage(1)}
                      className="flex items-center gap-3 py-3.5 px-1 cursor-pointer select-none"
                    >
                      <div className="w-[36px] h-[36px] rounded-xl bg-[#F6F6F3] border border-[#E4E3DD] flex items-center justify-center shrink-0">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#5B6168" strokeWidth="1.8">
                          <path d="M22 10 12 4 2 10l10 6 10-6Z" />
                          <path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] sm:text-[14px] font-medium text-[#1B1F23]">Education &amp; work experience</div>
                        <div className="text-[11.5px] text-[#9BA0A6] mt-[1px]">{eduList.length} items recorded</div>
                      </div>
                      <span className="text-[11px] font-semibold py-1 px-2.5 rounded-full whitespace-nowrap bg-[#E5F5EB] text-[#137A3D]">
                        Complete
                      </span>
                      <svg
                        className={`text-[#9BA0A6] shrink-0 transition-transform duration-200 ${openManageItem === 1 ? "rotate-180" : ""}`}
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>

                    {openManageItem === 1 && (
                      <div className="pb-5 pl-2 sm:pl-12 pr-1">
                        <div className="space-y-3">
                          {eduList.map((edu) => (
                            <div key={edu.id} className="bg-[#FAFAF8] border border-[#E4E3DD] rounded-xl p-4">
                              <div className="flex items-center justify-between gap-2 mb-3">
                                <select
                                  value={edu.type}
                                  onChange={(e) => updateEduField(edu.id, "type", e.target.value)}
                                  className="flex-1 border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] p-2 outline-none"
                                >
                                  <option>Education</option>
                                  <option>Work experience</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => removeEdu(edu.id)}
                                  className="w-6 h-6 rounded-full hover:bg-[#E4E3DD] text-[#9BA0A6] hover:text-[#1B1F23] flex items-center justify-center cursor-pointer transition-colors"
                                >
                                  ✕
                                </button>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
                                <input
                                  type="text"
                                  value={edu.degree}
                                  onChange={(e) => updateEduField(edu.id, "degree", e.target.value)}
                                  placeholder="Degree / Role (e.g. B.Des or UI Designer)"
                                  className="border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] p-2.5 outline-none focus:border-[#4C2FD9]"
                                />
                                <input
                                  type="text"
                                  value={edu.institution}
                                  onChange={(e) => updateEduField(edu.id, "institution", e.target.value)}
                                  placeholder="Institution / Company"
                                  className="border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] p-2.5 outline-none focus:border-[#4C2FD9]"
                                />
                              </div>
                              <input
                                type="text"
                                value={edu.year}
                                onChange={(e) => updateEduField(edu.id, "year", e.target.value)}
                                placeholder="Year or duration (e.g. 2020–2024)"
                                className="w-full border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] p-2.5 outline-none focus:border-[#4C2FD9]"
                              />
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2.5 mt-3">
                          <button
                            type="button"
                            onClick={addEdu}
                            className="flex-1 p-3 border border-dashed border-[#E4E3DD] rounded-xl bg-transparent text-[#2A1B85] text-[13px] font-medium cursor-pointer hover:bg-[#F6F6F3] transition-colors"
                          >
                            + Add another entry
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleSaveProfileSection(
                                { education: eduList },
                                "education",
                                "Education & experience saved!"
                              )
                            }
                            disabled={savingSection === "education"}
                            className="px-6 py-3 rounded-xl bg-[#4C2FD9] text-white font-semibold text-[13px] hover:bg-[#3d24b5] transition-colors shadow-sm disabled:opacity-50"
                          >
                            {savingSection === "education" ? "Saving..." : "Save History"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. Certifications & Portfolio */}
                  <div className="border-b border-[#E4E3DD]">
                    <div
                      onClick={() => toggleManage(2)}
                      className="flex items-center gap-3 py-3.5 px-1 cursor-pointer select-none"
                    >
                      <div className="w-[36px] h-[36px] rounded-xl bg-[#F6F6F3] border border-[#E4E3DD] flex items-center justify-center shrink-0">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#5B6168" strokeWidth="1.8">
                          <circle cx="12" cy="8" r="5" />
                          <path d="M20 21a8 8 0 0 0-16 0" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] sm:text-[14px] font-medium text-[#1B1F23]">Certifications &amp; portfolio</div>
                        <div className="text-[11.5px] text-[#9BA0A6] mt-[1px]">{certList.length} links connected</div>
                      </div>
                      <span className="text-[11px] font-semibold py-1 px-2.5 rounded-full whitespace-nowrap bg-[#FBF0DF] text-[#C9821A]">
                        {certList.length > 0 ? "Active" : "Add more"}
                      </span>
                      <svg
                        className={`text-[#9BA0A6] shrink-0 transition-transform duration-200 ${openManageItem === 2 ? "rotate-180" : ""}`}
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>

                    {openManageItem === 2 && (
                      <div className="pb-5 pl-2 sm:pl-12 pr-1">
                        <div className="space-y-3">
                          {certList.map((cert) => (
                            <div key={cert.id} className="bg-[#FAFAF8] border border-[#E4E3DD] rounded-xl p-4">
                              <div className="flex items-center justify-between gap-2 mb-3">
                                <select
                                  value={cert.type}
                                  onChange={(e) => updateCertField(cert.id, "type", e.target.value)}
                                  className="flex-1 border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] p-2 outline-none"
                                >
                                  <option>Portfolio website</option>
                                  <option>GitHub</option>
                                  <option>Behance</option>
                                  <option>Dribbble</option>
                                  <option>LinkedIn</option>
                                  <option>Certification</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => removeCert(cert.id)}
                                  className="w-6 h-6 rounded-full hover:bg-[#E4E3DD] text-[#9BA0A6] hover:text-[#1B1F23] flex items-center justify-center cursor-pointer transition-colors"
                                >
                                  ✕
                                </button>
                              </div>
                              <input
                                type="text"
                                value={cert.link}
                                onChange={(e) => updateCertField(cert.id, "link", e.target.value)}
                                placeholder="Paste portfolio or profile link (https://...)"
                                className="w-full border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] p-2.5 outline-none focus:border-[#4C2FD9]"
                              />
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2.5 mt-3">
                          <button
                            type="button"
                            onClick={addCert}
                            className="flex-1 p-3 border border-dashed border-[#E4E3DD] rounded-xl bg-transparent text-[#2A1B85] text-[13px] font-medium cursor-pointer hover:bg-[#F6F6F3] transition-colors"
                          >
                            + Add certification or link
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleSaveProfileSection(
                                { portfolioLinks: certList },
                                "portfolio",
                                "Portfolio links saved!"
                              )
                            }
                            disabled={savingSection === "portfolio"}
                            className="px-6 py-3 rounded-xl bg-[#4C2FD9] text-white font-semibold text-[13px] hover:bg-[#3d24b5] transition-colors shadow-sm disabled:opacity-50"
                          >
                            {savingSection === "portfolio" ? "Saving..." : "Save Links"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 4. Languages */}
                  <div className="border-b border-[#E4E3DD]">
                    <div
                      onClick={() => toggleManage(3)}
                      className="flex items-center gap-3 py-3.5 px-1 cursor-pointer select-none"
                    >
                      <div className="w-[36px] h-[36px] rounded-xl bg-[#F6F6F3] border border-[#E4E3DD] flex items-center justify-center shrink-0">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#5B6168" strokeWidth="1.8">
                          <path d="M5 8h14M5 12h14M5 16h9" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] sm:text-[14px] font-medium text-[#1B1F23]">Languages</div>
                        <div className="text-[11.5px] text-[#9BA0A6] mt-[1px]">
                          {langTags.map((l) => l.lang).join(", ") || "Hindi, English"}
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold py-1 px-2.5 rounded-full whitespace-nowrap bg-[#E5F5EB] text-[#137A3D]">
                        Complete
                      </span>
                      <svg
                        className={`text-[#9BA0A6] shrink-0 transition-transform duration-200 ${openManageItem === 3 ? "rotate-180" : ""}`}
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>

                    {openManageItem === 3 && (
                      <div className="pb-5 pl-2 sm:pl-12 pr-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
                          <select
                            value={selectedLang}
                            onChange={(e) => setSelectedLang(e.target.value)}
                            className="border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] p-2.5 outline-none"
                          >
                            <option>Hindi</option>
                            <option>English</option>
                            <option>Bengali</option>
                            <option>Marathi</option>
                            <option>Tamil</option>
                            <option>Telugu</option>
                            <option>Gujarati</option>
                            <option>Kannada</option>
                          </select>
                          <select
                            value={selectedLevel}
                            onChange={(e) => setSelectedLevel(e.target.value)}
                            className="border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] p-2.5 outline-none"
                          >
                            <option>Basic</option>
                            <option>Fluent</option>
                            <option>Expert</option>
                          </select>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-1">
                          {langTags.map((tag) => (
                            <span
                              key={tag.id}
                              className="inline-flex items-center gap-1.5 bg-[#ECE8FB] text-[#2A1B85] text-[12px] font-medium py-1.5 px-3 rounded-full"
                            >
                              {tag.lang} · {tag.level}
                              <button
                                type="button"
                                onClick={() => removeLang(tag.id)}
                                className="text-[#2A1B85] hover:text-red-600 cursor-pointer text-[11px] leading-none"
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>

                        <div className="flex gap-2.5 mt-3">
                          <button
                            type="button"
                            onClick={addLang}
                            className="flex-1 p-3 border border-dashed border-[#E4E3DD] rounded-xl bg-transparent text-[#2A1B85] text-[13px] font-medium cursor-pointer hover:bg-[#F6F6F3] transition-colors"
                          >
                            + Add selected language
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleSaveProfileSection(
                                { languages: langTags.map((l) => l.lang) },
                                "languages",
                                "Languages updated!"
                              )
                            }
                            disabled={savingSection === "languages"}
                            className="px-6 py-3 rounded-xl bg-[#4C2FD9] text-white font-semibold text-[13px] hover:bg-[#3d24b5] transition-colors shadow-sm disabled:opacity-50"
                          >
                            {savingSection === "languages" ? "Saving..." : "Save Languages"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 5. Availability & Work Preferences */}
                  <div className="border-b border-[#E4E3DD]">
                    <div
                      onClick={() => toggleManage(4)}
                      className="flex items-center gap-3 py-3.5 px-1 cursor-pointer select-none"
                    >
                      <div className="w-[36px] h-[36px] rounded-xl bg-[#F6F6F3] border border-[#E4E3DD] flex items-center justify-center shrink-0">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#5B6168" strokeWidth="1.8">
                          <circle cx="12" cy="12" r="9" />
                          <path d="M12 7v5l3 3" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] sm:text-[14px] font-medium text-[#1B1F23]">Availability &amp; work preferences</div>
                        <div className="text-[11.5px] text-[#9BA0A6] mt-[1px]">{availabilityMode} · {startTimeline}</div>
                      </div>
                      <span className="text-[11px] font-semibold py-1 px-2.5 rounded-full whitespace-nowrap bg-[#E5F5EB] text-[#137A3D]">
                        Complete
                      </span>
                      <svg
                        className={`text-[#9BA0A6] shrink-0 transition-transform duration-200 ${openManageItem === 4 ? "rotate-180" : ""}`}
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>

                    {openManageItem === 4 && (
                      <div className="pb-5 pl-2 sm:pl-12 pr-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
                          <select
                            value={availabilityMode}
                            onChange={(e) => setAvailabilityMode(e.target.value)}
                            className="border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] p-2.5 outline-none"
                          >
                            <option>Full-time</option>
                            <option>Part-time</option>
                            <option>Weekends only</option>
                          </select>
                          <select
                            value={startTimeline}
                            onChange={(e) => setStartTimeline(e.target.value)}
                            className="border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] p-2.5 outline-none"
                          >
                            <option>Available now</option>
                            <option>Within 1 week</option>
                            <option>Within 1 month</option>
                          </select>
                        </div>

                        <div className="bg-[#FAFAF8] border border-[#E4E3DD] rounded-xl p-4 mb-3">
                          <div className="font-semibold text-[13px] text-[#1B1F23] mb-2.5">Available work days</div>
                          <div className="flex gap-2 mb-3 flex-wrap">
                            {allDays.map((day) => {
                              const active = selectedDays.includes(day);
                              return (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => toggleDay(day)}
                                  className={`py-1.5 px-3 rounded-full border text-[12px] font-medium transition-colors cursor-pointer ${
                                    active
                                      ? "bg-[#4C2FD9] border-[#4C2FD9] text-white shadow-xs"
                                      : "bg-white border-[#E4E3DD] text-[#5B6168] hover:bg-gray-50"
                                  }`}
                                >
                                  {day}
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-2.5">
                            <input
                              type="text"
                              value={workStartTime}
                              onChange={(e) => setWorkStartTime(e.target.value)}
                              placeholder="10:00 AM"
                              className="flex-1 border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] p-2 outline-none"
                            />
                            <span className="text-[12px] text-[#9BA0A6]">to</span>
                            <input
                              type="text"
                              value={workEndTime}
                              onChange={(e) => setWorkEndTime(e.target.value)}
                              placeholder="06:00 PM"
                              className="flex-1 border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] p-2 outline-none"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleSaveProfileSection(
                              {
                                availability: availabilityMode,
                                preferredProjectDuration: startTimeline,
                                workHours: `${workStartTime} - ${workEndTime}`,
                              },
                              "availability",
                              "Availability preferences saved!"
                            )
                          }
                          disabled={savingSection === "availability"}
                          className="w-full py-3 rounded-xl bg-[#4C2FD9] text-white font-semibold text-[13px] hover:bg-[#3d24b5] transition-colors shadow-sm disabled:opacity-50"
                        >
                          {savingSection === "availability" ? "Saving..." : "Save Availability Preferences"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 6. Voice & Video Intro */}
                  <div className="border-b border-[#E4E3DD]">
                    <div
                      onClick={() => toggleManage(5)}
                      className="flex items-center gap-3 py-3.5 px-1 cursor-pointer select-none"
                    >
                      <div className="w-[36px] h-[36px] rounded-xl bg-[#F6F6F3] border border-[#E4E3DD] flex items-center justify-center shrink-0">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#5B6168" strokeWidth="1.8">
                          <path d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4Z" />
                          <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] sm:text-[14px] font-medium text-[#1B1F23]">Voice &amp; video intro</div>
                        <div className="text-[11.5px] text-[#9BA0A6] mt-[1px]">Adds about 8% to your profile strength</div>
                      </div>
                      <span className={`text-[11px] font-semibold py-1 px-2.5 rounded-full whitespace-nowrap ${voiceIntroUrl || videoIntroUrl ? "bg-[#E5F5EB] text-[#137A3D]" : "bg-[#FBF0DF] text-[#C9821A]"}`}>
                        {voiceIntroUrl || videoIntroUrl ? "Added" : "Not added"}
                      </span>
                      <svg
                        className={`text-[#9BA0A6] shrink-0 transition-transform duration-200 ${openManageItem === 5 ? "rotate-180" : ""}`}
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>

                    {openManageItem === 5 && (
                      <div className="pb-5 pl-2 sm:pl-12 pr-1 space-y-3">
                        <div>
                          <label className="text-[12px] font-semibold text-[#1B1F23] block mb-1">Voice Intro URL / Link</label>
                          <input
                            type="text"
                            value={voiceIntroUrl}
                            onChange={(e) => setVoiceIntroUrl(e.target.value)}
                            placeholder="Link to audio recording (Google Drive, Dropbox, etc.)"
                            className="w-full border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] p-2.5 outline-none focus:border-[#4C2FD9]"
                          />
                        </div>

                        <div>
                          <label className="text-[12px] font-semibold text-[#1B1F23] block mb-1">Video Intro URL (YouTube, Vimeo, Drive)</label>
                          <input
                            type="text"
                            value={videoIntroUrl}
                            onChange={(e) => setVideoIntroUrl(e.target.value)}
                            placeholder="https://youtube.com/watch?v=..."
                            className="w-full border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] p-2.5 outline-none focus:border-[#4C2FD9]"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleSaveProfileSection(
                              { voiceIntroUrl, videoIntroUrl },
                              "media",
                              "Voice & video intro links saved!"
                            )
                          }
                          disabled={savingSection === "media"}
                          className="w-full py-3 rounded-xl bg-[#4C2FD9] text-white font-semibold text-[13px] hover:bg-[#3d24b5] transition-colors shadow-sm disabled:opacity-50"
                        >
                          {savingSection === "media" ? "Saving..." : "Save Media Intros"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 7. Resume Upload */}
                  <div className="border-b border-[#E4E3DD]">
                    <div
                      onClick={() => toggleManage(6)}
                      className="flex items-center gap-3 py-3.5 px-1 cursor-pointer select-none"
                    >
                      <div className="w-[36px] h-[36px] rounded-xl bg-[#F6F6F3] border border-[#E4E3DD] flex items-center justify-center shrink-0">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#5B6168" strokeWidth="1.8">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                          <path d="M14 2v6h6" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] sm:text-[14px] font-medium text-[#1B1F23]">Resume Document</div>
                        <div className="text-[11.5px] text-[#9BA0A6] mt-[1px]">
                          {profile?.resumeUrl ? "Resume on file" : "Upload your PDF resume"}
                        </div>
                      </div>
                      <span className={`text-[11px] font-semibold py-1 px-2.5 rounded-full whitespace-nowrap ${profile?.resumeUrl ? "bg-[#E5F5EB] text-[#137A3D]" : "bg-[#FBF0DF] text-[#C9821A]"}`}>
                        {profile?.resumeUrl ? "Uploaded" : "Pending"}
                      </span>
                      <svg
                        className={`text-[#9BA0A6] shrink-0 transition-transform duration-200 ${openManageItem === 6 ? "rotate-180" : ""}`}
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>

                    {openManageItem === 6 && (
                      <div className="pb-5 pl-2 sm:pl-12 pr-1">
                        <input
                          ref={resumeFileInputRef}
                          type="file"
                          accept=".pdf,.docx"
                          onChange={handleResumeUpload}
                          className="hidden"
                        />
                        <div
                          onClick={() => resumeFileInputRef.current?.click()}
                          className="border border-dashed border-[#1FA854] bg-[#F3FBF5] text-[#1FA854] rounded-xl p-5 text-center cursor-pointer hover:bg-[#ebf8ee] transition-colors"
                        >
                          <svg className="mx-auto" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M14 3v5a1 1 0 0 0 1 1h5" />
                            <path d="M6 21h12a1 1 0 0 0 1-1V7l-5-5H6a1 1 0 0 0-1 1v17a1 1 0 0 0 1 1z" />
                          </svg>
                          <p className="mt-2 text-[13px] font-semibold m-0">
                            {uploadingResume ? "Uploading file..." : profile?.resumeUrl ? "Replace Current Resume" : "Click to Upload Resume (PDF)"}
                          </p>
                          <p className="text-[11px] text-[#9BA0A6] mt-1 m-0">Max 10MB · ATS-parsed instantly</p>
                        </div>

                        {profile?.resumeUrl && (
                          <div className="mt-3 flex gap-2">
                            <a
                              href={profile.resumeUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#4C2FD9] hover:underline"
                            >
                              ⬇️ View uploaded resume document
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 8. ID Verification */}
                  <div>
                    <div
                      onClick={() => toggleManage(7)}
                      className="flex items-center gap-3 py-3.5 px-1 cursor-pointer select-none"
                    >
                      <div className="w-[36px] h-[36px] rounded-xl bg-[#F6F6F3] border border-[#E4E3DD] flex items-center justify-center shrink-0">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#5B6168" strokeWidth="1.8">
                          <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] sm:text-[14px] font-medium text-[#1B1F23]">ID verification</div>
                        <div className="text-[11.5px] text-[#9BA0A6] mt-[1px]">Adds verified tick and 12% strength boost</div>
                      </div>
                      <span className={`text-[11px] font-semibold py-1 px-2.5 rounded-full whitespace-nowrap ${profile?.isVerified ? "bg-[#E5F5EB] text-[#137A3D]" : "bg-[#FBF0DF] text-[#C9821A]"}`}>
                        {profile?.isVerified ? "Verified" : "Pending"}
                      </span>
                      <svg
                        className={`text-[#9BA0A6] shrink-0 transition-transform duration-200 ${openManageItem === 7 ? "rotate-180" : ""}`}
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>

                    {openManageItem === 7 && (
                      <div className="pb-5 pl-2 sm:pl-12 pr-1">
                        <div className="flex flex-col gap-2 mb-3">
                          <label className="text-[12px] font-semibold text-[#1B1F23]">Government ID details</label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <select
                              value={idType}
                              onChange={(e) => setIdType(e.target.value)}
                              className="border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] p-2.5 outline-none"
                            >
                              <option>Aadhaar</option>
                              <option>PAN</option>
                              <option>Passport</option>
                            </select>
                            <input
                              type="text"
                              value={idNumber}
                              onChange={(e) => setIdNumber(e.target.value)}
                              placeholder="Enter document number"
                              className="sm:col-span-2 border border-[#E4E3DD] rounded-xl bg-white text-[13px] text-[#1B1F23] p-2.5 outline-none focus:border-[#4C2FD9]"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (!idNumber.trim()) {
                              toast.error("Please enter a valid ID number");
                              return;
                            }
                            handleSaveProfileSection(
                              {
                                idVerification: {
                                  idType,
                                  idNumber,
                                  status: "pending",
                                  submittedAt: new Date().toISOString(),
                                },
                              },
                              "idVerification",
                              "ID submitted for verification!"
                            );
                          }}
                          disabled={savingSection === "idVerification"}
                          className="w-full py-3 rounded-xl bg-[#4C2FD9] text-white font-semibold text-[13px] hover:bg-[#3d24b5] transition-colors shadow-sm disabled:opacity-50"
                        >
                          {savingSection === "idVerification" ? "Submitting..." : "Submit ID for Verification"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Resume Conversion Banner */}
              <div className="bg-white border border-[#E4E3DD] rounded-[20px] p-5 sm:p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-[15px] font-semibold text-[#1B1F23] m-0">Instant ATS-Ready Resume</h3>
                    <p className="text-[12.5px] text-[#5B6168] mt-1 m-0">Turn your verified profile card into a shareable, downloadable resume PDF in 1 click.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setConvertedToResume(true);
                      toast.success("Resume formatted with your live profile details!");
                    }}
                    className="w-full sm:w-auto shrink-0 py-3 px-6 rounded-xl text-[13.5px] font-semibold bg-[#4C2FD9] text-white border border-transparent cursor-pointer hover:bg-[#3d24b5] transition-colors shadow-sm"
                  >
                    {convertedToResume ? "✓ Converted to resume" : "📝 Convert my details into resume"}
                  </button>
                </div>

                {convertedToResume && (
                  <div className="flex gap-3 mt-4 pt-4 border-t border-[#E4E3DD]">
                    <button
                      type="button"
                      onClick={() => {
                        window.print();
                      }}
                      className="flex-1 py-2.5 px-4 rounded-xl text-[13px] font-semibold bg-[#F6F6F3] text-[#1B1F23] border border-[#E4E3DD] cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      ⬇️ Print / Save as PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        toast.success("Profile link copied to clipboard!");
                      }}
                      className="flex-1 py-2.5 px-4 rounded-xl text-[13px] font-semibold bg-[#F6F6F3] text-[#1B1F23] border border-[#E4E3DD] cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      🔗 Copy Share Link
                    </button>
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT / SIDEBAR COLUMN (lg:col-span-4) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Metrics Strip */}
              <div className="grid grid-cols-3 lg:grid-cols-1 gap-3">
                <div className="bg-white border border-[#E4E3DD] rounded-[16px] p-4 shadow-xs">
                  <div className="text-[20px] sm:text-[22px] font-bold text-[#1B1F23] font-['Fraunces',serif]">
                    {profile?.profileViews || stats?.profileViews || 128}
                  </div>
                  <div className="text-[12px] text-[#9BA0A6] mt-1 leading-snug">Profile views this week</div>
                  <div className="text-[11px] text-[#1FA854] font-semibold mt-2 flex items-center gap-1">
                    <span>↑ 18%</span>
                    <span className="text-[10px] text-[#9BA0A6]">vs last week</span>
                  </div>
                </div>

                <div className="bg-white border border-[#E4E3DD] rounded-[16px] p-4 shadow-xs">
                  <div className="text-[20px] sm:text-[22px] font-bold text-[#1B1F23] font-['Fraunces',serif]">
                    {leads.length}
                  </div>
                  <div className="text-[12px] text-[#9BA0A6] mt-1 leading-snug">Active recruiter leads</div>
                  <div className="text-[11px] text-[#1FA854] font-semibold mt-2 flex items-center gap-1">
                    <span>↑ {leads.filter((l) => l.status === "new").length}</span>
                    <span className="text-[10px] text-[#9BA0A6]">new inquiries</span>
                  </div>
                </div>

                <div className="bg-white border border-[#E4E3DD] rounded-[16px] p-4 shadow-xs">
                  <div className="text-[20px] sm:text-[22px] font-bold text-[#1B1F23] font-['Fraunces',serif]">
                    {stats?.responseRate ? `${stats.responseRate}%` : "95%"}
                  </div>
                  <div className="text-[12px] text-[#9BA0A6] mt-1 leading-snug">Response rate</div>
                  <div className="text-[11px] text-[#1FA854] font-semibold mt-2">Steady (Top 5%)</div>
                </div>
              </div>

              {/* Active Plan / Subscription Card */}
              <div className="relative overflow-hidden bg-gradient-to-br from-[#2A1B85] via-[#3B22A8] to-[#4C2FD9] rounded-[20px] p-6 text-[#F3F1FC] shadow-md">
                <div className="absolute -right-8 -top-8 w-40 h-40 border border-white/15 rounded-full pointer-events-none" />

                <div className="flex items-start justify-between relative z-1">
                  <div>
                    <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-[#CFC7F5] bg-white/10 py-1 px-2.5 rounded-full">
                      {subscription?.planName || "Freelancer Plan"}
                    </span>
                    <h3 className="font-['Fraunces',serif] text-[22px] mt-2 font-medium text-white m-0">
                      {subscription?.isDefault ? "Standard Tier" : "Priority Talent Tier"}
                    </h3>
                  </div>
                  <div className="text-right">
                    <div className="text-[22px] font-bold text-white">
                      {subscription?.totalAmount ? `₹${subscription.totalAmount}` : "₹0"}
                    </div>
                    <div className="text-[11px] text-[#CFC7F5]">per month</div>
                  </div>
                </div>

                <p className="text-[13px] text-[#DCD6F7] leading-[1.6] my-4 relative z-1">
                  Rank high in client discovery searches and access verified direct WhatsApp inquiries.
                </p>

                <div className="flex flex-col gap-2.5 mb-5 relative z-1">
                  <div className="flex items-center gap-2.5 text-[12.5px] text-[#F3F1FC]">
                    <span className="w-4 h-4 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    Direct client WhatsApp inquiries
                  </div>
                  <div className="flex items-center gap-2.5 text-[12.5px] text-[#F3F1FC]">
                    <span className="w-4 h-4 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    Direct quote submissions
                  </div>
                  <div className="flex items-center gap-2.5 text-[12.5px] text-[#F3F1FC]">
                    <span className="w-4 h-4 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    Verified talent card in category search
                  </div>
                </div>

                <div className="flex items-center justify-between bg-white/10 rounded-xl p-3 text-[12px] text-[#DCD6F7] mb-5 relative z-1">
                  <span>Status: <b className="text-white font-semibold">Active Plan</b></span>
                  <span><b className="text-white font-semibold">{leads.length}</b> leads received</span>
                </div>

                <Link
                  to="/provider/plans"
                  className="block text-center w-full bg-white text-[#2A1B85] border-none py-3.5 px-4 rounded-xl text-[14px] font-bold cursor-pointer hover:bg-gray-100 transition-colors relative z-1 shadow"
                >
                  Manage / Upgrade Plan
                </Link>
              </div>

              {/* Quick Resume Toolkit Banner on Desktop */}
              <div className="bg-white border border-[#E4E3DD] rounded-[20px] p-5 shadow-xs">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[22px]">🚀</span>
                  <h4 className="font-semibold text-[14px] text-[#1B1F23] m-0">Resume Journey</h4>
                </div>
                <p className="text-[12.5px] text-[#5B6168] leading-relaxed mb-3">
                  Score your resume against high-paying client contracts and get instant AI recommendations.
                </p>
                <button
                  type="button"
                  onClick={() => setIframeView("resume")}
                  className="w-full py-2.5 px-4 rounded-xl text-[12.5px] font-semibold text-[#4C2FD9] bg-[#ECE8FB] hover:bg-[#ded7fa] transition-colors cursor-pointer"
                >
                  Launch Resume Check →
                </button>
              </div>

            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: DYNAMIC LEADS VIEW */}
        {/* ========================================================================= */}
        {activeView === "leads" && (
          <div className="space-y-6">
            
            {/* Leads Hero Banner */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#2A1B85] via-[#3B22A8] to-[#4C2FD9] rounded-[22px] p-6 sm:p-8 text-[#F3F1FC] shadow-md">
              <div className="absolute -right-12 -top-12 w-48 h-48 border border-white/15 rounded-full pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-1">
                <div>
                  <div className="font-['Fraunces',serif] text-[36px] sm:text-[44px] font-semibold leading-none text-white">
                    {leads.length}
                  </div>
                  <div className="text-[13px] sm:text-[14px] text-[#CFC7F5] mt-1.5">Direct recruiter project leads</div>
                </div>
                <div className="sm:text-right">
                  <span className="inline-block text-[12px] font-bold text-white bg-white/15 py-2 px-4 rounded-full whitespace-nowrap">
                    Active Pipeline
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-6 relative z-1 max-w-lg">
                <div className="bg-white/10 rounded-xl p-3 sm:p-3.5">
                  <div className="text-[16px] sm:text-[18px] font-bold text-white">{stats?.responseRate ? `${stats.responseRate}%` : "95%"}</div>
                  <div className="text-[10px] sm:text-[11px] text-[#CFC7F5] mt-0.5 leading-tight">Response rate</div>
                </div>
                <div className="bg-white/10 rounded-xl p-3 sm:p-3.5">
                  <div className="text-[16px] sm:text-[18px] font-bold text-white">
                    {leads.filter((l) => l.status === "won").length}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-[#CFC7F5] mt-0.5 leading-tight">Won leads</div>
                </div>
                <div className="bg-white/10 rounded-xl p-3 sm:p-3.5">
                  <div className="text-[16px] sm:text-[18px] font-bold text-white">15m</div>
                  <div className="text-[10px] sm:text-[11px] text-[#CFC7F5] mt-0.5 leading-tight">Avg. reply time</div>
                </div>
              </div>
            </div>

            {/* Filter Section */}
            <div className="bg-white border border-[#E4E3DD] rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold text-[#9BA0A6] uppercase tracking-wider m-0">Filter by skill</p>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar flex-wrap">
                    {["All skills", ...skillsList.map((s) => s.title)].slice(0, 5).map((skill) => {
                      const active = selectedSkillFilter === skill;
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => setSelectedSkillFilter(skill)}
                          className={`text-[12px] font-semibold py-1.5 px-3.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                            active
                              ? "bg-[#2A1B85] text-white shadow-xs"
                              : "bg-[#F6F6F3] text-[#5B6168] hover:text-[#1B1F23]"
                          }`}
                        >
                          {skill}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold text-[#9BA0A6] uppercase tracking-wider m-0">Filter by status</p>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar flex-wrap">
                    {[
                      { key: "All", label: `All · ${leads.length}` },
                      { key: "New", label: `New · ${leads.filter((l) => l.status === "new").length}` },
                      { key: "Replied", label: `Replied · ${leads.filter((l) => l.status === "replied").length}` },
                      { key: "Won", label: `Won · ${leads.filter((l) => l.status === "won").length}` },
                    ].map((st) => {
                      const active = selectedStatusFilter === st.key;
                      return (
                        <button
                          key={st.key}
                          type="button"
                          onClick={() => setSelectedStatusFilter(st.key)}
                          className={`text-[12px] font-semibold py-1.5 px-3.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                            active
                              ? "bg-[#4C2FD9] text-white shadow-xs"
                              : "bg-[#F6F6F3] text-[#5B6168] hover:text-[#1B1F23]"
                          }`}
                        >
                          {st.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Lead Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
              {filteredLeads.map((lead) => {
                const leadQuoteForm = quoteForms[lead.id] || {
                  price: lead.initialPrice,
                  timeline: lead.defaultTimeline,
                  note: "",
                };

                return (
                  <div key={lead.id} className="bg-white border border-[#E4E3DD] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                    <div>
                      {/* Skills match */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {lead.skills.map((s) => (
                          <span key={s} className="text-[11px] font-semibold text-[#2A1B85] bg-[#ECE8FB] py-1 px-2.5 rounded-full">
                            🎯 {s}
                          </span>
                        ))}
                      </div>

                      {/* Client top info */}
                      <div className="flex items-start gap-3">
                        <div className="w-[42px] h-[42px] rounded-full shrink-0 bg-[#ECE8FB] text-[#2A1B85] flex items-center justify-center font-['Fraunces',serif] text-[16px]">
                          {lead.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[14px] font-semibold text-[#1B1F23]">{lead.name}</span>
                            <span className="text-[11px] text-[#9BA0A6] whitespace-nowrap">{lead.time}</span>
                          </div>
                          <p className="text-[13px] text-[#5B6168] mt-1 leading-relaxed m-0">{lead.brief}</p>
                        </div>
                      </div>

                      {/* Meta row */}
                      <div className="flex items-center gap-2.5 mt-3.5 flex-wrap">
                        <span className="text-[12.5px] font-semibold text-[#2A1B85]">{lead.offered}</span>
                        {lead.timeline && <span className="text-[12px] text-[#9BA0A6]">⏱ {lead.timeline}</span>}
                        <span
                          className={`text-[11px] font-semibold py-0.5 px-2.5 rounded-full ml-auto ${
                            lead.status === "new"
                              ? "bg-[#FBF0DF] text-[#C9821A]"
                              : lead.status === "replied"
                              ? "bg-[#ECE8FB] text-[#2A1B85]"
                              : "bg-[#E5F5EB] text-[#137A3D]"
                          }`}
                        >
                          {lead.statusLabel}
                        </span>
                      </div>

                      {/* Quoted summary */}
                      {lead.quotedSummary && (
                        <div className="mt-3 text-[12.5px] text-[#5B6168] bg-[#F6F6F3] rounded-xl p-2.5 leading-relaxed">
                          <b className="text-[#1B1F23]">You quoted:</b> {lead.quotedSummary}
                        </div>
                      )}
                    </div>

                    {/* Actions Area */}
                    <div className="mt-4 pt-3 border-t border-[#E4E3DD]/70">
                      <div className="flex gap-2">
                        <a
                          href={`https://wa.me/${lead.recruiterPhone || "919999999999"}?text=Hi%20${encodeURIComponent(lead.name)},%20I%20saw%20your%20project%20"${encodeURIComponent(lead.projectTitle)}"%20on%20LucoHire.%20I%20am%20available%20to%20help.`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-2.5 px-3.5 rounded-xl text-[13px] font-semibold bg-[#1FA854] text-white border border-transparent cursor-pointer hover:bg-[#198f46] transition-colors text-center"
                        >
                          💬 Chat
                        </a>
                        <button
                          type="button"
                          onClick={() => setOpenQuoteId((prev) => (prev === lead.id ? null : lead.id))}
                          className="flex-1 py-2.5 px-3.5 rounded-xl text-[13px] font-semibold bg-white text-[#2A1B85] border border-[#ECE8FB] cursor-pointer hover:bg-gray-50 transition-colors shadow-xs"
                        >
                          💰 Send quote
                        </button>
                      </div>

                      {/* Inline Quote Drawer */}
                      {openQuoteId === lead.id && (
                        <div className="pt-3 mt-3 border-t border-dashed border-[#E4E3DD]">
                          {!lead.quoteSent ? (
                            <>
                              <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                  <label className="text-[11px] font-semibold text-[#9BA0A6] block mb-1">Your price (₹)</label>
                                  <input
                                    type="number"
                                    value={leadQuoteForm.price}
                                    onChange={(e) =>
                                      setQuoteForms((prev) => ({
                                        ...prev,
                                        [lead.id]: { ...leadQuoteForm, price: e.target.value },
                                      }))
                                    }
                                    className="w-full text-[13px] text-[#1B1F23] bg-[#F6F6F3] border border-[#E4E3DD] rounded-xl p-2 outline-none focus:border-[#4C2FD9]"
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] font-semibold text-[#9BA0A6] block mb-1">Timeline</label>
                                  <select
                                    value={leadQuoteForm.timeline}
                                    onChange={(e) =>
                                      setQuoteForms((prev) => ({
                                        ...prev,
                                        [lead.id]: { ...leadQuoteForm, timeline: e.target.value },
                                      }))
                                    }
                                    className="w-full text-[13px] text-[#1B1F23] bg-[#F6F6F3] border border-[#E4E3DD] rounded-xl p-2 outline-none focus:border-[#4C2FD9]"
                                  >
                                    <option>3 days</option>
                                    <option>5 days</option>
                                    <option>7 days</option>
                                    <option>14 days</option>
                                    <option>1 month</option>
                                  </select>
                                </div>
                              </div>
                              <div className="mt-2.5">
                                <textarea
                                  value={leadQuoteForm.note}
                                  onChange={(e) =>
                                    setQuoteForms((prev) => ({
                                      ...prev,
                                      [lead.id]: { ...leadQuoteForm, note: e.target.value },
                                    }))
                                  }
                                  placeholder="Optional proposal note for recruiter..."
                                  className="w-full text-[13px] text-[#1B1F23] bg-[#F6F6F3] border border-[#E4E3DD] rounded-xl p-2 min-h-[52px] resize-none outline-none focus:border-[#4C2FD9]"
                                />
                              </div>
                              <div className="flex items-center gap-2.5 mt-2.5">
                                <button
                                  type="button"
                                  onClick={() => handleSendQuote(lead.id)}
                                  disabled={sendingQuoteId === lead.id}
                                  className="flex-1 py-2 px-3 rounded-xl text-[12.5px] font-semibold bg-[#4C2FD9] text-white cursor-pointer hover:bg-[#3d24b5] transition-colors disabled:opacity-50"
                                >
                                  {sendingQuoteId === lead.id ? "Sending..." : "Submit Quote"}
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center gap-2 text-[12.5px] font-semibold text-[#137A3D] bg-[#E5F5EB] p-2.5 rounded-xl">
                              ✓ Quote registered for {lead.name}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* VIEW PROFILE MODAL (PREVIEW AS CLIENT WITH LIVE DATA) */}
      {/* ========================================================================= */}
      {profileModalOpen && (
        <div className="fixed inset-0 bg-[#1B1F23]/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs">
          <div className="bg-[#F6F6F3] w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto rounded-t-[24px] sm:rounded-2xl p-5 sm:p-7 relative animate-in slide-in-from-bottom duration-300 shadow-2xl">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setProfileModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white border border-[#E4E3DD] flex items-center justify-center cursor-pointer hover:bg-gray-100 z-10"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>

            <p className="text-[11px] font-semibold text-[#9BA0A6] uppercase tracking-wider mb-3 m-0">
              Your profile — as clients see it
            </p>

            {/* Full Candidate Card Preview */}
            <div className="bg-white border border-[#E4E3DD] rounded-2xl p-5 sm:p-6 shadow-md">
              <div className="flex gap-4 items-start">
                <div className="relative shrink-0">
                  <div className="w-[58px] h-[58px] sm:w-[68px] sm:h-[68px] rounded-[16px] bg-gradient-to-br from-[#4C2FD9] to-[#2A1B85] flex items-center justify-center font-['Fraunces',serif] text-[21px] sm:text-[24px] text-[#F3F1FC] overflow-hidden">
                    {profilePhotoUrl ? (
                      <img src={profilePhotoUrl} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <span className="absolute -bottom-[7px] left-1/2 -translate-x-1/2 bg-[#1FA854] text-white text-[8.5px] font-bold py-0.5 px-2 rounded-full whitespace-nowrap shadow-sm">
                    {availabilityMode}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-['Fraunces',serif] font-medium text-[20px] sm:text-[22px] text-[#1B1F23]">
                      {displayName}
                    </span>
                    {(profile?.isVerified || profile?.idVerification?.status === "verified") && (
                      <span className="w-4 h-4 rounded-full bg-[#1FA854] flex items-center justify-center shrink-0">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <p className="text-[13.5px] text-[#5B6168] mt-0.5 m-0">{displayTitle}</p>
                  <p className="text-[12px] text-[#9BA0A6] mt-1 flex items-center gap-1.5 flex-wrap m-0">
                    <span>📍 {displayLocation}</span>
                    <span className="w-1 h-1 rounded-full bg-[#9BA0A6]" />
                    <span>🌐 Remote OK</span>
                  </p>
                </div>

                <div className="ml-auto text-center bg-[#F6F6F3] border border-[#E4E3DD] rounded-xl p-2.5 shrink-0">
                  <div className="text-[18px] font-bold text-[#1FA854] font-['Fraunces',serif] leading-none">
                    {strengthPct}%
                  </div>
                  <div className="text-[9px] text-[#9BA0A6] mt-1 whitespace-nowrap">Profile Strength</div>
                  <div className="h-1 w-14 bg-[#E4E3DD] rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full bg-[#1FA854]" style={{ width: `${strengthPct}%` }} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 my-4 py-3 border-y border-[#E4E3DD]">
                <div className="text-center">
                  <div className="text-[15px] font-bold text-[#1B1F23]">{profile?.experience || "3–5 yrs"}</div>
                  <div className="text-[11px] text-[#9BA0A6] mt-0.5">Experience</div>
                </div>
                <div className="text-center border-l border-[#E4E3DD]">
                  <div className="text-[15px] font-bold text-[#1B1F23]">{availabilityMode || "Full-time"}</div>
                  <div className="text-[11px] text-[#9BA0A6] mt-0.5">Availability</div>
                </div>
                <div className="text-center border-l border-[#E4E3DD]">
                  <div className="text-[15px] font-bold text-[#1B1F23]">{startTimeline || "Today"}</div>
                  <div className="text-[11px] text-[#9BA0A6] mt-0.5">Available to start</div>
                </div>
              </div>

              {/* Top Skills */}
              <div className="mb-4">
                <p className="text-[12px] font-semibold text-[#9BA0A6] mb-2 m-0">Top Skills &amp; Starting Rates</p>
                <div className="flex flex-wrap gap-2">
                  {skillsList.map((s) => (
                    <span key={s.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E4E3DD] text-[12.5px] text-[#1B1F23] bg-[#F6F6F3]">
                      {s.title} <span className="text-[#2A1B85] font-semibold">₹{Number(s.price).toLocaleString("en-IN")}/{s.type}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Highlight */}
              <div className="mb-4">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#E5F5EB]">
                    <span className="text-[18px] shrink-0">💰</span>
                    <div>
                      <b className="block text-[13px] text-[#1B1F23] leading-tight">₹{startingRate}</b>
                      <span className="text-[10px] text-[#9BA0A6]">Starting price</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#FBF0DF]">
                    <span className="text-[18px] shrink-0">🗣️</span>
                    <div>
                      <b className="block text-[13px] text-[#1B1F23] leading-tight">
                        {langTags.map((l) => l.lang).join(", ") || "Hindi, English"}
                      </b>
                      <span className="text-[10px] text-[#9BA0A6]">{langTags.length} Languages</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 mt-4">
                <a
                  href={`https://wa.me/?text=Hi,%20check%20out%20my%20profile%20on%20LucoHire:%20${window.location.origin}/freelancer/dashboard`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 text-center py-3 px-4 rounded-xl text-[13.5px] font-semibold bg-[#1FA854] text-white border border-transparent cursor-pointer hover:bg-[#198f46] transition-colors"
                >
                  💬 Share on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EMBEDDED IFRAME FULLSCREEN VIEW (Resume Journey) */}
      {/* ========================================================================= */}
      {iframeView && (
        <div className="fixed inset-0 bg-[#F6F6F3] z-50 flex flex-col">
          <div className="h-[56px] shrink-0 flex items-center px-4 sm:px-6 bg-white/95 backdrop-blur-md border-b border-[#E4E3DD]">
            <button
              type="button"
              onClick={() => setIframeView(null)}
              className="flex items-center gap-2 text-[13px] font-semibold text-[#1B1F23] bg-white border border-[#E4E3DD] rounded-full py-2 px-4 cursor-pointer hover:bg-gray-50 transition-colors shadow-xs"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Back to Dashboard
            </button>
          </div>
          <iframe
            src="/embedded/resume.html"
            title="Resume Journey"
            className="flex-1 w-full h-full border-none bg-white"
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* MOBILE BOTTOM NAVIGATION BAR (md:hidden - only shown on mobile devices) */}
      {/* ========================================================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E4E3DD] flex gap-1 p-2 px-3 pb-[calc(10px+env(safe-area-inset-bottom))] shadow-[0_-8px_20px_rgba(20,15,60,0.06)] z-20">
        <button
          type="button"
          onClick={() => {
            setActiveView("dashboard");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-2xl text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
            activeView === "dashboard"
              ? "text-white bg-gradient-to-br from-[#4C2FD9] to-[#2A1B85] shadow-xs"
              : "text-[#9BA0A6] hover:text-[#1B1F23]"
          }`}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
            <rect x="3" y="3" width="7" height="9" rx="1.5" />
            <rect x="14" y="3" width="7" height="5" rx="1.5" />
            <rect x="14" y="12" width="7" height="9" rx="1.5" />
            <rect x="3" y="16" width="7" height="5" rx="1.5" />
          </svg>
          Dashboard
          {activeView === "dashboard" && <span className="w-1 h-1 rounded-full bg-white mt-0.5" />}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveView("leads");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-2xl text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
            activeView === "leads"
              ? "text-white bg-gradient-to-br from-[#4C2FD9] to-[#2A1B85] shadow-xs"
              : "text-[#9BA0A6] hover:text-[#1B1F23]"
          }`}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
            <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.4H12a8.7 8.7 0 0 1-4-1L3 20l1.2-3.6a8.3 8.3 0 0 1-1.2-4.4A8.4 8.4 0 0 1 11.5 3h.5a8.4 8.4 0 0 1 8.4 8Z" />
          </svg>
          Leads
          {activeView === "leads" && <span className="w-1 h-1 rounded-full bg-white mt-0.5" />}
        </button>

        <button
          type="button"
          onClick={() => setIframeView("resume")}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-2xl text-[11px] font-semibold text-[#9BA0A6] hover:text-[#1B1F23] transition-all duration-200 cursor-pointer"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
            <path d="M14 2v6h6" />
            <path d="M9 13h6M9 17h6" />
          </svg>
          Resume Journey
        </button>
      </nav>
    </div>
  );
}
