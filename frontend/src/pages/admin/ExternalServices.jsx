import React, { useState, useEffect } from 'react';
import { ExternalLink, Mail, MessageSquare, Database, Server, Cpu, Cloud, Activity } from 'lucide-react';
import { HiGlobe } from 'react-icons/hi';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const iconMap = {
  Mail: <Mail className="w-8 h-8 text-rose-500" />,
  MessageSquare: <MessageSquare className="w-8 h-8 text-emerald-500" />,
  Database: <Database className="w-8 h-8 text-green-700" />,
  Server: <Server className="w-8 h-8 text-red-700" />,
  Cpu: <Cpu className="w-8 h-8 text-purple-500" />,
  Cloud: <Cloud className="w-8 h-8 text-orange-500" />,
  Activity: <Activity className="w-8 h-8 text-gray-500" />,
};

export default function ExternalServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await api.get('/v1/admin/health/external-services');
      if (res.data.success) {
        setServices(res.data.services);
      }
    } catch (error) {
      console.error('Error fetching external services', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading External Services..." />
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-[22px] font-bold text-[#0F172A] flex items-center gap-2">
            <HiGlobe className="w-6 h-6 text-indigo-600" />
            External Services Directory
          </h1>
          <p className="text-[13px] font-medium text-gray-500 mt-0.5">
            Manage and monitor actively configured third-party platforms.
          </p>
        </div>
      </div>

      {services.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 font-medium">No external services configured.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {services.map((service) => (
            <div key={service.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              <div className={`p-6 border-b flex-1 ${service.color}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-white rounded-xl shadow-sm">
                    {iconMap[service.iconName] || <HiGlobe className="w-8 h-8 text-gray-400" />}
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full ${service.statusColor}`}>
                    {service.status}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">{service.name}</h3>
                <p className="text-sm font-medium text-gray-700 mt-1">{service.description}</p>
              </div>
              
              <div className="p-5 bg-white space-y-4">
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Current Usage</div>
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                    <Activity className="w-4 h-4 text-gray-400" />
                    {service.usage}
                  </div>
                </div>
                
                <a 
                  href={service.url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full mt-2 py-2.5 flex items-center justify-center gap-2 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                  Go to Platform
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
