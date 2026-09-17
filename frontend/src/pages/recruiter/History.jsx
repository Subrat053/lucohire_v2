import useTranslation from "../../hooks/useTranslation";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiEye, HiSearch, HiLockOpen, HiClock } from 'react-icons/hi';
import { recruiterAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const typeConfig = {
  profile_view: { label: 'Profile Viewed', icon: HiEye, color: 'bg-blue-100 text-blue-600' },
  search: { label: 'Search', icon: HiSearch, color: 'bg-amber-100 text-amber-600' },
  contact_unlock: { label: 'Contact Unlocked', icon: HiLockOpen, color: 'bg-green-100 text-green-700' },
  job_match: { label: 'Job Match', icon: HiClock, color: 'bg-purple-100 text-purple-600' },
};

const RecruiterHistory = () => {
  const {
    t
  } = useTranslation();

  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      const { data } = await recruiterAPI.getHistory();
      setHistory(Array.isArray(data) ? data : data.history || []);
    } catch {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter ? history.filter(h => h.type === filter) : history;

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("Search & Contact History")}</h1>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">{t("All Activity")}</option>
          <option value="profile_view">{t("Profile Views")}</option>
          <option value="contact_unlock">{t("Unlocked Contacts")}</option>
          <option value="search">{t("Searches")}</option>
        </select>
      </div>
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <HiClock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">{t("No history yet")}</p>
          <p className="text-gray-400 text-sm mt-1">{t("Your searches and contact unlocks will appear here")}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {filtered.map((item, i) => {
            const cfg = typeConfig[item.type] || typeConfig.profile_view;
            const Icon = cfg.icon;
            const providerName = item.visitedUser?.name || item.visitedProfile?.user?.name;
            const providerId = item.visitedUser?._id || item.visitedProfile?._id;
            return (
              <div key={i} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {cfg.label}
                    {providerName && (
                      <button onClick={() => providerId && navigate(`/recruiter/provider/${providerId}`)}
                        className="text-indigo-600 font-medium hover:underline ml-1">{providerName}</button>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(item.createdAt).toLocaleString()}
                    {item.searchQuery && <span>{t("· Query: \"")}{item.searchQuery}"</span>}
                    {item.searchSkill && <span>{t("· Skill:")}{item.searchSkill}</span>}
                    {item.searchCity && <span>{t("· City:")}{item.searchCity}</span>}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                  {cfg.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecruiterHistory;
