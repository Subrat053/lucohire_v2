import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineUserGroup, HiOutlineOfficeBuilding, HiOutlineBriefcase, HiOutlineDocumentText, HiOutlineCurrencyRupee, HiOutlineTicket } from 'react-icons/hi';

const ActionRequired = ({ actionRequired = [] }) => {
  const totalCount = actionRequired.reduce((sum, item) => sum + (Number(item.count) || 0), 0);

  const getIcon = (label) => {
    if (label.includes('Provider')) return HiOutlineUserGroup;
    if (label.includes('Recruiter')) return HiOutlineUserGroup;
    if (label.includes('Compan')) return HiOutlineOfficeBuilding;
    if (label.includes('Job')) return HiOutlineBriefcase;
    if (label.includes('Document')) return HiOutlineDocumentText;
    if (label.includes('Refund')) return HiOutlineCurrencyRupee;
    if (label.includes('Ticket')) return HiOutlineTicket;
    return HiOutlineDocumentText;
  };

  const getIconColor = (label) => {
    if (label.includes('Provider')) return 'text-cyan-500 bg-cyan-50';
    if (label.includes('Recruiter')) return 'text-blue-500 bg-blue-50';
    if (label.includes('Compan')) return 'text-indigo-500 bg-indigo-50';
    if (label.includes('Job')) return 'text-emerald-500 bg-emerald-50';
    if (label.includes('Document')) return 'text-orange-500 bg-orange-50';
    if (label.includes('Refund')) return 'text-rose-500 bg-rose-50';
    if (label.includes('Ticket')) return 'text-purple-500 bg-purple-50';
    return 'text-gray-500 bg-gray-50';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-gray-900">Action Required</h3>
          {totalCount > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{totalCount}</span>}
        </div>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto pr-2" style={{ maxHeight: '400px' }}>
        {actionRequired.map((item, i) => {
          const Icon = getIcon(item.label);
          const colors = getIconColor(item.label);
          return (
            <Link key={i} to={item.link} className="flex items-center justify-between group hover:bg-gray-50 p-1.5 -mx-1.5 rounded-lg transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${colors}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-[12px] font-semibold text-gray-700 group-hover:text-blue-600 transition-colors">{item.label}</span>
              </div>
              <span className="text-[13px] font-extrabold text-gray-900">{item.count}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default ActionRequired;
