import React, { useState } from 'react';
import { HiOutlineSearchCircle, HiOutlineClock, HiOutlineBriefcase, HiOutlineShieldCheck, HiOutlineDatabase } from 'react-icons/hi';
import QueryManager from './QueryManager';
import ScanHistory from './ScanHistory';
import NeedsReviewQueue from './NeedsReviewQueue';
import MasterDataManagement from './MasterDataManagement';
import JobSources from '../JobSources';
import JobSourceBuilder from './JobSourceBuilder';
import ExternalJobs from '../ExternalJobs';
import SyncReports from '../SyncReports';

const PipelineAdmin = () => {
  const [activeTab, setActiveTab] = useState('queries');

  const tabs = [
    { id: 'sources', label: 'API Integrations', icon: <HiOutlineDatabase className="w-5 h-5 mr-2" />, component: <JobSources /> },
    { id: 'builder', label: 'Zero-Code Builder', icon: <HiOutlineDatabase className="w-5 h-5 mr-2" />, component: <JobSourceBuilder onSaveSuccess={() => setActiveTab('sources')} /> },
    { id: 'queries', label: 'Scraping Rules', icon: <HiOutlineSearchCircle className="w-5 h-5 mr-2" />, component: <QueryManager /> },
    { id: 'jobs', label: 'Master Job Pool', icon: <HiOutlineBriefcase className="w-5 h-5 mr-2" />, component: <ExternalJobs /> },
    { id: 'review', label: 'Needs Review', icon: <HiOutlineShieldCheck className="w-5 h-5 mr-2" />, component: <NeedsReviewQueue /> },
    { id: 'scans', label: 'Sync Logs & Health', icon: <HiOutlineClock className="w-5 h-5 mr-2" />, component: <SyncReports /> },
    { id: 'master', label: 'Master Data Mapping', icon: <HiOutlineDatabase className="w-5 h-5 mr-2" />, component: <MasterDataManagement /> }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Unified Data Pipeline</h1>
        <p className="text-gray-500 mt-2">Manage your API integrations, zero-code webhooks, scraping engine, and master job pool.</p>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50/50">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-6 py-4 text-sm font-medium transition-all duration-200 border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-700 bg-blue-50/30'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tabs.find(t => t.id === activeTab)?.component}
        </div>
      </div>
    </div>
  );
};

export default PipelineAdmin;
