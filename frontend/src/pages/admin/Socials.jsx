import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { HiCheck, HiRefresh, HiPlus, HiTrash, HiX } from 'react-icons/hi';
import {
  FaFacebookF, FaInstagram, FaLinkedinIn, FaTwitter, FaYoutube,
  FaWhatsapp, FaTelegram, FaGithub, FaDiscord, FaTiktok, FaPinterest, FaReddit, FaGlobe
} from 'react-icons/fa';

const PRESET_PLATFORMS = [
  { key: 'facebook', name: 'Facebook', icon: FaFacebookF, color: 'text-blue-600 bg-blue-50', defaultUrl: 'https://facebook.com/lucohire' },
  { key: 'twitter', name: 'Twitter (X)', icon: FaTwitter, color: 'text-sky-500 bg-sky-50', defaultUrl: 'https://twitter.com/lucohire' },
  { key: 'linkedin', name: 'LinkedIn', icon: FaLinkedinIn, color: 'text-blue-700 bg-blue-50', defaultUrl: 'https://linkedin.com/company/lucohire' },
  { key: 'instagram', name: 'Instagram', icon: FaInstagram, color: 'text-pink-600 bg-pink-50', defaultUrl: 'https://instagram.com/lucohire' },
  { key: 'youtube', name: 'YouTube', icon: FaYoutube, color: 'text-red-600 bg-red-50', defaultUrl: 'https://youtube.com/@lucohire' },
  { key: 'whatsapp', name: 'WhatsApp', icon: FaWhatsapp, color: 'text-emerald-600 bg-emerald-50', defaultUrl: 'https://wa.me/' },
  { key: 'telegram', name: 'Telegram', icon: FaTelegram, color: 'text-sky-600 bg-sky-50', defaultUrl: 'https://t.me/' },
  { key: 'github', name: 'GitHub', icon: FaGithub, color: 'text-gray-800 bg-gray-100', defaultUrl: 'https://github.com/lucohire' },
  { key: 'discord', name: 'Discord', icon: FaDiscord, color: 'text-indigo-600 bg-indigo-50', defaultUrl: 'https://discord.gg/' },
  { key: 'tiktok', name: 'TikTok', icon: FaTiktok, color: 'text-gray-900 bg-gray-100', defaultUrl: 'https://tiktok.com/@' },
  { key: 'pinterest', name: 'Pinterest', icon: FaPinterest, color: 'text-rose-600 bg-rose-50', defaultUrl: 'https://pinterest.com/' },
  { key: 'reddit', name: 'Reddit', icon: FaReddit, color: 'text-orange-600 bg-orange-50', defaultUrl: 'https://reddit.com/r/' },
];

const getPlatformMeta = (key, customName) => {
  const found = PRESET_PLATFORMS.find(p => p.key === key.toLowerCase());
  if (found) return found;
  return {
    key: key.toLowerCase(),
    name: customName || key.charAt(0).toUpperCase() + key.slice(1),
    icon: FaGlobe,
    color: 'text-blue-600 bg-blue-50',
    defaultUrl: 'https://'
  };
};

const Socials = () => {
  const defaultPlatforms = [
    { key: 'facebook', name: 'Facebook', url: 'https://facebook.com/lucohire' },
    { key: 'twitter', name: 'Twitter (X)', url: 'https://twitter.com/lucohire' },
    { key: 'linkedin', name: 'LinkedIn', url: 'https://linkedin.com/company/lucohire' },
    { key: 'instagram', name: 'Instagram', url: 'https://instagram.com/lucohire' },
  ];

  const [platforms, setPlatforms] = useState(defaultPlatforms);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const [newPlatform, setNewPlatform] = useState({
    presetKey: 'youtube',
    customName: '',
    url: '',
  });

  useEffect(() => {
    fetchSocials();
  }, []);

  const fetchSocials = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getContent('socials');
      let data = res.data || {};
      
      let list = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (typeof data === 'object') {
        const defaultKeys = ['facebook', 'twitter', 'linkedin', 'instagram'];
        const metaKeys = ['_list', '_id', '__v', 'createdAt', 'updatedAt'];
        const allKeys = Array.from(new Set([...defaultKeys, ...Object.keys(data)]))
          .filter(key => !metaKeys.includes(key));
        
        list = allKeys.map(key => ({
          key,
          name: getPlatformMeta(key).name,
          url: data[key] || getPlatformMeta(key).defaultUrl || '',
        }));
      }

      if (list.length === 0) list = defaultPlatforms;
      setPlatforms(list);
    } catch (error) {
      toast.error('Failed to load social links');
    } finally {
      setLoading(false);
    }
  };

  const formatUrl = (url) => {
    let trimmed = (url || '').trim();
    if (!trimmed) return '';
    if (!/^https?:\/\//i.test(trimmed)) {
      return `https://${trimmed}`;
    }
    return trimmed;
  };

  const handleUrlChange = (index, value) => {
    const updated = [...platforms];
    updated[index].url = value;
    setPlatforms(updated);
  };

  const handleDeletePlatform = (index) => {
    const updated = platforms.filter((_, i) => i !== index);
    setPlatforms(updated);
    handleSave(updated);
  };

  const handleAddPlatform = (e) => {
    e.preventDefault();
    const isCustom = newPlatform.presetKey === 'custom';
    const key = isCustom
      ? newPlatform.customName.toLowerCase().replace(/[^a-z0-9]/g, '_')
      : newPlatform.presetKey;
    const name = isCustom
      ? newPlatform.customName
      : getPlatformMeta(newPlatform.presetKey).name;

    if (!key || !name) {
      return toast.error('Please enter a platform name');
    }

    if (platforms.some(p => p.key === key)) {
      return toast.error(`Platform "${name}" is already in the list!`);
    }

    const preset = getPlatformMeta(key, name);
    const url = formatUrl(newPlatform.url) || preset.defaultUrl;

    const updated = [
      ...platforms,
      { key, name, url }
    ];
    setPlatforms(updated);

    toast.success(`Added ${name}!`);
    setAddModalOpen(false);
    setNewPlatform({ presetKey: 'youtube', customName: '', url: '' });
    
    handleSave(updated);
  };

  const handleSave = async (platformsToSave = platforms) => {
    setSaving(true);
    try {
      const payloadObj = {};
      const payloadArr = [];

      platformsToSave.forEach(p => {
        const formatted = formatUrl(p.url);
        if (formatted) {
          payloadObj[p.key] = formatted;
        }
        payloadArr.push({
          key: p.key,
          name: p.name,
          url: formatted,
          enabled: Boolean(formatted)
        });
      });

      await adminAPI.updateContent('socials', { ...payloadObj, _list: payloadArr });
      toast.success('Changes saved automatically!');
    } catch (error) {
      toast.error('Failed to save social links');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500 flex items-center justify-center min-h-[200px]">
        <HiRefresh className="animate-spin w-5 h-5 mr-2 text-blue-600" /> Loading...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Social Links Management</h1>
          <p className="text-sm text-gray-500 mt-1">Update the social media links displayed in the website footer.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 mr-2">{saving ? 'Saving...' : 'All changes saved automatically'}</span>
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 font-medium text-sm rounded-lg hover:bg-gray-200 transition"
          >
            <HiPlus className="w-4 h-4 text-gray-700" /> Add Social Platform
          </button>
        </div>
      </div>

      {/* Main Card Container */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
        {platforms.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">No social media links added yet.</p>
            <button
              onClick={() => setAddModalOpen(true)}
              className="mt-2 text-blue-600 font-semibold text-xs hover:underline"
            >
              + Add a social platform
            </button>
          </div>
        ) : (
          platforms.map((p, idx) => {
            const meta = getPlatformMeta(p.key, p.name);
            const IconComp = meta.icon;

            return (
              <div key={p.key || idx}>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${meta.color}`}>
                      <IconComp />
                    </div>
                    {p.name || meta.name} URL
                  </label>
                  <button
                    onClick={() => handleDeletePlatform(idx)}
                    className="text-gray-400 hover:text-red-600 p-1 transition"
                    title="Remove platform"
                  >
                    <HiTrash className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="url"
                  value={p.url || ''}
                  onChange={(e) => handleUrlChange(idx, e.target.value)}
                  onBlur={() => handleSave(platforms)}
                  placeholder={`https://${p.key}.com/...`}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
                />
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Add Social Platform */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <HiPlus className="w-5 h-5 text-blue-600" /> Add Social Media Platform
              </h3>
              <button onClick={() => setAddModalOpen(false)} className="text-gray-400 hover:text-gray-700">
                <HiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPlatform} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Select Platform</label>
                <select
                  value={newPlatform.presetKey}
                  onChange={(e) => setNewPlatform({ ...newPlatform, presetKey: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {PRESET_PLATFORMS.map(p => (
                    <option key={p.key} value={p.key}>{p.name}</option>
                  ))}
                  <option value="custom">🌐 Custom Platform / Website</option>
                </select>
              </div>

              {newPlatform.presetKey === 'custom' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Custom Platform Name *</label>
                  <input
                    type="text"
                    required
                    value={newPlatform.customName}
                    onChange={(e) => setNewPlatform({ ...newPlatform, customName: e.target.value })}
                    placeholder="e.g. Threads, Medium, Dribbble"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Platform Account URL</label>
                <input
                  type="url"
                  value={newPlatform.url}
                  onChange={(e) => setNewPlatform({ ...newPlatform, url: e.target.value })}
                  placeholder={
                    newPlatform.presetKey === 'custom'
                      ? 'https://yourwebsite.com/profile'
                      : getPlatformMeta(newPlatform.presetKey).defaultUrl
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition shadow-xs"
                >
                  Add Platform
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Socials;
