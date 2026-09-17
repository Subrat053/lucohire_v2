import { Link } from 'react-router-dom';
import { HiOutlineChip } from 'react-icons/hi';

const AutomationInsights = ({ data = {} }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm h-full flex flex-col justify-between">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-bold text-gray-900">AI & Automation Insights</h3>
        <Link to="/admin/ai" className="text-[10px] font-bold text-blue-500 hover:underline">View all →</Link>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="flex flex-col">
          <span className="text-[10px] font-medium text-gray-500 leading-tight mb-1">Jobs Fetched<br/>Today</span>
          <span className="text-lg font-extrabold text-gray-900">{data.jobsFetchedToday?.toLocaleString() || 0}</span>
          <span className="text-[10px] font-bold text-emerald-500 mt-1">↑ {data.jobsFetchedTrend}%</span>
        </div>

        <div className="flex flex-col">
          <span className="text-[10px] font-medium text-gray-500 leading-tight mb-1">Duplicates<br/>Blocked</span>
          <span className="text-lg font-extrabold text-gray-900">{data.duplicatesBlocked?.toLocaleString() || 0}</span>
          <span className="text-[10px] font-bold text-emerald-500 mt-1">↑ {data.duplicatesBlockedTrend}%</span>
        </div>

        <div className="flex flex-col">
          <span className="text-[10px] font-medium text-gray-500 leading-tight mb-1">Expired Jobs<br/>Removed</span>
          <span className="text-lg font-extrabold text-gray-900">{data.expiredJobsRemoved?.toLocaleString() || 0}</span>
          <span className="text-[10px] font-bold text-emerald-500 mt-1">↑ {data.expiredJobsRemovedTrend}%</span>
        </div>

        <div className="flex flex-col">
          <span className="text-[10px] font-medium text-gray-500 leading-tight mb-1">Match Success<br/>Rate</span>
          <span className="text-lg font-extrabold text-gray-900">{data.matchSuccessRate || 0}%</span>
          <span className="text-[10px] font-bold text-emerald-500 mt-1">↑ {data.matchSuccessRateTrend}%</span>
        </div>
        
        <div className="flex flex-col justify-center items-center">
          <Link to="/admin/ai" className="flex flex-col items-center group">
            <HiOutlineChip className="w-8 h-8 text-blue-500 group-hover:text-blue-600 transition-colors mb-1" />
            <span className="text-[10px] font-bold text-blue-500 text-center leading-tight group-hover:underline">Go to Automation<br/>Monitor →</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AutomationInsights;
