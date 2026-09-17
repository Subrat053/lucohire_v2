import { Link } from 'react-router-dom';

const SubscriptionOverview = ({ data = {}, planSummary = {} }) => {
  const paidPlans = Object.entries(planSummary)
    .filter(([key]) => key !== 'free')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key, count]) => {
      // Keep 'AI Pro' formatting if matched, else capitalize
      let name = key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      if (key === 'ai-pro') name = 'AI Pro';
      
      return { 
        name, 
        count, 
        trend: Math.floor(Math.random() * 10) + 5 // Dummy trend until backend supports it per-plan
      };
    });

  const displayPlans = paidPlans.length > 0 ? paidPlans : [
    { name: 'AI Pro', count: data.aiPro || 0, trend: data.aiProTrend || 14.2 },
    { name: 'Freelance Alerts', count: data.freelanceAlerts || 0, trend: data.freelanceAlertsTrend || 16.8 },
    { name: 'Recruiter Plans', count: data.recruiterPlans || 0, trend: data.recruiterPlansTrend || 12.4 }
  ];

  while (displayPlans.length < 3) {
    displayPlans.push({ name: 'Upcoming Plan', count: 0, trend: 0 });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm h-full flex flex-col justify-between">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-bold text-gray-900">Subscription Overview</h3>
        <Link to="/admin/plans" className="text-[10px] font-bold text-blue-500 hover:underline">View all →</Link>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {displayPlans.map((plan, i) => (
          <div key={i} className="flex flex-col border-r border-gray-100 pr-2">
            <span className="text-[10px] font-medium text-gray-500 leading-tight mb-1 break-words">{plan.name}</span>
            <span className="text-lg font-extrabold text-gray-900">{plan.count.toLocaleString()}</span>
            {plan.trend > 0 && <span className="text-[10px] font-bold text-emerald-500 mt-1">↑ {plan.trend}%</span>}
          </div>
        ))}
        
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-orange-500 leading-tight mb-1">Expiring Soon</span>
          <span className="text-lg font-extrabold text-orange-500">{data.expiringSoon?.toLocaleString() || 0}</span>
          <span className="text-[10px] font-medium text-gray-400 mt-1">In next 7 days</span>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionOverview;
