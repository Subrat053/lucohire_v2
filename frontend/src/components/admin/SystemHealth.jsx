import { Link } from 'react-router-dom';
import { HiOutlineServer, HiOutlineDatabase, HiOutlineCreditCard, HiOutlineChat, HiOutlineMail, HiOutlineChip } from 'react-icons/hi';

const SystemHealth = ({ systemHealth = {} }) => {
  const getIcon = (name) => {
    if (name.includes('AI')) return HiOutlineChip;
    if (name.includes('ATS')) return HiOutlineServer;
    if (name.includes('Database')) return HiOutlineDatabase;
    if (name.includes('Payment')) return HiOutlineCreditCard;
    if (name.includes('WhatsApp')) return HiOutlineChat;
    if (name.includes('Email')) return HiOutlineMail;
    return HiOutlineServer;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm h-full flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900">System Health</h3>
        <Link to="/admin/health" className="text-[10px] font-bold text-blue-500 hover:underline">View all →</Link>
      </div>

      <div className="space-y-3 mb-4">
        {(systemHealth.services || []).map((service, i) => {
          const Icon = getIcon(service.name);
          return (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-gray-500" />
                <span className="text-[11px] font-medium text-gray-700">{service.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${service.status === 'operational' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                <span className="text-[10px] font-bold text-emerald-600 capitalize">{service.status}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <span className="text-[11px] font-medium text-gray-500">Uptime (Last 30 days)</span>
        <span className="text-lg font-extrabold text-emerald-500">{systemHealth.uptime}%</span>
      </div>
    </div>
  );
};

export default SystemHealth;
