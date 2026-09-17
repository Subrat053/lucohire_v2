import React, { useState } from 'react';
import { providerAPI } from "../../services/api";
import toast from "react-hot-toast";

const getTabForSection = (key) => {
  switch (key) {
    case 'profilePhoto':
    case 'phone':
    case 'email':
      return 'Personal';
    case 'businessDetails':
    case 'skills':
    case 'serviceAreas':
      return 'Details';
    case 'education':
      return 'Education & Credentials';
    case 'portfolio':
      return 'Portfolio';
    case 'resume':
      return 'Resume';
    default:
      return 'Personal';
  }
};

export default function DocumentVerificationStatusCard({ profile, onRefresh, onSaveAndResubmit, onTabChange }) {
  const [resubmitting, setResubmitting] = useState(false);

  const approvalSections = profile?.approvalSections || [];
  const rejectedSections = approvalSections.filter(s => s.status === 'rejected');
  const isProfileRejected = profile?.approvalAction === 'rejected' || rejectedSections.length > 0;

  const handleResubmitProfile = async () => {
    try {
      setResubmitting(true);
      if (onSaveAndResubmit) {
        await onSaveAndResubmit();
      } else {
        await providerAPI.resubmitProfile();
        toast.success('Profile resubmitted successfully!');
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resubmit profile');
    } finally {
      setResubmitting(false);
    }
  };

  if (!isProfileRejected) return null;

  return (
    <div className="mb-6 p-4 border border-red-300 bg-red-50 rounded-lg">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-red-700 font-bold text-lg">Update Required</h3>
        <button
          disabled={resubmitting}
          onClick={handleResubmitProfile}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-semibold disabled:opacity-50 transition-colors"
        >
          {resubmitting ? 'Resubmitting...' : 'Save & Resubmit'}
        </button>
      </div>

      <div className="space-y-3">
        {rejectedSections.length > 0 ? (
          rejectedSections.map((sec) => (
            <div 
              key={sec.key} 
              onClick={() => onTabChange && onTabChange(getTabForSection(sec.key))}
              className="bg-white p-3 rounded border border-red-200 cursor-pointer hover:border-red-400 hover:shadow-sm transition-all"
            >
              <div className="flex justify-between items-center">
                <div className="font-bold text-red-900 capitalize">{sec.label || sec.key}</div>
                <div className="text-xs text-red-700 underline">Fix Issue &rarr;</div>
              </div>
              <div className="text-red-700 mt-1">
                {sec.remarks?.length > 0 ? sec.remarks[sec.remarks.length - 1]?.text : "Please update this field with correct details."}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white p-3 rounded border border-red-200">
            <div className="text-red-700">
              {profile?.approvalNote || "Your profile requires updates. Please check your details and resubmit."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
