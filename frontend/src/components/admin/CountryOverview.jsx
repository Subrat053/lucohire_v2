import { Link } from 'react-router-dom';

const CountryOverview = ({ data = [] }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900">Country Overview</h3>
        <Link to="/admin/countries" className="text-[10px] font-bold text-blue-500 hover:underline">View all →</Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="pb-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">Country</th>
              <th className="pb-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-right">Active Jobs</th>
              <th className="pb-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-right">Candidates</th>
              <th className="pb-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-right">Recruiters</th>
              <th className="pb-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{item.flag}</span>
                    <span className="text-[11px] font-bold text-gray-700">{item.country}</span>
                  </div>
                </td>
                <td className="py-2.5 text-right text-[11px] font-semibold text-gray-900">{item.activeJobs.toLocaleString()}</td>
                <td className="py-2.5 text-right text-[11px] font-semibold text-gray-900">{item.candidates.toLocaleString()}</td>
                <td className="py-2.5 text-right text-[11px] font-semibold text-gray-900">{item.recruiters.toLocaleString()}</td>
                <td className="py-2.5 text-right text-[11px] font-extrabold text-gray-900">₹{item.revenue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CountryOverview;
