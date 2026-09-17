import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineUserAdd, HiOutlineBriefcase, HiOutlineCurrencyRupee, HiOutlineDocumentText } from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';

const RecentActivity = ({ activities = [] }) => {
  const getIcon = (iconStr) => {
    switch (iconStr) {
      case 'user': return <HiOutlineUserAdd className="w-4 h-4 text-emerald-500" />;
      case 'job': return <HiOutlineBriefcase className="w-4 h-4 text-blue-500" />;
      case 'payment': return <HiOutlineCurrencyRupee className="w-4 h-4 text-green-500" />;
      case 'document': return <HiOutlineDocumentText className="w-4 h-4 text-orange-500" />;
      case 'whatsapp': return <FaWhatsapp className="w-4 h-4 text-teal-500" />;
      default: return <HiOutlineDocumentText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getBgColor = (iconStr) => {
    switch (iconStr) {
      case 'user': return 'bg-emerald-50';
      case 'job': return 'bg-blue-50';
      case 'payment': return 'bg-green-50';
      case 'document': return 'bg-orange-50';
      case 'whatsapp': return 'bg-teal-50';
      default: return 'bg-gray-50';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h3 className="text-sm font-bold text-gray-900">Recent Activity</h3>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto pr-2" style={{ maxHeight: '400px' }}>
        {activities.map((activity, i) => (
          <div key={activity.id} className="flex gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${getBgColor(activity.icon)}`}>
              {getIcon(activity.icon)}
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-[12px] font-bold text-gray-900 leading-tight">{activity.title}</h4>
                  <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{activity.subtitle}</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-medium text-gray-400">{activity.time}</span>
                  {activity.value && (
                    <span className="text-[12px] font-extrabold text-gray-900 mt-0.5">{activity.value}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentActivity;
