import { HiChevronRight } from 'react-icons/hi';

const colorPalette = [
  { color: 'bg-[#C4B5FD]', dot: 'bg-[#A78BFA]' },
  { color: 'bg-[#7C3AED]', dot: 'bg-[#7C3AED]' },
  { color: 'bg-gray-900', dot: 'bg-gray-900' },
  { color: 'bg-blue-400', dot: 'bg-blue-500' },
  { color: 'bg-emerald-400', dot: 'bg-emerald-500' },
  { color: 'bg-orange-400', dot: 'bg-orange-500' }
];

const PlanSummary = ({ plans = {} }) => {
  const hasPlans = Object.keys(plans).length > 0;

  // Generate plan display configs dynamically based on what the API returns
  const PLAN_TYPES = hasPlans ? Object.keys(plans).map((key, i) => {
    const isFree = key === 'free';
    const c = isFree ? { color: 'bg-gray-300', dot: 'bg-gray-300' } : colorPalette[i % colorPalette.length];
    return {
      key,
      name: key === 'free' ? 'Free' : key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      color: c.color,
      dot: c.dot
    };
  }) : [
    { key: 'free', name: 'Free', color: 'bg-gray-300', dot: 'bg-gray-300' },
    { key: 'starter', name: 'Basic', color: 'bg-[#C4B5FD]', dot: 'bg-[#A78BFA]' },
    { key: 'business', name: 'Pro', color: 'bg-[#7C3AED]', dot: 'bg-[#7C3AED]' },
    { key: 'enterprise', name: 'Enterprise', color: 'bg-gray-900', dot: 'bg-gray-900' },
  ];

  const defaultPlans = hasPlans ? plans : { free: 0, starter: 0, business: 0, enterprise: 0 };
  const totalCount = Object.values(defaultPlans).reduce((a, b) => a + (Number(b) || 0), 0);
  const total = totalCount || 1; // Prevent division by zero

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900">Subscription Overview</h3>
        <span className="text-[10px] text-gray-500">{total.toLocaleString('en-IN')} total</span>
      </div>
      
      {/* Single Multi-color Progress Bar */}
      <div className="flex w-full h-1.5 rounded-full overflow-hidden mb-6">
        {PLAN_TYPES.map((plan) => {
          const count = defaultPlans[plan.key] || 0;
          const percentage = (count / total) * 100;
          if (percentage === 0) return null;
          return (
            <div 
              key={plan.key}
              className={`${plan.color} h-full`} 
              style={{ width: `${percentage}%` }}
            />
          );
        })}
      </div>

      <div className="space-y-3 text-[11px]">
        {PLAN_TYPES.map((plan) => {
          const count = defaultPlans[plan.key] || 0;
          const percentage = ((count / total) * 100).toFixed(1);
          
          return (
            <div key={plan.key} className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${plan.dot}`} />
                <span className="text-gray-500 font-medium">{plan.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-extrabold text-gray-900 w-12 text-right">{count.toLocaleString('en-IN')}</span>
                <span className="text-gray-400 w-8 text-right">{percentage}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlanSummary;
