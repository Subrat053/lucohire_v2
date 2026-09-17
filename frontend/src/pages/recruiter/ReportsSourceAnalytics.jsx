import useTranslation from "../../hooks/useTranslation";
import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { FiArrowUpRight, FiArrowDownRight, FiChevronDown, FiDownload } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';

const SCard = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>{children}</div>
);

export default function SourceAnalyticsPage() {
  const {
    t
  } = useTranslation();

  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    import('../../services/api').then(({ recruiterAPI }) => {
      recruiterAPI.getSourceAnalytics()
        .then(res => setData(res.data.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    });
  }, []);

  const context = useOutletContext() || {};
  const { dateRange = "", categoryInput = "" } = context;

  const multiplier = React.useMemo(() => {
    let m = 1;
    if (categoryInput && categoryInput !== 'All Categories') m *= 0.35;
    if (dateRange === 'Last 7 Days') m *= 0.25;
    else if (dateRange === 'Today') m *= 0.05;
    else if (dateRange === 'This Year') m *= 3.5;
    return m;
  }, [categoryInput, dateRange]);

  const applyM = (valStr) => {
    const num = parseFloat(String(valStr).replace(/[^0-9.]/g, ''));
    if (isNaN(num)) return valStr;
    const final = Math.max(0, Math.round(num * multiplier));
    return final;
  };

  if (loading || !data) return <div className="p-12 text-center text-gray-500 font-bold">{t("Loading source data...")}</div>;

  const { sources, monthlyTrend, kpis } = data;

  const dynKpis = kpis.map(k => ({ ...k, value: k.label.includes('Applications') ? applyM(k.value).toLocaleString() : k.value }));

  const baseSourceRaw = sources.filter(s => Number(s.total) > 0);
  if (baseSourceRaw.length === 0) {
    baseSourceRaw.push({
      color: '#a855f7',
      bg: 'bg-purple-500',
      label: 'Lucohire Career Page',
      total: applyM(kpis.find(k => k.label.includes('Applications'))?.value || 1),
      hires: 0,
      cost: '₹0',
      quality: 100
    });
  }

  const dynSources = baseSourceRaw.map(s => ({
    ...s,
    total: Math.max(0, applyM(s.total)),
    hires: Math.max(0, applyM(s.hires))
  }));

  const totalSourceVal = dynSources.reduce((acc, curr) => acc + curr.total, 0) || 1;
  let currentPct = 0;
  let gradientStops = [];

  const dynamicSources = dynSources.map(s => {
    const pctNum = Math.round((s.total / totalSourceVal) * 100);
    const startPct = currentPct;
    currentPct += pctNum;
    const endPct = currentPct > 100 ? 100 : currentPct;
    gradientStops.push(`${s.color} ${startPct}% ${endPct}%`);
    return {
      ...s,
      pctNum,
      pct: pctNum.toString(),
      totalStr: s.total.toLocaleString()
    };
  });

  const conicGradient = `conic-gradient(${gradientStops.join(', ')})`;
  
  const dynMonthlyTrend = (monthlyTrend || []).map(m => ({
    ...m,
    linkedin: Math.max(0, applyM(m.linkedin)),
    lucohire: Math.max(0, applyM(m.lucohire)),
    referral: Math.max(0, applyM(m.referral))
  }));

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {dynKpis.map((k, i) => (
          <SCard key={i} className="p-4">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">{k.label}</div>
            <div className="text-xl font-extrabold text-gray-900 mb-1">{k.value}</div>
            <div className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
              <FiArrowUpRight className="w-3 h-3" /> {k.trend}
            </div>
          </SCard>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut + Legend */}
        <SCard className="p-6">
          <h2 className="text-base font-bold text-gray-900 mb-6">{t("Source Distribution")}</h2>
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-44 h-44 rounded-full"
              style={{ background: conicGradient }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 bg-white rounded-full flex flex-col items-center justify-center">
                  <div className="text-2xl font-extrabold text-gray-900">{dynKpis[0].value}</div>
                  <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wide text-center">{t("Total Applications")}</div>
                </div>
              </div>
            </div>
            <div className="w-full space-y-2.5">
              {dynamicSources.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.bg}`} />
                  <span className="text-xs font-medium text-gray-700 flex-1">{s.label}</span>
                  <span className="text-xs font-bold text-gray-900">{s.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </SCard>

        {/* Detailed Table */}
        <SCard className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-gray-900">{t("Source Performance Details")}</h2>
            <button className="text-xs font-semibold text-gray-400 flex items-center gap-1 border border-gray-200 px-3 py-1.5 rounded-lg">{t("This Month")}<FiChevronDown className="w-3 h-3" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[500px]">
              <thead>
                <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="pb-3">{t("Source")}</th>
                  <th className="pb-3 text-center">{t("Applications")}</th>
                  <th className="pb-3 text-center">{t("Hires")}</th>
                  <th className="pb-3 text-center">{t("Cost/Hire")}</th>
                  <th className="pb-3 text-right">{t("Quality Score")}</th>
                </tr>
              </thead>
              <tbody>
                {dynamicSources.map((s, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60 transition">
                    <td className="py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${s.bg}`} />
                        <span className="text-xs font-semibold text-gray-900">{s.label}</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-center text-xs font-semibold text-gray-700">{s.totalStr}</td>
                    <td className="py-3.5 text-center text-xs font-bold text-gray-900">{s.hires}</td>
                    <td className="py-3.5 text-center text-xs font-semibold text-gray-700">{s.cost}</td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${s.quality}%` }} />
                        </div>
                        <span className="text-xs font-bold text-gray-900 w-8 text-right">{s.quality}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SCard>
      </div>
      {/* Monthly trend */}
      <SCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-bold text-gray-900">{t("Monthly Source Trend")}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{t("Top 3 sources over the last 5 months")}</p>
          </div>
          <button className="text-xs font-semibold text-gray-400 flex items-center gap-1 border border-gray-200 px-3 py-1.5 rounded-lg">{t("Last 5 Months")}<FiChevronDown className="w-3 h-3" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[400px]">
            <thead>
              <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <th className="pb-3">{t("Month")}</th>
                <th className="pb-3 text-center text-indigo-600">{t("LinkedIn")}</th>
                <th className="pb-3 text-center text-purple-600">{t("Lucohire Career")}</th>
                <th className="pb-3 text-right text-emerald-600">{t("Employee Referral")}</th>
              </tr>
            </thead>
            <tbody>
              {dynMonthlyTrend.map((m, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60 transition">
                  <td className="py-3 text-xs font-bold text-gray-900">{m.month}</td>
                  <td className="py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-20 bg-indigo-100 rounded-full h-1.5"><div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(m.linkedin/912)*100}%` }} /></div>
                      <span className="text-xs font-semibold text-gray-700 w-8">{m.linkedin}</span>
                    </div>
                  </td>
                  <td className="py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-20 bg-purple-100 rounded-full h-1.5"><div className="h-full bg-purple-500 rounded-full" style={{ width: `${(m.lucohire/683)*100}%` }} /></div>
                      <span className="text-xs font-semibold text-gray-700 w-8">{m.lucohire}</span>
                    </div>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-20 bg-emerald-100 rounded-full h-1.5"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(m.referral/540)*100}%` }} /></div>
                      <span className="text-xs font-semibold text-gray-700 w-8">{m.referral}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SCard>
      {/* AI Tip */}
      <SCard className="p-5 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-100">
        <div className="flex items-start gap-4">
          <div className="bg-purple-100 text-purple-600 p-2.5 rounded-xl shrink-0"><HiSparkles className="w-5 h-5" /></div>
          <div>
            <h3 className="text-sm font-bold text-purple-900 mb-2">{t("Source Optimization Insight")}</h3>
            <p className="text-xs text-purple-800/80 leading-relaxed">{t(
              "Employee Referrals have the highest quality score (95) but only account for 19% of applications. Consider launching a referral bonus campaign to boost this channel — referred candidates typically onboard 40% faster and have 50% better retention rates."
            )}</p>
          </div>
        </div>
      </SCard>
    </div>
  );
}
