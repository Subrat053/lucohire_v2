import useTranslation from "../../hooks/useTranslation";
import { useState, useEffect } from 'react';
import { HiPhone, HiMail, HiBriefcase, HiCheck, HiX as HiXIcon } from 'react-icons/hi';
import { providerAPI } from '../../services/api';
import RouteLoader from '../../components/common/RouteLoader';
import toast from 'react-hot-toast';

const ProviderLeads = () => {
  const {
    t
  } = useTranslation();

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchLeads(); }, []);

  const fetchLeads = async () => {
    try {
      const { data } = await providerAPI.getLeads();
      setLeads(data);
    } catch (err) {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await providerAPI.updateLead(id, { status });
      setLeads(leads.map(l => l._id === id ? { ...l, status } : l));
      toast.success(`Lead marked as ${status}`);
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  if (loading) return <RouteLoader />;

  const statusColors = {
    new: 'bg-green-100 text-green-700',
    viewed: 'bg-teal-100 text-teal-700',
    contacted: 'bg-teal-100 text-teal-700',
    hired: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t("My Leads (")}{leads.length})</h1>
      {leads.length > 0 ? (
        <div className="space-y-2.5">
          {leads.map((lead) => (
            <div key={lead._id} className="bg-white rounded-2xl border border-gray-100 py-2 px-3 hover:shadow-sm transition">
              <div className="flex flex-row justify-between items-center gap-2">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{lead.recruiter?.name || 'Unknown Recruiter'}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${statusColors[lead.status] || ''}`}>{lead.status}</span>
                  </div>
                  <p className="text-sm text-gray-500 capitalize">{lead.type?.replace(/_/g, ' ')}</p>
                  {lead.jobPost && (
                    <div className="flex items-center space-x-1 mt-1 text-sm text-emerald-600">
                      <HiBriefcase className="w-4 h-4" />
                      <span>{lead.jobPost.title} - {lead.jobPost.city}</span>
                    </div>
                  )}
                  <p className="text-[10px] sm:text-xs text-gray-400 mt-1">{new Date(lead.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center space-x-1.5 shrink-0">
                  {lead.isUnlocked && lead.recruiter?.phone && (
                    <a href={`tel:${lead.recruiter.phone}`} className="flex-none w-8 h-8 min-w-8 min-h-8 aspect-square sm:w-10 sm:h-10 sm:min-w-10 sm:min-h-10 p-0 bg-green-50 text-green-700 rounded-full hover:bg-green-100 flex items-center justify-center overflow-hidden">
                      <HiPhone className="w-4 h-4 sm:w-5 sm:h-5" />
                    </a>
                  )}
                  {lead.isUnlocked && lead.recruiter?.email && (
                    <a href={`mailto:${lead.recruiter.email}`} className="flex-none w-8 h-8 min-w-8 min-h-8 aspect-square sm:w-10 sm:h-10 sm:min-w-10 sm:min-h-10 p-0 bg-teal-50 text-teal-600 rounded-full hover:bg-teal-100 flex items-center justify-center overflow-hidden">
                      <HiMail className="w-4 h-4 sm:w-5 sm:h-5" />
                    </a>
                  )}
                  {lead.status === 'new' && (
                    <>
                      <button onClick={() => updateStatus(lead._id, 'contacted')} className="flex-none !w-6 !h-6 !min-w-[24px] !min-h-[24px] !max-w-[24px] !max-h-[24px] sm:!w-7 sm:!h-7 sm:!min-w-[28px] sm:!min-h-[28px] sm:!max-w-[28px] sm:!max-h-[28px] p-0 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 flex items-center justify-center overflow-hidden aspect-square" title="Mark Contacted">
                        <HiCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                      <button onClick={() => updateStatus(lead._id, 'rejected')} className="flex-none !w-6 !h-6 !min-w-[24px] !min-h-[24px] !max-w-[24px] !max-h-[24px] sm:!w-7 sm:!h-7 sm:!min-w-[28px] sm:!min-h-[28px] sm:!max-w-[28px] sm:!max-h-[28px] p-0 bg-red-600 text-white rounded-full hover:bg-red-700 flex items-center justify-center overflow-hidden aspect-square" title="Reject">
                        <HiXIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
            <HiBriefcase className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{t("No leads yet")}</h3>
          <p className="text-gray-500">{t("Complete your profile and upgrade your plan to receive leads.")}</p>
        </div>
      )}
    </div>
  );
};

export default ProviderLeads;
