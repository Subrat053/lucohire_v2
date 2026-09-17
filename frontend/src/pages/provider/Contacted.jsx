import useTranslation from "../../hooks/useTranslation";
import { useState, useEffect } from 'react';
import {
  HiPhone, HiMail, HiLocationMarker, HiStar,
  HiCheckCircle, HiEye, HiArrowRight, HiDocumentText,
} from 'react-icons/hi';
import { jobsAPI } from '../../services/api';
import RouteLoader from '../../components/common/RouteLoader';
import toast from 'react-hot-toast';
import { useLocale } from '../../context/LocaleContext';

const STATUS_BADGES = {
  pending:     { bg: 'bg-yellow-50 border-yellow-200 text-yellow-700', label: 'Pending Review' },
  reviewed:    { bg: 'bg-teal-50 border-teal-200 text-teal-700',       label: 'Reviewed' },
  contacted:   { bg: 'bg-amber-50 border-amber-200 text-amber-700',   label: '✓ Contacted You!' },
  shortlisted:{ bg: 'bg-emerald-50 border-emerald-200 text-emerald-700', label: 'Shortlisted' },
  rejected:    { bg: 'bg-red-50 border-red-200 text-red-700',          label: 'Not Selected' },
  hired:       { bg: 'bg-emerald-50 border-emerald-200 text-emerald-700', label: '✓✓ Hired!' },
};

const ContactedCard = ({ application }) => {
  const {
    t
  } = useTranslation();

  const { formatPrice } = useLocale();
  const recruiter = application.jobPost?.recruiter;
  const job = application.jobPost;
  const badge = STATUS_BADGES[application.status] || STATUS_BADGES.pending;
  const isContacted = application.status === 'contacted' || application.status === 'hired' || application.status === 'shortlisted';

  return (
    <div className={`relative rounded-2xl border transition-all duration-300 overflow-hidden ${
      isContacted
        ? 'bg-teal-50/40 border-teal-200 shadow-sm shadow-teal-100/50'
        : 'bg-white border-gray-100 hover:border-gray-200'
    }`}>
      {isContacted && (
        <div className="absolute top-0 right-0 bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-4 py-1 rounded-bl-xl text-[10px] font-black uppercase tracking-wider">{t("💬 Contacted")}</div>
      )}
      <div className="p-6 space-y-4">
        {/* Recruiter Info */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-extrabold text-lg text-gray-900">{recruiter?.name || 'Recruiter'}</h3>
            <p className="text-sm text-gray-700 mt-1 font-semibold">
              {job?.title}{job?.city && ` • ${job.city}`}
            </p>
          </div>
          <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold border ${badge.bg}`}>
            {badge.label}
          </span>
        </div>

        {/* Job Details */}
        <div className="bg-gray-50/50 rounded-xl p-4 space-y-2.5 border border-gray-100">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
            <HiDocumentText className="w-4 h-4 text-gray-450" />
            <span><span className="text-gray-500 uppercase tracking-wider text-[10px]">{t("Skill Required:")}</span> {job?.skill}</span>
          </div>
          {job?.budgetMin && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-emerald-600 font-extrabold">{formatPrice(job.budgetMin)}</span>
              {job?.budgetMax && <span className="text-gray-500">– {formatPrice(job.budgetMax)}</span>}
            </div>
          )}
          {job?.description && (
            <p className="text-xs text-gray-700 leading-relaxed font-medium">{job.description}</p>
          )}
        </div>

        {/* Contact & Actions */}
        <div className="grid sm:grid-cols-2 gap-3">
          {recruiter?.email && (
            <a href={`mailto:${recruiter.email}`}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-teal-50 text-teal-600 hover:bg-teal-100 transition-all text-xs font-bold border border-teal-200"
            >
              <HiMail className="w-4 h-4" />{t("Send Email")}</a>
          )}
          {recruiter?.phone && (
            <a href={`tel:${recruiter.phone}`}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all text-xs font-bold border border-emerald-200"
            >
              <HiPhone className="w-4 h-4" />{t("Place Call")}</a>
          )}
        </div>

        {/* Timeline */}
        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-300" />{t("Applied")}{new Date(application.appliedAt || application.createdAt).toLocaleDateString()}
          {isContacted && (
            <>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-300" />
              <span className="text-teal-600">{t("Contacted recently")}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const ProviderContacted = () => {
  const {
    t
  } = useTranslation();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => { fetchApplications(); }, []);

  const fetchApplications = async () => {
    try {
      const { data } = await jobsAPI.getMyApplications();
      setApplications(data?.applications || []);
    } catch {
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const contactedApps = applications.filter(a => a.status === 'contacted' || a.status === 'shortlisted' || a.status === 'hired');
  const acceptedApps = applications.filter(a => a.status === 'hired');

  const filteredApps = filterType === 'all'
    ? applications
    : filterType === 'contacted'
    ? contactedApps
    : acceptedApps;

  if (loading) return <RouteLoader />;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 font-sans">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-left mb-8">
          <h1 className="text-3xl font-extrabold text-emerald-950 mb-2">{t("Recruiter")} <span className="text-black drop-shadow-sm">{t("Messages")}</span>
          </h1>
          <p className="text-gray-500 text-sm">{t("See who has reached out to you about your applications")}</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 text-center shadow-xs border border-gray-100">
            <p className="text-3xl font-black text-emerald-950">{applications.length}</p>
            <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-wider">{t("Total Applications")}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 text-center shadow-xs border border-gray-100">
            <p className="text-3xl font-black text-black">{contactedApps.length}</p>
            <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-wider">{t("Recruiters Contacted")}</p>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-white rounded-2xl p-5 text-center shadow-xs border border-gray-100">
            <p className="text-3xl font-black text-emerald-650">{acceptedApps.length}</p>
            <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-wider">{t("Jobs Accepted")}</p>
          </div>
        </div>

        {/* Filter Tabs */}
        {applications.length > 0 && (
          <div className="bg-white rounded-2xl p-2 mb-6 flex gap-2 border border-gray-100 shadow-2xs">
            {[
              { id: 'all', label: 'All' },
              { id: 'contacted', label: '💬 Contacted' },
              { id: 'accepted', label: '✓ Accepted' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-4 py-2.5 rounded-xl transition text-xs font-extrabold uppercase tracking-wider ${
                  filterType === tab.id
                    ? 'bg-emerald-100 text-emerald-800 shadow-xs border-0'
                    : 'text-gray-700 hover:text-emerald-950 hover:bg-gray-55'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Applications List */}
        {filteredApps.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center border border-gray-100 shadow-xs">
            <HiDocumentText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-700 font-bold mb-1 text-sm uppercase tracking-wider">
              {applications.length === 0
                ? 'No applications yet. Start browsing jobs!'
                : `No applications in "${filterType === 'contacted' ? 'Contacted' : 'Accepted'}" category`}
            </p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              {filterType === 'contacted' && 'Recruiters will contact you here once they review your applications.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApps.map(app => (
              <ContactedCard key={app._id} application={app} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProviderContacted;
