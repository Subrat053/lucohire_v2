import useTranslation from "../../hooks/useTranslation";
import React from 'react';
import { FiArrowUpRight, FiChevronDown, FiExternalLink } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';

const SCard = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>{children}</div>
);

export default function JobPerformancePage() {
  const {
    t
  } = useTranslation();

  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    import('../../services/api').then(({ recruiterAPI }) => {
      recruiterAPI.getJobPerformance()
        .then(res => setData(res.data.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    });
  }, []);

  if (loading || !data) return <div className="p-12 text-center text-gray-500 font-bold">{t("Loading performance data...")}</div>;

  const { jobs, jobTypeStats, kpis } = data;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <SCard key={i} className="p-4">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">{k.label}</div>
            <div className="text-2xl font-extrabold text-gray-900 mb-1">{k.value}</div>
            <div className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
              <FiArrowUpRight className="w-3 h-3" /> {k.sub}
            </div>
          </SCard>
        ))}
      </div>
      {/* Job Type Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {jobTypeStats.map((j, i) => (
          <SCard key={i} className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className={`w-3 h-3 rounded-full ${j.dot}`} />
              <span className="text-sm font-bold text-gray-900">{j.type}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">{t("Jobs")}</div>
                <div className="text-xl font-extrabold text-gray-900">{j.count}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">{t("Applications")}</div>
                <div className="text-xl font-extrabold text-gray-900">{j.apps}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">{t("Hires")}</div>
                <div className="text-xl font-extrabold text-emerald-700">{j.hires}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">{t("Hires/Job")}</div>
                <div className="text-xl font-extrabold text-gray-900">{j.ratio}</div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] font-semibold text-gray-500">{t("Avg. cost/hire:")}<span className="text-gray-900 font-bold">{j.avg_cost}</span>
            </div>
          </SCard>
        ))}
      </div>
      {/* Job Detail Table */}
      <SCard className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-gray-900">{t("Individual Job Performance")}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{t("All job postings with detailed performance metrics")}</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-170">
            <thead>
              <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <th className="pb-3">{t("Job Title")}</th>
                <th className="pb-3">{t("Type")}</th>
                <th className="pb-3 text-center">{t("Apps")}</th>
                <th className="pb-3 text-center">{t("Hires")}</th>
                <th className="pb-3 text-center">{t("Hires/Job")}</th>
                <th className="pb-3 text-center">{t("Days Open")}</th>
                <th className="pb-3 text-right">{t("Status")}</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60 transition group">
                  <td className="py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900 group-hover:text-indigo-600 transition">{j.label}</span>
                      <FiExternalLink className="w-3 h-3 text-gray-300 group-hover:text-indigo-400 transition" />
                    </div>
                    <div className="text-[10px] font-semibold text-gray-400">{j.dept}</div>
                  </td>
                  <td className="py-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${j.dot}`} />
                      <span className="text-[11px] font-semibold text-gray-700">{j.type}</span>
                    </div>
                  </td>
                  <td className="py-3.5 text-center text-xs font-semibold text-gray-700">{j.apps}</td>
                  <td className="py-3.5 text-center text-xs font-bold text-gray-900">{j.hires}</td>
                  <td className="py-3.5 text-center">
                    <span className={`text-xs font-bold ${Number(j.ratio) >= 1 ? 'text-emerald-600' : Number(j.ratio) > 0 ? 'text-orange-500' : 'text-gray-400'}`}>
                      {Number(j.ratio).toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3.5 text-center text-xs font-semibold text-gray-700">{j.daysOpen}{t("d")}</td>
                  <td className="py-3.5 text-right">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      j.status === 'Active' ? 'bg-emerald-50 text-emerald-700' :
                      j.status === 'Paused' ? 'bg-orange-50 text-orange-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>{j.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SCard>
    </div>
  );
}
