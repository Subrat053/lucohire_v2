import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useFreelancer } from "../../context/FreelancerContext";

export default function FreelancerLeadsPage() {
  const navigate = useNavigate();
  const {
    leads,
    stats,
    user,
    strengthPct,
    skillsList,
    availabilityMode,
    quoteForms,
    setQuoteForms,
    openQuoteId,
    setOpenQuoteId,
    sendingQuoteId,
    handleSendQuote,
    handleMarkLeadWon,
    setProfileModalOpen,
  } = useFreelancer();

  // Local filter states
  const [selectedSkillFilter, setSelectedSkillFilter] = useState("All skills");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("All");

  // Dynamic skill list derived from real leads
  const distinctLeadSkills = ["All skills", ...new Set(leads.flatMap((l) => l.skills || []))].slice(0, 8);

  // Lead Filtering
  const filteredLeads = leads.filter((lead) => {
    if (
      selectedSkillFilter !== "All skills" &&
      !lead.skills?.some((s) => String(s).toLowerCase() === selectedSkillFilter.toLowerCase())
    ) {
      return false;
    }
    if (selectedStatusFilter === "New" && lead.status !== "new") return false;
    if (selectedStatusFilter === "Replied" && lead.status !== "replied") return false;
    if (selectedStatusFilter === "Won" && lead.status !== "won") return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* LEADS HERO BANNER */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#2A1B85] via-[#3B22A8] to-[#4C2FD9] rounded-[22px] p-6 sm:p-8 text-[#F3F1FC] shadow-md">
        <div className="absolute -right-12 -top-12 w-48 h-48 border border-white/15 rounded-full pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-1">
          <div>
            <div className="font-['Fraunces',serif] text-[36px] sm:text-[44px] font-semibold leading-none text-white">
              {leads.length}
            </div>
            <div className="text-[13px] sm:text-[14px] text-[#CFC7F5] mt-1.5">
              {leads.length === 1 ? "Direct recruiter project lead" : "Direct recruiter project leads"}
            </div>
          </div>
          <div className="sm:text-right">
            <span className="inline-block text-[12px] font-bold text-white bg-white/15 py-2 px-4 rounded-full whitespace-nowrap">
              {leads.filter((l) => l.status === "new" || l.status === "replied").length > 0
                ? `${leads.filter((l) => l.status === "new" || l.status === "replied").length} Active in Pipeline`
                : "Direct Opportunities"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-6 relative z-1 max-w-lg">
          <div className="bg-white/10 rounded-xl p-3 sm:p-3.5">
            <div className="text-[16px] sm:text-[18px] font-bold text-white">
              {leads.length > 0
                ? (stats?.responseRate ? `${stats.responseRate}%` : `${Math.round((leads.filter((l) => l.status !== "new").length / leads.length) * 100)}%`)
                : "100%"}
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#CFC7F5] mt-0.5 leading-tight">Response rate</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 sm:p-3.5">
            <div className="text-[16px] sm:text-[18px] font-bold text-white">
              {leads.filter((l) => l.status === "won").length}
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#CFC7F5] mt-0.5 leading-tight">Won leads</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 sm:p-3.5">
            <div className="text-[16px] sm:text-[18px] font-bold text-white">
              {leads.filter((l) => l.status === "new").length}
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#CFC7F5] mt-0.5 leading-tight">New inquiries</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FILTER SECTION */}
      {/* ========================================================================= */}
      <div className="bg-white border border-[#E4E3DD] rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold text-[#9BA0A6] uppercase tracking-wider m-0">Filter by skill</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar flex-wrap">
              {distinctLeadSkills.map((skill) => {
                const active = selectedSkillFilter.toLowerCase() === skill.toLowerCase();
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

      {/* ========================================================================= */}
      {/* ZERO LEADS EMPTY STATE */}
      {/* ========================================================================= */}
      {leads.length === 0 ? (
        <div className="bg-white border border-[#E4E3DD] rounded-2xl p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#ECE8FB] text-[#4C2FD9] flex items-center justify-center mx-auto mb-4 text-3xl shadow-sm">
            💼
          </div>
          <h3 className="font-['Fraunces',serif] text-[22px] sm:text-[26px] font-semibold text-[#1B1F23] m-0">
            No recruiter leads yet
          </h3>
          <p className="text-[13.5px] sm:text-[14.5px] text-[#5B6168] mt-2 mb-6 max-w-lg mx-auto leading-relaxed">
            When recruiters search for your skills or unlock your profile, their direct project inquiries and WhatsApp contact requests will appear here in real time.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left mb-6">
            <div className="p-3.5 rounded-xl bg-[#F6F6F3] border border-[#E4E3DD]">
              <div className="text-[11px] font-bold text-[#9BA0A6] uppercase tracking-wider mb-1">Profile Strength</div>
              <div className="text-[14px] font-bold text-[#1B1F23]">{strengthPct}% Complete</div>
              <p className="text-[11px] text-[#5B6168] mt-1 m-0">Complete profiles get contacted 4.5x more often.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#F6F6F3] border border-[#E4E3DD]">
              <div className="text-[11px] font-bold text-[#9BA0A6] uppercase tracking-wider mb-1">Skills Listed</div>
              <div className="text-[14px] font-bold text-[#1B1F23]">{skillsList.length} Skills</div>
              <p className="text-[11px] text-[#5B6168] mt-1 m-0">Add exact starting rates for your key offerings.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#F6F6F3] border border-[#E4E3DD]">
              <div className="text-[11px] font-bold text-[#9BA0A6] uppercase tracking-wider mb-1">Status</div>
              <div className="text-[14px] font-bold text-[#1FA854] flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#1FA854]" />
                {availabilityMode}
              </div>
              <p className="text-[11px] text-[#5B6168] mt-1 m-0">Your profile is visible in client searches.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className="py-2.5 px-5 rounded-xl text-[13px] font-semibold bg-[#4C2FD9] text-white hover:bg-[#3d24b5] transition-colors shadow-sm cursor-pointer"
            >
              👁️ Preview Profile as Client
            </button>
            <button
              type="button"
              onClick={() => navigate("/freelancer/dashboard")}
              className="py-2.5 px-5 rounded-xl text-[13px] font-semibold bg-[#F6F6F3] text-[#1B1F23] border border-[#E4E3DD] hover:bg-gray-100 transition-colors cursor-pointer"
            >
              ⚙️ Edit Skills &amp; Rates
            </button>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/provider/${user?.id || user?._id || ""}`);
                toast.success("Public profile link copied to clipboard!");
              }}
              className="py-2.5 px-5 rounded-xl text-[13px] font-semibold bg-[#ECE8FB] text-[#2A1B85] hover:bg-[#ded7fa] transition-colors cursor-pointer"
            >
              🔗 Copy Public Share Link
            </button>
          </div>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="bg-white border border-[#E4E3DD] rounded-2xl p-8 text-center shadow-xs">
          <div className="text-3xl mb-2">🔍</div>
          <h4 className="text-[16px] font-semibold text-[#1B1F23] m-0">No matching leads</h4>
          <p className="text-[13px] text-[#5B6168] mt-1 mb-4">
            No project inquiries found for skill "{selectedSkillFilter}" and status "{selectedStatusFilter}".
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedSkillFilter("All skills");
              setSelectedStatusFilter("All");
            }}
            className="py-2 px-4 rounded-xl text-[12.5px] font-semibold bg-[#4C2FD9] text-white hover:bg-[#3d24b5] transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* ========================================================================= */
        /* LEAD CARDS GRID */
        /* ========================================================================= */
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
                    {lead.skills?.map((s) => (
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
                        <span className="text-[14px] font-semibold text-[#1B1F23] truncate">{lead.name}</span>
                        <span className="text-[11px] text-[#9BA0A6] whitespace-nowrap">{lead.time}</span>
                      </div>
                      {lead.company && (
                        <p className="text-[11.5px] font-medium text-[#4C2FD9] m-0 truncate">🏢 {lead.company}</p>
                      )}
                      <h4 className="text-[13.5px] font-semibold text-[#1B1F23] mt-1 m-0 leading-snug">{lead.projectTitle}</h4>
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
                          : lead.status === "won"
                          ? "bg-[#E5F5EB] text-[#137A3D]"
                          : "bg-gray-100 text-[#5B6168]"
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
                      href={
                        lead.recruiterPhone
                          ? `https://wa.me/${lead.recruiterPhone.replace(/\D/g, "")}?text=Hi%20${encodeURIComponent(lead.name)},%20I%20saw%20your%20project%20"${encodeURIComponent(lead.projectTitle)}"%20on%20LucoHire.%20I%20am%20available%20to%20help.`
                          : undefined
                      }
                      onClick={(e) => {
                        if (!lead.recruiterPhone) {
                          e.preventDefault();
                          toast("Recruiter contact phone will be unlocked once quote is accepted or in direct message.", { icon: "ℹ️" });
                        }
                      }}
                      target={lead.recruiterPhone ? "_blank" : undefined}
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
                      {lead.quoteSent ? "✏️ Update quote" : "💰 Send quote"}
                    </button>
                    {lead.status !== "won" && (
                      <button
                        type="button"
                        onClick={() => handleMarkLeadWon(lead.id)}
                        title="Mark as hired / contract won"
                        className="py-2.5 px-3 rounded-xl text-[12px] font-semibold text-[#137A3D] bg-[#E5F5EB] hover:bg-[#d5eedd] transition-colors cursor-pointer"
                      >
                        ✓ Won
                      </button>
                    )}
                  </div>

                  {/* Inline Quote Drawer */}
                  {openQuoteId === lead.id && (
                    <div className="pt-3 mt-3 border-t border-dashed border-[#E4E3DD]">
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
                            <option>10 days</option>
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
                          placeholder="Proposal note or portfolio link for recruiter..."
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
                          {sendingQuoteId === lead.id ? "Saving..." : lead.quoteSent ? "Update Quote" : "Submit Quote"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
