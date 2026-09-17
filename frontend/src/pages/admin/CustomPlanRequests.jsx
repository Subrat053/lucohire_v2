import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { HiCheck, HiX, HiClock, HiOutlineDocumentText } from 'react-icons/hi';

const CustomPlanRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offerModal, setOfferModal] = useState({ show: false, reqId: null, price: '', duration: 1, reqFeatures: [] });
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [pricingSettingsModal, setPricingSettingsModal] = useState({ show: false, loading: false, saving: false, data: {} });

  useEffect(() => {
    fetchRequests();
  }, []);

  const openPricingSettings = async () => {
    setPricingSettingsModal(p => ({ ...p, show: true, loading: true }));
    try {
      const res = await adminAPI.getCustomPlanPricingSettings();
      if (res.data?.success) {
        setPricingSettingsModal(p => ({ ...p, loading: false, data: res.data.data }));
      }
    } catch {
      toast.error('Failed to load pricing settings');
      setPricingSettingsModal(p => ({ ...p, loading: false }));
    }
  };

  const savePricingSettings = async (e) => {
    e.preventDefault();
    try {
      setPricingSettingsModal(p => ({ ...p, saving: true }));
      await adminAPI.updateCustomPlanPricingSettings(pricingSettingsModal.data);
      toast.success('Pricing settings updated successfully');
      setPricingSettingsModal(p => ({ ...p, show: false, saving: false }));
    } catch {
      toast.error('Failed to update pricing settings');
      setPricingSettingsModal(p => ({ ...p, saving: false }));
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getCustomPlanRequests();
      setRequests(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to load custom plan requests');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to delete ALL custom plan requests? This cannot be undone.')) return;
    try {
      await adminAPI.clearAllCustomPlanRequests();
      toast.success('All custom plan requests cleared');
      fetchRequests();
    } catch (err) {
      toast.error('Failed to clear requests');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await adminAPI.updateCustomPlanRequestStatus(id, newStatus);
      toast.success('Status updated');
      setRequests(requests.map(req => req._id === id ? { ...req, status: newStatus } : req));
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleGenerateOffer = async (e) => {
    e.preventDefault();
    if (offerModal.price === '' || offerModal.price < 0) {
      toast.error('Valid price is required');
      return;
    }
    try {
      setSubmittingOffer(true);
      await adminAPI.generateCustomPlanOffer(offerModal.reqId, {
        price: Number(offerModal.price),
        durationMonths: Number(offerModal.duration),
        features: offerModal.reqFeatures
      });
      toast.success('Offer generated and sent to recruiter!');
      setOfferModal({ show: false, reqId: null, price: '', duration: 1, reqFeatures: [] });
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate offer');
    } finally {
      setSubmittingOffer(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">Pending</span>;
      case 'contacted': return <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">Contacted</span>;
      case 'resolved': return <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Resolved</span>;
      case 'closed': return <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">Closed</span>;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Custom Plan Requests</h1>
          <p className="text-sm text-slate-500 mt-1">Manage enterprise custom plan requests from recruiters</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={openPricingSettings}
            className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition shadow-sm"
          >
            Configure Pricing
          </button>
          <button onClick={fetchRequests} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition shadow-sm">
            Refresh
          </button>
          <button 
            onClick={handleClearAll}
            disabled={requests.length === 0}
            className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 text-sm font-bold rounded-xl hover:bg-red-100 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-black">
                <th className="px-6 py-4">Recruiter</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Features Requested</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500 font-medium">
                    <div className="flex flex-col items-center">
                      <HiOutlineDocumentText className="w-12 h-12 text-slate-300 mb-3" />
                      <p>No custom plan requests found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map(req => (
                  <tr key={req._id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{req.recruiterId?.name || 'Unknown'}</div>
                      <div className="text-xs text-slate-500">{req.recruiterId?.email}</div>
                      {req.recruiterId?.phone && <div className="text-xs text-slate-500">{req.recruiterId?.phone}</div>}
                      {req.company && <div className="text-[10px] font-bold text-indigo-600 mt-1 uppercase tracking-wider">{req.company} {req.designation ? `- ${req.designation}` : ''}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-700">{req.durationMonths} Month{req.durationMonths > 1 ? 's' : ''}</div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <div className="flex flex-wrap gap-1">
                        {req.selectedFeatures?.map((f, i) => (
                          <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded">
                            {f}
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-slate-600 grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 shadow-xs">
                        {req.estimatedPrice > 0 && <div className="col-span-2 text-indigo-700 font-black mb-1">System Est: ₹{req.estimatedPrice?.toLocaleString('en-IN')}</div>}
                        {req.jobsPerMonth > 0 && <div>Jobs/mo: <span className="font-bold">{req.jobsPerMonth}</span></div>}
                        {req.profileUnlocks > 0 && <div>Unlocks: <span className="font-bold">{req.profileUnlocks}</span></div>}
                        {req.campaigns > 0 && <div>Campaigns: <span className="font-bold">{req.campaigns}</span></div>}
                        {req.boostJobs > 0 && <div>Boost Jobs: <span className="font-bold">{req.boostJobs}</span></div>}
                        {req.boostDays > 0 && <div>Boost Days: <span className="font-bold">{req.boostDays}</span></div>}
                      </div>
                      {req.notes && (
                        <div className="mt-2 text-[11px] text-slate-500 italic bg-white p-2 rounded-lg border border-slate-200">
                          {req.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-medium">
                      {new Date(req.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex flex-col items-end gap-2">
                        <select
                          value={req.status}
                          onChange={(e) => handleStatusChange(req._id, e.target.value)}
                          className="text-xs font-bold border-slate-200 rounded-lg bg-white px-2 py-1 outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="pending">Pending</option>
                          <option value="contacted">Contacted</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                        {!req.offerDetails?.price && (req.status === 'pending' || req.status === 'contacted') && (
                          <button
                            onClick={() => setOfferModal({ show: true, reqId: req._id, duration: req.durationMonths || 1, price: req.estimatedPrice || '', reqFeatures: req.selectedFeatures || [] })}
                            className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-700 transition"
                          >
                            Generate Offer
                          </button>
                        )}
                        {req.offerDetails?.price > 0 && (
                          <div className="flex flex-col items-end gap-1 mt-1">
                            {req.offerDetails.status === 'accepted' ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 shadow-xs">
                                ✓ Purchased · ₹{req.offerDetails.price?.toLocaleString('en-IN')}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200 shadow-xs">
                                Offer Sent · ₹{req.offerDetails.price?.toLocaleString('en-IN')} · Awaiting Payment
                              </span>
                            )}
                            {req.offerDetails.purchasedAt && (
                              <span className="text-[9px] text-slate-400">
                                Paid {new Date(req.offerDetails.purchasedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {offerModal.show && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h2 className="text-xl font-black text-slate-900 mb-4">Generate Custom Plan Offer</h2>
            <form onSubmit={handleGenerateOffer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Duration (Months)</label>
                <input type="number" min="1" required value={offerModal.duration} onChange={e => setOfferModal({...offerModal, duration: e.target.value})} className="w-full border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-hidden focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Custom Price (₹)</label>
                <input type="number" min="0" required value={offerModal.price} onChange={e => setOfferModal({...offerModal, price: e.target.value})} className="w-full border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-hidden focus:border-indigo-500" placeholder="e.g. 50000" />
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setOfferModal({ show: false, reqId: null, price: '', duration: 1, reqFeatures: [] })} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900">Cancel</button>
                <button type="submit" disabled={submittingOffer} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition shadow-sm disabled:opacity-50">
                  {submittingOffer ? 'Generating...' : 'Send Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {pricingSettingsModal.show && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-black text-slate-900 mb-4 flex items-center justify-between">
              Configure Base Pricing
              <button onClick={() => setPricingSettingsModal(p => ({ ...p, show: false }))} className="p-1 hover:bg-slate-100 rounded-full">
                <HiX className="w-5 h-5 text-slate-500" />
              </button>
            </h2>
            {pricingSettingsModal.loading ? (
              <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
            ) : (
              <form onSubmit={savePricingSettings} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(pricingSettingsModal.data).map(([key, value]) => {
                    if (key === '_id' || key === '__v') return null;
                    
                    const labelMap = {
                      copilot: 'AI Copilot Assistant (Base)',
                      resume_parser: 'AI Resume Parser (Base)',
                      interview_kits: 'AI Interview Kits (Base)',
                      automated_email: 'Automated Email (Base)',
                      data_export: 'Advanced Data Export (Base)',
                      jobPrice: 'Price per Job Post',
                      unlockPrice: 'Price per Profile Unlock',
                      campaignPrice: 'Price per Outreach Campaign',
                      boostJobPrice: 'Price per Boosted Job',
                      boostDayPrice: 'Price per Boost Day'
                    };
                    
                    const label = labelMap[key] || key.replace(/_/g, ' ');

                    return (
                      <div key={key} className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <label className="block text-xs font-bold text-slate-700 mb-1">{label} (₹)</label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={value}
                          onChange={(e) => setPricingSettingsModal(p => ({
                            ...p,
                            data: { ...p.data, [key]: Number(e.target.value) }
                          }))}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-hidden focus:border-indigo-500"
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setPricingSettingsModal(p => ({ ...p, show: false }))} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900">Cancel</button>
                  <button type="submit" disabled={pricingSettingsModal.saving} className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl transition shadow-sm disabled:opacity-50">
                    {pricingSettingsModal.saving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomPlanRequests;
