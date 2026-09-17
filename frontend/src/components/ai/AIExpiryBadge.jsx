import { useState, useEffect } from 'react';
import { HiSparkles, HiClock } from 'react-icons/hi';
import { aiAPI } from '../../services/api';

const AIExpiryBadge = ({ jobId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;
    let isMounted = true;
    
    setLoading(true);
    aiAPI.getJobExpiryPrediction(jobId)
      .then(res => {
        if (isMounted && res.data?.success) {
          setData(res.data.data);
        }
      })
      .catch(err => {
        console.error("Failed to fetch job expiry prediction:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [jobId]);

  if (loading || !data) return null;

  const isHighRisk = data.opportunity_expiry_risk === 'High';
  const isMediumRisk = data.opportunity_expiry_risk === 'Medium';
  
  const bgClass = isHighRisk ? 'bg-red-50 border-red-200' : isMediumRisk ? 'bg-yellow-50 border-yellow-200' : 'bg-emerald-50 border-emerald-200';
  const textClass = isHighRisk ? 'text-red-700' : isMediumRisk ? 'text-yellow-700' : 'text-emerald-700';
  const iconClass = isHighRisk ? 'text-red-600' : isMediumRisk ? 'text-yellow-600' : 'text-emerald-600';

  return (
    <div className={`mt-4 w-full p-3 rounded-xl border ${bgClass} flex items-start gap-3 transition-all animate-fadeIn`}>
      <div className={`p-2 rounded-full ${isHighRisk ? 'bg-red-100' : isMediumRisk ? 'bg-yellow-100' : 'bg-emerald-100'} shrink-0 mt-0.5`}>
        <HiClock className={`w-4 h-4 ${iconClass}`} />
      </div>
      <div>
        <div className="flex items-center gap-1.5 mb-0.5">
          <HiSparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-600">AI Opportunity Predictor</span>
        </div>
        <p className={`text-sm font-bold ${textClass}`}>
          {data.candidate_message}
        </p>
        <p className={`text-xs mt-0.5 ${textClass} opacity-80 font-medium`}>
          Est. active days left: {data.estimated_active_days_left} • {data.recommended_action}
        </p>
      </div>
    </div>
  );
};

export default AIExpiryBadge;
