import { useState } from 'react';
import { HiLightningBolt, HiDatabase, HiCog, HiViewList } from 'react-icons/hi';
import LiveTester from './LiveTester';
import BulkCrawlerPanel from './components/BulkCrawlerPanel';
import LiveQueueMonitor from './components/LiveQueueMonitor';
import NightlyEngineSettings from './components/NightlyEngineSettings';

const ScraperControlCenter = () => {
  const [activeTab, setActiveTab] = useState('single');

  const tabs = [
    { id: 'single', label: 'Single Scraper', icon: HiLightningBolt },
    { id: 'bulk', label: 'Bulk Mapping & Upload', icon: HiDatabase },
    { id: 'queue', label: 'Live Queue Monitor', icon: HiViewList },
    { id: 'engine', label: 'Nightly Engine Settings', icon: HiCog },
  ];

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <div className="mb-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Scrapers & Crawlers Control Center</h1>
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors
                ${activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-indigo-500' : 'text-gray-400'}`} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6 w-full">
        {activeTab === 'single' && <LiveTester />}
        {activeTab === 'bulk' && <BulkCrawlerPanel />}
        {activeTab === 'queue' && <LiveQueueMonitor />}
        {activeTab === 'engine' && <NightlyEngineSettings />}
      </div>
    </div>
  );
};

export default ScraperControlCenter;
