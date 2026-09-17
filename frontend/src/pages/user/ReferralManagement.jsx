import React, { useState, useEffect } from "react";
import { referralAPI, walletAPI } from "../../services/api";
import { toast } from "react-hot-toast";
import {
  Users,
  Copy,
  Check,
  TrendingUp,
  Wallet,
  Clock,
  UserPlus,
  Share2,
  ChevronRight,
  ArrowUpRight,
  Building2,
  Phone,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import { auth } from "../../config/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { useAuth } from "../../context/AuthContext";

const ReferralManagement = () => {
  const { user } = useAuth();
  const activeRole = user?.activeRole || user?.role;
  const isProvider = activeRole === "provider";

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [copied, setCopied] = useState(false);

  // Withdrawal State
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("bank");
  const [bankDetails, setBankDetails] = useState({
    accountHolderName: "",
    accountNumber: "",
    upiId: "",
  });

  // Firebase Auth State
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [statsRes, summaryRes, txnsRes] = await Promise.all([
        referralAPI.getMyStats(),
        walletAPI.getSummary(),
        walletAPI.getTransactions()
      ]);

      const statsData = statsRes.data;
      const summaryData = summaryRes.data.data;
      const txnsData = txnsRes.data.data;

      const mergedStats = {
        ...statsData,
        user: {
          ...statsData.user,
          referralWalletBalance: summaryData.referralWalletBalance || 0,
          totalReferralCommission: summaryData.totalCommissionEarned || 0,
        },
        transactions: txnsData || []
      };

      setStats(mergedStats);
      if (statsData?.user?.bankDetails) {
        setBankDetails({
          accountHolderName: statsData.user.bankDetails.accountHolderName || "",
          accountNumber: statsData.user.bankDetails.accountNumber || "",
          upiId: statsData.user.bankDetails.upiId || "",
        });
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching referral stats:", error);
      toast.error("Failed to load referral data");
      setLoading(false);
    }
  };

  const saveBankDetails = async () => {
    setProcessing(true);
    try {
      await referralAPI.updatePaymentMethods(bankDetails);
      toast.success("Bank details saved securely.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save details");
    } finally {
      setProcessing(false);
    }
  };

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        { size: "invisible" },
      );
    }
  };

  const sendOtp = async () => {
    if (!stats?.user?.phone) {
      return toast.error("Please add a phone number in your profile first");
    }
    setProcessing(true);
    try {
      setupRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      const formattedPhone = stats.user.phone.startsWith("+91")
        ? stats.user.phone
        : `+91${stats.user.phone}`;

      const result = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        appVerifier,
      );
      setConfirmationResult(result);
      setOtpSent(true);
      toast.success("OTP sent to your phone");
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to send OTP");
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } finally {
      setProcessing(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) return toast.error("Enter 6-digit OTP");
    setProcessing(true);
    try {
      await confirmationResult.confirm(otp);
      setIsPhoneVerified(true);
      setOtpSent(false);
      toast.success("Phone verified successfully!");
    } catch (error) {
      toast.error("Invalid or expired OTP");
    } finally {
      setProcessing(false);
    }
  };

  const submitWithdrawal = async () => {
    if (!isPhoneVerified) return toast.error("Please verify your phone first");
    const numericAmount = Number(withdrawAmount);
    if (!numericAmount || numericAmount < 500 || !Number.isInteger(numericAmount)) {
      return toast.error("Minimum withdrawal is ₹500 (positive integer)");
    }

    setProcessing(true);
    try {
      await referralAPI.requestWithdrawal({
        amount: Number(withdrawAmount),
        method: payoutMethod,
      });
      toast.success("Withdrawal request submitted successfully");
      setWithdrawAmount("");
      setIsPhoneVerified(false);
      fetchStats(); // Refresh balance
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit request");
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(stats?.user?.referralLink);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferral = () => {
    if (navigator.share) {
      navigator
        .share({
          title: "Join me on ServiceHub!",
          text: `Hey! Use my referral link to join ServiceHub and find top service providers or jobs:`,
          url: stats?.user?.referralLink,
        })
        .catch(console.error);
    } else {
      copyToClipboard();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Refer & Earn</h1>
        <p className="text-gray-700">
          Invite your friends to ServiceHub and earn commission on their first
          subscription.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-10">
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 flex items-center space-x-3 sm:space-x-4">
          <div className="p-2.5 sm:p-3 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-[11px] sm:text-sm text-gray-500 font-medium capitalize sm:uppercase tracking-wide sm:tracking-wider leading-tight sm:leading-normal mb-1 sm:mb-0">
              Total Referrals
            </p>
            <h3 className="text-lg sm:text-2xl font-bold text-gray-900 leading-none">
              {stats?.user?.totalReferrals}
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 flex items-center space-x-3 sm:space-x-4">
          <div className="p-2.5 sm:p-3 bg-green-50 rounded-xl text-green-700 shrink-0">
            <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-[11px] sm:text-sm text-gray-500 font-medium capitalize sm:uppercase tracking-wide sm:tracking-wider leading-tight sm:leading-normal mb-1 sm:mb-0">
              Wallet Balance
            </p>
            <h3 className="text-lg sm:text-2xl font-bold text-gray-900 leading-none">
              ₹{stats?.user?.referralWalletBalance}
            </h3>
          </div>
        </div>

        <div className="col-span-2 md:col-span-1 bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 flex items-center justify-center md:justify-start space-x-3 sm:space-x-4">
          <div className="p-2.5 sm:p-3 bg-teal-50 rounded-xl text-teal-600 shrink-0">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-[11px] sm:text-sm text-gray-500 font-medium capitalize sm:uppercase tracking-wide sm:tracking-wider leading-tight sm:leading-normal mb-1 sm:mb-0">
              Total Earnings
            </p>
            <h3 className="text-lg sm:text-2xl font-bold text-gray-900 leading-none">
              ₹{stats?.user?.totalReferralCommission}
            </h3>
          </div>
        </div>
      </div>

      {/* Referral Link Card */}
      <div className="bg-emerald-600 rounded-3xl p-8 text-white mb-12 relative overflow-hidden shadow-xl">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <Share2 className="mr-2" /> Share your link
          </h2>
          <p className="text-emerald-100 mb-8 max-w-md">
            Earn {stats?.commissionRate || 40}% commission when your referred friends subscribe to any of
            our plans for the first time.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 flex-1 w-full font-mono text-sm break-all">
              {stats?.user?.referralLink}
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={copyToClipboard}
                className="flex-1 sm:flex-none bg-white/20 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/30 transition-colors flex items-center justify-center whitespace-nowrap border border-white/30"
              >
                {copied ? (
                  <Check size={20} className="mr-2" />
                ) : (
                  <Copy size={20} className="mr-2" />
                )}
                {copied ? "Copied" : "Copy Link"}
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between text-sm text-emerald-100 border-t border-white/20 pt-6">
            <div className="flex items-center mb-4 sm:mb-0">
              <span className="mr-2">Your Code:</span>
              <span className="font-bold bg-white/20 px-3 py-1 rounded-lg border border-white/30 tracking-widest">
                {stats?.user?.referralCode}
              </span>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-48 h-48 bg-emerald-400/20 rounded-full blur-3xl"></div>
      </div>

      <div id="recaptcha-container"></div>

      {/* Withdrawal Section */}
      {!isProvider && (
        <div className="bg-white rounded-none sm:rounded-3xl p-4 sm:p-8 shadow-none sm:shadow-sm border-y sm:border border-gray-100 mb-12 -mx-4 sm:mx-0">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <CreditCard className="mr-2 text-emerald-600" /> Withdrawal Settings
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Bank Details Form */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
                1. Payment Details (Encrypted)
              </h3>

              <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
                <button
                  onClick={() => setPayoutMethod("bank")}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${payoutMethod === "bank" ? "bg-white shadow text-emerald-600" : "text-gray-700 hover:text-gray-900"}`}
                >
                  Bank
                </button>
                <button
                  onClick={() => setPayoutMethod("upi")}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${payoutMethod === "upi" ? "bg-white shadow text-emerald-600" : "text-gray-700 hover:text-gray-900"}`}
                >
                  UPI
                </button>
              </div>

              {payoutMethod === "bank" && (
                <>
                  <input
                    type="text"
                    placeholder="Account Holder Name"
                    value={bankDetails.accountHolderName}
                    onChange={(e) =>
                      setBankDetails((d) => ({
                        ...d,
                        accountHolderName: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-gray-50 focus:bg-white transition"
                  />
                  <input
                    type="text"
                    placeholder="Account Number"
                    value={bankDetails.accountNumber}
                    onChange={(e) =>
                      setBankDetails((d) => ({
                        ...d,
                        accountNumber: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-gray-50 focus:bg-white transition"
                  />
                </>
              )}

              {payoutMethod === "upi" && (
                <input
                  type="text"
                  placeholder="UPI ID (e.g. name@bank)"
                  value={bankDetails.upiId}
                  onChange={(e) =>
                    setBankDetails((d) => ({ ...d, upiId: e.target.value }))
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-gray-50 focus:bg-white transition"
                />
              )}

              <button
                onClick={saveBankDetails}
                disabled={processing}
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition disabled:opacity-70"
              >
                Save Payment Details
              </button>
            </div>

            {/* Request Withdrawal Form */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
                2. Request Payout
              </h3>

              <div className="relative">
                <span className="absolute left-4 top-3 text-gray-500 font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  placeholder="Amount (Min. ₹500)"
                  value={withdrawAmount}
                  step="1"
                  onKeyDown={(e) => {
                    if (['e', 'E', '+', '-', '.'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    const sanitized = val.replace(/\D/g, '');
                    setWithdrawAmount(sanitized);
                  }}
                  className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-gray-50 focus:bg-white transition"
                />
              </div>
              <p className="text-xs text-gray-500 text-right">
                Available to withdraw: ₹{stats?.user?.referralWalletBalance}
              </p>

              {/* OTP Verification Block */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                <div className="flex items-start mb-3">
                  <ShieldCheck
                    className="text-emerald-600 mr-2 shrink-0"
                    size={20}
                  />
                  <p className="text-xs text-emerald-900 leading-relaxed">
                    For your security, withdrawals require a one-time password
                    sent to your registered mobile number:{" "}
                    <strong>{stats?.user?.phone || "Not set"}</strong>
                  </p>
                </div>

                {!otpSent && !isPhoneVerified && (
                  <button
                    onClick={sendOtp}
                    disabled={processing}
                    className="w-full py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-70"
                  >
                    Send OTP via SMS
                  </button>
                )}

                {otpSent && !isPhoneVerified && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="6-digit OTP"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="flex-1 px-3 py-2 border border-emerald-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      onClick={verifyOtp}
                      disabled={processing}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-70"
                    >
                      Verify
                    </button>
                  </div>
                )}

                {isPhoneVerified && (
                  <div className="flex items-center text-green-700 text-sm font-bold bg-green-50 px-3 py-2 rounded-lg">
                    <Check size={16} className="mr-1" /> Phone Verified
                    Successfully
                  </div>
                )}
              </div>

              <button
                onClick={submitWithdrawal}
                disabled={processing || !isPhoneVerified || !withdrawAmount}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold hover:from-emerald-700 hover:to-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex justify-center items-center"
              >
                Submit Withdrawal Request
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-none sm:rounded-3xl shadow-none sm:shadow-sm border-y sm:border border-gray-100 overflow-hidden mb-12 -mx-4 sm:mx-0">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">
            Recent Referrals
          </h3>
          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
            {stats?.referrals?.length || 0} Total
          </span>
        </div>
        
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                <th className="p-4 font-semibold">User</th>
                <th className="p-4 font-semibold">Email</th>
                <th className="p-4 font-semibold">Role</th>
                <th className="p-4 font-semibold">Registered</th>
                <th className="p-4 font-semibold">Plan</th>
                <th className="p-4 font-semibold">Activity</th>
                <th className="p-4 font-semibold">Reward Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats?.referrals?.length > 0 ? (
                stats.referrals.map((ref) => (
                  <tr key={ref._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold shrink-0">
                          {ref.referredUserId?.avatar ? (
                            <img
                              src={ref.referredUserId.avatar}
                              alt={ref.referredUserId.name}
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            ref.referredUserId?.name?.charAt(0) || "U"
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">
                            {ref.referredUserId?.name || "Unknown User"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-500 truncate max-w-[200px]">
                        {ref.referredUserId?.email || "No Email"}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className="capitalize text-xs font-medium bg-slate-100 text-slate-700 px-2 py-1 rounded-md">
                        {ref.referredRole || "Unknown"}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock size={12} className="mr-1" />
                        {new Date(ref.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4 text-sm font-medium text-gray-700">
                      {ref.firstSubscriptionId?.planId?.name ? (
                        <span className="text-emerald-600 font-bold">{ref.firstSubscriptionId.planId.name}</span>
                      ) : (
                        <span className="text-gray-400 italic">No Plan</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          ref.status === "subscribed"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {ref.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col items-start">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider mb-1 ${
                            ref.commissionStatus === "paid"
                              ? "bg-green-100 text-green-700"
                              : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {ref.commissionStatus}
                        </span>
                        {ref.commissionAmount > 0 && (
                          <span className="text-xs font-bold text-gray-900">
                            +₹{ref.commissionAmount}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="p-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-50 rounded-full mb-4">
                      <UserPlus className="text-gray-300" size={32} />
                    </div>
                    <p className="text-gray-500">
                      No referrals yet. Share your link to start earning!
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReferralManagement;
