import { HiOutlineExclamationCircle, HiOutlineCreditCard, HiOutlineShieldExclamation, HiOutlineServer, HiOutlineUsers, HiOutlinePhone, HiOutlineTicket, HiOutlineClock, HiOutlineLink } from 'react-icons/hi';
import { Link } from 'react-router-dom';

const DashboardAlerts = ({ criticalAlerts = [] }) => {
  return (
    <div className="mb-6">
      
      {/* Critical Alerts */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm h-full flex flex-col justify-between">
        <div className="flex items-center gap-2 mb-5">
          <HiOutlineExclamationCircle className="w-5 h-5 text-red-700" />
          <h3 className="text-sm font-bold text-gray-900">Critical Alerts</h3>
          <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {criticalAlerts.reduce((sum, a) => sum + (a.count || 0), 0)}
          </span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {criticalAlerts.map((alert) => (
            <div key={alert.id || alert.title} className="flex flex-col bg-gray-50/50 p-3 rounded-lg border border-gray-100/80">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${alert.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-500'}`}>
                  {alert.title?.includes('Payment') ? (
                    <HiOutlineCreditCard className="w-3.5 h-3.5" />
                  ) : (
                    <HiOutlineServer className="w-3.5 h-3.5" />
                  )}
                </div>
                <span className="text-[11px] font-bold text-gray-700 leading-tight">{alert.title}</span>
              </div>
              <span className="text-xl font-extrabold text-gray-900 mb-1">{alert.count || 0}</span>
              <Link to={alert.actionLink} className="text-[11px] font-semibold text-blue-600 hover:underline">
                {alert.actionText} →
              </Link>
            </div>
          ))}
        </div>
      </div>
      
    </div>
  );
};

export default DashboardAlerts;
