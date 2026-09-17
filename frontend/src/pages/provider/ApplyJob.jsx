import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { HiArrowLeft, HiOutlineBriefcase, HiOutlineOfficeBuilding } from "react-icons/hi";
import toast from "react-hot-toast";
import { providerAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import SubscriptionPlansPopup from "../../components/common/SubscriptionPlansPopup";

const ApplyJob = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [job, setJob] = useState(null);
  const [loadingJob, setLoadingJob] = useState(true);
  
  const [coverLetter, setCoverLetter] = useState("");
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [showPlans, setShowPlans] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const { data } = await providerAPI.getJobById(jobId);
        setJob(data.job || data);
      } catch (err) {
        toast.error("Failed to fetch job details");
        navigate("/provider/job-for-me");
      } finally {
        setLoadingJob(false);
      }
    };
    fetchJob();
  }, [jobId, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoadingSubmit(true);
    try {
      const response = await providerAPI.applyToJob(job._id, { coverLetter });
      toast.success("Application submitted successfully!");
      // Redirect to Application Success page, pass job and application
      navigate(`/provider/application-success/${response.data.application._id}`, { 
        state: { job, application: response.data.application },
        replace: true
      });
    } catch (err) {
      if (err.response?.data?.upgradeRequired) {
        toast.error(err.response.data.message || "Limit reached");
        setShowPlans(true);
      } else {
        toast.error(err.response?.data?.message || "Failed to apply");
      }
    } finally {
      setLoadingSubmit(false);
    }
  };

  if (loadingJob) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!job) return null;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 lg:p-8 mt-8">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition"
      >
        <HiArrowLeft className="w-4 h-4" /> Back to Job Details
      </button>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 border-b border-gray-100 bg-emerald-50/30">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Submit Your Application</h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm text-gray-700">
            <div className="flex items-center gap-1.5">
              <HiOutlineBriefcase className="w-4 h-4 text-emerald-600" />
              <span className="font-medium text-gray-800">{job.title}</span>
            </div>
            <div className="hidden sm:block text-gray-300">•</div>
            <div className="flex items-center gap-1.5">
              <HiOutlineOfficeBuilding className="w-4 h-4 text-emerald-600" />
              <span>{job.companyName || "Company"}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">
              Introduce Yourself / Cover Letter <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows={6}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              maxLength={1000}
              placeholder="Describe your qualifications and why you're the best fit for this role..."
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300 resize-none transition shadow-sm"
            />
            <p className="text-right text-xs text-gray-400 mt-1">{coverLetter.length}/1000</p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <button 
              type="button" 
              onClick={() => navigate(-1)} 
              className="flex-1 py-3 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loadingSubmit} 
              className="flex-1 py-3 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition shadow-md shadow-emerald-600/20"
            >
              {loadingSubmit ? "Submitting..." : "Submit Application"}
            </button>
          </div>
        </form>
      </div>
      
      <SubscriptionPlansPopup 
        open={showPlans} 
        onClose={() => setShowPlans(false)} 
        role="provider" 
        reason="job_apply_limit" 
      />
    </div>
  );
};

export default ApplyJob;
