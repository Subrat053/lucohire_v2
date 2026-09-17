import { useState, useEffect } from 'react';
import { HiSave, HiInformationCircle } from 'react-icons/hi';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const AdminAbout = () => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const { data } = await adminAPI.getContent('about');
      setContent(data || '');
    } catch (err) {
      toast.error('Failed to load About Us content');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminAPI.updateContent('about', content);
      toast.success('About Us content updated!');
    } catch (err) {
      toast.error('Failed to update About Us content');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <HiInformationCircle className="w-7 h-7 text-gray-400" />
        <h1 className="text-2xl font-bold text-gray-900">About Us Editor</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Content (HTML Supported)</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={20}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-mono text-sm resize-y"
          placeholder="Enter About Us content here..."
        />
        
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition disabled:opacity-50"
          >
            <HiSave className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Content'}
          </button>
          
          <a
            href="/about"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-500 hover:text-indigo-600 underline"
          >
            Preview Public Page →
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdminAbout;
