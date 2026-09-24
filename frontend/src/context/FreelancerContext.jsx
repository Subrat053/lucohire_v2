import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "./AuthContext";
import { providerAPI } from "../services/api";

const FreelancerContext = createContext(null);

export function FreelancerProvider({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Cached initial render
  const cachedDash = (() => {
    try {
      const c = sessionStorage.getItem("lucohire_freelancer_dashboard");
      return c ? JSON.parse(c) : null;
    } catch {
      return null;
    }
  })();

  const [loading, setLoading] = useState(!cachedDash);
  const [savingSection, setSavingSection] = useState(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [sendingQuoteId, setSendingQuoteId] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Core Data States
  const [profile, setProfile] = useState(cachedDash?.profile || null);
  const [stats, setStats] = useState(cachedDash?.stats || null);
  const [subscription, setSubscription] = useState(cachedDash?.subscription || null);
  const [strengthPct, setStrengthPct] = useState(
    cachedDash?.profile?.profileCompletion || cachedDash?.stats?.profileCompletion || 0
  );

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

  // Leads Data
  const [leads, setLeads] = useState(Array.isArray(cachedDash?.leads) ? cachedDash.leads : []);
  const [openQuoteId, setOpenQuoteId] = useState(null);

  // File input ref for resume
  const resumeFileInputRef = useRef(null);

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

  // Format today's date
  const formattedToday = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Load Dashboard Data from Backend
  const loadDashboardData = async () => {
    try {
      if (!cachedDash && !profile) {
        setLoading(true);
      }
      const dashRes = await providerAPI.getDashboard();

      if (dashRes?.data) {
        const d = dashRes.data;
        const profData = d.profile || null;
        const statsData = d.stats || null;
        const subData = d.subscription || null;
        const leadsData = Array.isArray(d.leads) ? d.leads : [];

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

        // Sync Leads (Purely dynamic from PostgreSQL database)
        if (leadsData.length > 0) {
          setLeads(
            leadsData.map((lead, idx) => {
              const recruiterObj = lead.recruiter || lead.recruiterRecord || {};
              const jobPostObj = lead.jobPost || lead.jobPostRecord || {};
              const recruiterName = recruiterObj.name || lead.recruiterName || lead.clientName || "Direct Recruiter";
              const recruiterPhone = recruiterObj.phone || lead.recruiterPhone || lead.phone || "";
              const companyName = recruiterObj.company || jobPostObj.companyName || "";

              let leadSkills = [];
              if (Array.isArray(lead.tags) && lead.tags.length > 0) {
                leadSkills = lead.tags;
              } else if (Array.isArray(lead.skills) && lead.skills.length > 0) {
                leadSkills = lead.skills;
              } else if (jobPostObj.skill) {
                leadSkills = [jobPostObj.skill];
              } else if (profData?.skills?.[0]) {
                leadSkills = [typeof profData.skills[0] === 'string' ? profData.skills[0] : profData.skills[0].name || "Specialist"];
              } else {
                leadSkills = ["General Requirement"];
              }

              let parsedNotes = {};
              if (lead.notes) {
                if (typeof lead.notes === "object") {
                  parsedNotes = lead.notes;
                } else if (typeof lead.notes === "string") {
                  try { parsedNotes = JSON.parse(lead.notes); } catch (_) { parsedNotes = { raw: lead.notes }; }
                }
              }

              let offeredText = "Budget Negotiable";
              let rawBudget = null;
              if (jobPostObj.budgetMin || jobPostObj.minBudget) {
                rawBudget = jobPostObj.budgetMin || jobPostObj.minBudget;
                const maxB = jobPostObj.budgetMax || jobPostObj.maxBudget;
                offeredText = maxB && maxB !== rawBudget
                  ? `Offered ₹${Number(rawBudget).toLocaleString("en-IN")} – ₹${Number(maxB).toLocaleString("en-IN")}`
                  : `Offered ₹${Number(rawBudget).toLocaleString("en-IN")}`;
              } else if (parsedNotes.budgetOffered || lead.budget) {
                rawBudget = parsedNotes.budgetOffered || lead.budget;
                offeredText = `Offered ₹${Number(rawBudget).toLocaleString("en-IN")}`;
              }

              const projectTitle = jobPostObj.title || lead.projectTitle || lead.title || "Freelance Project Requirement";
              const projectBrief = lead.message || parsedNotes.projectBrief || jobPostObj.description || "Looking for an experienced freelancer for a high-priority deliverable.";

              const isQuoted = lead.status === "replied" || !!parsedNotes.quotedPrice;
              const quotedSummary = parsedNotes.quotedPrice
                ? `₹${Number(parsedNotes.quotedPrice).toLocaleString("en-IN")} · ${parsedNotes.quotedTimeline || "As proposed"}`
                : "";

              return {
                id: lead.id || lead._id || `lead-${idx + 1}`,
                name: recruiterName,
                avatar: recruiterName.charAt(0).toUpperCase(),
                company: companyName,
                time: lead.createdAt ? formatTimeAgo(lead.createdAt) : "Recent",
                skills: leadSkills,
                brief: projectBrief,
                offered: offeredText,
                timeline: lead.timeline || parsedNotes.targetDelivery || (jobPostObj.jobType ? `${jobPostObj.jobType.replace(/_/g, ' ')}` : "flexible timeline"),
                status: lead.status || "new",
                statusLabel: lead.status === "won" ? "Won" : lead.status === "replied" ? "Replied" : lead.status === "contacted" ? "Contacted" : "New",
                initialPrice: String(rawBudget || "10000"),
                defaultTimeline: parsedNotes.targetDelivery || lead.timeline || "7 days",
                acceptPrice: String(rawBudget || "10000"),
                quoteSent: isQuoted,
                quotedSummary,
                recruiterPhone,
                projectTitle,
                sourceType: lead.sourceType || "direct",
                isUnlocked: lead.isUnlocked !== false,
              };
            })
          );
        } else {
          setLeads([]);
        }

        try {
          sessionStorage.setItem("lucohire_freelancer_dashboard", JSON.stringify(d));
        } catch {}
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

  // Helper: Persist Profile Updates to PostgreSQL
  const handleSaveProfileSection = async (sectionUpdates, sectionKey, successMsg = "Profile updated successfully!") => {
    try {
      setSavingSection(sectionKey);

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
        country: profile?.country || "India",
        latitude: profile?.latitude || 28.6139,
        longitude: profile?.longitude || 77.209,
        education: eduList,
        pricingEntries: skillsList.map((s) => ({
          skill: s.title,
          skillLevel: s.level,
          startingPrice: Number(s.price || 0),
          priceType: s.type || "Per project",
          experience: s.exp,
        })),
        portfolioLinks: certList.map((c) => ({
          type: c.type,
          url: c.link,
          link: c.link,
        })),
        languages: langTags.map((l) => ({
          language: l.lang,
          proficiency: l.level,
        })),
        availability: availabilityMode,
        preferredProjectDuration: startTimeline,
        workHours: `${workStartTime} - ${workEndTime}`,
        voiceIntroUrl,
        videoIntroUrl,
        idVerification: {
          idType,
          idNumber,
          status: profile?.idVerification?.status || "pending",
        },
        ...sectionUpdates,
      };

      const res = await providerAPI.updateProfile(basePayload);
      if (res?.data) {
        setProfile((prev) => ({ ...prev, ...res.data, ...sectionUpdates }));
        if (res.data.profileCompletion) {
          setStrengthPct(res.data.profileCompletion);
        }
        toast.success(successMsg);
      }
    } catch (err) {
      console.error("Error updating profile section:", err);
      toast.error(err.response?.data?.message || "Failed to save updates. Please try again.");
    } finally {
      setSavingSection(null);
    }
  };

  // Helper: Resume Upload
  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit");
      return;
    }

    const formData = new FormData();
    formData.append("resume", file);

    try {
      setUploadingResume(true);
      const res = await providerAPI.uploadResume(formData);
      if (res?.data) {
        toast.success("Resume uploaded and parsed successfully!");
        await loadDashboardData();
      }
    } catch (err) {
      console.error("Resume upload failed:", err);
      toast.error(err.response?.data?.message || "Failed to upload resume document");
    } finally {
      setUploadingResume(false);
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
        notes: {
          quotedPrice: quotePrice,
          quotedTimeline: quoteTimeline,
          freelancerNote: quoteNote,
          sentAt: new Date().toISOString(),
        },
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
                quotedSummary: `₹${Number(quotePrice).toLocaleString("en-IN")} · ${quoteTimeline}`,
              }
            : l
        )
      );
      setOpenQuoteId(null);
    } catch (err) {
      console.error("Error submitting quote:", err);
      toast.error("Could not submit quote. Please try again.");
    } finally {
      setSendingQuoteId(null);
    }
  };

  // Mark Lead as Won / Closed
  const handleMarkLeadWon = async (leadId) => {
    try {
      await providerAPI.updateLead(leadId, { status: "won" });
      toast.success("Lead marked as Won! Added to your completed pipeline.");
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId
            ? { ...l, status: "won", statusLabel: "Won" }
            : l
        )
      );
    } catch (err) {
      console.error("Error updating lead status:", err);
      toast.error("Could not update lead status.");
    }
  };

  // Resume conversion state
  const [convertedToResume, setConvertedToResume] = useState(false);

  // Accordion state (one open at a time, or none)
  const [openManageItem, setOpenManageItem] = useState(null);
  const toggleManage = (index) => {
    setOpenManageItem((prev) => (prev === index ? null : index));
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

  const handleSignOut = () => {
    logout();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  // Computed helper details
  const displayName = profile?.profileName || user?.name || "Freelancer";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  const profilePhotoUrl = profile?.photo || profile?.profilePhoto || user?.profilePhoto;
  const displayTitle = profile?.professionalTitle || profile?.headlineSkill || skillsList[0]?.title || "Freelancer & Specialist";
  const displayLocation = profile?.city && profile?.state 
    ? `${profile.city}, ${profile.state}` 
    : (profile?.city || user?.city || "India");
  const startingRate = skillsList[0]?.price 
    ? Number(skillsList[0].price).toLocaleString("en-IN") 
    : (profile?.pricing ? Number(profile.pricing).toLocaleString("en-IN") : "2,500");

  const value = {
    user,
    profile,
    stats,
    subscription,
    strengthPct,
    loading,
    savingSection,
    uploadingResume,
    sendingQuoteId,
    profileModalOpen,
    setProfileModalOpen,
    skillsList,
    setSkillsList,
    eduList,
    setEduList,
    certList,
    setCertList,
    langTags,
    setLangTags,
    selectedLang,
    setSelectedLang,
    selectedLevel,
    setSelectedLevel,
    selectedDays,
    setSelectedDays,
    allDays,
    workStartTime,
    setWorkStartTime,
    workEndTime,
    setWorkEndTime,
    availabilityMode,
    setAvailabilityMode,
    startTimeline,
    setStartTimeline,
    voiceIntroUrl,
    setVoiceIntroUrl,
    videoIntroUrl,
    setVideoIntroUrl,
    idType,
    setIdType,
    idNumber,
    setIdNumber,
    quoteForms,
    setQuoteForms,
    leads,
    setLeads,
    openQuoteId,
    setOpenQuoteId,
    resumeFileInputRef,
    formatTimeAgo,
    formattedToday,
    loadDashboardData,
    handleSaveProfileSection,
    handleResumeUpload,
    handleSendQuote,
    handleMarkLeadWon,
    convertedToResume,
    setConvertedToResume,
    openManageItem,
    setOpenManageItem,
    toggleManage,
    addSkill,
    removeSkill,
    updateSkillField,
    addEdu,
    removeEdu,
    updateEduField,
    addCert,
    removeCert,
    updateCertField,
    addLang,
    removeLang,
    toggleDay,
    handleSignOut,
    displayName,
    initials,
    profilePhotoUrl,
    displayTitle,
    displayLocation,
    startingRate,
  };

  return (
    <FreelancerContext.Provider value={value}>
      {children}
    </FreelancerContext.Provider>
  );
}

export function useFreelancer() {
  const context = useContext(FreelancerContext);
  if (!context) {
    throw new Error("useFreelancer must be used within a FreelancerProvider");
  }
  return context;
}
