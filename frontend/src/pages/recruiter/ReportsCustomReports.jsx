import useTranslation from "../../hooks/useTranslation";
import React, { useState } from 'react';
import { FiPlus, FiDownload, FiFileText, FiTrash2, FiEdit2, FiClock } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';

const SCard = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>{children}</div>
);

export default function CustomReportsPage() {
  const {
    t
  } = useTranslation();

  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [aiUsage, setAiUsage] = useState({ limits: {}, usage: {} });
  const [usageLoading, setUsageLoading] = useState(true);
  const [selectedMetrics, setSelectedMetrics] = useState(['hires', 'funnel', 'sources']);
  const [reportName, setReportName] = useState('');
  const [format, setFormat] = useState('PDF');
  const [showBuilder, setShowBuilder] = useState(false);

  React.useEffect(() => {
    import('../../services/api').then(({ recruiterAPI }) => {
      Promise.all([
        recruiterAPI.getCustomExportsData(),
        recruiterAPI.getAiUsage().catch(() => ({ data: { limits: {}, usage: {} } }))
      ]).then(([res, usageRes]) => {
        setData(res.data.data);
        if (usageRes.data?.success) {
          setAiUsage({ limits: usageRes.data.limits || {}, usage: usageRes.data.usage || {} });
        }
      }).catch(console.error)
        .finally(() => {
          setLoading(false);
          setUsageLoading(false);
        });
    });
  }, []);

  const isCustomReportsLimitReached = !usageLoading && 
    aiUsage.limits?.customReports !== -1 && 
    (aiUsage.usage?.customReports || 0) >= (aiUsage.limits?.customReports || 0);

  if (loading || !data) return <div className="p-12 text-center text-gray-500 font-bold">{t("Loading reports...")}</div>;

  const { savedReports, templates } = data;
  const metrics = [
    { id: 'hires',       label: 'Total Hires'          },
    { id: 'funnel',      label: 'Hiring Funnel'         },
    { id: 'sources',     label: 'Source Performance'    },
    { id: 'time',        label: 'Time to Hire'          },
    { id: 'cost',        label: 'Cost per Hire'         },
    { id: 'outreach',    label: 'Outreach Analytics'    },
    { id: 'interviews',  label: 'Interview Analytics'   },
    { id: 'ai',          label: 'AI Insights & Trends'  },
  ];



  const toggleMetric = (id) => {
    setSelectedMetrics(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleGenerateReport = () => {
    if (isCustomReportsLimitReached) {
      import('react-hot-toast').then(({ default: toast }) => {
        toast.error(`Custom Reports limit reached (${aiUsage.usage?.customReports || 0}/${aiUsage.limits?.customReports || 0}). Please upgrade your plan.`);
      });
      return;
    }
    // Proceed with generation logic if exists
  };

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">{t("Custom Report Builder")}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{t("Create tailored reports with the metrics you care about.")}</p>
        </div>
        
        {!usageLoading && aiUsage?.limits && (
          <div className="bg-white rounded-xl border border-indigo-100 p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex flex-col">
                <span className="text-gray-500 text-[10px] mb-0.5">{t('common.currentPlan', 'Current Plan')}</span>
                <span className="text-indigo-600 font-bold capitalize bg-indigo-50 px-2 py-0.5 rounded text-[10px] uppercase tracking-wide border border-indigo-100 self-start">
                  {aiUsage.planDetails?.name || aiUsage.planDetails?.slug || 'Free'}
                </span>
              </div>
              <div className="h-6 w-px bg-gray-200 hidden md:block"></div>
              <div className="flex flex-col">
                <span className="text-gray-500 text-[10px] flex items-center gap-1"><FiFileText className="w-2.5 h-2.5 text-indigo-500"/> {t('recruiter.reportsLimit', 'Custom Reports')}</span>
                <span className="text-slate-800 font-bold text-xs">
                  {aiUsage.limits.customReports === -1 ? 'Unlimited' : 
                    `${Math.max(0, (aiUsage.limits.customReports || 0) - (aiUsage.usage?.customReports || 0))} / ${aiUsage.limits.customReports || 0} ${t('common.credits', 'Credits')}`}
                </span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => setShowBuilder(!showBuilder)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition"
        >
          <FiPlus /> {showBuilder ? 'Close Builder' : 'Create Custom Report'}
        </button>
      </div>
      {/* Report Builder Panel */}
      {showBuilder && (
        <SCard className="p-6 border-indigo-100 bg-indigo-50/30">
          <h3 className="text-sm font-bold text-gray-900 mb-5 flex items-center gap-2">
            <HiSparkles className="text-indigo-600" />{t("Report Builder")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wide block mb-1.5">{t("Report Name")}</label>
                <input
                  type="text"
                  value={reportName}
                  onChange={e => setReportName(e.target.value)}
                  placeholder={t("e.g., Q3 Hiring Summary")}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wide block mb-1.5">{t("Date Range")}</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  <input type="date" className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wide block mb-1.5">{t("Export Format")}</label>
                <div className="flex gap-3">
                  {['PDF', 'Excel', 'CSV'].map(f => (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                        format === f
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-gray-200 text-gray-700 bg-white hover:bg-gray-50'
                      }`}
                    >{f}</button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wide block mb-1.5">{t("Select Metrics to Include")}</label>
              <div className="grid grid-cols-2 gap-2">
                {metrics.map(m => (
                  <button
                    key={m.id}
                    onClick={() => toggleMetric(m.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition text-left ${
                      selectedMetrics.includes(m.id)
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                        : 'border-gray-200 text-gray-700 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded border-2 shrink-0 flex items-center justify-center ${
                      selectedMetrics.includes(m.id) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                    }`}>
                      {selectedMetrics.includes(m.id) && <span className="text-white text-[8px] font-black">✓</span>}
                    </span>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-6 pt-5 border-t border-indigo-100">
            <button 
              onClick={handleGenerateReport}
              disabled={isCustomReportsLimitReached}
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiDownload />{t("Generate Report")}
            </button>
            <button className="flex items-center gap-2 border border-indigo-200 text-indigo-600 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-50 transition">{t("Save Template")}</button>
            <button className="flex items-center gap-2 border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50 transition">{t("Preview")}</button>
          </div>
        </SCard>
      )}
      {/* Report Templates */}
      <SCard className="p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4">{t("Report Templates")}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t, i) => (
            <button
              key={i}
              onClick={() => setShowBuilder(true)}
              className="flex items-start gap-4 p-4 rounded-2xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition text-left group"
            >
              <span className="text-2xl">{t.icon}</span>
              <div>
                <div className="text-xs font-bold text-gray-900 mb-1 group-hover:text-indigo-700 transition">{t.name}</div>
                <div className="text-[10px] font-medium text-gray-500">{t.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </SCard>
      {/* Saved Reports */}
      <SCard className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-bold text-gray-900">{t("Saved Reports")}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{t("Your previously generated and saved reports")}</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[540px]">
            <thead>
              <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <th className="pb-3">{t("Report Name")}</th>
                <th className="pb-3 text-center">{t("Format")}</th>
                <th className="pb-3 text-center">{t("Created")}</th>
                <th className="pb-3 text-center">{t("Downloads")}</th>
                <th className="pb-3 text-right">{t("Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {savedReports.map((r, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60 transition group">
                  <td className="py-3.5">
                    <div className="flex items-center gap-2">
                      <FiFileText className={r.type === 'PDF' ? 'text-red-700' : 'text-emerald-500'} />
                      <div>
                        <div className="text-xs font-bold text-gray-900 group-hover:text-indigo-600 transition">{r.name}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {r.tags.map(tag => (
                            <span key={tag} className="text-[9px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{tag}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 text-center">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.type === 'PDF' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>{r.type}</span>
                  </td>
                  <td className="py-3.5 text-center text-xs font-semibold text-gray-700">
                    <div className="flex items-center justify-center gap-1"><FiClock className="w-3 h-3 text-gray-400" />{r.created}</div>
                  </td>
                  <td className="py-3.5 text-center text-xs font-semibold text-gray-700">{r.downloads}</td>
                  <td className="py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-1.5 text-gray-400 hover:text-indigo-600 transition"><FiDownload className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 text-gray-400 hover:text-blue-600 transition"><FiEdit2 className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 text-gray-400 hover:text-red-700 transition"><FiTrash2 className="w-3.5 h-3.5" /></button>
                    </div>
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
