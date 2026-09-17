import { HiTrendingUp } from 'react-icons/hi';
import { Link } from 'react-router-dom';

const TopPartnersTable = ({ partners = [] }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-extrabold text-gray-900 text-base">Top 5 Performing Partners</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">Highest earners this month</p>
        </div>
        <Link to="/admin/partners" className="text-[11px] font-bold text-[#7C3AED] hover:text-[#6D28D9] flex items-center gap-1">
          View Full List <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>

      <div className="space-y-4">
        {partners.length > 0 ? (
          partners.slice(0, 5).map((partner, index) => {
            const rank = (index + 1).toString().padStart(2, '0');
            return (
              <div key={partner._id || index} className="flex items-center justify-between p-2 hover:bg-[#F8F7FB] rounded-xl transition-colors">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-gray-400">{rank}</span>
                  <div className="flex items-center gap-3">
                    <img 
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(partner.name || 'A')}&background=7C3AED&color=fff&rounded=true`} 
                      alt={partner.name} 
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{partner.name || 'Unknown'}</p>
                      <p className="text-[10px] text-gray-500">Senior Partner</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 text-sm">
                    ₹{Number(partner.totalCommissionEarned || 0).toLocaleString('en-IN')}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 mt-0.5">
                    <HiTrendingUp className="w-3 h-3" /> +{(Math.random() * 20 + 5).toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-8 text-center text-gray-500 text-sm">
            No performing partners this month.
          </div>
        )}
      </div>
    </div>
  );
};

export default TopPartnersTable;
