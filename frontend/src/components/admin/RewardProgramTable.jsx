import { useState } from 'react';
import { HiOutlineTrophy } from 'react-icons/hi2';

const RewardProgramTable = ({ topPartners = [] }) => {
  const [period, setPeriod] = useState('monthly');
  const [tab, setTab] = useState('By Registrations');

  const sortedData = [...topPartners].sort((a, b) => {
    if (tab === 'By Registrations') return (b.totalReferrals || 0) - (a.totalReferrals || 0);
    if (tab === 'By Country') return (a.country || '').localeCompare(b.country || '');
    if (tab === 'By State') return (a.state || '').localeCompare(b.state || '');
    if (tab === 'By City') return (a.city || '').localeCompare(b.city || '');
    return (b.totalCommissionEarned || 0) - (a.totalCommissionEarned || 0);
  });

  const displayData = sortedData.slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm mt-6 h-full">
      <div className="bg-gradient-to-r from-[#F8F7FB] to-white rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#7C3AED] flex items-center justify-center text-white shrink-0 mt-1">
            <HiOutlineTrophy className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-gray-900 text-lg">₹1 Lakh Reward Program</h3>
              <span className="bg-[#7C3AED] text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Live</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Top performing partners earn from a ₹1,00,000 monthly reward pool</p>
          </div>
        </div>
        
        <div className="flex gap-1 bg-white border border-[#EAE7F2] rounded-full p-1 shadow-sm">
          {['monthly', 'quarterly', 'annually'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                period === p
                  ? 'bg-[#7C3AED] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar">
        {['By Registrations', 'By Country', 'By State', 'By City'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all whitespace-nowrap ${
              tab === t
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 bg-[#F8F7FB] hover:bg-gray-100'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            <tr>
              <th className="px-2 py-3 text-left">Rank</th>
              <th className="px-4 py-3 text-left">Partner</th>
              <th className="px-4 py-3 text-left">Registrations</th>
              <th className="px-4 py-3 text-left">Location</th>
              <th className="px-4 py-3 text-right">Reward Eligible</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAE7F2]">
            {displayData.length > 0 ? (
              displayData.map((partner, index) => {
                const rank = (index + 1).toString().padStart(2, '0');
                const locationStr = [partner.city, partner.state].filter(Boolean).join(', ') || 'Unknown Location';
                
                return (
                  <tr key={partner._id || index} className="hover:bg-[#F8F7FB] transition-colors">
                    <td className="px-2 py-4 whitespace-nowrap">
                      <div className="w-8 h-6 bg-gray-100 rounded-full flex items-center justify-center gap-1 text-[10px] font-bold text-gray-500">
                        <span className="text-[8px]">👑</span> {rank}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <img 
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(partner.name || 'A')}&background=7C3AED&color=fff&rounded=true`} 
                          alt={partner.name} 
                          className="w-8 h-8 rounded-full"
                        />
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{partner.name || 'Unknown'}</p>
                          <p className="text-[10px] text-gray-500">Code: {partner.referralCode || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-gray-900">{partner.totalReferrals || 0}</span>
                        <span className="text-[10px] text-gray-500">this period</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-900">{locationStr}</span>
                        <span className="text-[10px] text-gray-500">{partner.country || 'Unknown Country'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <span className="inline-flex items-center justify-center px-3 py-1 bg-green-50 text-green-700 font-bold text-[10px] rounded-full">
                        ₹{(Number(partner.totalCommissionEarned || 0)).toLocaleString('en-IN')}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-gray-500 text-sm">
                  No reward data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RewardProgramTable;
