import useTranslation from "../../hooks/useTranslation";
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { recruiterAPI } from '../../services/api';
import { HiArrowLeft, HiSparkles, HiLocationMarker, HiBriefcase, HiStar, HiCheck } from 'react-icons/hi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

export default function TopMatches() {
  const {
    t
  } = useTranslation();

  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('jobId');
  const navigate = useNavigate();

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobTitle, setJobTitle] = useState('');

  useEffect(() => {
    if (!jobId) {
      toast.error('No Job ID provided');
      navigate('/recruiter/job-postings');
      return;
    }

    const fetchMatches = async () => {
      setLoading(true);
      try {
        const { data } = await recruiterAPI.getMatches(jobId);
        if (data.success) {
          setMatches(data.data || []);
          if (data.job) {
             setJobTitle(data.job.title);
          }
        }
      } catch (error) {
        toast.error('Failed to fetch top matches');
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [jobId, navigate]);

  return (
    <div className="min-h-screen bg-[#F8FAFF] p-5">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/recruiter/job-postings" className="p-2 bg-white border border-[#E5EAF3] rounded-xl hover:bg-gray-50 transition">
            <HiArrowLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#081B3A] flex items-center gap-2">
              <HiSparkles className="text-purple-600" />{t("Top Matches")}{jobTitle ? `for "${jobTitle}"` : ''}
            </h1>
            <p className="text-sm text-gray-500">{t(
              "Our AI Matchmaking Engine analyzed this job's requirements and found the top 15 most suitable providers."
            )}</p>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : matches.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E5EAF3] p-10 text-center">
            <HiSparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-700">{t("No Perfect Matches Found")}</h3>
            <p className="text-sm text-gray-500 mt-1">{t(
              "Try expanding the location or adjusting the skill requirements in your job post."
            )}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {matches.map((provider, index) => (
              <div key={provider._id} className="bg-white rounded-2xl border border-[#E5EAF3] p-5 hover:border-purple-300 hover:shadow-md transition group relative overflow-hidden">
                {/* Ranking Badge */}
                <div className="absolute top-0 right-0 bg-gradient-to-bl from-purple-600 to-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-bl-xl shadow-sm">
                  #{index + 1}{t("Match")}</div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xl border-2 border-purple-200">
                    {provider.user?.name?.[0] || 'P'}
                  </div>
                  <div>
                    <h3 className="font-bold text-[#081B3A] text-lg leading-tight group-hover:text-purple-700 transition">
                      {provider.user?.name || 'Unknown Provider'}
                    </h3>
                    <p className="text-sm text-gray-500 font-medium">
                      {provider.skills?.[0] || 'General Service'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-5">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <HiLocationMarker className="w-4 h-4 text-purple-500 shrink-0" />
                    <span className="truncate">{provider.city || 'Location not specified'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <HiBriefcase className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>{provider.experience || '0'}{t("Years Experience")}</span>
                  </div>
                  {provider.pricing && (
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 bg-gray-50 p-2 rounded-lg border border-gray-100">{t("Pricing: ₹")}{provider.pricing}{t("/ hr")}</div>
                  )}
                </div>

                {provider.skills?.length > 1 && (
                  <div className="flex flex-wrap gap-1 mb-5">
                    {provider.skills.slice(1, 4).map((s, i) => (
                      <span key={i} className="text-[10px] px-2 py-1 bg-gray-100 text-gray-700 rounded-md border border-gray-200">
                        {s}
                      </span>
                    ))}
                    {provider.skills.length > 4 && (
                      <span className="text-[10px] px-2 py-1 text-gray-400">+{provider.skills.length - 4}</span>
                    )}
                  </div>
                )}

                <button 
                  onClick={() => navigate(`/recruiter/find-providers?providerId=${provider._id}`)}
                  className="w-full py-2.5 bg-white border-2 border-purple-600 text-purple-700 font-bold rounded-xl hover:bg-purple-50 transition"
                >{t("View Full Profile")}</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
