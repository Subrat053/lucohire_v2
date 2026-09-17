import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, Loader2, Briefcase } from 'lucide-react';
import api from '../../services/api';

const JobRoles = () => {
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newRole, setNewRole] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/job-roles/all');
      setRoles(response.data);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Failed to load job roles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRole = async (e) => {
    e.preventDefault();
    if (!newRole.trim()) return;

    try {
      setIsAdding(true);
      const response = await api.post('/job-roles', { roleName: newRole.trim() });
      setRoles([...roles, response.data].sort((a, b) => a.roleName.localeCompare(b.roleName)));
      setNewRole('');
      toast.success('Job role added successfully');
    } catch (error) {
      console.error('Error adding role:', error);
      toast.error(error.response?.data?.message || 'Failed to add job role');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteRole = async (id) => {
    if (!window.confirm('Are you sure you want to delete this job role?')) return;

    try {
      await api.delete(`/job-roles/${id}`);
      setRoles(roles.filter(r => r._id !== id));
      toast.success('Job role deleted');
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Failed to delete job role');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-blue-600" />
          Job Roles Management
        </h1>
        <p className="text-gray-700 mt-1">Manage the list of job roles available for candidates.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Add New Role</h2>
          <form onSubmit={handleAddRole} className="flex gap-4">
            <input
              type="text"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              placeholder="e.g. Software Engineer"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              disabled={isAdding}
            />
            <button
              type="submit"
              disabled={isAdding || !newRole.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Role
            </button>
          </form>
        </div>

        <div className="p-0">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Role Name</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {roles.length === 0 ? (
                <tr>
                  <td colSpan="2" className="px-6 py-8 text-center text-gray-500">
                    No job roles found. Add some above.
                  </td>
                </tr>
              ) : (
                roles.map((role) => (
                  <tr key={role._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{role.roleName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeleteRole(role._id)}
                        className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Role"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default JobRoles;
