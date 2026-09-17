import { useState, useEffect } from 'react';
import { HiPlus, HiPencil, HiTrash, HiCheckCircle, HiXCircle, HiClock, HiExclamationCircle, HiLibrary } from 'react-icons/hi';
import bankAccountService from '../../services/bankAccountService';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const PartnerBankDetails = () => {
  const [bankAccount, setBankAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
    branchName: '',
    accountType: 'Savings',
    upiId: ''
  });

  useEffect(() => {
    fetchBankAccount();
  }, []);

  const fetchBankAccount = async () => {
    try {
      setLoading(true);
      const res = await bankAccountService.getManagerBankAccount();
      if (res.data.data) {
        setBankAccount(res.data.data);
        setFormData({
          ...res.data.data,
          accountNumber: res.data.data.fullAccountNumber || '',
          confirmAccountNumber: res.data.data.fullAccountNumber || ''
        });
      } else {
        setBankAccount(null);
      }
    } catch (error) {
      console.error("Failed to fetch bank account", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Frontend Validation
    if (!formData.accountHolderName || !formData.bankName || !formData.accountNumber || !formData.ifscCode) {
      toast.error("Please fill all required fields");
      return;
    }

    if (formData.accountNumber !== formData.confirmAccountNumber) {
      toast.error("Account numbers do not match");
      return;
    }

    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(formData.ifscCode)) {
      toast.error("Invalid IFSC code format (e.g., SBIN0012345)");
      return;
    }

    if (formData.upiId) {
      const upiRegex = /^[\w.-]+@[\w.-]+$/;
      if (!upiRegex.test(formData.upiId)) {
        toast.error("Invalid UPI ID format");
        return;
      }
    }

    try {
      setSubmitting(true);
      if (isEditing) {
        await bankAccountService.updateManagerBankAccount(formData);
        toast.success("Bank details updated and submitted for verification");
      } else {
        await bankAccountService.createManagerBankAccount(formData);
        toast.success("Bank details submitted for verification");
      }
      setShowForm(false);
      setIsEditing(false);
      fetchBankAccount();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save bank details");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete your bank account? This will block any pending withdrawals.")) return;
    
    try {
      await bankAccountService.deleteManagerBankAccount();
      toast.success("Bank account deleted");
      setBankAccount(null);
      setFormData({
        accountHolderName: '',
        bankName: '',
        accountNumber: '',
        confirmAccountNumber: '',
        ifscCode: '',
        branchName: '',
        accountType: 'Savings',
        upiId: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete bank account");
    }
  };

  if (loading) return <div className="flex justify-center p-12"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Bank Account Details</h1>
          <p className="text-sm text-gray-500 mt-1">Manage where you receive your commission payouts.</p>
        </div>
        {!bankAccount && !showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
          >
            <HiPlus className="w-5 h-5" /> Add Bank Account
          </button>
        )}
      </div>

      {bankAccount && !showForm && (
        <div className="bg-white rounded-3xl border border-[#EAE7F2] shadow-sm overflow-hidden mb-8">
          <div className="p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                  <HiLibrary className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{bankAccount.bankName}</h3>
                  <p className="text-sm text-gray-500">{bankAccount.branchName || 'Main Branch'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {bankAccount.verificationStatus === 'pending' && (
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100">
                    <HiClock className="w-4 h-4" /> Pending Verification
                  </span>
                )}
                {bankAccount.verificationStatus === 'approved' && (
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                    <HiCheckCircle className="w-4 h-4" /> Verified
                  </span>
                )}
                {bankAccount.verificationStatus === 'rejected' && (
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-100">
                    <HiXCircle className="w-4 h-4" /> Rejected
                  </span>
                )}
              </div>
            </div>

            {bankAccount.verificationStatus === 'rejected' && (
              <div className="mb-8 p-4 bg-red-50 rounded-2xl border border-red-100 flex gap-3">
                <HiExclamationCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-800">Account Rejected</p>
                  <p className="text-sm text-red-700">{bankAccount.rejectionReason || "Please check your details and resubmit."}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12 mb-8">
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Account Holder</p>
                <p className="text-gray-900 font-semibold">{bankAccount.accountHolderName}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Account Number</p>
                <p className="text-gray-900 font-mono font-bold tracking-wider">{bankAccount.accountNumber}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">IFSC Code</p>
                <p className="text-gray-900 font-semibold">{bankAccount.ifscCode}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Account Type</p>
                <p className="text-gray-900 font-semibold">{bankAccount.accountType}</p>
              </div>
              {bankAccount.upiId && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">UPI ID</p>
                  <p className="text-gray-900 font-semibold">{bankAccount.upiId}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 pt-6 border-t border-gray-100">
              <button 
                onClick={() => {
                  setIsEditing(true);
                  setShowForm(true);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-50 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-100 transition-all border border-gray-200"
              >
                <HiPencil className="w-4 h-4" /> Edit Details
              </button>
              <button 
                onClick={handleDelete}
                className="flex items-center justify-center px-4 py-2.5 text-red-700 hover:bg-red-50 rounded-xl transition-all"
                title="Delete Account"
              >
                <HiTrash className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-3xl border border-[#EAE7F2] shadow-sm overflow-hidden">
          <form onSubmit={handleSubmit} className="p-8">
            <h3 className="text-lg font-bold text-gray-900 mb-6">{isEditing ? 'Update Bank Details' : 'Add New Bank Account'}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 ml-1">Account Holder Name *</label>
                <input 
                  type="text"
                  name="accountHolderName"
                  value={formData.accountHolderName}
                  onChange={handleChange}
                  placeholder="Enter as per bank record"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 ml-1">Bank Name *</label>
                <input 
                  type="text"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleChange}
                  placeholder="e.g. HDFC Bank, SBI"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 ml-1">Account Number *</label>
                <input 
                  type="password"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleChange}
                  placeholder="9-18 digit account number"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 ml-1">Confirm Account Number *</label>
                <input 
                  type="text"
                  name="confirmAccountNumber"
                  value={formData.confirmAccountNumber}
                  onChange={handleChange}
                  placeholder="Re-enter account number"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm font-mono"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 ml-1">IFSC Code *</label>
                <input 
                  type="text"
                  name="ifscCode"
                  value={formData.ifscCode}
                  onChange={handleChange}
                  placeholder="e.g. HDFC0001234"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm uppercase"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 ml-1">Account Type *</label>
                <select 
                  name="accountType"
                  value={formData.accountType}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm bg-white"
                  required
                >
                  <option value="Savings">Savings</option>
                  <option value="Current">Current</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 ml-1">Branch Name (Optional)</label>
                <input 
                  type="text"
                  name="branchName"
                  value={formData.branchName}
                  onChange={handleChange}
                  placeholder="e.g. Noida Sector 62"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 ml-1">UPI ID (Optional)</label>
                <input 
                  type="text"
                  name="upiId"
                  value={formData.upiId}
                  onChange={handleChange}
                  placeholder="e.g. name@upi"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button 
                type="submit"
                disabled={submitting}
                className="flex-1 px-8 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-70 transition-all"
              >
                {submitting ? 'Saving...' : isEditing ? 'Update Details' : 'Submit Bank Details'}
              </button>
              <button 
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setIsEditing(false);
                }}
                className="px-8 py-3 bg-white text-gray-500 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mt-8 p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100 flex gap-4">
        <HiExclamationCircle className="w-6 h-6 text-indigo-500 shrink-0 mt-1" />
        <div>
          <h4 className="text-sm font-bold text-indigo-900 mb-1">Important Note</h4>
          <p className="text-xs text-indigo-700 leading-relaxed">
            Please ensure all bank details are correct. Inaccurate information may lead to payout failures or delays. 
            Once submitted, our admin team will verify the details within 24-48 business hours. 
            You can request withdrawals only after your bank account is verified.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PartnerBankDetails;
