import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import {
  BadgeCheck,
  BadgePercent,
  Building2,
  Check,
  ChevronRight,
  Globe2,
  MapPin,
  SlidersHorizontal,
  Target,
  Wallet,
  AlertTriangle,
  RefreshCw,
  Zap,
  Crown,
  MessageCircle,
  ShieldCheck,
  X,
  Sparkles,
  ArrowRight,
  Clock,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import toast from 'react-hot-toast';
import RouteLoader from '../../components/common/RouteLoader';
import {
  getCurrentSubscription,
  getMyPlan,
  getProviderPlans,
  previewPlan,
  getProviderUsageMetrics,
  purchaseFixedPlan,
  confirmPaymentSuccess,
  cancelSubscription,
  toggleAutoRenew,
} from '../../services/providerPlanService';
import { detectNearestLocation } from '../../utils/location';
import { useAuth } from '../../context/AuthContext';
import useTranslation from '../../hooks/useTranslation';
import GuaranteeModal from '../../components/common/GuaranteeModal';
import { API, providerAPI, providerWalletAPI } from '../../services/api';
import LocationSearch from '../../components/LocationSearch';
import SkillSearchSelect from '../../components/common/SkillSearchSelect';
import { safeReturnPath } from '../../utils/navigation';

const ADDON_SLUGS = ['top-in-city', 'one-pincode-top', 'show-top-in-country', 'add-multiple-skills', 'whatsapp-alerts'];

const DURATION_OPTIONS = Array.from({ length: 12 }, (_, index) => {
  const months = index + 1;
  const discount = { 3: 10, 6: 15, 12: 20 }[months] || 0;
  return {
    months,
    label: `${months} Month${months > 1 ? 's' : ''}`,
    badge: discount ? `Save ${discount}%` : '',
  };
});
const DISCOUNT_BY_MONTHS = { 1: 0, 3: 10, 6: 15, 12: 20 };

const planIconMap = {
  'add-multiple-skills': BadgeCheck,
  'one-pincode-top': Target,
  'top-in-city': Building2,
  'show-top-in-country': Globe2,
  'customise-plan': SlidersHorizontal,
  'whatsapp-alerts': MessageCircle,
};

const coverageLabels = {
  pincode: 'Selected Pincode',
  city: 'Entire City',
  country: 'Entire Country',
  custom: 'Custom Coverage',
};

const formatCurrency = (value, symbol = '₹') => {
  const num = Number(value || 0);
  const formatted = num % 1 === 0 ? num.toLocaleString('en-IN') : num.toFixed(2);
  return `${symbol || '₹'}${formatted}`;
};

const buildLocalPreview = (plan, months) => {
  if (!plan) return null;
  const isAddon = ADDON_SLUGS.includes(plan.slug);
  const effectiveMonths = isAddon ? 1 : months;
  
  const monthlyPrice = Number(plan.priceMonthly || plan.price || 0);
  const discountPercent = DISCOUNT_BY_MONTHS[effectiveMonths] || 0;
  const subtotal = Math.max(0, Math.round(monthlyPrice * effectiveMonths * (1 - discountPercent / 100) * 100) / 100);
  const taxPercent = plan.gstPercent || 0;
  const gstAmount = 0;
  const totalAmount = subtotal;
  return {
    ...plan,
    subtotal,
    gstPercent: taxPercent,
    gstAmount,
    totalAmount,
    currencySymbol: plan.currencySymbol || '₹',
    taxName: plan.taxName || 'GST',
  };
};

const PROVIDER_FEATURES = [
  { key: 'resumeOptimization', label: 'AI Optimize Resume' },
  { key: 'autoAnalysisLimit', label: 'Profile Auto-Analysis' },
  { key: 'careerHealthRefresh', label: 'Refresh Insights' },
  { key: 'interviewQuestionsRefresh', label: 'Interview Questions' },
  { key: 'careerGpsRefresh', label: 'AI Career GPS' },
  { key: 'whyNotHiredRefresh', label: 'Why Not Hired' },
  { key: 'skillGapRefresh', label: 'Skill Gap Report' },
  { key: 'atsOptimizerRefresh', label: 'ATS Optimizer' },
  { key: 'chatMessagesLimit', label: 'Chat Messages Limit' },
  { key: 'dailyTasksRefresh', label: 'Daily Tasks' },
  { key: 'careerPlanRefresh', label: 'Career Plan' },
  { key: 'resourcesRefresh', label: 'Resources' },
  { key: 'progressRefresh', label: 'Progress' },
  { key: 'aiTipsRefresh', label: 'AI Tips Insight' },
  { key: 'resumeScoreRefresh', label: 'Resume Score Refresh' }
];

const ProviderPlans = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const paymentHandledRef = useRef(false);
  const [activeTab, setActiveTab] = useState('plans');
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState(1);
  const [pricingPreview, setPricingPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');
  const [showGuaranteeModal, setShowGuaranteeModal] = useState(false);
  const [isAutoSubscription, setIsAutoSubscription] = useState(true);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [availableAddons, setAvailableAddons] = useState([]);
  const [paymentSuccessData, setPaymentSuccessData] = useState(location.state?.invoiceData || null);
  const isHistoricalInvoice = !!location.state?.invoiceData;
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelConfirmed, setCancelConfirmed] = useState(false);
  const [cancelBankMethod, setCancelBankMethod] = useState(null);
  const [isInvoiceMinimized, setIsInvoiceMinimized] = useState(false);
  const [addonDurations, setAddonDurations] = useState({}); // {addonId: months}
  const [queueModalData, setQueueModalData] = useState(null);
  const [whatsappConsentOpen, setWhatsappConsentOpen] = useState(false);
  const [whatsappConsent1, setWhatsappConsent1] = useState(false);
  const [whatsappConsent2, setWhatsappConsent2] = useState(false);

  const [availableSkills, setAvailableSkills] = useState([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [finalizingPayment, setFinalizingPayment] = useState(false);
  const [usageSummary, setUsageSummary] = useState(null);
  const [activePlanData, setActivePlanData] = useState(null);
  const [providerProfileData, setProviderProfileData] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const returnTo = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return safeReturnPath(
      location.state?.returnTo ||
        params.get('returnTo') ||
        params.get('redirect') ||
        sessionStorage.getItem('paymentReturnTo') ||
        '/provider/dashboard',
    );
  }, [location.search, location.state?.returnTo]);

  useEffect(() => {
    const fetchSkills = async () => {
      setSkillsLoading(true);
      try {
        const { data } = await API.get('/skills');
        if (Array.isArray(data)) {
          const all = data.flatMap(cat => cat.skills || []);
          const names = [...new Set(all.map(s => s.name))].sort();
          setAvailableSkills(names);
        }
      } catch (err) {
        console.warn('Failed to fetch backend skills, using fallbacks:', err);
        setAvailableSkills([
          'Electrician', 'Plumber', 'Carpenter', 'Painter', 'Driver', 'Cook',
          'Welder', 'Mason', 'AC Technician', 'CCTV Installer', 'Tiler',
          'Interior Designer', 'UI/UX Designer', 'Graphic Designer', 'Web Developer',
          'Mobile Developer', 'Content Writer', 'Digital Marketer', 'Accountant',
          'Data Entry Operator', 'Receptionist', 'Security Guard', 'Housekeeping',
          'Nurse', 'Caretaker', 'Tailor', 'Beautician', 'Yoga Trainer', 'Tutor'
        ]);
      } finally {
        setSkillsLoading(false);
      }
    };
    fetchSkills();
  }, []);

  useEffect(() => {
    sessionStorage.setItem('paymentReturnTo', returnTo);
    if (location.state?.source) {
      sessionStorage.setItem('paymentReturnSource', String(location.state.source));
    }
  }, [location.state?.source, returnTo]);
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  useEffect(() => {
    // Empty state cleanup since location is checked at checkout
  }, [selectedPlan, user, profile]);

  useEffect(() => {
    if (location.hash === '#addons') {
      setTimeout(() => {
        document.getElementById('addons-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500);
    }
  }, [location.hash, availableAddons]);

  // =============================================================
  const initials = useMemo(() => {
    const name = user?.name || 'Provider';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [user]);

  const providerName = user?.name || 'Provider';

  const providerLocation =
    user?.providerProfile?.city ||
    user?.profile?.city ||
    user?.city ||
    'Noida, UP';

  const providerSubtitle = `Provider • ${providerLocation}`;
  // ===============================================================

  useEffect(() => {
    const loadPlans = async () => {
      setLoading(true);
      setError('');
      try {
        setHistoryLoading(true);
        const [planList, myPlan, usageMetrics, paymentsRes, profileRes] = await Promise.all([
          getProviderPlans(),
          getMyPlan(),
          getProviderUsageMetrics().catch(() => null),
          providerAPI.getMyPayments().catch(() => null),
          providerAPI.getProfile().catch(() => null)
        ]);
        const filteredPlans = planList.filter(p => {
          const isTopPlan = ADDON_SLUGS.includes(p.slug);
          return !isTopPlan;
        });
        const addons = planList.filter(p =>
          ADDON_SLUGS.includes(p.slug) || (p.slug && p.slug.toLowerCase().includes('whatsapp'))
        );
        setPlans(filteredPlans);
        setAvailableAddons(addons);
        setUsageSummary(usageMetrics);
        setActivePlanData(myPlan);
        if (profileRes?.data) {
          setProviderProfileData(profileRes.data);
        }
        if (paymentsRes?.data) {
          const list = Array.isArray(paymentsRes.data) ? paymentsRes.data : (paymentsRes.data.data || paymentsRes.data.payments || []);
          setPaymentHistory(list);
        }
        if (myPlan?.subscription?.isAutoRenew !== undefined) {
          setIsAutoSubscription(Boolean(myPlan.subscription.isAutoRenew));
        }

        if (myPlan?.subscription?.planId) {
          const existing = planList.find((plan) => String(plan._id) === String(myPlan.subscription.planId));
          if (existing) {
            setSelectedDuration(Number(myPlan.subscription.durationMonths || 1));
          }
        }

      } catch (err) {
        setError('Failed to load plans. Please try again.');
      } finally {
        setLoading(false);
        setHistoryLoading(false);
      }
    };

    loadPlans();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (paymentHandledRef.current) {
      return;
    }

    if (params.get('success') === 'true' && params.get('sub_id')) {
      const subId = params.get('sub_id');
      const sessionId = params.get('session_id');

      const finalizePayment = async () => {
        paymentHandledRef.current = true;
        setFinalizingPayment(true);
        try {
          await confirmPaymentSuccess({
            subscriptionId: subId,
            paymentId: sessionId,
            orderId: 'stripe_session',
          });
          await getCurrentSubscription().catch(() => null);
          const updatedUsage = await getProviderUsageMetrics().catch(() => null);
          if (updatedUsage) setUsageSummary(updatedUsage);
          toast.success('Payment confirmed! Your plan is now active.');
          sessionStorage.removeItem('paymentReturnTo');
          sessionStorage.removeItem('paymentReturnSource');
          navigate(returnTo, {
            replace: true,
            state: {
              paymentSuccess: true,
              refreshSubscription: true,
              source: 'provider-plans',
            },
          });
        } catch (err) {
          toast.error('Failed to confirm payment status.');
        } finally {
          setFinalizingPayment(false);
        }
      };
      finalizePayment();
    } else if (params.get('cancelled') === 'true') {
      paymentHandledRef.current = true;
      toast.error('Payment was cancelled.');
      sessionStorage.removeItem('paymentReturnSource');
      navigate('/provider/plans', { replace: true });
    }
  }, [location.search, navigate, returnTo]);


  useEffect(() => {
    const runPreview = async () => {
      if (!selectedPlan) return;
      try {
        const preview = await previewPlan({
          planId: selectedPlan._id,
          durationMonths: selectedDuration,
          addonIds: selectedAddons,
        });
        setPricingPreview(preview?.pricing || null);
      } catch (_) {
        setPricingPreview(buildLocalPreview(selectedPlan, selectedDuration));
      }
    };

    runPreview();
  }, [selectedPlan, selectedDuration, selectedAddons]);


  const handleCancelPlan = async () => {
    try {
      toast.loading('Checking refund requirements...', { id: 'cancel-sub' });
      const { data } = await providerWalletAPI.getWallet();
      const bankMethod = data?.payoutMethods?.find(m => m.type === 'bank');
      
      if (!bankMethod || !bankMethod.bankDetails || !bankMethod.bankDetails.accountNumber) {
        toast.error('Please add your bank details first to process the refund.', { id: 'cancel-sub' });
        navigate('/provider/payout-settings');
        return;
      }

      toast.dismiss('cancel-sub');
      
      setCancelBankMethod(bankMethod);
      setShowCancelModal(true);
      setCancelConfirmed(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to process request', { id: 'cancel-sub' });
    }
  };

  const proceedCancelPlan = async () => {
    try {
      setShowCancelModal(false);
      toast.loading('Processing cancellation and refund...', { id: 'cancel-sub' });
      await providerAPI.requestRefund({ bankDetails: cancelBankMethod.bankDetails });
      toast.success('Subscription cancelled and refund requested successfully!', { id: 'cancel-sub' });
      
      const myPlan = await getMyPlan().catch(() => null);
      if (myPlan) setActivePlanData(myPlan);
      navigate('/provider/refunds');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to process request', { id: 'cancel-sub' });
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window?.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const processCheckoutResponse = async (checkout, subscription, plan) => {
    if (checkout?.simulationMode) {
      const confirm = window.confirm('Simulation Mode: Click OK to simulate successful payment.');
      if (confirm) {
        const confirmRes = await confirmPaymentSuccess({
          subscriptionId: subscription?._id,
          paymentId: 'sim_' + Date.now(),
          orderId: 'sim_order_' + Date.now(),
        });
        await getMyPlan();
        const updatedUsage = await getProviderUsageMetrics().catch(() => null);
        if (updatedUsage) setUsageSummary(updatedUsage);
        toast.success('Simulation: Payment successful! Plan activated.');
        sessionStorage.removeItem('paymentReturnTo');
        sessionStorage.removeItem('paymentReturnSource');
        
        // Show success UI locally
        setPaymentSuccessData(confirmRes?.subscription || subscription);
        window.scrollTo(0, 0);
        return;
      }
    }

    if (checkout?.paymentRequired && checkout?.paymentProvider === 'razorpay' && checkout?.orderId) {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !window?.Razorpay) {
        toast.error('Razorpay SDK failed to load. Please check your internet connection.');
        return;
      }

      const options = {
        key: checkout.publishableKey || checkout.keyId,
        amount: checkout.amount,
        currency: checkout.currency || 'INR',
        name: 'Lucohire',
        description: plan?.name || 'Subscription',
      };

      if (checkout.isSubscription) {
        options.subscription_id = checkout.orderId;
      } else {
        options.order_id = checkout.orderId;
      }

      options.handler = async (payment) => {
        const confirmRes = await confirmPaymentSuccess({
          subscriptionId: subscription?._id,
          paymentId: payment?.razorpay_payment_id,
          orderId: payment?.razorpay_order_id || checkout.orderId,
          signature: payment?.razorpay_signature,
        });
          await getMyPlan();
          const updatedUsage = await getProviderUsageMetrics().catch(() => null);
          if (updatedUsage) setUsageSummary(updatedUsage);
          toast.success('Payment successful! Plan activated.');
          sessionStorage.removeItem('paymentReturnTo');
          sessionStorage.removeItem('paymentReturnSource');
          
          // Show success UI locally
        setPaymentSuccessData(confirmRes?.subscription || subscription);
        window.scrollTo(0, 0);
        setCheckoutLoading(false);
      }; // Close options.handler

      options.modal = {
        ondismiss: () => {
          setCheckoutLoading(false);
          toast.error('Payment cancelled by user.');
        }
      };
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } else if (checkout?.paymentRequired && checkout?.paymentProvider === 'stripe' && checkout?.url) {
      toast.success('Redirecting to payment gateway...');
      window.location.href = checkout.url;
    } else if (!checkout?.paymentRequired) {
      await getMyPlan();
      const updatedUsage = await getProviderUsageMetrics().catch(() => null);
      if (updatedUsage) setUsageSummary(updatedUsage);
      toast.success(checkout?.message || 'Plan activated successfully.');
      
      setPaymentSuccessData(subscription);
      window.scrollTo(0, 0);
      setCheckoutLoading(false);
    } else {
      toast.error('Failed to initiate checkout.');
      setCheckoutLoading(false);
    }
  };

  const handleDirectCheckout = async (planToCheckout) => {
    let rawSkills = profile?.skills || profile?.expandedSkills || user?.providerProfile?.skills || user?.profile?.skills || user?.skills || [];
    if (!Array.isArray(rawSkills)) rawSkills = [rawSkills].filter(Boolean);
    const resolvedSkills = rawSkills.map(s => typeof s === 'string' ? s : (s?.name || s?.skill || '')).filter(Boolean);

    let resolvedCity = profile?.city || profile?.location?.city || user?.providerProfile?.city || user?.profile?.city || user?.city || profile?.locationData?.city;
    let resolvedPincode = profile?.location?.postalCode || profile?.pincode || user?.providerProfile?.pincode || user?.profile?.pincode || user?.pincode || profile?.locations?.[0] || profile?.nearestLocation;
    let resolvedCountry = profile?.country || profile?.location?.country || user?.country || user?.providerProfile?.country || user?.profile?.country;

    if (!resolvedCity || !resolvedPincode || !resolvedCountry) {
      try {
        const loc = await detectNearestLocation();
        resolvedCity = resolvedCity || loc.city || loc.nearestLocation || 'India';
        resolvedPincode = resolvedPincode || loc.nearestLocation || loc.postalCode || loc.pincode || loc.city || '000000';
        resolvedCountry = resolvedCountry || loc.country || 'IN';
      } catch (err) {
        // Safe fallbacks
        resolvedCity = resolvedCity || 'India';
        resolvedPincode = resolvedPincode || '000000';
        resolvedCountry = resolvedCountry || 'IN';
      }
    }

    resolvedCity = resolvedCity || 'India';
    resolvedPincode = resolvedPincode || resolvedCity || '000000';
    resolvedCountry = resolvedCountry || 'IN';

    setSelectedPlan(planToCheckout);
    setCheckoutLoading(true);
    try {
      const response = await purchaseFixedPlan({
        planId: planToCheckout._id,
        durationMonths: selectedDuration,
        addonIds: [],
        configuration: {
            skills: resolvedSkills,
            pincodes: resolvedPincode ? [resolvedPincode] : [],
            cities: resolvedCity ? [resolvedCity] : [],
        },
        isAutoSubscription,
      });

      const { checkout, subscription, queueWarning } = response || {};

      if (queueWarning) {
        const confirmQueue = window.confirm(queueWarning + '\n\nDo you want to proceed to payment?');
        if (!confirmQueue) {
          setCheckoutLoading(false);
          return;
        }
      }

      await processCheckoutResponse(checkout, subscription, planToCheckout);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Error processing request.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCheckout = async () => {
    setCheckoutLoading(true);

    if (!selectedPlan) {
      toast.error('Select a plan to continue.');
      setCheckoutLoading(false);
      return;
    }

    let rawSkills = profile?.skills || profile?.expandedSkills || user?.providerProfile?.skills || user?.profile?.skills || user?.skills || [];
    if (!Array.isArray(rawSkills)) rawSkills = [rawSkills].filter(Boolean);
    const resolvedSkills = rawSkills.map(s => typeof s === 'string' ? s : (s?.name || s?.skill || '')).filter(Boolean);

    let resolvedCity = profile?.city || profile?.location?.city || user?.providerProfile?.city || user?.profile?.city || user?.city || profile?.locationData?.city;
    let resolvedPincode = profile?.location?.postalCode || profile?.pincode || user?.providerProfile?.pincode || user?.profile?.pincode || user?.pincode || profile?.locations?.[0] || profile?.nearestLocation;
    let resolvedCountry = profile?.country || profile?.location?.country || user?.country || user?.providerProfile?.country || user?.profile?.country;

    const isLocationRequired = selectedAddons.length > 0;

    if (isLocationRequired && (!resolvedCity || !resolvedPincode || !resolvedCountry)) {
      try {
        const loc = await detectNearestLocation();
        resolvedCity = resolvedCity || loc.city || loc.nearestLocation || 'India';
        resolvedPincode = resolvedPincode || loc.nearestLocation || loc.postalCode || loc.pincode || loc.city || '000000';
        resolvedCountry = resolvedCountry || loc.country || 'IN';
      } catch (err) {
        resolvedCity = resolvedCity || 'India';
        resolvedPincode = resolvedPincode || '000000';
        resolvedCountry = resolvedCountry || 'IN';
      }
    }

    const hasWhatsappAddon = selectedAddons.some(id => {
      const p = availableAddons.find(a => a._id === id);
      return p && p.slug === 'whatsapp-alerts';
    });

    if (hasWhatsappAddon && !whatsappConsentOpen && (!whatsappConsent1 || !whatsappConsent2)) {
      setWhatsappConsentOpen(true);
      setCheckoutLoading(false);
      return;
    }

    try {
      const payload = {
        planId: selectedPlan._id,
        durationMonths: selectedDuration,
        addonIds: selectedAddons,
        addonDurations,
        configuration: {
          skills: resolvedSkills,
          pincodes: resolvedPincode ? [resolvedPincode] : [],
          cities: resolvedCity ? [resolvedCity] : [],
        },
        isAutoSubscription,
      };

      const response = await purchaseFixedPlan(payload);
      const { checkout, subscription, queueWarning } = response || {};

      if (queueWarning) {
        setQueueModalData({
          message: queueWarning,
          checkout,
          subscription,
          plan: selectedPlan
        });
        setCheckoutLoading(false);
        return;
      }

      await processCheckoutResponse(checkout, subscription, selectedPlan);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to start checkout.');
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return <RouteLoader />;
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById('invoice-preview');
    if (!element) return;
    
    setIsDownloading(true);

    // Temporarily hide the download and pay buttons for the PDF
    const actionButtons = element.querySelectorAll('.no-print');
    actionButtons.forEach(btn => btn.style.display = 'none');
    
    // Show the invoice number for the PDF
    const invoiceNumElements = element.querySelectorAll('.pdf-only');
    invoiceNumElements.forEach(el => el.style.display = 'block');

    // Force A4 aspect ratio on the element before capturing
    const originalMinHeight = element.style.minHeight;
    element.style.minHeight = `${element.offsetWidth * 1.414}px`;

    try {
      // Use html-to-image because html2canvas (used by html2pdf) doesn't support Tailwind v4's oklch colors
      const dataUrl = await toPng(element, { quality: 0.98, pixelRatio: 2 });
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`lucohire-invoice-${(selectedPlan?.name || 'receipt').toLowerCase()}-${new Date().getTime()}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error(t("Failed to generate PDF"));
    } finally {
      element.style.minHeight = originalMinHeight;
      actionButtons.forEach(btn => btn.style.display = '');
      invoiceNumElements.forEach(el => el.style.display = 'none');
      setIsDownloading(false);
    }
  };

  if (paymentSuccessData) {
    const invoiceNumber = `INV-${(paymentSuccessData._id || 'PAYMENT').toString().slice(-6).toUpperCase()}`;
    const rawAmount = paymentSuccessData.finalAmount || paymentSuccessData.totalAmount || paymentSuccessData.amount || paymentSuccessData.subtotal || 0;
    const amount = Math.round(rawAmount * 100) / 100;
    const currency = paymentSuccessData.currency || 'INR';
    const addonsTotal = (paymentSuccessData.selectedAddons || []).reduce((acc, addon) => acc + (addon.totalPrice || addon.price || 0), 0);
    const basePlanAmount = Math.round(Math.max(0, amount - addonsTotal) * 100) / 100;

    
    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 font-sans flex flex-col items-center justify-center">
        <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-8 text-center animate-in zoom-in duration-500">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">{isHistoricalInvoice ? t("Invoice Details") : t("Payment Successful!")}</h2>
          {!isHistoricalInvoice && (
            <p className="text-slate-500 mb-8">{t("Your subscription has been activated and an invoice has been sent to your email.")}</p>
          )}
          
          {/* Invoice Summary */}
          <div className="bg-slate-50 rounded-xl pt-0 text-left border border-slate-200 mb-8 relative font-sans overflow-hidden flex flex-col z-0" id="invoice-preview">
            
            {/* Watermark Logo */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.06]">
              <img src="/lucologo.png" alt="" className="w-full max-w-2xl scale-110 object-contain" />
            </div>

            {/* Company & Date Details */}
            <div className="bg-emerald-50 flex flex-col md:flex-row justify-between items-start md:items-start mb-6 md:mb-8 gap-4 md:gap-6 pb-6 border-b border-emerald-100 p-4 sm:p-6 relative z-10">
              <div className="hidden md:flex items-start gap-4">
                <div className="w-16 h-16 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center shrink-0">
                  <img src="/lucologo.png" alt="Lucohire Logo" className="w-full h-auto object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Lucohire Inc.</h2>
                  <p className="text-sm font-medium text-slate-600 mt-0.5">AI-Powered Global Jobs & Hiring Platform</p>
                  <div className="mt-3 text-xs text-slate-500 space-y-1">
                    <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> SUPERTECH ECO VILLAGE-2,</p>
                    <p className="pl-5">GAUTAM BUDDHA NAGAR, 201306, INDIA</p>
                    <p className="flex items-center gap-1.5 mt-1.5"><MessageCircle className="w-3.5 h-3.5" /> support@lucohire.com</p>
                  </div>
                </div>
              </div>
              
              <div className="text-left md:text-right w-full md:w-auto flex flex-row md:flex-col items-center md:items-end justify-between h-auto md:h-full md:min-h-[80px]">
                <div className="text-left md:text-right w-full flex justify-between md:block items-center">
                  <div className="mb-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t("Invoice")}</p>
                    <p className="text-sm font-bold text-slate-800">{invoiceNumber}</p>
                  </div>
                  <div className="mb-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t("Date & Time")}</p>
                    <p className="text-sm font-medium text-slate-800">
                      {paymentSuccessData.createdAt 
                        ? `${new Date(paymentSuccessData.createdAt).toLocaleDateString()} - ${new Date(paymentSuccessData.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : `${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                  </div>
                  <div className="pdf-only hidden">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t("Terms")}</p>
                    <p className="text-sm font-medium text-slate-600">Auto-renewing</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Items Table */}
            <div className="px-4 sm:px-6 relative z-10 overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[300px]">
                <thead>
                  <tr className="border-b-2 border-slate-800">
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[140px] sm:w-1/2">{t("Description")}</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">{t("Amount")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-4">
                      <p className="font-bold text-slate-800">{paymentSuccessData.planSnapshot?.name || 'Subscription'}</p>
                      <p className="text-xs text-slate-500 mt-1">{t("Subscription fee")}</p>
                      <div className="mt-2 text-[11px] text-slate-600 flex flex-col gap-0.5">
                        <p><span className="font-medium text-slate-500">{t("Starting Date")}:</span> {new Date(paymentSuccessData.createdAt || Date.now()).toLocaleDateString()}</p>
                        <p><span className="font-medium text-slate-500">{t("Next Billing Date")}:</span> {paymentSuccessData.endDate ? new Date(paymentSuccessData.endDate).toLocaleDateString() : (() => { const d = new Date(paymentSuccessData.createdAt || Date.now()); const dur = paymentSuccessData.planSnapshot?.durationMonths || paymentSuccessData.durationMonths || selectedDuration; if (Number(dur) === 12) d.setDate(d.getDate() + 365); else if (Number(dur) === 3) d.setDate(d.getDate() + 90); else d.setDate(d.getDate() + 30); return d.toLocaleDateString(); })()}</p>
                        <p><span className="font-medium text-slate-500">{t("Auto Renewal")}:</span> <span className="text-emerald-600 font-bold">On</span></p>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-slate-800">
                      {currency === 'INR' ? '₹' : '$'}{basePlanAmount}
                    </td>
                  </tr>
                  {(paymentSuccessData.selectedAddons || []).map((addon, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-4">
                        <p className="font-bold text-slate-800">{addon.description || addon.name || 'Add-on'}</p>
                        <p className="text-xs text-slate-500 mt-1">{t("Monthly Add-on fee")}</p>
                        <div className="mt-2 text-[11px] text-slate-600 flex flex-col gap-0.5">
                          <p><span className="font-medium text-slate-500">{t("Starting Date")}:</span> {new Date(paymentSuccessData.createdAt || Date.now()).toLocaleDateString()}</p>
                          <p><span className="font-medium text-slate-500">{t("Next Billing Date")}:</span> {(() => { const d = new Date(paymentSuccessData.createdAt || Date.now()); d.setDate(d.getDate() + 30); return d.toLocaleDateString(); })()}</p>
                          <p><span className="font-medium text-slate-500">{t("Auto Renewal")}:</span> <span className="text-emerald-600 font-bold">On</span></p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-slate-800">
                        {currency === 'INR' ? '₹' : '$'}{addon.totalPrice || addon.price || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Invoice Totals */}
            <div className="flex flex-col items-end justify-end mt-8 border-t border-slate-200 pt-6 px-6 relative z-10">
              <div className="w-full sm:w-80 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-slate-500">{t("Subtotal")}</span>
                  <span className="font-bold text-slate-800">{currency === 'INR' ? '₹' : '$'}{amount}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-slate-500">{t("Taxes & Fees")}</span>
                  <span className="font-medium text-slate-500 text-xs italic">{t("Calculated at checkout")}</span>
                </div>
                <div className="border-t-2 border-slate-800 pt-3 mt-3 flex justify-between items-center">
                  <span className="font-black text-slate-800 text-lg">{t("Total Due")}</span>
                  <span className="font-black text-slate-900 text-xl">
                    {currency === 'INR' ? '₹' : '$'}{amount}
                  </span>
                </div>
              </div>
            </div>

            {/* Bill To Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mt-10 pt-8 border-t border-slate-200 gap-6 px-4 sm:px-6 relative z-10">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t("Bill To")}</p>
                <p className="text-base font-bold text-slate-800">{user?.name || "Provider Name"}</p>
                <p className="text-sm font-medium text-slate-700 mt-0.5">
                  {providerProfileData?.skills?.[0] || profile?.skills?.[0] || user?.providerProfile?.skills?.[0] || user?.skills?.[0] || profile?.headline || user?.headline || profile?.title || user?.title || user?.providerProfile?.speciality || user?.speciality || profile?.speciality || "Specialized Services"}
                </p>
                {user?.email && <p className="text-sm text-slate-600 mt-0.5">{user.email}</p>}
                {(providerProfileData?.phone || profile?.phone || user?.providerProfile?.phone || user?.phone) && (
                  <p className="text-sm text-slate-600 mt-0.5">
                    {providerProfileData?.phone || profile?.phone || user?.providerProfile?.phone || user?.phone}
                  </p>
                )}
                <p className="text-sm text-slate-600 mt-0.5">
                  {(() => {
                    const getStr = (val) => {
                      if (!val) return null;
                      if (typeof val === 'string') return val;
                      if (typeof val === 'object') return val.city || val.name || val.formattedAddress;
                      return null;
                    };
                    const pLoc = getStr(providerProfileData?.location) || getStr(providerProfileData?.city) || getStr(providerProfileData?.locationData);
                    const profLoc = getStr(profile?.location) || getStr(profile?.city) || getStr(profile?.locationData);
                    const uLoc = getStr(user?.providerProfile?.location) || getStr(user?.providerProfile?.city) || getStr(user?.location) || getStr(user?.city);
                    return pLoc || profLoc || uLoc || "Noida, UP";
                  })()}
                </p>
              </div>
            </div>

            <div className="mt-auto pt-6 pb-6 border-t border-slate-200 text-center px-6">
              <p className="text-sm font-medium text-slate-600">
                {t("This is a computer-generated invoice. No signature is required.")}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isDownloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {t("Download Invoice")}
            </button>
            <button 
              onClick={() => {
                setPaymentSuccessData(null);
                navigate('/provider/dashboard');
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              {t("Go to Dashboard")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="mx-auto relative">
        {/* Active Plan Display Top Left */}
        {(() => {
          if (!activePlanData || !activePlanData.subscription || activePlanData.subscription.subscriptionStatus !== 'active' || activePlanData.plan?.slug === 'free') return null;

          const activePlan = activePlanData.subscription;
          const planName = activePlan.planSnapshot?.name || 'Paid Plan';
          const purchaseDate = activePlan.startDate || activePlan.createdAt;
          const endDate = activePlan.endDate || activePlan.expiresAt;
          
          let days = 0;
          if (endDate) {
            const expiryTime = new Date(endDate).getTime();
            const currentTime = new Date().getTime();
            days = Math.max(0, Math.ceil((expiryTime - currentTime) / (1000 * 60 * 60 * 24)));
          } else if (purchaseDate) {
            const validationDays = (activePlan.durationMonths || 1) * (activePlan.planSnapshot?.duration || 30);
            const purchaseTime = new Date(purchaseDate).getTime();
            const currentTime = new Date().getTime();
            const validityMs = validationDays * 24 * 60 * 60 * 1000;
            const diff = (purchaseTime + validityMs) - currentTime;
            days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
          }
          
          if (days <= 0) return null;

          return (
            <div className="lg:absolute lg:top-4 lg:left-2 mb-6 lg:mb-0 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-3 text-white shadow-md flex flex-col gap-2 z-10 w-full lg:w-auto min-w-[250px]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-[9px] font-semibold text-emerald-100 uppercase tracking-wider mb-0.5">{t("Current Active Plan")}</h2>
                  <div className="text-sm font-bold flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-yellow-300" />
                    {planName}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 px-2.5 py-1 rounded-md backdrop-blur-sm text-center border border-white/10 shadow-inner">
                    <div className="text-base font-extrabold leading-none">{days}</div>
                    <div className="text-[7px] font-bold text-emerald-100 uppercase tracking-wider mt-0.5">{t("Days Left")}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Header */}
        <div className="hidden md:block text-center mb-10 lg:pl-24">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-emerald-950 tracking-tight mb-3">{t("Choose the Right Plan for Your")} <span className="text-emerald-600">{t("Career Growth")}</span>
          </h1>
          <p className="text-slate-500 text-base">{t(
            "Unlock powerful AI insights, personalized reports, and smart alerts to get hired faster."
          )}</p>
        </div>



        {/* Duration Toggles */}
        {(() => {
          const sortedPlans = [...plans].sort((a, b) => a.price - b.price);
          const lowestPaidPlan = sortedPlans.find(p => p.price > 0) || sortedPlans[0];
          const baseMonthlyPrice = lowestPaidPlan ? (lowestPaidPlan.priceMonthly || lowestPaidPlan.price || 0) : 0;
          const currencySymbol = lowestPaidPlan?.currencySymbol || '₹';

          const getDisplayPrice = (duration) => {
            if (!lowestPaidPlan) return '';
            let discountPercent = 0;
            if (duration === 3) discountPercent = 10;
            if (duration === 6) discountPercent = 15;
            if (duration === 12) discountPercent = 20;
            const displayMonthly = Math.round((baseMonthlyPrice * (1 - discountPercent / 100)) * 100) / 100;
            return formatCurrency(displayMonthly, currencySymbol);
          };

          return (
            <div className="flex justify-center mb-10 relative px-4 sm:px-0">
              <div className="sm:bg-white sm:border sm:border-emerald-100 sm:rounded-full sm:p-1.5 flex flex-col sm:flex-row sm:inline-flex items-stretch sm:items-center relative sm:shadow-sm w-full sm:w-auto gap-3 sm:gap-0">
                <button
                  onClick={() => setSelectedDuration(1)}
                  className={`relative z-10 w-full sm:w-auto px-4 sm:px-6 py-3 sm:py-2.5 text-sm font-bold rounded-xl sm:rounded-full transition-colors flex items-center justify-center ${selectedDuration === 1 ? 'text-white bg-emerald-600 shadow border border-transparent' : 'text-slate-500 hover:text-emerald-950 bg-white sm:bg-transparent shadow-sm sm:shadow-none border border-emerald-100 sm:border-transparent'}`}
                >
                  <span className="sm:hidden">{t("Monthly")} {getDisplayPrice(1) ? `(${getDisplayPrice(1)}/mo)` : ''}</span>
                  <span className="hidden sm:inline">{t("Monthly Plans")}</span>
                </button>
                <button
                  onClick={() => setSelectedDuration(3)}
                  className={`relative z-10 w-full sm:w-auto px-4 sm:px-6 py-3 sm:py-2.5 text-sm font-bold rounded-xl sm:rounded-full transition-colors flex items-center justify-center gap-2 ${selectedDuration === 3 ? 'text-white bg-emerald-600 shadow border border-transparent' : 'text-slate-500 hover:text-emerald-950 bg-white sm:bg-transparent shadow-sm sm:shadow-none border border-emerald-100 sm:border-transparent'}`}
                >
                  <span className="sm:hidden">{t("Quarterly")} {getDisplayPrice(3) ? `(${getDisplayPrice(3)}/mo)` : ''}</span>
                  <span className="hidden sm:inline">{t("Quarterly Plans")}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${selectedDuration === 3 ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>{t("10% OFF")}</span>
                </button>
                <button
                  onClick={() => setSelectedDuration(12)}
                  className={`relative z-10 w-full sm:w-auto px-4 sm:px-6 py-3 sm:py-2.5 text-sm font-bold rounded-xl sm:rounded-full transition-colors flex items-center justify-center gap-2 ${selectedDuration === 12 ? 'text-white bg-emerald-600 shadow border border-transparent' : 'text-slate-500 hover:text-emerald-950 bg-white sm:bg-transparent shadow-sm sm:shadow-none border border-emerald-100 sm:border-transparent'}`}
                >
                  <span className="sm:hidden">{t("Yearly")} {getDisplayPrice(12) ? `(${getDisplayPrice(12)}/mo)` : ''}</span>
                  <span className="hidden sm:inline">{t("Yearly Plans")}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${selectedDuration === 12 ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>{t("20% OFF")}</span>
                  {selectedDuration !== 12 && (
                    <div className="absolute top-0 right-2 -translate-y-1/2 sm:-top-3 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">{t("BEST VALUE")}</div>
                  )}
                </button>
              </div>
            </div>
          );
        })()}

        {/* Pricing Cards Grid */}
        {plans.length === 0 ? (
          <div className="text-center py-10">
            <h3 className="text-xl font-bold text-slate-700">{t("No Plans Available")}</h3>
            <p className="text-slate-500 mt-2">{t("There are currently no provider plans available. Please check back later.")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[...plans].sort((a,b) => a.price - b.price).map((plan) => {
              const isPro = plan.isPopular;
              const isPremium = plan.price > 500;
              
              // Apply duration discounts properly
              const baseMonthlyPrice = plan.priceMonthly || plan.price || 0;
              let discountPercent = 0;
              if (selectedDuration === 3) discountPercent = 10;
              if (selectedDuration === 6) discountPercent = 15;
              if (selectedDuration === 12) discountPercent = 20;

              const totalOriginal = baseMonthlyPrice * selectedDuration;
              const totalBilled = Math.round((totalOriginal * (1 - discountPercent / 100)) * 100) / 100;
              const displayMonthly = Math.round((baseMonthlyPrice * (1 - discountPercent / 100)) * 100) / 100;
              
              return (
                <div 
                  key={plan._id} 
                  onClick={(e) => {
                    if (!e.target.closest('button')) {
                      document.getElementById(`plan-btn-${plan._id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }}
                  className="bg-white rounded-3xl p-6 relative flex flex-col border border-emerald-100 shadow-md transition-all duration-300 hover:border-2 hover:border-teal-600 hover:shadow-xl hover:scale-105 hover:z-10 cursor-pointer"
                >
                  {isPro && (
                    <></>
                  )}
                  {isPremium && (
                    <div className="absolute top-4 right-4 text-amber-500">
                      <Crown className="w-8 h-8" />
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className={`text-sm font-bold uppercase tracking-wider mb-2 ${isPro ? 'text-teal-600' : isPremium ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-emerald-950">{formatCurrency(displayMonthly, plan.currencySymbol)}</span>
                      <span className="text-xs text-slate-500 font-semibold">{t("/month")}</span>
                      {discountPercent > 0 && (
                        <span className="text-xs text-slate-400 line-through font-medium">{formatCurrency(baseMonthlyPrice, plan.currencySymbol)}</span>
                      )}
                    </div>
                    {selectedDuration > 1 ? (
                      <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/60 text-[11px] font-bold text-emerald-700">
                        <span>{t("Billed")}: {formatCurrency(totalBilled, plan.currencySymbol)} {t("for")} {selectedDuration} {t("months")}</span>
                        <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded font-extrabold">{discountPercent}% OFF</span>
                      </div>
                    ) : (
                      <div className="mt-2.5 text-[11px] font-semibold text-slate-400">
                        {t("Billed monthly")}
                      </div>
                    )}
                    <p className="text-xs text-slate-500 mt-2 h-4">{plan.description}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-emerald-950 mb-4 uppercase tracking-wider">
                      {t('WHAT\'S INCLUDED')}
                    </p>
                  <ul className="space-y-3">
                    {(plan.features || []).map((feature, i) => {
                      if (!feature) return null;
                      const [name, val] = feature.split(':');
                      return (
                        <li key={`f-${i}`} className="flex items-start justify-between text-xs gap-3">
                          <div className="flex items-start gap-2 text-emerald-950 font-medium">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>{name.trim()}</span>
                          </div>
                          {val && <span className="text-slate-500 text-right shrink-0">{val.trim()}</span>}
                        </li>
                      );
                    })}
                    {plan.aiLimits && PROVIDER_FEATURES.map(({ key, label }) => {
                      const val = plan.aiLimits[key];
                      if (val === undefined || val === null) return null;
                      const isIncluded = val !== 0;
                      return (
                        <li key={`ai-${key}`} className={`flex items-start justify-between text-xs gap-3 ${!isIncluded ? 'opacity-50' : ''}`}>
                          <div className={`flex items-start gap-2 font-medium ${isIncluded ? 'text-emerald-950' : 'text-slate-500'}`}>
                            {isIncluded ? (
                              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                            ) : (
                              <X className="w-4 h-4 text-red-500 shrink-0" />
                            )}
                            <span className={!isIncluded ? 'line-through' : ''}>{label}</span>
                          </div>
                          {isIncluded && <span className="text-slate-500 text-right shrink-0 font-bold">{val === -1 ? 'Unlimited' : val}</span>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="mt-8 pt-4">
                  {(() => {
                    const isActivePlan = activePlanData?.subscription?.subscriptionStatus === 'active' && String(activePlanData?.subscription?.planId) === String(plan._id) && Number(activePlanData?.subscription?.durationMonths || 1) === selectedDuration;
                    if (isActivePlan) {
                      return (
                        <button
                          id={`plan-btn-${plan._id}`}
                          disabled
                          className="w-full py-3 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                        >
                          <BadgeCheck className="w-5 h-5" />
                          {t("Current Plan")}
                        </button>
                      );
                    }

                    return (
                      <button
                        id={`plan-btn-${plan._id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedPlan?._id === plan._id) {
                            setSelectedPlan(null); // Allow unselecting
                          } else {
                            const isCurrentPlanAddon = selectedPlan && ADDON_SLUGS.includes(selectedPlan.slug);
                            if (isCurrentPlanAddon) {
                              setSelectedAddons([selectedPlan._id]);
                            }
                            setSelectedPlan(plan);
                            setIsInvoiceMinimized(false);
                            // Scroll to addons section
                            setTimeout(() => {
                              document.getElementById('addons-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }, 100);
                          }
                        }}
                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all shadow-sm border-2 ${
                          selectedPlan?._id === plan._id
                            ? 'bg-emerald-600 text-white border-emerald-600 ring-4 ring-emerald-600/20'
                            : isPro 
                              ? 'bg-teal-600 hover:bg-teal-700 text-white border-transparent' 
                              : isPremium
                                ? 'bg-amber-500 hover:bg-amber-600 text-white border-transparent'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {selectedPlan?._id === plan._id ? (
                          <span className="flex items-center justify-center gap-2">
                            <Check className="w-5 h-5" /> {t("Selected")}
                          </span>
                        ) : (
                          `${t("Select")} ${plan.name.split(' ')[0]}`
                        )}
                      </button>
                    );
                  })()}
                  <p className="text-[10px] text-center text-slate-500 mt-3 flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />{t("Cancel anytime. No hidden charges.")}</p>
                </div>
              </div>
            );
          })}
        </div>
        )}

        {/* Top Plans Preview Section */}
        {availableAddons.length > 0 && (
          <div id="addons-section" className="mb-8 scroll-mt-24">
            {false && (
              <>
                <h2 className="text-xl font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-500" /> {t("Visibility Add-ons")}
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full ml-2 uppercase">Optional</span>
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                  {availableAddons.filter(a => !a.slug.includes('whatsapp')).map(addon => {
                    const Icon = planIconMap[addon.slug] || Sparkles;
                    return (
                    <div key={addon._id} className={`bg-white border border-slate-200 hover:border-emerald-200 rounded-2xl p-4 flex flex-col justify-between hover:shadow-sm transition-all`}>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`p-1.5 rounded-lg bg-emerald-50 text-emerald-600`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <h3 className="font-bold text-slate-900">{addon.name}</h3>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{addon.description}</p>
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-emerald-700">₹{addon.priceMonthly || addon.price || 0}<span className="text-[10px] text-slate-500 font-medium">/mo</span></span>
                          <select
                            value={addonDurations[addon._id] || 1}
                            onChange={e => setAddonDurations(prev => ({ ...prev, [addon._id]: Number(e.target.value) }))}
                            className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:border-emerald-400"
                            onClick={e => e.stopPropagation()}
                          >
                            {[1,2,3,4,5,6,9,12].map(m => (
                              <option key={m} value={m}>{m} month{m > 1 ? 's' : ''} — ₹{(addon.priceMonthly || addon.price || 0) * m}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => {
                              const isAddonSelected = selectedAddons.includes(addon._id);
                              const isBasePlanAddon = selectedPlan?._id === addon._id;
                              
                              if (isBasePlanAddon) {
                                if (selectedAddons.length > 0) {
                                  const nextAddon = availableAddons.find(a => a._id === selectedAddons[0]);
                                  setSelectedPlan(nextAddon);
                                  setSelectedAddons(selectedAddons.filter(id => id !== nextAddon._id));
                                } else {
                                  setSelectedPlan(null);
                                }
                              } else if (isAddonSelected) {
                                setSelectedAddons(selectedAddons.filter(id => id !== addon._id));
                              } else {
                                if (selectedPlan && !ADDON_SLUGS.includes(selectedPlan.slug)) {
                                  const waAddon = availableAddons.find(a => a.slug.includes('whatsapp'));
                                  const newAddons = waAddon && selectedAddons.includes(waAddon._id) ? [waAddon._id] : [];
                                  setSelectedAddons([...newAddons, addon._id]);
                                } else if (selectedPlan && selectedPlan.slug.includes('whatsapp')) {
                                  setSelectedPlan(addon);
                                  setSelectedAddons([selectedPlan._id]);
                                } else {
                                  setSelectedPlan(addon);
                                  const waAddon = availableAddons.find(a => a.slug.includes('whatsapp'));
                                  const newAddons = waAddon && selectedAddons.includes(waAddon._id) ? [waAddon._id] : [];
                                  setSelectedAddons(newAddons);
                                }
                                setIsInvoiceMinimized(false);
                              }
                            }}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border ${selectedPlan?._id === addon._id || selectedAddons.includes(addon._id) ? 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-2 ring-emerald-500/20' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                          >
                            {selectedPlan?._id === addon._id || selectedAddons.includes(addon._id) ? t("Selected") : t("Select")}
                          </button>
                          <button onClick={() => handleDirectCheckout(addon)}
                            className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                          >
                            {t("Purchase")}
                          </button>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </>
            )}

            {availableAddons.filter(a => a.slug.includes('whatsapp')).length > 0 && (
              <>
                <h2 className="text-xl font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                  <FaWhatsapp className="w-5 h-5 text-[#25D366]" /> {t("Freelance Add-ons")}
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full ml-2 uppercase">Optional</span>
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableAddons.filter(a => a.slug.includes('whatsapp')).map(addon => {
                    const Icon = planIconMap[addon.slug] || FaWhatsapp;
                    return (
                    <div key={addon._id} className={`bg-white border border-[#25D366]/30 hover:border-[#25D366] rounded-2xl p-4 flex flex-col justify-between hover:shadow-sm transition-all`}>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`p-1.5 rounded-lg bg-[#25D366]/10 text-[#25D366]`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <h3 className="font-bold text-slate-900">{addon.name}</h3>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{addon.description}</p>
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-emerald-700">₹{addon.priceMonthly || addon.price || 0}<span className="text-[10px] text-slate-500 font-medium">/mo</span></span>
                          <select
                            value={addonDurations[addon._id] || 1}
                            onChange={e => setAddonDurations(prev => ({ ...prev, [addon._id]: Number(e.target.value) }))}
                            className="text-xs border border-[#25D366]/40 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:border-[#25D366]"
                            onClick={e => e.stopPropagation()}
                          >
                            {[1,2,3,4,5,6,9,12].map(m => (
                              <option key={m} value={m}>{m} month{m > 1 ? 's' : ''} — ₹{(addon.priceMonthly || addon.price || 0) * m}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => {
                              const isAddonSelected = selectedAddons.includes(addon._id);
                              const isBasePlanAddon = selectedPlan?._id === addon._id;
                              
                              if (isBasePlanAddon) {
                                if (selectedAddons.length > 0) {
                                  const nextAddon = availableAddons.find(a => a._id === selectedAddons[0]);
                                  setSelectedPlan(nextAddon);
                                  setSelectedAddons(selectedAddons.filter(id => id !== nextAddon._id));
                                } else {
                                  setSelectedPlan(null);
                                }
                              } else if (isAddonSelected) {
                                setSelectedAddons(selectedAddons.filter(id => id !== addon._id));
                              } else {
                                if (selectedPlan && !ADDON_SLUGS.includes(selectedPlan.slug)) {
                                  const visAddon = availableAddons.find(a => !a.slug.includes('whatsapp') && selectedAddons.includes(a._id));
                                  const newAddons = visAddon ? [visAddon._id] : [];
                                  setSelectedAddons([...newAddons, addon._id]);
                                } else if (selectedPlan && !selectedPlan.slug.includes('whatsapp')) {
                                  setSelectedAddons([addon._id]);
                                } else {
                                  setSelectedPlan(addon);
                                  setSelectedAddons([]);
                                }
                                setIsInvoiceMinimized(false);
                              }
                            }}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border ${selectedPlan?._id === addon._id || selectedAddons.includes(addon._id) ? 'bg-[#25D366]/10 text-[#075E54] border-[#25D366] ring-2 ring-[#25D366]/20' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                          >
                            {selectedPlan?._id === addon._id || selectedAddons.includes(addon._id) ? t("Selected") : t("Select")}
                          </button>
                          <button onClick={() => handleDirectCheckout(addon)}
                            className="text-xs font-bold text-white bg-[#25D366] hover:bg-[#1DA851] px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                          >
                            {t("Purchase")}
                          </button>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </>
            )}
            <p className="text-xs text-slate-500 mt-5 text-center">{t("You can configure location and skills for these add-ons during checkout.")}</p>
          </div>
        )}

        {/* Invoice Preview */}
        {selectedPlan && (
          <div className="w-full mb-16 animate-in slide-in-from-bottom-8 duration-500">
            <div id="invoice-preview" className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden p-6 sm:p-10 font-sans">
              
              {/* Order Summary Header */}
              <div className="flex justify-between items-center mb-4 md:mb-6 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl md:text-2xl font-black text-slate-900">{t("Order Summary")}</h3>
                  {isInvoiceMinimized && (
                    <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">1 {t("Item")}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsInvoiceMinimized(!isInvoiceMinimized)} 
                    className="no-print p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                    title={isInvoiceMinimized ? t("Expand Summary") : t("Minimize Summary")}
                  >
                    {isInvoiceMinimized ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {!isInvoiceMinimized && (
                <>
                  {/* Company & Date Details */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-start mb-6 md:mb-8 gap-4 md:gap-6">
                <div className="hidden md:flex items-start gap-4">
                  <div className="w-16 h-16 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center shrink-0">
                    <img src="/lucologo.png" alt="Lucohire Logo" className="w-full h-auto object-contain" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Lucohire Inc.</h2>
                    <p className="text-sm font-medium text-slate-600 mt-0.5">AI-Powered Global Jobs & Hiring Platform</p>
                    <div className="mt-3 text-xs text-slate-500 space-y-1">
                      <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> SUPERTECH ECO VILLAGE-2,</p>
                      <p className="pl-5">GAUTAM BUDDHA NAGAR, 201306, INDIA</p>
                      <p className="flex items-center gap-1.5 mt-1.5"><MessageCircle className="w-3.5 h-3.5" /> support@lucohire.com</p>
                    </div>
                  </div>
                </div>
                
                <div className="text-left md:text-right w-full md:w-auto flex flex-row md:flex-col items-center md:items-end justify-between h-auto md:h-full md:min-h-[80px]">
                  <div className="text-left md:text-right w-full flex justify-between md:block items-center">
                    <div className="pdf-only hidden mb-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t("Invoice Number")}</p>
                      <p className="text-sm font-bold text-slate-800">INV-{new Date().getTime().toString().slice(-6)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t("Date")}</p>
                      <p className="text-sm font-medium text-slate-800">{new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Items Table */}
              <div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-800">
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[140px] sm:w-1/2">{t("Description")}</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">{t("Billing Cycle")}</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">{t("Amount")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Base Plan Row */}
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-4">
                        <p className="font-bold text-slate-800">
                          {selectedPlan.name} {ADDON_SLUGS.includes(selectedPlan?.slug) ? '' : t("Plan")}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {ADDON_SLUGS.includes(selectedPlan?.slug) ? t("Monthly Add-on fee") : t("Base subscription fee")}
                        </p>
                        <div className="mt-2 text-[11px] text-slate-600">
                          <p><span className="font-medium text-slate-500">{t("Next Billing Date")}:</span> {(() => { const d = new Date(); const isAddon = ADDON_SLUGS.includes(selectedPlan?.slug); const dur = isAddon ? 1 : Number(selectedDuration); if (dur === 12) d.setDate(d.getDate() + 365); else if (dur === 3) d.setDate(d.getDate() + 90); else d.setDate(d.getDate() + 30); return d.toLocaleDateString(); })()}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-medium capitalize">
                          <Clock className="w-3 h-3" />
                          {ADDON_SLUGS.includes(selectedPlan?.slug) ? 1 : selectedDuration}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-slate-800">
                        <div className="flex items-center justify-end gap-3">
                          <span>
                            {formatCurrency(
                              buildLocalPreview(selectedPlan, selectedDuration).subtotal,
                              selectedPlan.currencySymbol
                            )}
                          </span>
                          <button 
                            onClick={() => setSelectedPlan(null)} 
                            className="no-print text-slate-400 hover:text-red-500 transition-colors p-1"
                            title={t("Remove item")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Add-on Rows */}
                    {selectedAddons.map(addonId => {
                      const addon = availableAddons.find(a => a._id === addonId);
                      if (!addon) return null;
                      return (
                        <tr key={addonId} className="hover:bg-slate-50 transition-colors group/row relative">
                          <td className="py-4 px-4">
                            <div className="font-bold text-slate-800 flex items-start gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-[2px]" />
                              <span className="leading-tight">{addon.name}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{t("Optional Add-on")}</p>
                            <div className="mt-2 text-[11px] text-slate-600">
                              <p><span className="font-medium text-slate-500">{t("Next Billing Date")}:</span> {(() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toLocaleDateString(); })()}</p>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-medium capitalize">
                              <Clock className="w-3 h-3" />
                              {addonDurations[addonId] || 1} mo
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right font-bold text-slate-800 relative">
                            <div className="flex items-center justify-end gap-3">
                              {formatCurrency(
                              (addon.priceMonthly || addon.price || 0) * (addonDurations[addonId] || 1),
                              selectedPlan.currencySymbol
                            )}
                              <button 
                                onClick={() => setSelectedAddons(selectedAddons.filter(id => id !== addonId))}
                                className="no-print opacity-0 group-hover/row:opacity-100 transition-opacity p-1 hover:bg-red-100 text-red-500 rounded-full"
                                title={t("Remove item")}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Invoice Totals */}
              <div className="flex flex-col items-end justify-end mt-8 border-t border-slate-200 pt-6">
                <div className="w-full sm:w-80 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-slate-500">{t("Subtotal")}</span>
                    <span className="font-bold text-slate-800">
                      {formatCurrency(
                        buildLocalPreview(selectedPlan, selectedDuration).subtotal + 
                        selectedAddons.reduce((sum, id) => {
                          const a = availableAddons.find(addon => addon._id === id);
                          return sum + (a ? (a.priceMonthly || a.price || 0) * (addonDurations[id] || 1) : 0);
                        }, 0),
                        selectedPlan.currencySymbol
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-slate-500">{t("Taxes & Fees")}</span>
                    <span className="font-medium text-slate-500 text-xs italic">{t("Calculated at checkout")}</span>
                  </div>
                  <div className="border-t-2 border-slate-800 pt-3 mt-3 flex justify-between items-center">
                    <span className="font-black text-slate-800 text-lg">{t("Total Due")}</span>
                    <span className="font-black text-slate-900 text-2xl">
                      {formatCurrency(
                        buildLocalPreview(selectedPlan, selectedDuration).subtotal + 
                        selectedAddons.reduce((sum, id) => {
                          const a = availableAddons.find(addon => addon._id === id);
                          return sum + (a ? (a.priceMonthly || a.price || 0) * (addonDurations[id] || 1) : 0);
                        }, 0),
                        selectedPlan.currencySymbol
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bill To Section & Actions */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mt-10 pt-8 border-t border-slate-200 gap-6">
                {location.pathname !== '/provider/my-plan' ? (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t("Bill To")}</p>
                    <p className="text-base font-bold text-slate-800">{user?.name || "Provider Name"}</p>
                    <p className="text-sm font-medium text-slate-700 mt-0.5">
                      {providerProfileData?.skills?.[0] || profile?.skills?.[0] || user?.providerProfile?.skills?.[0] || user?.skills?.[0] || profile?.headline || user?.headline || profile?.title || user?.title || user?.providerProfile?.speciality || user?.speciality || profile?.speciality || "Specialized Services"}
                    </p>
                    {user?.email && <p className="text-sm text-slate-600 mt-0.5">{user.email}</p>}
                    {(providerProfileData?.phone || profile?.phone || user?.providerProfile?.phone || user?.phone) && (
                      <p className="text-sm text-slate-600 mt-0.5">
                        {providerProfileData?.phone || profile?.phone || user?.providerProfile?.phone || user?.phone}
                      </p>
                    )}
                    <p className="text-sm text-slate-600 mt-0.5">
                      {(() => {
                        const getStr = (val) => {
                          if (!val) return null;
                          if (typeof val === 'string') return val;
                          if (typeof val === 'object') return val.city || val.name || val.formattedAddress;
                          return null;
                        };
                        const pLoc = getStr(providerProfileData?.location) || getStr(providerProfileData?.city) || getStr(providerProfileData?.locationData);
                        const profLoc = getStr(profile?.location) || getStr(profile?.city) || getStr(profile?.locationData);
                        const uLoc = getStr(user?.providerProfile?.location) || getStr(user?.providerProfile?.city) || getStr(user?.location) || getStr(user?.city);
                        return pLoc || profLoc || uLoc || "Noida, UP";
                      })()}
                    </p>
                  </div>
                ) : (
                  <div /> // Empty div to maintain flex layout for checkout button on the right
                )}

                <div className="no-print flex flex-col items-start md:items-end gap-3 w-full md:w-auto">
                  <p className="text-xs text-slate-500 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    {activePlanData?.subscription?.subscriptionStatus === 'active' && String(activePlanData?.subscription?.planId) === String(selectedPlan?._id) && activePlanData?.subscription?.durationMonths === selectedDuration && selectedAddons.length === 0
                      ? t("You are currently subscribed to this exact plan.")
                      : t("Proceed to secure payment gateway.")}
                  </p>
                  <button 
                    onClick={handleCheckout}
                    disabled={checkoutLoading || (activePlanData?.subscription?.subscriptionStatus === 'active' && String(activePlanData?.subscription?.planId) === String(selectedPlan?._id) && activePlanData?.subscription?.durationMonths === selectedDuration && selectedAddons.length === 0)}
                    className={`w-full sm:w-auto font-bold py-3.5 px-8 rounded-lg transition-colors shadow-md flex items-center justify-center gap-2 ${
                      activePlanData?.subscription?.subscriptionStatus === 'active' && String(activePlanData?.subscription?.planId) === String(selectedPlan?._id) && activePlanData?.subscription?.durationMonths === selectedDuration && selectedAddons.length === 0
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default shadow-none'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-70'
                    }`}
                  >
                    {checkoutLoading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : activePlanData?.subscription?.subscriptionStatus === 'active' && String(activePlanData?.subscription?.planId) === String(selectedPlan?._id) && activePlanData?.subscription?.durationMonths === selectedDuration && selectedAddons.length === 0 ? (
                      <>
                        <BadgeCheck className="w-5 h-5" />
                        {t("Current Plan")}
                      </>
                    ) : (
                      <>
                        <Wallet className="w-4 h-4" />
                        {t("Proceed")}
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </button>
                </div>
              </div>
                </>
              )}
            </div>
          </div>
        )}

          
          {/* Important Disclaimers */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm relative overflow-hidden mb-8">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <AlertTriangle className="w-16 h-16 text-amber-500" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-2 text-xs text-amber-800 font-medium">
                <p className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0"></span>
                  {t("All prices are in INR and exclusive of applicable taxes (GST), where applicable.")}
                </p>
                <p className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0"></span>
                  {t("Showcase your freelance profile and receive direct calls or WhatsApp enquiries from verified clients—with your consent.")}
                </p>
                <p className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0"></span>
                  {t("Subscriptions renew automatically until cancelled by the user. You can cancel future renewals anytime before the next billing cycle.")}
                </p>
                <p className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0"></span>
                  {t("By subscribing, you agree to our Terms & Conditions, Privacy Policy, and Refund Policy.")}
                </p>
              </div>
              {/* <div className="flex-1 bg-white/60 p-4 rounded-xl border border-amber-100/50">
                <span className="font-bold text-amber-900 block mb-1 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" />
                  {t("AI disclaimer")}
                </span>
                <p className="text-xs text-amber-800/80 leading-relaxed">
                  {t("AI-generated scores, recommendations and career insights are intended to assist users and do not guarantee interviews, recruiter responses or employment outcomes.")}
                </p>
              </div> */}
            </div>
          </div>

        {/* Empty Comparison Table (Removed) */}

          {/* Bottom Bar */}
          {/* <div className="bg-white border border-emerald-100 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
            <div className="flex items-center gap-4">
              <div 
                role="button"
                tabIndex={0}
                onClick={() => setIsAutoSubscription(!isAutoSubscription)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${isAutoSubscription ? 'bg-emerald-600' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAutoSubscription ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-950">{t("Auto Subscription")}</p>
                <p className="text-xs text-slate-500">{t("Your plan will auto-renew at the end of each billing cycle.")}</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center md:justify-end items-center gap-3 sm:gap-6 text-xs font-bold text-slate-500 mt-4 md:mt-0">
              <div className="flex items-center gap-1.5 sm:gap-2"><ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />{t("100% Secure Payments")}</div>
              <div className="flex items-center gap-1.5 sm:gap-2"><RefreshCw className="w-4 h-4 text-emerald-600 shrink-0" />{t("Cancel Anytime")}</div>
              <div className="flex items-center gap-1.5 sm:gap-2"><BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0" />{t("7-Day Money Back Guarantee (T&C Apply)")}</div>
            </div>
          </div> */}

      {/* Configuration & Checkout Modal */}
      {/* Queue Warning Modal */}
      {queueModalData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col p-5 sm:p-7">
            <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-emerald-950">{t("Plan Queue Notice")}</h2>
            </div>
            <p className="text-sm sm:text-base text-slate-600 mb-6 sm:mb-8 leading-relaxed">
              {queueModalData.message}
            </p>
            <div className="flex justify-end gap-3 mt-auto">
              <button
                onClick={() => { setQueueModalData(null); setCheckoutLoading(false); }}
                className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-sm sm:text-base font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                {t("Cancel")}
              </button>
              <button
                onClick={async () => {
                  const data = queueModalData;
                  setQueueModalData(null);
                  setCheckoutLoading(true);
                  try {
                    await processCheckoutResponse(data.checkout, data.subscription, data.plan);
                  } catch(e) {
                    setCheckoutLoading(false);
                    toast.error("Error proceeding with checkout");
                  }
                }}
                className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-sm sm:text-base font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-600/20"
              >
                {t("Proceed to Payment")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Consent Modal */}
      {whatsappConsentOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col p-5 sm:p-7">
            <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <FaWhatsapp className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-emerald-950">{t("WhatsApp Alerts Consent")}</h2>
            </div>
            <p className="text-sm sm:text-base text-slate-600 mb-6 sm:mb-8 leading-relaxed">
              {t("By proceeding with the WhatsApp Alerts addon, your profile and contact details will be made publicly visible so recruiters can reach out to you directly.")}
            </p>
            
            <div className="flex flex-col gap-3 sm:gap-4 mb-6 sm:mb-8">
              <label className="flex items-start gap-3 sm:gap-4 cursor-pointer p-3 sm:p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={whatsappConsent1}
                  onChange={(e) => setWhatsappConsent1(e.target.checked)}
                  className="mt-1 w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-sm sm:text-base text-slate-700 font-medium leading-snug">
                  {t("I agree to show my profile publicly")}
                </span>
              </label>
              
              <label className="flex items-start gap-3 sm:gap-4 cursor-pointer p-3 sm:p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={whatsappConsent2}
                  onChange={(e) => setWhatsappConsent2(e.target.checked)}
                  className="mt-1 w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-sm sm:text-base text-slate-700 font-medium leading-snug">
                  {t("I agree to share my contact details with recruiters")}
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-3 mt-auto">
              <button
                onClick={() => { setWhatsappConsentOpen(false); setCheckoutLoading(false); }}
                className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-sm sm:text-base font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                {t("Cancel")}
              </button>
              <button
                onClick={() => {
                  setWhatsappConsentOpen(false);
                  handleCheckout();
                }}
                disabled={!whatsappConsent1 || !whatsappConsent2}
                className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-sm sm:text-base font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed transition-colors shadow-sm shadow-emerald-600/20"
              >
                {t("Accept & Continue")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col p-6">
            <h2 className="text-xl font-extrabold text-emerald-950 mb-2">{t("Cancel Subscription")}</h2>
            <p className="text-sm text-slate-500 mb-6">
              {t("Are you sure you want to cancel your active subscription? This will cancel your plan immediately and process a refund to your bank account.")}
            </p>
            
            <label className="flex items-start gap-3 cursor-pointer p-4 bg-red-50 border border-red-100 rounded-xl mb-6">
              <input
                type="checkbox"
                checked={cancelConfirmed}
                onChange={(e) => setCancelConfirmed(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-red-600 rounded border-red-300 focus:ring-red-500 cursor-pointer"
              />
              <span className="text-sm text-red-800 font-medium leading-tight">
                {t("I understand that my plan will be cancelled immediately and I will lose access to premium features.")}
              </span>
            </label>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                {t("Keep My Plan")}
              </button>
              <button
                onClick={proceedCancelPlan}
                disabled={!cancelConfirmed}
                className="px-5 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors"
              >
                {t("Cancel Subscription")}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default ProviderPlans;
