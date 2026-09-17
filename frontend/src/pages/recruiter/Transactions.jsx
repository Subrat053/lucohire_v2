import React, { useState, useEffect, useRef } from 'react';
import { 
  Wallet, TrendingUp, ArrowUpRight, Clock, CheckCircle, 
  AlertCircle, Info, Sparkles, Settings, ArrowRight, ShieldCheck, DollarSign
} from 'lucide-react';
import { walletAPI, referralAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../../config/firebase';
import useTranslation from '../../hooks/useTranslation';

const Transactions = () => {
  const { t } = useTranslation();
  
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Withdrawal Form States
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('bank');
  const [bankDetails, setBankDetails] = useState({
    accountHolderName: '',
    accountNumber: '',
    upiId: '',
  });
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  // OTP Withdrawal verification states
  const [withdrawalStep, setWithdrawalStep] = useState('details'); // 'details' or 'verify'
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [userPhone, setUserPhone] = useState('');
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);

  const otpRefs = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (resendTimer > 0) {
      timerRef.current = setInterval(() => {
        setResendTimer(t => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resendTimer]);

  useEffect(() => {
    fetchData();
    
    const interval = setInterval(() => {
      fetchData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      const [summaryRes, txnsRes, statsRes] = await Promise.all([
        walletAPI.getSummary(),
        walletAPI.getTransactions(),
        referralAPI.getMyStats()
      ]);

      setSummary(summaryRes.data.data);
      setTransactions(txnsRes.data.data);
      setUserPhone(statsRes.data?.user?.phone || '');

      if (statsRes.data?.user?.bankDetails) {
        setBankDetails({
          accountHolderName: statsRes.data.user.bankDetails.accountHolderName || '',
          accountNumber: statsRes.data.user.bankDetails.accountNumber || '',
          upiId: statsRes.data.user.bankDetails.upiId || '',
        });
      }
    } catch (err) {
      if (!quiet) {
        toast.error(err?.response?.data?.message || 'Failed to load transaction details');
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  const getFormattedPhone = () => {
    if (!userPhone) return '';
    const cleanPhone = userPhone.replace(/\D/g, "");
    if (userPhone.startsWith("+")) {
      return userPhone;
    }
    if (cleanPhone.length === 10) {
      return `+91${cleanPhone}`;
    }
    return `+91${cleanPhone}`;
  };

  const handleSendOtp = async () => {
    const formattedPhone = getFormattedPhone();
    if (!formattedPhone) {
      toast.error('No mobile number found. Please add one in your Profile first.');
      return;
    }

    setSendingOtp(true);
    try {
      if (window.recaptchaVerifierRecruiter) {
        try { window.recaptchaVerifierRecruiter.clear(); } catch(e) {}
        window.recaptchaVerifierRecruiter = null;
      }

      window.recaptchaVerifierRecruiter = new RecaptchaVerifier(
        auth,
        'recaptcha-container-recruiter',
        {
          size: 'invisible',
          callback: () => {},
          'expired-callback': () => {
            window.recaptchaVerifierRecruiter = null;
          }
        }
      );

      const appVerifier = window.recaptchaVerifierRecruiter;
      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(result);
      setOtp('');
      setWithdrawalStep('verify');
      setResendTimer(60);
      toast.success('Verification code sent to your registered phone number.');
    } catch (err) {
      console.error('Firebase OTP Send Error:', err);
      toast.error(err.message || 'Failed to send OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP code.');
      return;
    }
    setSubmittingWithdraw(true);
    try {
      if (confirmationResult) {
        await confirmationResult.confirm(otp);
        setIsPhoneVerified(true);
        setWithdrawalStep('details');
        toast.success('Phone verified successfully!');
      } else {
        toast.error('No pending OTP request found.');
      }
    } catch (err) {
      toast.error('Invalid OTP. Please try again.');
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  const handleWithdrawSubmit = async (e) => {
    if (e) e.preventDefault();
    const numericAmount = Number(amount);
    
    if (!numericAmount || numericAmount <= 0 || !Number.isInteger(numericAmount)) {
      toast.error('Please enter a valid positive integer withdrawal amount');
      return;
    }

    if (numericAmount < 500) {
      toast.error('Minimum withdrawal amount is ₹500');
      return;
    }

    if (numericAmount > (summary?.referralWalletBalance || 0)) {
      toast.error('Insufficient available balance');
      return;
    }

    if (!isPhoneVerified) {
      await handleSendOtp();
      return;
    }

    setSubmittingWithdraw(true);
    try {
      await referralAPI.requestWithdrawal({
        amount: numericAmount,
        method: payoutMethod,
      });

      toast.success('Withdrawal request submitted successfully!');
      setShowWithdrawModal(false);
      setAmount('');
      setIsPhoneVerified(false);
      setWithdrawalStep('details');
      await fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to submit withdrawal request');
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  const saveBankDetails = async () => {
    setSubmittingWithdraw(true);
    try {
      await referralAPI.updatePaymentMethods(bankDetails);
      toast.success('Payout details saved securely.');
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save payout details');
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-[#F8FAFF] min-h-screen">
      {/* Top Banner and Quick Actions */}
      <div className="relative overflow-hidden bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 mb-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />{t("Live Ledger Status")}</div>
            <h1 className="text-3xl font-extrabold tracking-tight">{t("Financial Center")}</h1>
            <p className="text-slate-400 mt-1 max-w-lg text-sm">{t(
              "Manage subscription costs, referral commissions, cashbacks, and request secure bank payouts."
            )}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                if ((summary?.referralWalletBalance || 0) < 500) {
                  toast.error('Minimum balance required for withdrawal is ₹500');
                } else {
                  setShowWithdrawModal(true);
                }
              }}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-extrabold tracking-wide uppercase shadow-lg shadow-emerald-600/15 hover:shadow-emerald-600/25 transition-all flex items-center gap-2"
            >
              <Wallet className="w-4 h-4 text-indigo-200" />{t("Request Payout")}</button>
          </div>
        </div>
      </div>
      {/* Wallet Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-8">
        {[
          { label: 'Referral Balance', value: summary?.referralWalletBalance || 0, color: 'from-purple-600 to-violet-600', icon: Wallet, desc: 'Earnings from user invitation commissions' },
          { label: 'Task Wallet Balance', value: summary?.walletBalance || 0, color: 'from-emerald-600 to-teal-600', icon: CheckCircle, desc: 'Provider profile available task earnings' },
          { label: 'Promo Cashback', value: summary?.cashbackBalance || 0, color: 'from-teal-500 to-emerald-500', icon: Sparkles, desc: 'Verified email/phone signup cashback reward' },
          { label: 'Total Commissions', value: summary?.totalCommissionEarned || 0, color: 'from-blue-600 to-indigo-600', icon: TrendingUp, desc: 'Cumulative commissions + signups earned' },
          { label: 'Pending Withdrawal', value: summary?.pendingWithdrawal || 0, color: 'from-amber-600 to-orange-600', icon: Clock, desc: 'Requested withdrawals undergoing review' }
        ].map((card, idx) => (
          <div key={idx} className="relative overflow-hidden bg-white border border-slate-100 rounded-3xl p-6 shadow-xs hover:shadow-sm transition-all group flex flex-col justify-between h-full">
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{card.label}</span>
                <div className={`w-8 h-8 rounded-lg bg-linear-to-br ${card.color} text-white flex items-center justify-center shrink-0`}>
                  <card.icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl font-black text-slate-900">₹{card.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-medium">{card.desc}</p>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Ledger & Transactions: 2 Columns */}
        <div className="lg:col-span-2 bg-white rounded-none sm:rounded-3xl border-y sm:border border-slate-100 p-4 sm:p-6 shadow-none sm:shadow-xs -mx-4 sm:mx-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-950 flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600"><DollarSign className="w-5 h-5" /></span>{t("Transaction Ledger")}</h2>
              <p className="text-xs text-slate-400 mt-1">{t(
                "Consolidated view of referral payouts, plan purchases, cashbacks, and commission adjustments"
              )}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold text-slate-400">
                  <th className="py-3 px-2 uppercase">{t("Txn Details")}</th>
                  <th className="py-3 px-2 uppercase">{t("Type")}</th>
                  <th className="py-3 px-2 uppercase">{t("Amount")}</th>
                  <th className="py-3 px-2 uppercase">{t("Status")}</th>
                  <th className="py-3 px-2 uppercase">{t("Date")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {transactions.length > 0 ? (
                  transactions.map(txn => (
                    <tr key={txn._id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-2">
                        <div>
                          <p className="font-semibold text-slate-800">{txn.description}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{t("ID:")}{txn._id}</p>
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        <span className={`px-2 py-0.5 rounded-md font-bold uppercase tracking-wider text-[9px] ${
                          txn.type === 'earning' || txn.type === 'provider_task_earning' ? 'bg-indigo-50 text-indigo-700' :
                          txn.type === 'withdrawal' || txn.type === 'withdrawal_request' ? 'bg-orange-50 text-orange-700' :
                          txn.type === 'commission' || txn.type === 'platform_commission' || txn.type === 'user_referral_commission' || txn.type === 'partner_referral_commission' ? 'bg-red-50 text-red-700' :
                          txn.type === 'signup_cashback' ? 'bg-emerald-50 text-emerald-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {txn.type ? txn.type.replace(/_/g, ' ') : ''}
                        </span>
                      </td>
                      <td className="py-4 px-2 font-mono font-bold text-slate-900">
                        {txn.direction === 'credit' ? '+' : '-'}₹{txn.amount.toFixed(2)}
                      </td>
                      <td className="py-4 px-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold uppercase text-[9px] ${
                          txn.status === 'credited' || txn.status === 'approved' || txn.status === 'completed' || txn.status === 'success' || txn.status === 'processed' ? 'bg-emerald-50 text-emerald-700' :
                          txn.status === 'debited' ? 'bg-slate-100 text-slate-700' :
                          txn.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            txn.status === 'credited' || txn.status === 'approved' || txn.status === 'completed' || txn.status === 'success' || txn.status === 'processed' ? 'bg-emerald-500' :
                            txn.status === 'debited' ? 'bg-slate-500' :
                            txn.status === 'pending' ? 'bg-amber-500' :
                            'bg-red-500'
                          }`} />
                          {txn.status}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-slate-400">
                        {new Date(txn.createdAt).toLocaleDateString()} {new Date(txn.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <Info className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <p className="text-xs font-semibold">{t("No wallet transactions found.")}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payout & Withdrawal Settings panel */}
        <div className="space-y-6">
          <div className="bg-white rounded-none sm:rounded-3xl border-y sm:border border-slate-100 p-4 sm:p-6 shadow-none sm:shadow-xs -mx-4 sm:mx-0">
            <h3 className="text-lg font-bold mb-4 text-slate-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-600" />{t("Payout Settings")}</h3>
            
            <div className="space-y-4 text-xs">
              <div className="flex bg-slate-100 p-1 rounded-xl w-fit mb-4">
                <button
                  type="button"
                  onClick={() => setPayoutMethod('bank')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${payoutMethod === 'bank' ? 'bg-white shadow text-indigo-600 font-bold' : 'text-gray-700 hover:text-gray-900'}`}
                >{t("Bank")}</button>
                <button
                  type="button"
                  onClick={() => setPayoutMethod('upi')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${payoutMethod === 'upi' ? 'bg-white shadow text-indigo-600 font-bold' : 'text-gray-700 hover:text-gray-900'}`}
                >{t("UPI")}</button>
              </div>

              {payoutMethod === 'bank' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">{t("Account Holder Name")}</label>
                    <input
                      type="text"
                      placeholder={t("Account Holder Name")}
                      value={bankDetails.accountHolderName}
                      onChange={(e) => setBankDetails({ ...bankDetails, accountHolderName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-hidden focus:border-indigo-500 transition font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">{t("Account Number")}</label>
                    <input
                      type="text"
                      placeholder={t("Account Number")}
                      value={bankDetails.accountNumber}
                      onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-hidden focus:border-indigo-500 transition font-medium"
                    />
                  </div>
                </div>
              )}

              {payoutMethod === 'upi' && (
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">{t("UPI ID")}</label>
                  <input
                    type="text"
                    placeholder={t("UPI ID (e.g. name@bank)")}
                    value={bankDetails.upiId}
                    onChange={(e) => setBankDetails({ ...bankDetails, upiId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-hidden focus:border-indigo-500 transition font-medium"
                  />
                </div>
              )}

              <button
                onClick={saveBankDetails}
                disabled={submittingWithdraw}
                className="w-full mt-4 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition disabled:opacity-50 text-xs"
              >{t("Save Payout Details")}</button>
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-none sm:rounded-3xl p-4 sm:p-6 border-y sm:border border-slate-800 shadow-none sm:shadow-lg -mx-4 sm:mx-0">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-indigo-400">
              <Info className="w-4 h-4 text-indigo-400" />{t("Withdrawal Rules")}</h3>
            <div className="space-y-3 text-[11px]">
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">{t("Minimum Payout Threshold")}</span>
                <span className="font-bold text-slate-200">₹500</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">{t("Processing Time")}</span>
                <span className="font-bold text-slate-200">{t("24 - 48 Hours")}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">{t("Verification")}</span>
                <span className="font-bold text-slate-200">{t("Secure Phone OTP")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* WITHDRAW MONEY MODAL */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 animate-scaleUp">
            <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
              <span className="p-1 rounded bg-indigo-50 text-indigo-600">
                <Wallet className="w-5 h-5" />
              </span>
              {withdrawalStep === 'details' ? 'Submit Withdrawal Request' : 'Phone Verification'}
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              {withdrawalStep === 'details' 
                ? 'Enter the amount you would like to withdraw from your referral balance.'
                : 'A secure 6-digit one-time passcode has been sent to protect your withdrawal request.'}
            </p>

            {withdrawalStep === 'details' ? (
              <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">{t("Withdrawal Amount")}</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 font-bold">₹</span>
                    <input
                      type="number"
                      min={500}
                      max={summary?.referralWalletBalance}
                      step="1"
                      required
                      value={amount}
                      onKeyDown={(e) => {
                        if (['e', 'E', '+', '-', '.'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      onChange={e => {
                        const val = e.target.value;
                        const sanitized = val.replace(/\D/g, '');
                        setAmount(sanitized);
                      }}
                      placeholder={t("e.g. 500")}
                      className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-base font-bold focus:outline-hidden focus:border-indigo-500 transition"
                    />
                  </div>
                  <div className="flex justify-between items-center mt-1 text-[10px]">
                    <span className="text-slate-400">{t("Available:")}<strong className="text-slate-600">₹{summary?.referralWalletBalance}</strong></span>
                    <button 
                      type="button" 
                      onClick={() => setAmount(String(summary?.referralWalletBalance))}
                      className="text-indigo-600 hover:underline font-bold"
                    >{t("Withdraw Maximum")}</button>
                  </div>
                </div>

                <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-xs space-y-1">
                  <p className="font-bold text-indigo-900 uppercase tracking-wide text-[9px] mb-1">{t("Payout Destination Details")}</p>
                  {payoutMethod === 'bank' ? (
                    <>
                      <p className="font-bold text-slate-800">{bankDetails.accountHolderName || 'No Name Set'}</p>
                      <p className="text-slate-600">{t("Bank ending in")}{bankDetails.accountNumber ? `••• ${bankDetails.accountNumber.slice(-4)}` : 'N/A'}</p>
                    </>
                  ) : (
                    <p className="text-slate-800 font-semibold">{bankDetails.upiId || 'No UPI ID Set'}</p>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowWithdrawModal(false)}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                  >{t("Cancel")}</button>
                  <button
                    type="submit"
                    disabled={sendingOtp || !amount || Number(amount) < 500}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {sendingOtp ? 'Sending OTP...' : 'Confirm Payout'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="text-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <p className="text-xs text-slate-500">{t(
                    "Please enter the 6-digit verification code sent to your registered phone number:"
                  )}</p>
                  <p className="text-sm font-extrabold text-slate-800 mt-1">
                    {userPhone ? `+91 ******${userPhone.replace(/\D/g, "").slice(-4)}` : ''}
                  </p>
                </div>

                <input
                  type="text"
                  placeholder={t("Enter 6-digit OTP")}
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center text-xl font-bold border border-slate-200 rounded-xl py-2 outline-hidden transition focus:border-indigo-500 bg-slate-50"
                />

                <div className="text-center text-xs">
                  {resendTimer > 0 ? (
                    <span className="text-slate-400">{t("Resend code in")}<strong className="text-slate-600">{resendTimer}{t("s")}</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={sendingOtp}
                      className="text-indigo-600 hover:underline font-bold"
                    >{t("Resend Verification Code")}</button>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setWithdrawalStep('details');
                      setOtp('');
                    }}
                    disabled={submittingWithdraw}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                  >{t("Back")}</button>
                  <button
                    type="submit"
                    disabled={submittingWithdraw || otp.length !== 6}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {submittingWithdraw ? 'Verifying...' : 'Verify OTP'}
                    <CheckCircle className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      <div id="recaptcha-container-recruiter"></div>
    </div>
  );
};

export default Transactions;