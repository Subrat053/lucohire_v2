import useTranslation from "../../hooks/useTranslation";
import React from 'react';
import { FiMail, FiArrowUpRight, FiArrowDownRight, FiMessageCircle, FiSmartphone } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';

const SCard = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>{children}</div>
);

const iconMap = {
  FiMail: <FiMail className="w-5 h-5" />,
  FiMessageCircle: <FiMessageCircle className="w-5 h-5" />,
  FiSmartphone: <FiSmartphone className="w-5 h-5" />,
};

export default function OutreachAnalyticsPage() {
  const {
    t
  } = useTranslation();

  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    import('../../services/api').then(({ recruiterAPI }) => {
      recruiterAPI.getOutreachAnalytics()
        .then(res => setData(res.data.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    });
  }, []);

  if (loading || !data) return <div className="p-12 text-center text-gray-500 font-bold">{t("Loading outreach data...")}</div>;

  const { channels, campaignData, weeklyStats, kpis } = data;
  const mappedChannels = channels.map(c => ({ ...c, icon: iconMap[c.icon] }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <SCard key={i} className="p-4">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">{k.label}</div>
            <div className="text-xl font-extrabold text-gray-900 mb-1">{k.value}</div>
            <div className={`text-[10px] font-bold flex items-center gap-0.5 ${k.up ? 'text-emerald-600' : 'text-red-700'}`}>
              <FiArrowUpRight className="w-3 h-3" /> {k.trend}{t("vs last month")}</div>
          </SCard>
        ))}
      </div>
      {/* Channel Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {mappedChannels.map((c, i) => (
          <SCard key={i} className="p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className={`${c.bg} ${c.ic} p-2.5 rounded-xl`}>{c.icon}</div>
              <div>
                <div className="text-sm font-bold text-gray-900">{c.name}</div>
                <div className="text-[10px] font-semibold text-gray-500">{c.sent.toLocaleString()}{t("messages sent")}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Open Rate',  val: c.open,  up: c.upOpen  },
                { label: 'Reply Rate', val: c.reply, up: c.upReply },
                { label: 'Click Rate', val: c.click, up: true  },
                { label: 'Bounce',     val: c.bounce,up: false },
              ].map((stat, j) => (
                <div key={j} className="bg-gray-50 rounded-xl p-2.5">
                  <div className="text-[10px] text-gray-500 font-semibold mb-0.5">{stat.label}</div>
                  <div className="text-base font-extrabold text-gray-900">{stat.val}</div>
                </div>
              ))}
            </div>
          </SCard>
        ))}
      </div>
      {/* Campaign Performance */}
      <SCard className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-gray-900">{t("Campaign Performance")}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{t("Active and completed outreach campaigns")}</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <th className="pb-3">{t("Campaign")}</th>
                <th className="pb-3">{t("Channel")}</th>
                <th className="pb-3 text-center">{t("Sent")}</th>
                <th className="pb-3 text-center">{t("Opens")}</th>
                <th className="pb-3 text-center">{t("Replies")}</th>
                <th className="pb-3 text-center">{t("Hires")}</th>
                <th className="pb-3 text-right">{t("Status")}</th>
              </tr>
            </thead>
            <tbody>
              {campaignData.map((row, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60 transition">
                  <td className="py-3.5 text-xs font-semibold text-gray-900">{row.name}</td>
                  <td className="py-3.5">
                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{row.channel}</span>
                  </td>
                  <td className="py-3.5 text-center text-xs font-semibold text-gray-700">{row.sent}</td>
                  <td className="py-3.5 text-center text-xs font-bold text-blue-600">{row.opens}</td>
                  <td className="py-3.5 text-center text-xs font-bold text-emerald-600">{row.replies}</td>
                  <td className="py-3.5 text-center text-xs font-bold text-gray-900">{row.hires}</td>
                  <td className="py-3.5 text-right">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      row.status === 'Active' ? 'bg-emerald-50 text-emerald-700' :
                      row.status === 'Paused' ? 'bg-orange-50 text-orange-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>{row.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SCard>
      {/* Weekly Activity */}
      <SCard className="p-6">
        <h2 className="text-base font-bold text-gray-900 mb-5">{t("Weekly Activity Breakdown")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[420px]">
            <thead>
              <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <th className="pb-3">{t("Week")}</th>
                <th className="pb-3 text-center text-blue-600">{t("Emails")}</th>
                <th className="pb-3 text-center text-indigo-600">{t("LinkedIn")}</th>
                <th className="pb-3 text-center text-emerald-600">{t("WhatsApp")}</th>
                <th className="pb-3 text-right">{t("Total Responses")}</th>
              </tr>
            </thead>
            <tbody>
              {weeklyStats.map((w, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60 transition">
                  <td className="py-3 text-xs font-bold text-gray-800">{w.week}</td>
                  <td className="py-3 text-center text-xs font-semibold text-blue-700">{w.emailSent}</td>
                  <td className="py-3 text-center text-xs font-semibold text-indigo-700">{w.linkedinSent}</td>
                  <td className="py-3 text-center text-xs font-semibold text-emerald-700">{w.whatsapp}</td>
                  <td className="py-3 text-right text-xs font-bold text-gray-900">{w.responses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SCard>
      {/* AI Tip */}
      <SCard className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100">
        <div className="flex items-start gap-4">
          <div className="bg-emerald-100 text-emerald-600 p-2.5 rounded-xl shrink-0"><HiSparkles className="w-5 h-5" /></div>
          <div>
            <h3 className="text-sm font-bold text-emerald-900 mb-2">{t("Outreach Optimization Insight")}</h3>
            <p className="text-xs text-emerald-800/80 leading-relaxed">{t(
              "WhatsApp has your highest open rate (78%) and reply rate (34%). Consider shifting more passive candidate outreach to WhatsApp. Personalized messages sent between 10 AM – 12 PM and 4 PM – 6 PM IST tend to get 40% higher response rates."
            )}</p>
          </div>
        </div>
      </SCard>
    </div>
  );
}
