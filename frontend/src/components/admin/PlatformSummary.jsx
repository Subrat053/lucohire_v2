import { HiOutlineUserGroup, HiOutlineBriefcase, HiOutlineLocationMarker, HiOutlineGlobeAlt } from 'react-icons/hi';

const PlatformSummary = ({ totalUsers = 0, totalProviders = 0, totalRecruiters = 0, totalCities = 0, totalCountries = 0 }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm h-full">
      <h3 className="text-sm font-bold text-gray-900 mb-4">Platform Overview</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50/50 p-4 rounded-xl flex flex-col justify-between border border-gray-100">
          <HiOutlineUserGroup className="w-4 h-4 text-indigo-500 mb-3" />
          <div>
            <h4 className="font-bold text-gray-900 text-lg">{totalUsers.toLocaleString('en-IN')}</h4>
            <p className="text-[10px] text-gray-500">Total Users</p>
          </div>
        </div>

        <div className="bg-gray-50/50 p-4 rounded-xl flex flex-col justify-between border border-gray-100">
          <HiOutlineBriefcase className="w-4 h-4 text-emerald-500 mb-3" />
          <div>
            <h4 className="font-bold text-gray-900 text-lg">{totalProviders.toLocaleString('en-IN')}</h4>
            <p className="text-[10px] text-gray-500">Candidates</p>
          </div>
        </div>

        <div className="bg-gray-50/50 p-4 rounded-xl flex flex-col justify-between border border-gray-100">
          <HiOutlineLocationMarker className="w-4 h-4 text-orange-500 mb-3" />
          <div>
            <h4 className="font-bold text-gray-900 text-lg">{totalCities.toLocaleString('en-IN')}</h4>
            <p className="text-[10px] text-gray-500">Cities</p>
          </div>
        </div>

        <div className="bg-gray-50/50 p-4 rounded-xl flex flex-col justify-between border border-gray-100">
          <HiOutlineGlobeAlt className="w-4 h-4 text-blue-500 mb-3" />
          <div>
            <h4 className="font-bold text-gray-900 text-lg">{totalCountries.toLocaleString('en-IN')}</h4>
            <p className="text-[10px] text-gray-500">Countries</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformSummary;
