import useTranslation from "../../hooks/useTranslation";
import React from 'react';
import { HiX, HiOutlineDownload, HiOutlineDocumentText } from 'react-icons/hi';
import { FiUser, FiBriefcase, FiMapPin } from 'react-icons/fi';

export default function CandidateProfileModal({ isOpen, onClose, candidateProfile, candidateUser }) {
  const {
    t
  } = useTranslation();

  if (!isOpen || !candidateProfile) return null;

  const {
    skills,
    experience,
    designation,
    company,
    city,
    education,
    previousExperience,
    resumeUrl,
    portfolioLinks
  } = candidateProfile;

  const name = candidateUser?.name || 'Candidate';
  const email = candidateUser?.email;
  const phone = candidateUser?.phone;
  const photo = candidateUser?.profilePhoto || candidateUser?.avatar;

  const getFullUrl = (url) => {
    if (!url || url === '/') return '';
    if (url.startsWith('http')) return url;
    const apiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api';
    const backendUrl = apiUrl.replace(/\/api\/?$/, '');
    return `${backendUrl}${url}`;
  };

  const fullResumeUrl = getFullUrl(resumeUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <FiUser className="text-indigo-600" />{t("Candidate Profile")}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition">
            <HiX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col md:flex-row gap-8 min-h-[60vh]">
            {/* Left Column: Details */}
            <div className="md:w-1/3 space-y-6">
              <div className="text-center">
                {photo ? (
                  <img src={photo} alt={name} className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-white shadow-md mb-4" />
                ) : (
                  <div className="w-24 h-24 rounded-full mx-auto bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-3xl border-4 border-white shadow-md mb-4">
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
                <h3 className="font-bold text-xl text-slate-900">{name}</h3>
                <p className="text-sm font-medium text-slate-500">{designation || 'Candidate'}</p>
                <div className="flex items-center justify-center gap-1 text-xs text-slate-400 mt-2">
                  <FiMapPin className="w-3 h-3" /> {city || 'Remote'}
                </div>
              </div>

              {email && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                  <div className="text-xs font-bold text-slate-400 uppercase mb-1">{t("Contact")}</div>
                  <div className="font-medium text-slate-700">{email}</div>
                  {phone && <div className="font-medium text-slate-700 mt-1">{phone}</div>}
                </div>
              )}

              {skills && skills.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t("Skills")}</h4>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, idx) => (
                      <span key={idx} className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md text-xs font-medium border border-indigo-100">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {experience && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t("Experience")}</h4>
                  <p className="text-sm text-slate-700 font-medium flex items-center gap-2">
                    <FiBriefcase className="text-slate-400" /> {experience} {company ? `at ${company}` : ''}
                  </p>
                </div>
              )}

              {portfolioLinks && portfolioLinks.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t("Links")}</h4>
                  <div className="flex flex-col gap-1.5">
                    {portfolioLinks.map((link, idx) => (
                      <a key={idx} href={link.url} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline break-all">
                        {link.platform || link.url}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Resume Viewer */}
            <div className="md:w-2/3 flex flex-col bg-slate-50 rounded-xl border border-slate-200 overflow-hidden h-[600px] md:h-auto">
              <div className="px-4 py-3 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <HiOutlineDocumentText className="text-indigo-600 w-5 h-5" />{t("Uploaded Resume")}</h4>
                {fullResumeUrl && (
                  <a href={fullResumeUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition">
                    <HiOutlineDownload className="w-4 h-4" />{t("Download")}</a>
                )}
              </div>
              
              <div className="flex-1 bg-slate-100 flex items-center justify-center p-2 relative">
                {fullResumeUrl ? (
                  <iframe 
                    src={`${fullResumeUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
                    title="Candidate Resume"
                    className="w-full h-full rounded shadow-sm bg-white"
                  />
                ) : (
                  <div className="text-center text-slate-400">
                    <HiOutlineDocumentText className="w-16 h-16 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">{t("No resume uploaded")}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
