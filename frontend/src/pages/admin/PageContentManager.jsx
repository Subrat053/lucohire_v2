import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { HiSave, HiDocumentText } from 'react-icons/hi';
import PolicyPageLayout from '../../components/common/PolicyPageLayout';
import FaqLayout from '../../components/common/FaqLayout';

const PAGES = [
  { key: 'refund', label: 'Refund Policy' },
  { key: 'privacy', label: 'Privacy Policy' },
  { key: 'terms', label: 'Terms & Conditions' },
  { key: 'faq', label: 'FAQ' },
  { key: 'about', label: 'About Us' }
];

export default function PageContentManager() {
  const [activePage, setActivePage] = useState('refund');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pageData, setPageData] = useState({});

  useEffect(() => {
    fetchContent();
  }, [activePage]);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getContent(activePage);
      let data = res.data;
      let parsed = {};
      
      if (data && typeof data === 'string') {
        try { parsed = JSON.parse(data); } catch (e) {}
      } else if (data && typeof data === 'object') {
        parsed = data;
      }

      if (!parsed.title) {
        parsed = {
          badge: activePage === 'faq' ? 'TRUSTED BY' : 'Badge Title',
          title: PAGES.find(p => p.key === activePage)?.label || 'Page Title',
          intro: 'Add a brief introduction here...',
          lastUpdated: `Last updated: ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
          sections: [
            { title: activePage === 'faq' ? 'Question goes here?' : '1. First Section', body: 'Start typing your content here...' }
          ]
        };
      }
      
      setPageData(parsed);
    } catch (err) {
      toast.error(`Failed to load ${activePage} content`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminAPI.updateContent(activePage, JSON.stringify(pageData));
      toast.success(`${PAGES.find(p => p.key === activePage).label} updated successfully!`);
    } catch (err) {
      toast.error('Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  const getImageUrl = (key) => {
    switch(key) {
      case 'privacy': return '/privacy_policy_illustration_1785319033161.webp';
      case 'terms': return '/terms_illustration_1785319045794.webp';
      case 'refund': return '/refund_illustration_1785319056153.webp';
      case 'about': return '/image.webp';
      default: return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Top Navbar for Editor */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <HiDocumentText className="text-blue-600" />
            Page Content Editor
          </h1>
          <div className="flex items-center bg-gray-100 p-1 rounded-lg">
            {PAGES.map(page => (
              <button
                key={page.key}
                onClick={() => setActivePage(page.key)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                  activePage === page.key 
                    ? 'bg-white text-blue-700 shadow-sm border border-gray-200' 
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                {page.label}
              </button>
            ))}
          </div>
        </div>
        
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition flex items-center gap-2 shadow-sm disabled:opacity-50"
        >
          <HiSave className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Editor Canvas */}
      <div className="flex-1 w-full bg-gray-200 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="h-[60vh] flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="w-full h-full shadow-inner">
            {activePage === 'faq' ? (
              <FaqLayout data={pageData} onChange={setPageData} isEditMode={true} />
            ) : (
              <PolicyPageLayout data={pageData} onChange={setPageData} isEditMode={true} imageUrl={getImageUrl(activePage)} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
