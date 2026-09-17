import React, { useEffect, useState } from 'react';
import { pipelineAdminAPI } from '../../../services/api';
import toast from 'react-hot-toast';

const MasterDataManagement = () => {
  const [categories, setCategories] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('categories');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [catRes, compRes, locRes] = await Promise.all([
        pipelineAdminAPI.getCategories(),
        pipelineAdminAPI.getCompanies(),
        pipelineAdminAPI.getLocations()
      ]);
      if (catRes.data?.success) setCategories(catRes.data.data);
      if (compRes.data?.success) setCompanies(compRes.data.data);
      if (locRes.data?.success) setLocations(locRes.data.data);
    } catch (error) {
      toast.error('Failed to fetch master data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-gray-500">Loading master data...</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Master Data Management</h2>
      <p className="text-sm text-gray-500 mb-6">Normalized categories, companies, and locations used for mapping raw data.</p>
      
      <div className="flex gap-4 mb-4">
        <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 rounded font-medium ${activeTab === 'categories' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>Categories</button>
        <button onClick={() => setActiveTab('companies')} className={`px-4 py-2 rounded font-medium ${activeTab === 'companies' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>Companies</button>
        <button onClick={() => setActiveTab('locations')} className={`px-4 py-2 rounded font-medium ${activeTab === 'locations' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>Locations</button>
      </div>

      <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg">
        {activeTab === 'categories' && (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category Name</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.map((c) => (
                <tr key={c._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.name}</td>
                </tr>
              ))}
              {categories.length === 0 && <tr><td className="px-6 py-4 text-center text-gray-500">No categories found.</td></tr>}
            </tbody>
          </table>
        )}

        {activeTab === 'companies' && (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Normalized Name</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {companies.map((c) => (
                <tr key={c._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.normalizedName}</td>
                </tr>
              ))}
              {companies.length === 0 && <tr><td className="px-6 py-4 text-center text-gray-500">No companies found.</td></tr>}
            </tbody>
          </table>
        )}

        {activeTab === 'locations' && (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">City</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Country Code</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {locations.map((c) => (
                <tr key={c._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.city}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.countryCode}</td>
                </tr>
              ))}
              {locations.length === 0 && <tr><td colSpan="2" className="px-6 py-4 text-center text-gray-500">No locations found.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default MasterDataManagement;
