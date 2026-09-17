import React, { useState } from 'react';
import { HiBriefcase, HiUserGroup, HiUsers } from 'react-icons/hi';
import ExternalJobs from './ExternalJobs';
import StagingCandidates from './StagingCandidates';
import RecruiterLeads from './RecruiterLeads';

const ScrapedDataVault = () => {
  const [activeTab, setActiveTab] = useState('jobs');

  const tabs = [
    { id: 'jobs', label: 'Scraped Jobs', icon: HiBriefcase },
    { id: 'candidates', label: 'Scraped Candidates', icon: HiUserGroup },
    { id: 'recruiters', label: 'Scraped Recruiters / Leads', icon: HiUsers },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Scraped Data Vault</h1>
        <p className="text-sm text-gray-500 mt-1">Unified viewer for all external scraped data and B2B leads.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 mb-6 inline-flex overflow-x-auto w-full md:w-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-indigo-600' : 'text-gray-400'}`} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {activeTab === 'jobs' && <ExternalJobs />}
        {activeTab === 'candidates' && <StagingCandidates />}
        {activeTab === 'recruiters' && <RecruiterLeads />}
      </div>
    </div>
  );
};

export default ScrapedDataVault;
