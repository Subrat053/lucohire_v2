import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { providerWalletAPI, walletAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { 
  HiCurrencyRupee, HiArrowUp, HiArrowDown, HiClock, HiCheckCircle, HiExclamationCircle, 
  HiInformationCircle, HiPlusCircle, HiArrowRight, HiDocumentReport, HiOutlineSparkles, HiCog 
} from 'react-icons/hi';
import useTranslation from '../../hooks/useTranslation';
import RouteLoader from '../../components/common/RouteLoader';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../../config/firebase';


const Wallet = () => {
  const { t } = useTranslation();
  
  const [wallet, setWallet] = useState(null);
  const [payoutMethods, setPayoutMethods] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [config, setConfig] = useState({ minWithdrawalAmount: 500, fixedWithdrawalFee: 0 });
  const [loading, setLoading] = useState(true);
  
  // Withdrawal Form Modal States
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [selectedPayoutMethodId, setSelectedPayoutMethodId] = useState('');
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  // OTP Withdrawal verification states
  const [withdrawalStep, setWithdrawalStep] = useState('details'); // 'details' or 'verify'
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [providerPhone, setProviderPhone] = useState('');

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

  const handleOtpBox = (idx, e) => {
    const digit = e.target.value.replace(/\D/g, '').slice(-1);
    const arr = otp.padEnd(6, ' ').split('');
    arr[idx] = digit || ' ';
    const newOtp = arr.join('').trimEnd();
    setOtp(newOtp);

    if (digit && idx < 5) {
      setTimeout(() => otpRefs.current[idx + 1]?.focus(), 0);
    }
  };

  const handleOtpKey = (idx, e) => {
    if (e.key === 'Backspace') {
      const arr = otp.padEnd(6, ' ').split('');
      if (arr[idx] && arr[idx] !== ' ') {
        arr[idx] = ' ';
        setOtp(arr.join('').trimEnd());
      } else if (idx > 0) {
        arr[idx - 1] = ' ';
        setOtp(arr.join('').trimEnd());
        setTimeout(() => otpRefs.current[idx - 1]?.focus(), 0);
      }
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedOtp = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, 6);
    setOtp(pastedOtp);
    setTimeout(() => otpRefs.current[Math.min(pastedOtp.length, 5)]?.focus(), 0);
  };

  useEffect(() => {
    fetchWalletData();
    
    // 30 seconds polling interval
    const pollingInterval = setInterval(() => {
      fetchWalletData(true);
    }, 30000);
    return () => clearInterval(pollingInterval);
  }, []);

  const fetchWalletData = async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      const [walletRes, summaryRes, txnsRes] = await Promise.all([
        providerWalletAPI.getWallet(),
        walletAPI.getSummary(),
        walletAPI.getTransactions()
      ]);

      const walletData = walletRes.data;
      const summaryData = summaryRes.data.data;
      const txnsData = txnsRes.data.data;

      setWallet({
        totalEarnings: walletData.wallet?.totalEarnings || 0,
        availableBalance: summaryData.walletBalance || 0,
        pendingBalance: summaryData.pendingWithdrawal || 0,
        withdrawnAmount: summaryData.totalWithdrawn || 0,
        commissionDeducted: walletData.wallet?.commissionDeducted || 0,
        referralBalance: summaryData.referralWalletBalance || 0,
        cashbackBalance: summaryData.cashbackBalance || 0
      });

      setPayoutMethods(walletData.payoutMethods || []);
      setTransactions(txnsData || []);
      setConfig(walletData.config || { minWithdrawalAmount: 500, fixedWithdrawalFee: 0 });
      setProviderPhone(walletData.user?.phone || '');
      
      // Auto-select default payout method
      const defaultMethod = walletData.payoutMethods?.find(m => m.isDefault);
      if (defaultMethod) {
        setSelectedPayoutMethodId(defaultMethod._id);
      } else if (walletData.payoutMethods?.length > 0) {
        setSelectedPayoutMethodId(walletData.payoutMethods[0]._id);
      }
    } catch (err) {
      if (!quiet) {
        toast.error(err?.response?.data?.message || t('wallet.loadFail', 'Failed to load wallet dashboard'));
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  const getFormattedPhone = () => {
    if (!providerPhone) return '';
    const cleanPhone = providerPhone.replace(/\D/g, "");
    if (providerPhone.startsWith("+")) {
      return providerPhone;
    }
    if (cleanPhone.length === 10) {
      return `+91${cleanPhone}`;
    }
    if (cleanPhone.startsWith("91") && cleanPhone.length === 12) {
      return `+${cleanPhone}`;
    }
    return `+91${cleanPhone}`;
  };

  const handleSendOtp = async () => {
    const formattedPhone = getFormattedPhone();
    if (!formattedPhone) {
      toast.error(t('wallet.noPhoneError', 'No mobile number found. Please add one in your Profile first.'));
      return;
    }

    setSendingOtp(true);
    try {
      if (window.recaptchaVerifierWithdraw) {
        try { window.recaptchaVerifierWithdraw.clear(); } catch(e) {}
        window.recaptchaVerifierWithdraw = null;
      }

      window.recaptchaVerifierWithdraw = new RecaptchaVerifier(
        auth,
        'recaptcha-container-withdraw',
        {
          size: 'invisible',
          callback: () => {},
          'expired-callback': () => {
            window.recaptchaVerifierWithdraw = null;
          }
        }
      );

      const appVerifier = window.recaptchaVerifierWithdraw;
      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(result);
      setOtp('');
      setWithdrawalStep('verify');
      setResendTimer(60);
      toast.success(t('wallet.otpSentSuccess', 'Verification code sent to your registered phone number.'));
    } catch (err) {
      console.error('Firebase OTP Send Error:', err);
      // Clear firebase verifier
      if (window.recaptchaVerifierWithdraw) {
        try { window.recaptchaVerifierWithdraw.clear(); } catch(e) {}
        window.recaptchaVerifierWithdraw = null;
      }
      // Fallback: request server-side OTP
      try {
        const clean = formattedPhone.replace(/\D/g, '');
        await providerWalletAPI.sendOtpForPayout({ phone: clean });
        setConfirmationResult(null);
        setOtp('');
        setWithdrawalStep('verify');
        setResendTimer(60);
        toast.success(t('wallet.otpSentSuccess', 'Verification code sent to your registered phone number.'));
      } catch (sendErr) {
        console.error('Server OTP send failed', sendErr);
        toast.error(err.message || t('wallet.otpSendFail', 'Failed to send verification code. Please try again.'));
      }
    } finally {
      setSendingOtp(false);
    }
  };

  const handleWithdrawSubmit = async (e) => {
    if (e) e.preventDefault();
    const numericAmount = Number(amount);
    
    if (!numericAmount || numericAmount <= 0 || !Number.isInteger(numericAmount)) {
      toast.error(t('wallet.invalidAmount', 'Please enter a valid positive integer withdrawal amount'));
      return;
    }

    if (numericAmount < config.minWithdrawalAmount) {
      toast.error(`${t('wallet.minLimitError', 'Minimum withdrawal amount is')} ₹${config.minWithdrawalAmount}`);
      return;
    }

    if (numericAmount > (wallet?.availableBalance || 0)) {
      toast.error(t('wallet.insufficient', 'Insufficient available balance'));
      return;
    }

    if (!selectedPayoutMethodId) {
      toast.error(t('wallet.selectPayout', 'Please select a payout method'));
      return;
    }

    if (withdrawalStep === 'details') {
      await handleSendOtp();
      return;
    }

    const cleanOtp = otp.replace(/\s/g, "");
    if (cleanOtp.length !== 6) {
      toast.error(t('wallet.enter6DigitOtp', 'Please enter the 6-digit verification code.'));
      return;
    }

    if (!confirmationResult) {
      toast.error(t('wallet.sendOtpFirst', 'Please request verification code first.'));
      return;
    }

    try {
      setSubmittingWithdraw(true);
      // If we have a Firebase confirmation flow, use it to obtain token
      if (confirmationResult) {
        const result = await confirmationResult.confirm(cleanOtp);
        const firebaseToken = await result.user.getIdToken(true);

        const { data } = await providerWalletAPI.requestWithdrawal({
          amount: numericAmount,
          payoutMethodId: selectedPayoutMethodId,
          firebaseToken
        });

        toast.success(t('wallet.withdrawSuccess', 'Withdrawal request submitted successfully!'));
      } else {
        // Server-side OTP fallback
        const cleanPhone = providerPhone.replace(/\D/g, '');
        const { data } = await providerWalletAPI.requestWithdrawal({
          amount: numericAmount,
          payoutMethodId: selectedPayoutMethodId,
          otp: cleanOtp,
          otpPhone: cleanPhone
        });
        toast.success(t('wallet.withdrawSuccess', 'Withdrawal request submitted successfully!'));
      }

      setShowWithdrawModal(false);
      setAmount('');
      setOtp('');
      setConfirmationResult(null);
      setWithdrawalStep('details');
      await fetchWalletData();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || t('wallet.withdrawFail', 'Failed to submit withdrawal request'));
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  if (loading) {
    return <RouteLoader />;
  }

  const defaultMethod = payoutMethods.find(m => m._id === selectedPayoutMethodId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Banner and Quick Actions */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-8 mb-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-3">
              <HiOutlineSparkles className="w-3.5 h-3.5" />
              {t('wallet.liveStatus', 'Wallet & Balance')}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">{t('wallet.title', 'Earnings Ledger')}</h1>
            <p className="text-slate-400 mt-1 max-w-lg text-sm">
              {t('wallet.subtitle', 'Track your income share, platform fees, and withdrawal histories securely.')}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link 
              to="/provider/payout-settings" 
              className="px-5 py-3 bg-emerald-950 text-white hover:bg-emerald-900 rounded-2xl text-xs font-extrabold tracking-wide uppercase transition-all flex items-center gap-2"
            >
              <HiCog className="w-4 h-4 text-slate-400" />
              {t('wallet.managePayouts', 'Payout Methods')}
            </Link>
            <button
              onClick={() => {
                if (payoutMethods.length === 0) {
                  toast.error(t('wallet.addPayoutFirst', 'Please add a Payout Method first!'));
                } else {
                  setShowWithdrawModal(true);
                }
              }}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-extrabold tracking-wide uppercase shadow-lg shadow-emerald-600/15 hover:shadow-emerald-600/25 transition-all flex items-center gap-2"
            >
              <HiCurrencyRupee className="w-5 h-5 text-emerald-200" />
              {t('wallet.withdrawBtn', 'Withdraw Money')}
            </button>
          </div>
        </div>
      </div>
      {/* Wallet Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-6 mb-8">
        {[
          { label: t('wallet.totalEarnings', 'Total Earnings'), value: wallet?.totalEarnings || 0, color: 'from-teal-600 to-emerald-600', icon: HiArrowUp, desc: t('wallet.totalEarnedDesc', 'Provider earnings credited') },
          { label: t('wallet.availableBalance', 'Available Balance'), value: wallet?.availableBalance || 0, color: 'from-emerald-600 to-teal-600', icon: HiCheckCircle, desc: t('wallet.availDesc', 'Ready to withdraw instantly') },
          { label: t('wallet.pendingBalance', 'Pending Balance'), value: wallet?.pendingBalance || 0, color: 'from-amber-600 to-orange-600', icon: HiClock, desc: t('wallet.pendingDesc', 'Locked in withdrawal process') },
          { label: t('wallet.withdrawnAmount', 'Withdrawn Amount'), value: wallet?.withdrawnAmount || 0, color: 'from-slate-600 to-slate-800', icon: HiArrowDown, desc: t('wallet.withdrawnDesc', 'Successfully paid out') },
          { label: t('wallet.feesDeducted', 'Commission Paid'), value: wallet?.commissionDeducted || 0, color: 'from-rose-600 to-red-700', icon: HiExclamationCircle, desc: t('wallet.feeDesc', 'Platform commission share') },
          { label: t('wallet.referralBalance', 'Referral Balance'), value: wallet?.referralBalance || 0, color: 'from-teal-600 to-emerald-600', icon: HiPlusCircle, desc: t('wallet.referralDesc', 'Earnings from referral commission') },
          { label: t('wallet.cashbackBalance', 'Promo Cashback'), value: wallet?.cashbackBalance || 0, color: 'from-teal-500 to-emerald-500', icon: HiOutlineSparkles, desc: t('wallet.cashbackDesc', 'Verified signup cashback reward') }
        ].map((card, idx) => (
          <div key={idx} className="relative overflow-hidden bg-white border border-slate-100 rounded-3xl p-6 shadow-xs hover:shadow-sm transition-all group flex flex-col justify-between h-full">
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{card.label}</span>
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${card.color} text-white flex items-center justify-center shrink-0`}>
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
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-950 flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600"><HiDocumentReport className="w-5 h-5" /></span>
                {t('wallet.transactionsHeader', 'Transaction Ledger')}
              </h2>
              <p className="text-xs text-slate-400 mt-1">{t('wallet.transactionsDesc', 'List of all system updates, earning splits, and withdrawal processing logs')}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold text-slate-400">
                  <th className="py-3 px-2 uppercase">{t('wallet.txnId', 'Txn Details')}</th>
                  <th className="py-3 px-2 uppercase hidden sm:table-cell">{t('wallet.txnType', 'Type')}</th>
                  <th className="py-3 px-2 uppercase">{t('wallet.txnAmount', 'Amount')}</th>
                  <th className="py-3 px-2 uppercase">{t('wallet.txnStatus', 'Status')}</th>
                  <th className="py-3 px-2 uppercase hidden sm:table-cell">{t('wallet.txnDate', 'Date')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {transactions.length > 0 ? (
                  transactions.map(txn => (
                    <tr key={txn._id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-2">
                        <div>
                          <p className="font-semibold text-slate-800">{txn.description}</p>
                          <div className="sm:hidden flex flex-col gap-1 mt-1">
                            <span className="text-[10px] text-slate-500 font-medium capitalize">{txn.type ? txn.type.replace(/_/g, ' ') : ''}</span>
                            <span className="text-[10px] text-slate-400">{new Date(txn.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5 hidden sm:block">{t("ID:")}{txn._id}</p>
                        </div>
                      </td>
                      <td className="py-4 px-2 hidden sm:table-cell">
                        <span className={`px-2 py-0.5 rounded-md font-bold uppercase tracking-wider text-[9px] ${
                          txn.type === 'earning' || txn.type === 'provider_task_earning' ? 'bg-emerald-50 text-emerald-700' :
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
                      <td className="py-4 px-2 text-slate-400 hidden sm:table-cell">
                        {new Date(txn.createdAt).toLocaleDateString()} {new Date(txn.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <HiInformationCircle className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <p className="text-xs font-semibold">{t('wallet.noTxn', 'No wallet transactions found.')}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dynamic withdrawal limits card */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-lg">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-emerald-400">
              <HiInformationCircle className="w-5 h-5 text-emerald-400" />
              {t('wallet.rulesHeader', 'Withdrawal Rules')}
            </h3>
            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-slate-400">{t('wallet.minLimit', 'Minimum Payout Threshold')}</span>
                <span className="font-bold text-slate-200">₹{config.minWithdrawalAmount}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-slate-400">{t('wallet.withdrawalFee', 'Fixed Payout Fee')}</span>
                <span className="font-bold text-slate-200">
                  {config.fixedWithdrawalFee > 0 ? `₹${config.fixedWithdrawalFee}` : t('wallet.freeFee', '₹0.00 (Free)')}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-400">{t('wallet.processingDuration', 'Admin Review Window')}</span>
                <span className="font-bold text-slate-200">{t('wallet.reviewTime', '24 - 48 Hours')}</span>
              </div>
            </div>

            <div className="mt-6 p-3 bg-white/5 rounded-2xl border border-white/10">
              <p className="text-[10px] text-slate-400 leading-relaxed">
                <strong>{t('wallet.notefromadmin', 'Note:')}</strong> {t('wallet.rulesDesc', 'Ensure that at least one payout method has been registered and verified with an OTP under Payout Settings. Unverified attempts are blocked.')}
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* WITHDRAW MONEY MODAL */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 animate-scaleUp">
            <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
              <span className="p-1 rounded bg-emerald-50 text-emerald-600">
                <HiCurrencyRupee className="w-5 h-5" />
              </span>
              {withdrawalStep === 'details' ? t('wallet.withdrawalRequest', 'Submit Withdrawal') : t('wallet.otpVerification', 'Enter Security Code')}
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              {withdrawalStep === 'details' 
                ? t('wallet.withdrawPrompt', 'Enter the amount you would like to transfer. This amount will be locked until the request is paid.')
                : t('wallet.withdrawOtpPrompt', 'A secure 6-digit one-time passcode has been sent to protect your withdrawal request.')}
            </p>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              {withdrawalStep === 'details' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">{t('wallet.withdrawAmountLabel', 'Withdrawal Amount')}</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 font-bold">₹</span>
                      <input
                        type="number"
                        min={config.minWithdrawalAmount}
                        max={wallet?.availableBalance}
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
                        placeholder={`e.g. ${config.minWithdrawalAmount}`}
                        className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-base font-bold focus:outline-hidden focus:border-emerald-500 transition"
                      />
                    </div>
                    <div className="flex justify-between items-center mt-1 text-[10px]">
                      <span className="text-slate-400">{t('wallet.availLimit', 'Available:')} <strong className="text-slate-600">₹{wallet?.availableBalance}</strong></span>
                      <button 
                        type="button" 
                        onClick={() => setAmount(String(wallet?.availableBalance))}
                        className="text-emerald-600 hover:underline font-bold"
                      >
                        {t('wallet.maxBtn', 'Withdraw Maximum')}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">{t('wallet.selectPayoutLabel', 'Select Payout Destination')}</label>
                    <select
                      required
                      value={selectedPayoutMethodId}
                      onChange={e => setSelectedPayoutMethodId(e.target.value)}
                      className="w-full px-3 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold focus:outline-hidden focus:border-emerald-500 transition"
                    >
                      <option value="" disabled>{t('wallet.selectOne', 'Choose saved payout method')}</option>
                      {payoutMethods.map(m => (
                        <option key={m._id} value={m._id}>
                          {m.type === 'bank' ? `${m.bankDetails?.bankName} (••• ${m.bankDetails?.accountNumber?.slice(-4)})` : m.type === 'upi' ? `UPI - ${m.upiId}` : `QR Code - ${m.providerName || 'Online'}`} {m.isDefault ? ' (Default)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {defaultMethod && (
                    <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100 text-xs space-y-1">
                      <p className="font-bold text-emerald-900 uppercase tracking-wide text-[9px] mb-1">{t('wallet.methodPreview', 'Payout Destination Summary')}</p>
                      {defaultMethod.type === 'bank' && (
                        <>
                          <p className="font-bold text-slate-800">{defaultMethod.bankDetails?.accountHolderName}</p>
                          <p className="text-slate-600">{defaultMethod.bankDetails?.bankName}{t("• Account ending in")}{defaultMethod.bankDetails?.accountNumber?.slice(-4)}</p>
                        </>
                      )}
                      {defaultMethod.type === 'upi' && <p className="text-slate-800 font-semibold">{defaultMethod.upiId}</p>}
                      {defaultMethod.type === 'qr' && <p className="text-slate-800 font-semibold">{t("QR Code")}{defaultMethod.providerName ? `(${defaultMethod.providerName})` : ''}</p>}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowWithdrawModal(false)}
                      className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                    >
                      {t('common.cancel', 'Cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={sendingOtp || !amount || Number(amount) < config.minWithdrawalAmount}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {sendingOtp ? t('wallet.sendingOtp', 'Sending OTP...') : t('wallet.confirmWithdraw', 'Confirm Payout')}
                      <HiArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="text-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <p className="text-xs text-slate-500">
                      {t('wallet.enterOtpSentTo', 'Please enter the 6-digit verification code sent to your registered phone number:')}
                    </p>
                    <p className="text-sm font-extrabold text-slate-800 mt-1">
                      {providerPhone ? `+91 ******${providerPhone.replace(/\D/g, "").slice(-4)}` : ''}
                    </p>
                  </div>

                  <div className="flex gap-2.5 justify-center py-2" onPaste={handleOtpPaste}>
                    {[0, 1, 2, 3, 4, 5].map((idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpRefs.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={otp[idx] && otp[idx] !== " " ? otp[idx] : ""}
                        onChange={(e) => handleOtpBox(idx, e)}
                        onKeyDown={(e) => handleOtpKey(idx, e)}
                        disabled={submittingWithdraw}
                        className="w-10 h-12 text-center text-xl font-bold border border-slate-200 rounded-xl outline-hidden transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-slate-50 focus:bg-white disabled:opacity-50"
                      />
                    ))}
                  </div>

                  <div className="text-center text-xs">
                    {resendTimer > 0 ? (
                      <span className="text-slate-400">
                        {t('wallet.resendIn', 'Resend code in')} <strong className="text-slate-600">{resendTimer}{t("s")}</strong>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={sendingOtp}
                        className="text-emerald-600 hover:underline font-bold"
                      >
                        {t('wallet.resendCode', 'Resend Verification Code')}
                      </button>
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
                    >
                      {t('common.back', 'Back')}
                    </button>
                    <button
                      type="submit"
                      disabled={submittingWithdraw || otp.replace(/\s/g, "").length !== 6}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {submittingWithdraw ? t('wallet.submitting', 'Submitting...') : t('wallet.verifyAndWithdraw', 'Verify & Withdraw')}
                      <HiCheckCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
      <div id="recaptcha-container-withdraw"></div>
    </div>
  );
};

export default Wallet;
