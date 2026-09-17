import useTranslation from "../../hooks/useTranslation";
import { useState, useEffect } from "react";
import {
  HiX,
  HiOfficeBuilding,
  HiLocationMarker,
  HiMail,
  HiPhone,
  HiGlobeAlt,
  HiUser,
  HiStar,
  HiSparkles,
  HiBriefcase,
} from "react-icons/hi";
import toast from "react-hot-toast";
import { profileAPI } from "../../services/api";
import LoadingSpinner from "../common/LoadingSpinner";
import AIReputationBadge from "../ai/AIReputationBadge";

export default function RecruiterProfileModal({ recruiterId, companyFallbackName, onClose }) {
  const {
    t
  } = useTranslation();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!recruiterId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    profileAPI
      .getByUserId(recruiterId, { role: "recruiter" })
      .then((res) => {
        setProfileData(res.data);
      })
      .catch((err) => {
        console.error("Failed to fetch recruiter profile:", err);
        setError("Could not load company/recruiter profile details.");
        toast.error("Failed to load recruiter profile");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [recruiterId]);

  if (!recruiterId) return null;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/70 backdrop-blur-xs px-4 animate-fadeIn">
      <div className="bg-gradient-to-b from-white to-slate-50 rounded-3xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden transform transition-all flex flex-col max-h-[85vh] animate-scaleIn">
        
        {/* Top Gradient Banner Header */}
        <div className="relative bg-gradient-to-r from-blue-900 via-indigo-950 to-blue-900 px-6 py-8 text-white flex flex-col items-center justify-center text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition text-white/90 hover:text-white"
          >
            <HiX className="w-5.5 h-5.5" />
          </button>

          {/* Large Avatar container */}
          <div className="relative group mb-3">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-500 rounded-full blur-md opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
            <div className="relative w-20 h-20 rounded-full bg-slate-800 border-2 border-white overflow-hidden flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-105">
              {profileData?.user?.avatar ? (
                <img
                  src={profileData.user.avatar}
                  alt={profileData.user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <HiUser className="w-12 h-12 text-slate-400" />
              )}
            </div>
          </div>

          <h3 className="font-extrabold text-lg sm:text-xl tracking-tight">
            {profileData?.profile?.companyName || companyFallbackName || profileData?.user?.name || "Company Profile"}
          </h3>
          
          <p className="text-xs text-indigo-200 font-medium mt-1 flex items-center gap-1">
            <HiOfficeBuilding className="w-3.5 h-3.5" />
            {profileData?.profile?.companyType ? (
              <span className="capitalize">{profileData.profile.companyType}{t("recruiter")}</span>
            ) : (
              "Registered Partner Recruiter"
            )}
          </p>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-slate-700 text-xs sm:text-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <LoadingSpinner />
              <p className="text-xs text-slate-400 font-medium">{t("Fetching profile details...")}</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-rose-500 font-medium">
              {error}
            </div>
          ) : (
            <>
              {/* AI Reputation Predictor Badge */}
              {profileData?.user?._id && (
                <AIReputationBadge recruiterId={profileData.user._id} />
              )}

              {/* Stats Card Grid */}
              <div className="grid grid-cols-3 gap-2 bg-indigo-50/30 p-3.5 rounded-2xl border border-indigo-100/50">
                <div className="text-center space-y-0.5">
                  <span className="text-[10px] text-indigo-600 uppercase font-bold tracking-wider">{t("Rating")}</span>
                  <p className="font-extrabold text-slate-900 flex items-center justify-center gap-0.5 text-xs sm:text-sm">
                    <HiStar className="w-4 h-4 text-amber-500 fill-amber-500" />
                    {profileData?.profile?.avgRating ? Number(profileData.profile.avgRating).toFixed(1) : "N/A"}
                  </p>
                </div>
                <div className="text-center space-y-0.5 border-x border-indigo-100/60">
                  <span className="text-[10px] text-indigo-600 uppercase font-bold tracking-wider">{t("Hires")}</span>
                  <p className="font-extrabold text-slate-900 text-xs sm:text-sm">
                    {profileData?.profile?.totalHires || 0}
                  </p>
                </div>
                <div className="text-center space-y-0.5">
                  <span className="text-[10px] text-indigo-600 uppercase font-bold tracking-wider">{t("Jobs Posted")}</span>
                  <p className="font-extrabold text-slate-900 text-xs sm:text-sm">
                    {profileData?.profile?.totalJobsPosted || 0}
                  </p>
                </div>
              </div>

              {/* Bio / Description */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 border-l-4 border-indigo-600 pl-2">{t("Company Info & Bio")}</h4>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 leading-relaxed italic text-slate-600 text-xs sm:text-sm relative">
                  <span className="text-4xl text-slate-200 absolute top-1 left-2 select-none">“</span>
                  <p className="relative z-10 pl-3">
                    {profileData?.profile?.description ||
                      profileData?.profile?.bio ||
                      "This recruiter is verified and registered under the ServiceHub network, offering various jobs."}
                  </p>
                </div>
              </div>

              {/* Skills Category Needed */}
              {profileData?.profile?.skillsNeeded?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 border-l-4 border-indigo-600 pl-2 flex items-center gap-1">
                    <HiSparkles className="w-4 h-4 text-indigo-500" />{t("Hiring Categories")}</h4>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {profileData.profile.skillsNeeded.map((skill, index) => (
                      <span
                        key={index}
                        className="text-[10px] sm:text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 capitalize"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact Info & Location details */}
              <div className="space-y-2.5 border-t border-slate-100 pt-5">
                <h4 className="font-bold text-slate-900">{t("Contact & Head Office")}</h4>
                <div className="space-y-2">
                  {/* Location */}
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-600">
                    <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500">
                      <HiLocationMarker className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{t("Location")}</p>
                      <p>
                        {[
                          profileData?.profile?.nearestLocation,
                          profileData?.profile?.city,
                          profileData?.profile?.state,
                        ]
                          .filter(Boolean)
                          .join(", ") || "Not Specified"}
                      </p>
                    </div>
                  </div>

                  {/* Email */}
                  {profileData?.user?.email && (
                    <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-600">
                      <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500">
                        <HiMail className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{t("Email Address")}</p>
                        <a
                          href={`mailto:${profileData.user.email}`}
                          className="text-indigo-600 hover:underline"
                        >
                          {profileData.user.email}
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Contact Person Name */}
                  {profileData?.profile?.contactPersonName && (
                    <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-600">
                      <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500">
                        <HiUser className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{t("Contact Person")}</p>
                        <p>
                          {profileData.profile.contactPersonName}
                          {profileData.profile.designation && ` (${profileData.profile.designation})`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Company Website */}
                  {profileData?.profile?.companyWebsite && (
                    <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-600">
                      <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500">
                        <HiGlobeAlt className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{t("Website")}</p>
                        <a
                          href={
                            profileData.profile.companyWebsite.startsWith("http")
                              ? profileData.profile.companyWebsite
                              : `https://${profileData.profile.companyWebsite}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline break-all"
                        >
                          {profileData.profile.companyWebsite}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-center text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition shadow-2xs"
          >{t("Close Profile")}</button>
        </div>
      </div>
    </div>
  );
}
