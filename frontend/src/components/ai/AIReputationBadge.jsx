import { useState, useEffect } from 'react';
import { HiSparkles, HiShieldCheck, HiStar } from 'react-icons/hi';
import { aiAPI } from '../../services/api';

const AIReputationBadge = ({ recruiterId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!recruiterId) return;
    let isMounted = true;
    
    setLoading(true);
    aiAPI.getRecruiterReputation(recruiterId)
      .then(res => {
        if (isMounted && res.data?.success) {
          setData(res.data.data);
        }
      })
      .catch(err => {
        console.error("Failed to fetch recruiter reputation:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [recruiterId]);

  if (loading || !data) return null;

  const score = data.recruiter_reputation_score || 0;
  
  const isHighTrust = score >= 80;
  const isMediumTrust = score >= 50 && score < 80;
  
  const bgClass = isHighTrust ? 'bg-indigo-50 border-indigo-200' : isMediumTrust ? 'bg-yellow-50 border-yellow-200' : 'bg-orange-50 border-orange-200';
  const textClass = isHighTrust ? 'text-indigo-800' : isMediumTrust ? 'text-yellow-800' : 'text-orange-800';
  const iconClass = isHighTrust ? 'text-indigo-600' : isMediumTrust ? 'text-yellow-600' : 'text-orange-600';

  return (
    <div className={`mt-4 w-full p-4 rounded-2xl border ${bgClass} transition-all animate-fadeIn`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <HiSparkles className="w-4 h-4 text-indigo-500" />
          <span className="text-[11px] uppercase tracking-wider font-extrabold text-indigo-600">AI Trust Score</span>
        </div>
        <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg shadow-2xs border border-gray-100">
          <HiStar className="w-4 h-4 text-yellow-400" />
          <span className="text-xs font-bold text-gray-800">{score}/100</span>
        </div>
      </div>
      
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-full bg-white shadow-2xs shrink-0`}>
          <HiShieldCheck className={`w-5 h-5 ${iconClass}`} />
        </div>
        <div>
          <p className={`text-sm font-bold ${textClass}`}>
            {data.recruiter_label}
          </p>
          <p className={`text-xs mt-0.5 ${textClass} opacity-80 font-medium`}>
            Avg Response: {data.average_response_time} • Ghosting Risk: {data.ghosting_risk_score}%
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIReputationBadge;
