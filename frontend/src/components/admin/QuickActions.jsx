import { HiOutlineUserAdd, HiOutlineBriefcase, HiOutlineOfficeBuilding, HiOutlineDocumentSearch, HiOutlinePlus, HiOutlineSpeakerphone, HiOutlineDocumentReport, HiOutlineCollection } from 'react-icons/hi';
import { Link } from 'react-router-dom';

const QuickActions = () => {
  const actions = [
    { icon: HiOutlineUserAdd, label: 'Approve Recruiter', color: 'text-emerald-600', bg: 'bg-emerald-50', link: '/admin/recruiters' },
    { icon: HiOutlineBriefcase, label: 'Review Jobs', color: 'text-orange-600', bg: 'bg-orange-50', link: '/admin/dashboard' },
    { icon: HiOutlineOfficeBuilding, label: 'Approve Company', color: 'text-blue-600', bg: 'bg-blue-50', link: '/admin/partners' },
    { icon: HiOutlineDocumentSearch, label: 'Verify Documents', color: 'text-yellow-600', bg: 'bg-yellow-50', link: '/admin/users' },
    { icon: HiOutlinePlus, label: 'Create Job', color: 'text-purple-600', bg: 'bg-purple-50', link: '/admin/dashboard' },
    { icon: HiOutlineSpeakerphone, label: 'Send Announcement', color: 'text-teal-600', bg: 'bg-teal-50', link: '/admin/dashboard' },
    { icon: HiOutlineDocumentReport, label: 'Generate Report', color: 'text-rose-600', bg: 'bg-rose-50', link: '/admin/dashboard' },
    { icon: HiOutlineCollection, label: 'View All Actions', color: 'text-gray-700', bg: 'bg-gray-50', link: '/admin/dashboard' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm h-full flex flex-col">
      <h3 className="text-sm font-bold text-gray-900 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-4 gap-3 flex-1">
        {actions.map((action, i) => (
          <Link 
            key={i} 
            to={action.link}
            className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 text-center"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${action.bg}`}>
              <action.icon className={`w-5 h-5 ${action.color}`} />
            </div>
            <span className="text-[10px] font-bold text-gray-700 leading-tight">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
