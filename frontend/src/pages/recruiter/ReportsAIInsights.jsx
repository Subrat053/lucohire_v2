import useTranslation from "../../hooks/useTranslation";
import React, { useState } from 'react';
import { FiArrowUpRight, FiChevronRight, FiBriefcase, FiDollarSign, FiUsers, FiTrendingUp } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';

const SCard = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>{children}</div>
);

const iconMap = {
  FiBriefcase: <FiBriefcase className="w-5 h-5" />,
  FiDollarSign: <FiDollarSign className="w-5 h-5" />,
  FiTrendingUp: <FiTrendingUp className="w-5 h-5" />,
  FiUsers: <FiUsers className="w-5 h-5" />
};

export default function AIInsightsPage() {
  const {
    t
  } = useTranslation();

  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [activeCategory, setActiveCategory] = useState('skills');

  React.useEffect(() => {
    import('../../services/api').then(({ recruiterAPI }) => {
      recruiterAPI.getAiInsights()
        .then(res => setData(res.data.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    });
  }, []);

  if (loading || !data) return <div className="p-12 text-center text-gray-500 font-bold">{t("Loading AI Insights...")}</div>;

  const { insightCategories, kpis } = data;
  const mappedCategories = insightCategories.map(c => ({ ...c, icon: iconMap[c.icon] }));
  const activeData = mappedCategories.find(c => c.id === activeCategory);

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <SCard key={i} className="p-4">
            <div className={`text-2xl font-extrabold mb-1 ${k.color}`}>{k.value}</div>
            <div className="text-xs font-bold text-gray-900 mb-0.5">{k.label}</div>
            <div className="text-[10px] font-semibold text-gray-500">{k.sub}</div>
          </SCard>
        ))}
      </div>
      {/* Category selector + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar category list */}
        <div className="space-y-3">
          {mappedCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition ${
                activeCategory === cat.id
                  ? 'border-indigo-200 bg-indigo-50 shadow-sm'
                  : 'border-gray-100 bg-white hover:bg-gray-50'
              }`}
            >
              <div className={`${cat.bg} ${cat.ic} p-2 rounded-xl shrink-0`}>{cat.icon}</div>
              <div className="min-w-0">
                <div className={`text-xs font-bold mb-0.5 ${activeCategory === cat.id ? 'text-indigo-700' : 'text-gray-900'}`}>{cat.title}</div>
                <div className="text-[10px] font-medium text-gray-500 truncate">{cat.desc}</div>
              </div>
              <FiChevronRight className={`shrink-0 ${activeCategory === cat.id ? 'text-indigo-500' : 'text-gray-300'}`} />
            </button>
          ))}
        </div>

        {/* Detail panel */}
        <SCard className="lg:col-span-3 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className={`${activeData.bg} ${activeData.ic} p-3 rounded-xl`}>{activeData.icon}</div>
            <div>
              <h2 className="text-base font-bold text-gray-900">{activeData.title}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{activeData.desc}</p>
            </div>
          </div>

          <div className="space-y-4">
            {activeData.id === 'skills' && (
              <div className="space-y-3">
                <div className="grid grid-cols-4 text-[10px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-100 pb-2">
                  <span>{t("Skill")}</span>
                  <span className="text-center">{t("Demand")}</span>
                  <span className="text-center">{t("Supply")}</span>
                  <span className="text-right">{t("Market")}</span>
                </div>
                {activeData.items.map((item, i) => (
                  <div key={i} className="grid grid-cols-4 items-center">
                    <div className="text-xs font-semibold text-gray-900">{item.skill}</div>
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 bg-indigo-100 rounded-full h-1.5"><div className="h-full bg-indigo-500 rounded-full" style={{ width: `${item.demand}%` }} /></div>
                      <span className="text-[10px] font-bold text-gray-700 w-6">{item.demand}</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 bg-emerald-100 rounded-full h-1.5"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${item.supply}%` }} /></div>
                      <span className="text-[10px] font-bold text-gray-700 w-6">{item.supply}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.trend === 'High' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>{item.trend}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeData.id === 'salary' && (
              <div className="space-y-3">
                {activeData.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50/60 rounded-xl">
                    <div className="text-xs font-semibold text-gray-900">{item.skill}</div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-gray-900">{item.gap}</div>
                      <div className="text-[10px] font-semibold text-indigo-600">{item.trend}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(activeData.id === 'hiring' || activeData.id === 'market') && (
              <div className="space-y-3">
                {activeData.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50/60 rounded-xl">
                    <div className="text-xs font-semibold text-gray-900 flex-1">{item.skill}</div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-700">{item.gap}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                        item.trend.includes('Hot') || item.trend.includes('Rising') || item.trend.includes('Growing')
                          ? 'bg-emerald-50 text-emerald-700'
                          : item.trend.includes('Cooling')
                          ? 'bg-red-50 text-red-600'
                          : 'bg-gray-100 text-gray-700'
                      }`}>{item.trend}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SCard>
      </div>
      {/* AI Summary Block */}
      <SCard className="p-6 bg-gradient-to-br from-indigo-900 to-purple-900 border-0 text-white">
        <div className="flex items-start gap-4">
          <div className="bg-white/20 p-3 rounded-xl shrink-0"><HiSparkles className="w-6 h-6" /></div>
          <div>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">{t("AI Monthly Summary")}<span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{t("New")}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-white/10 rounded-xl p-4">
                <div className="text-white/60 font-semibold mb-2 text-[10px] uppercase tracking-wide">{t("Hiring Health")}</div>
                <p className="text-white/90 leading-relaxed">{t(
                  "Your overall hiring efficiency improved by 14%. AI shortlisting reduced screening time by 3.2 days on average."
                )}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <div className="text-white/60 font-semibold mb-2 text-[10px] uppercase tracking-wide">{t("Talent Market")}</div>
                <p className="text-white/90 leading-relaxed">{t(
                  "React and DevOps skills remain in critical shortage. Expand your sourcing to tier-2 cities and consider upskilling programs."
                )}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <div className="text-white/60 font-semibold mb-2 text-[10px] uppercase tracking-wide">{t("Next Best Action")}</div>
                <p className="text-white/90 leading-relaxed">{t(
                  "Launch a senior tech referral campaign. Your Employee Referral quality score (95) is the highest of all sources — capitalize on it."
                )}</p>
              </div>
            </div>
          </div>
        </div>
      </SCard>
    </div>
  );
}
