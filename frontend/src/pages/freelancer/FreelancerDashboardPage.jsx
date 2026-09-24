import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useFreelancer } from "../../context/FreelancerContext";

export default function FreelancerDashboardPage() {
  const navigate = useNavigate();
  const {
    user,
    profile,
    stats,
    subscription,
    strengthPct,
    skillsList,
    eduList,
    certList,
    langTags,
    selectedLang,
    setSelectedLang,
    selectedLevel,
    setSelectedLevel,
    selectedDays,
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
    resumeFileInputRef,
    savingSection,
    uploadingResume,
    convertedToResume,
    setConvertedToResume,
    openManageItem,
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
    handleSaveProfileSection,
    handleResumeUpload,
    setProfileModalOpen,
    displayName,
    initials,
    profilePhotoUrl,
    displayTitle,
    displayLocation,
    startingRate,
    leads,
  } = useFreelancer();

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 lg:gap-6 items-start">
      {/* ========================================================================= */}
      {/* LEFT / MAIN COLUMN (md:col-span-7 lg:col-span-8) */}
      {/* ========================================================================= */}
      <div className="md:col-span-7 lg:col-span-8 space-y-5 sm:space-y-6">
        {/* Profile Strength Banner */}
        <div className="bg-white border border-[#E4E3DD] rounded-[16px] sm:rounded-[18px] p-3.5 sm:p-5 flex items-center gap-3 sm:gap-5 shadow-xs">
          <div
            className="w-[46px] h-[46px] sm:w-[58px] sm:h-[58px] rounded-full shrink-0 flex items-center justify-center transition-all duration-1000 ease-out"
            style={{
              background: `conic-gradient(#4C2FD9 ${strengthPct * 3.6}deg, #ECE8FB 0deg)`,
            }}
          >
            <div className="w-[36px] h-[36px] sm:w-[46px] sm:h-[46px] rounded-full bg-white flex items-center justify-center text-[12px] sm:text-[14px] font-bold text-[#1B1F23]">
              {strengthPct}%
            </div>
          </div>
          <div className="space-y-[2px] sm:space-y-[3px] flex-1 min-w-0">
            <p className="text-[13.5px] sm:text-[15px] font-semibold text-[#1B1F23] m-0 truncate">
              Your profile is {strengthPct}% complete
            </p>
            <p className="text-[11.5px] sm:text-[13px] text-[#5B6168] leading-[1.45] sm:leading-[1.5] m-0">
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
        <div className="bg-white border border-[#E4E3DD] rounded-[18px] sm:rounded-[20px] p-4 sm:p-7 shadow-[0_18px_40px_-22px_rgba(42,27,133,0.2)]">
          {/* Header Row */}
          <div className="flex gap-3 sm:gap-5 items-start">
            <div className="relative shrink-0">
              <div className="w-[54px] h-[54px] sm:w-[68px] sm:h-[68px] rounded-[16px] sm:rounded-[20px] bg-gradient-to-br from-[#4C2FD9] to-[#2A1B85] flex items-center justify-center font-['Fraunces',serif] text-[20px] sm:text-[24px] text-[#F3F1FC] shadow-sm overflow-hidden">
                {profilePhotoUrl ? (
                  <img src={profilePhotoUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <span className="absolute -bottom-[7px] left-1/2 -translate-x-1/2 bg-[#1FA854] text-white text-[8px] sm:text-[9.5px] font-bold py-[2px] sm:py-[3px] px-[6px] sm:px-[8px] rounded-full max-w-[85px] sm:max-w-none truncate shadow-[0_2px_6px_rgba(31,168,84,0.35)]">
                {availabilityMode || "Available Now"}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-[6px] sm:gap-2 flex-wrap">
                <span className="font-['Fraunces',serif] font-medium text-[18px] sm:text-[24px] text-[#1B1F23] truncate">
                  {displayName}
                </span>
                {(profile?.isVerified || profile?.idVerification?.status === "verified") && (
                  <span className="w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] rounded-full bg-[#1FA854] flex items-center justify-center shrink-0" title="Identity verified">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                )}
              </div>
              <p className="text-[13px] sm:text-[14.5px] text-[#5B6168] mt-[2px] m-0 truncate">{displayTitle}</p>
              <p className="text-[11.5px] sm:text-[13px] text-[#9BA0A6] mt-[4px] sm:mt-[6px] flex items-center gap-x-[8px] gap-y-[3px] flex-wrap m-0">
                <span>📍 {displayLocation}</span>
                <span className="w-[3px] h-[3px] rounded-full bg-[#9BA0A6]" />
                <span>🌐 Remote OK</span>
              </p>
            </div>

            {/* Profile Strength Mini Chip (tablet & desktop) */}
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
          <div className="grid grid-cols-3 gap-1 sm:gap-4 my-4 sm:my-5 py-3 sm:py-4 border-y border-[#E4E3DD]">
            <div className="text-center px-1">
              <div className="text-[13.5px] sm:text-[17px] font-bold text-[#1B1F23] truncate">{profile?.experience || "3–5 yrs"}</div>
              <div className="text-[10px] sm:text-[12px] text-[#9BA0A6] mt-[2px] truncate">Experience</div>
            </div>
            <div className="text-center border-l border-[#E4E3DD] px-1">
              <div className="text-[13.5px] sm:text-[17px] font-bold text-[#1B1F23] truncate">{availabilityMode || "Full-time"}</div>
              <div className="text-[10px] sm:text-[12px] text-[#9BA0A6] mt-[2px] truncate">Availability</div>
            </div>
            <div className="text-center border-l border-[#E4E3DD] px-1">
              <div className="text-[13.5px] sm:text-[17px] font-bold text-[#1B1F23] truncate">{startTimeline || "Today"}</div>
              <div className="text-[10px] sm:text-[12px] text-[#9BA0A6] mt-[2px] truncate">Available to start</div>
            </div>
          </div>

          {/* Top Skills */}
          <div className="mb-4 sm:mb-5">
            <p className="text-[11.5px] sm:text-[12px] font-semibold text-[#9BA0A6] mb-2 sm:mb-2.5 m-0">Top Skills &amp; Rates</p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2.5">
              {skillsList.slice(0, 4).map((skill) => (
                <span key={skill.id} className="inline-flex items-center gap-[6px] px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full border border-[#E4E3DD] text-[11.5px] sm:text-[13px] text-[#1B1F23] bg-[#F6F6F3]">
                  {skill.title} <span className="text-[#2A1B85] font-semibold">₹{Number(skill.price || 0).toLocaleString("en-IN")}/{skill.type}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Highlights */}
          <div className="mb-4 sm:mb-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-[#E5F5EB]">
                <span className="text-[20px] shrink-0">💰</span>
                <div className="min-w-0">
                  <b className="block text-[13.5px] sm:text-[14px] text-[#1B1F23] leading-tight truncate">₹{startingRate}</b>
                  <span className="text-[10px] sm:text-[11px] text-[#9BA0A6]">Starting rate</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-[#FBF0DF]">
                <span className="text-[20px] shrink-0">🗣️</span>
                <div className="min-w-0">
                  <b className="block text-[13.5px] sm:text-[14px] text-[#1B1F23] leading-tight truncate">
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
              <div className="flex items-center gap-1.5 sm:gap-2 text-[11.5px] sm:text-[12.5px] text-[#5B6168]">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${profile?.resumeUrl ? "bg-[#1FA854]" : "bg-gray-300"}`}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                Resume {profile?.resumeUrl ? "Uploaded" : "Pending"}
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-[11.5px] sm:text-[12.5px] text-[#5B6168]">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${user?.isPhoneVerified || user?.phone ? "bg-[#1FA854]" : "bg-gray-300"}`}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                Mobile Verified
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-[11.5px] sm:text-[12.5px] text-[#5B6168]">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${user?.isEmailVerified ? "bg-[#1FA854]" : "bg-gray-300"}`}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                Email Verified
              </div>
            </div>
            <p className="text-[11px] sm:text-[12px] text-[#9BA0A6] mt-2.5 sm:mt-3 m-0">
              Profile status: Active in Recruiter Directory
            </p>
          </div>

          {/* Action Buttons (Responsive on Mobile + Desktop) */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-5">
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className="flex-1 text-center py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl text-[13px] sm:text-[13.5px] font-semibold bg-white text-[#1B1F23] border border-[#E4E3DD] cursor-pointer hover:bg-gray-50 transition-colors shadow-xs"
            >
              👁️ View Profile
            </button>
            <a
              href={`https://wa.me/?text=Hi,%20view%20my%20freelancer%20profile%20on%20LucoHire:%20${window.location.origin}/freelancer/dashboard`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 text-center py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl text-[13px] sm:text-[13.5px] font-semibold bg-[#1FA854] text-white border border-transparent cursor-pointer hover:bg-[#198f46] transition-colors shadow-xs flex items-center justify-center gap-1.5"
            >
              💬 Share on WhatsApp
            </a>
            <button
              type="button"
              onClick={() => toast.success(`Contact verified: ${user?.phone || user?.email}`)}
              title="Verified Contact"
              className="w-full sm:w-[46px] py-2.5 sm:py-3 rounded-xl bg-white text-[#1B1F23] border border-[#E4E3DD] flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors shadow-xs shrink-0"
            >
              📞 <span className="sm:hidden ml-2 text-[12.5px] font-semibold">Contact Info</span>
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

      {/* ========================================================================= */}
      {/* RIGHT / SIDEBAR COLUMN (md:col-span-5 lg:col-span-4) */}
      {/* ========================================================================= */}
      <div className="md:col-span-5 lg:col-span-4 space-y-5 sm:space-y-6 lg:sticky lg:top-20">
        {/* Metrics Strip */}
        <div className="grid grid-cols-3 md:grid-cols-1 gap-2.5 sm:gap-3">
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

          <div
            onClick={() => navigate("/freelancer/leads")}
            className="bg-white border border-[#E4E3DD] rounded-[16px] p-4 shadow-xs cursor-pointer hover:border-[#4C2FD9]/40 transition-colors"
          >
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
              {stats?.responseRate ? `${stats.responseRate}%` : leads.length > 0 ? `${Math.round((leads.filter((l) => l.status !== "new").length / leads.length) * 100)}%` : "100%"}
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
            onClick={() => navigate("/freelancer/resume")}
            className="w-full py-2.5 px-4 rounded-xl text-[12.5px] font-semibold text-[#4C2FD9] bg-[#ECE8FB] hover:bg-[#ded7fa] transition-colors cursor-pointer"
          >
            Launch Resume Check →
          </button>
        </div>
      </div>
    </div>
  );
}
