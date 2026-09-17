import React, { useState } from 'react';
import { adminAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import { Save, Globe, Key, Webhook, List } from 'lucide-react';

const JobSourceBuilder = ({ onSaveSuccess }) => {
  const [formData, setFormData] = useState({
    sourceName: '',
    sourceType: 'ats',
    isZeroCode: true,
    apiBaseUrl: '',
    authType: 'No auth',
    apiCredentialsRef: '',
    webhookUrl: '',
    inputSchemaJson: JSON.stringify({ resultsKey: 'data.jobs' }, null, 2),
    outputMappingJson: JSON.stringify({ title: 'job_title', companyName: 'company', applyUrl: 'url' }, null, 2),
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        inputSchemaJson: JSON.parse(formData.inputSchemaJson),
        outputMappingJson: JSON.parse(formData.outputMappingJson),
      };
      await adminAPI.createJobSource(payload);
      toast.success('Zero-Code Job Source created successfully!');
      if (onSaveSuccess) onSaveSuccess();
    } catch (error) {
      toast.error('Failed to create source. Ensure JSON is valid and name is unique.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Zero-Code API Builder</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Source Name</label>
            <input 
              type="text" 
              name="sourceName" 
              value={formData.sourceName} 
              onChange={handleChange} 
              required
              className="w-full px-3 py-2 border rounded-md"
              placeholder="e.g., custom_board_1"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Auth Type</label>
            <select 
              name="authType" 
              value={formData.authType} 
              onChange={handleChange} 
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="No auth">No Auth</option>
              <option value="Bearer token">Bearer Token</option>
              <option value="Custom header">Custom Header / API Key</option>
              <option value="Webhook">Webhook Push</option>
            </select>
          </div>
        </div>

        {formData.authType !== 'Webhook' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">API Endpoint URL</label>
              <input 
                type="text" 
                name="apiBaseUrl" 
                value={formData.apiBaseUrl} 
                onChange={handleChange} 
                className="w-full px-3 py-2 border rounded-md"
                placeholder="https://api.example.com/v1/jobs"
              />
            </div>
            {(formData.authType === 'Bearer token' || formData.authType === 'Custom header') && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">API Key / Token</label>
                <input 
                  type="password" 
                  name="apiCredentialsRef" 
                  value={formData.apiCredentialsRef} 
                  onChange={handleChange} 
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Paste key or ENV var name"
                />
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Pagination & Input Config (JSON)</label>
            <textarea 
              name="inputSchemaJson" 
              value={formData.inputSchemaJson} 
              onChange={handleChange} 
              rows={5}
              className="w-full px-3 py-2 border rounded-md font-mono text-xs"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Field Mapping (JSON)</label>
            <textarea 
              name="outputMappingJson" 
              value={formData.outputMappingJson} 
              onChange={handleChange} 
              rows={5}
              className="w-full px-3 py-2 border rounded-md font-mono text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            type="submit" 
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md font-bold hover:bg-blue-700 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Create Source'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default JobSourceBuilder;
