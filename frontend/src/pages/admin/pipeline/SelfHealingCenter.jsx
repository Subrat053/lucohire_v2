import React, { useState, useEffect } from "react";
import { HiShieldCheck, HiRefresh, HiOutlineInformationCircle } from "react-icons/hi";
import { ADMIN_API as api } from "../../../services/api";
import { toast } from "react-hot-toast";

export default function SelfHealingCenter() {
  const [flaggedJobs, setFlaggedJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFlaggedJobs = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/self-healing/flagged");
      if (res.data.success) {
        setFlaggedJobs(res.data.data);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch flagged jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlaggedJobs();
  }, []);

  const handleApplyFix = async (jobId, action) => {
    try {
      const res = await api.post("/admin/self-healing/apply-fix", { jobId, action });
      if (res.data.success) {
        toast.success("Fix applied successfully!");
        fetchFlaggedJobs();
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to apply fix");
    }
  };

  const handleUndoFix = async (jobId) => {
    try {
      const res = await api.post("/admin/self-healing/undo-fix", { jobId });
      if (res.data.success) {
        toast.success("Fix undone successfully!");
        fetchFlaggedJobs();
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to undo fix");
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HiShieldCheck className="text-blue-600" /> Self-Healing & One-Click Fix Center
          </h1>
          <p className="text-gray-500 mt-1">
            Review and quickly fix jobs with missing or incorrect data.
          </p>
        </div>
        <button
          onClick={fetchFlaggedJobs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <HiRefresh className={loading ? "animate-spin" : ""} /> Refresh List
        </button>
      </div>

      {/* SOW 3-Tier Legend */}
      <div className="mb-6 bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-4 text-sm text-blue-800">
        <HiOutlineInformationCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <strong>System operates on a 3-Tier Classification:</strong>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li><strong>Tier-1 (Fully Safe Auto):</strong> System corrects formatting and minor schema issues automatically in the background.</li>
            <li><strong>Tier-2 (Admin Confirmed):</strong> Use the Quick Actions below to resolve missing salaries or set items to draft.</li>
            <li><strong>Tier-3 (Developer Only):</strong> Critical errors are flagged here but locked from manual admin edits to prevent DB corruption.</li>
          </ul>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Scanning for data issues...</div>
      ) : flaggedJobs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
          <HiShieldCheck className="text-6xl text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-800">All Clear!</h2>
          <p className="text-gray-500 mt-2">No data issues found in recent jobs.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Job Details</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Issues Found</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {flaggedJobs.map((job) => {
                  const hasCriticalError = job.errors.some(e => e.tier === 3);
                  return (
                    <tr key={job.jobId} className={hasCriticalError ? "bg-red-50/30" : "hover:bg-gray-50/50"}>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">{job.title || "Untitled Job"}</div>
                        <div className="text-sm text-gray-500 mt-1">{job.companyName || "Unknown Company"}</div>
                        <div className="text-xs text-gray-400 mt-1">Status: {job.status}</div>
                      </td>
                      <td className="px-6 py-5">
                        <ul className="text-sm text-red-600 space-y-1">
                          {job.errors.map((err, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="mt-1">•</span>
                              <span>{err.msg}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        {hasCriticalError ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                            Needs Developer Fix
                          </span>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApplyFix(job.jobId, 'set_draft')}
                              className="text-sm px-3 py-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded hover:bg-yellow-100 font-medium transition-colors"
                            >
                              Unpublish (Draft)
                            </button>
                            <button
                              onClick={() => handleApplyFix(job.jobId, 'apply_default_salary')}
                              className="text-sm px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 font-medium transition-colors"
                            >
                              Fix Salary
                            </button>
                            <button
                              onClick={() => handleUndoFix(job.jobId)}
                              className="text-sm px-3 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 rounded hover:bg-gray-100 font-medium transition-colors"
                            >
                              Undo
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
