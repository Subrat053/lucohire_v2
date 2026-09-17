import React, { useState, useEffect } from 'react';
import { FiX, FiDownload, FiFileText } from 'react-icons/fi';
import toast from 'react-hot-toast';
import API from '../../services/api';
import { jsPDF } from 'jspdf';

export default function InvoiceModal({ isOpen, onClose, profileData, fetchProfile, platformCompanyDetails }) {
  const [gstNumber, setGstNumber] = useState(profileData?.gstNumber || '');
  const [savingGst, setSavingGst] = useState(false);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setGstNumber(profileData?.gstNumber || '');
      fetchPayments();
    }
  }, [isOpen, profileData]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await API.get('/payments/my-payments');
      setPayments(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGst = async () => {
    try {
      setSavingGst(true);
      await API.put('/recruiter/profile', { gstNumber });
      toast.success('GST details saved successfully');
      if (fetchProfile) fetchProfile();
    } catch (error) {
      toast.error('Failed to save GST details');
    } finally {
      setSavingGst(false);
    }
  };

  const handleDownload = (payment) => {
    try {
      const doc = new jsPDF();
      
      // Basic info
      doc.setFontSize(22);
      doc.setTextColor(79, 70, 229); // Indigo 600
      doc.text("INVOICE", 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`#${payment._id.slice(-8).toUpperCase()}`, 14, 28);
      
      // Company details
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text(platformCompanyDetails?.companyName || "Lucohire Inc.", 140, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(platformCompanyDetails?.addressLine1 || "123 Business Avenue", 140, 28);
      if (platformCompanyDetails?.addressLine2) {
        doc.text(platformCompanyDetails.addressLine2, 140, 34);
      } else {
        doc.text("Tech District, Bangalore 560001", 140, 34);
      }
      doc.text(`GSTIN: ${platformCompanyDetails?.gstNumber || "29AABCU9603R1ZX"}`, 140, 40);
      
      // Divider
      doc.setDrawColor(200, 200, 200);
      doc.line(14, 48, 196, 48);
      
      // Billed To
      doc.setFontSize(9);
      doc.text("BILLED TO", 14, 58);
      
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      const companyName = profileData?.companyName || profileData?.displayName || 'Company';
      doc.text(companyName, 14, 65);
      
      let y = 71;
      if (profileData?.city) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`${profileData.city}${profileData.state ? `, ${profileData.state}` : ''}`, 14, y);
        y += 6;
      }
      if (gstNumber) {
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`GSTIN: ${gstNumber}`, 14, y);
      }
      
      // Invoice Details
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text("INVOICE DETAILS", 140, 58);
      
      doc.setFontSize(10);
      doc.text(`Date: ${new Date(payment.createdAt).toLocaleDateString()}`, 140, 65);
      doc.text(`Payment Method: ${payment.paymentMethod || 'Card'}`, 140, 71);
      
      // Table Header
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(14, 90, 196, 90);
      
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text("Description", 14, 96);
      doc.text("Amount", 170, 96);
      
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.1);
      doc.line(14, 100, 196, 100);
      
      // Table Content
      doc.text(payment.plan?.name || 'Subscription Plan', 14, 108);
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.text("Subscription charges for the selected period", 14, 114);
      
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`INR ${payment.amount}`, 170, 108);
      
      doc.line(14, 120, 196, 120);
      
      // Totals
      const amount = Number(payment.amount);
      
      
      doc.line(130, 144, 196, 144);
      
      doc.setFontSize(14);
      doc.text("Total", 130, 154);
      doc.setTextColor(79, 70, 229);
      doc.text(`INR ${amount.toFixed(2)}`, 170, 154);
      
      // Footer
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.1);
      doc.line(14, 250, 196, 250);
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text("Thank you for doing business with us.", 70, 260);

      doc.save(`Invoice_${payment._id}.pdf`);
      toast.success('Invoice downloaded successfully');
    } catch (err) {
      console.error(err);
      toast.error('Error generating invoice PDF');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">GST & Payment History</h2>
            <p className="text-sm text-gray-500">Manage your GST details and download invoices</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {/* GST Section */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-900 mb-3">GST Information</h3>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-700 mb-1.5">GST Number</label>
                <input 
                  type="text" 
                  value={gstNumber} 
                  onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                  placeholder="Enter your GSTIN"
                  className="w-full text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm uppercase placeholder:normal-case"
                />
              </div>
              <button 
                onClick={handleSaveGst}
                disabled={savingGst || gstNumber === (profileData?.gstNumber || '')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition shadow-sm disabled:opacity-50 h-10.5"
              >
                {savingGst ? 'Saving...' : 'Save Details'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Saved GST number will appear on all future generated invoices.</p>
          </div>

          {/* Payment History */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">Payment History</h3>
            {loading ? (
              <div className="py-8 text-center text-sm font-medium text-gray-500">Loading payments...</div>
            ) : payments.length === 0 ? (
              <div className="py-8 text-center bg-gray-50 rounded-lg border border-gray-100">
                <FiFileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-500">No payment history found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map(payment => (
                  <div key={payment._id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">{payment.plan?.name || 'Custom Plan'}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(payment.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        <span className="mx-2">•</span>
                        Status: <span className={`capitalize font-bold ${payment.status === 'succeeded' || payment.status === 'completed' ? 'text-emerald-600' : 'text-orange-500'}`}>{payment.status}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-black text-gray-900">₹{payment.amount}</span>
                      <button 
                        onClick={() => handleDownload(payment)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="Download Invoice"
                      >
                        <FiDownload className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
