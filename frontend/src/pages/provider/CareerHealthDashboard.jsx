import useTranslation from "../../hooks/useTranslation";
import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  HiOutlineArrowLeft, HiOutlineDownload, HiCheckCircle, HiArrowUp, HiArrowDown
} from 'react-icons/hi';
import { 
  FiCheck, FiTarget, FiAlertCircle, FiLock, FiClock
} from 'react-icons/fi';
import { 
  BiTrophy, BiBriefcase, BiLineChart, BiMessageRoundedDots 
} from 'react-icons/bi';
import { MdOutlineWorkOutline, MdOutlineMenuBook, MdOutlineMonitor, MdOutlineHandshake, MdOutlineLocationOn } from 'react-icons/md';
import { getCareerHealth, getAiUsage, improveCareerHealth } from '../../services/providerAIService';
import { providerAPI } from '../../services/api';
import { getCurrentSubscription } from '../../services/providerPlanService';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from 'recharts';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

const getCurrencyCode = (country) => {
  if (!country) return 'INR';
  const c = country.toLowerCase();
  if (c.includes('united states') || /\b(us|usa)\b/.test(c)) return 'USD';
  if (c.includes('united kingdom') || /\b(uk)\b/.test(c)) return 'GBP';
  if (c.includes('europe') || /\b(eu)\b/.test(c)) return 'EUR';
  if (c.includes('canada')) return 'CAD';
  if (c.includes('australia')) return 'AUD';
  return 'INR'; // default fallback
};

const getLocale = (currency) => {
  switch(currency) {
    case 'USD': return 'en-US';
    case 'GBP': return 'en-GB';
    case 'EUR': return 'en-IE';
    case 'CAD': return 'en-CA';
    case 'AUD': return 'en-AU';
    default: return 'en-IN';
  }
};

const formatSalaryByCountry = (salaryString, country) => {
  if (!salaryString || salaryString === 'N/A') return 'N/A';
  let s = salaryString.toString();
  
  const targetCurrency = getCurrencyCode(country);
  const targetLocale = getLocale(targetCurrency);

  if (s.includes('₹') || s.toLowerCase().includes('inr')) {
    if (targetCurrency === 'INR') return s;
  }
  
  if (s.includes('$') || s.toLowerCase().includes('usd')) {
    return s.replace(/\$?([\d,]+)(k|m)?\s*(usd)?/ig, (match, numStr, multiplier) => {
      let num = parseFloat(numStr.replace(/,/g, ''));
      let valInUSD = num;
      if (multiplier) {
        if (multiplier.toLowerCase() === 'k') valInUSD *= 1000;
        if (multiplier.toLowerCase() === 'm') valInUSD *= 1000000;
      }
      
      let convertedValue = valInUSD;
      if (targetCurrency === 'INR') convertedValue = valInUSD * 84;
      
      return new Intl.NumberFormat(targetLocale, { style: 'currency', currency: targetCurrency, maximumFractionDigits: 0 }).format(convertedValue);
    });
  }
  if (/^\d/.test(s.trim())) {
    return s.split('-').map(part => {
      let n = parseFloat(part.replace(/,/g, ''));
      return isNaN(n) ? part : new Intl.NumberFormat(targetLocale, { style: 'currency', currency: targetCurrency, maximumFractionDigits: 0 }).format(n);
    }).join(' - ');
  }
  return s;
};

export default function CareerHealthDashboard({ tab = 'overview' }) {
  const {
    t
  } = useTranslation();

  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [salaryDetails, setSalaryDetails] = useState(null);
  const [loadingSalary, setLoadingSalary] = useState(false);
  const [improving, setImproving] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [aiUsage, setAiUsage] = useState({ limits: {}, usage: {} });
  const [usageLoading, setUsageLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);

  const { state } = location;
  const fileHash = state?.fileHash || localStorage.getItem('lastResumeHash');
  const parsedData = state?.parsedData;

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const planRes = await getCurrentSubscription();
        const activePlan = planRes?.subscription || planRes || {};
        const planStatus = activePlan?.subscriptionStatus || activePlan?.status || 'active';
        const tier = activePlan?.planSnapshot?.slug || activePlan?.planName || activePlan?.plan || activePlan?.tier || 'free';
        const isUserPro = planStatus === 'active' && String(tier).toLowerCase() !== 'free';
        setIsPro(isUserPro);
        
        await fetchUsage();
        if (isUserPro) {
          await fetchReport();
        } else {
          setReport({
            career_health_score: 74,
            market_demand_score: 82,
            employability_breakdown: { experience_relevance: 68 },
            salary_growth_score: 78,
            target_role: 'Software Engineer',
            expected_salary_range: '₹12,00,000 - ₹18,00,000',
            summary: 'Your career profile is strong but has areas for improvement.',
            top_strengths: ['JavaScript', 'React', 'Problem Solving', 'Team Collaboration'],
            top_weaknesses: ['Cloud Architecture', 'System Design'],
            radar_data: [
              { subject: 'Skills', A: 80, fullMark: 100 },
              { subject: 'Experience', A: 70, fullMark: 100 },
              { subject: 'Market', A: 85, fullMark: 100 },
              { subject: 'Growth', A: 75, fullMark: 100 }
            ],
            role_fit_breakdown: [
              { name: 'Technical Skills', score: 85, benchmark: 90 },
              { name: 'Experience Level', score: 70, benchmark: 80 },
              { name: 'Domain Knowledge', score: 75, benchmark: 85 }
            ],
            skills_to_improve: [
              { name: 'System Design', score: 45, impact: 'High Impact', impactColor: 'text-red-700' },
              { name: 'AWS', score: 55, impact: 'Medium Impact', impactColor: 'text-amber-500' }
            ],
            in_demand_skills: ['React', 'Node.js', 'AWS', 'TypeScript', 'GraphQL'],
            market_insights: {
              jobsInDemand: '15,000+',
              jobsGrowth: '+12% YoY',
              avgSalary: '₹14,50,000',
              salaryGrowth: '+8% YoY',
              topCities: 'Bengaluru, Pune, Hyderabad'
            },
            career_growth_path: [
              { role: 'Senior Software Engineer', timeline: '1-2 years' },
              { role: 'Tech Lead', timeline: '3-5 years' }
            ],
            ai_tip: 'Focus on System Design and Cloud Architecture to boost your profile for senior roles.'
          });
          setSalaryDetails({ minWage: 1200000, maxWage: 1800000, avgWage: 1500000 });
          setLoading(false);
        }
      } catch (err) {
        console.error('Init error', err);
        setLoading(false);
      }
    };
    init();
  }, [fileHash, parsedData]);

  const fetchUsage = async () => {
    try {
      setUsageLoading(true);
      const { data } = await getAiUsage();
      if (data.success) {
        setAiUsage({ limits: data.limits || {}, usage: data.usage || {} });
      }
    } catch (error) {
      console.error('Failed to fetch AI usage', error);
    } finally {
      setUsageLoading(false);
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      
      const { data } = await getCareerHealth({ fileHash, parsedData });
      if (data.success) {
        setReport(data.data);
        if (fileHash) {
          localStorage.setItem('lastResumeHash', fileHash);
        }
      }
    } catch (error) {
      console.error("Failed to fetch career health report:", error);
      if (error.response?.data?.code === 'REQUIRED_DATA_MISSING') {
        setErrorMessage(error.response.data.message);
      } else {
        toast.error("Failed to generate career health report.");
        setErrorMessage("An error occurred while loading your AI Career Health Report.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImprove = async () => {
    try {
      setImproving(true);
      const { data } = await improveCareerHealth({ fileHash, parsedData, improve: true });
      if (data.success) {
        setReport(data.data);
        toast.success('AI Career Health updated with improved insights!');
        setTimeout(() => fetchUsage(), 500);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to generate improved insights.';
      toast.error(msg);
    } finally {
      setImproving(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!report) {
      toast.error("No report data available to download.");
      return;
    }
    
    toast.loading("Generating Custom PDF Report...", { id: "pdf-toast" });
    
    try {
      const { jsPDF } = await import('jspdf');
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      });
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;
      let cursorY = margin;

      const addWrappedText = (text, x, y, maxWidth, lineHeight = 14) => {
        if (!text) return 0;
        const lines = doc.splitTextToSize(String(text), maxWidth);
        doc.text(lines, x, y);
        return lines.length * lineHeight;
      };

      // Header background
      doc.setFillColor(5, 150, 105); // Emerald-600
      doc.rect(0, 0, pageWidth, 100, 'F');
      
      // Header text
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("Lucohire Career Health Report", margin, 50);
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, 75);
      
      cursorY = 140;
      
      // Section: Overview
      doc.setTextColor(30, 41, 59); // Slate-800
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("1. Executive Summary", margin, cursorY);
      cursorY += 25;
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105); // Slate-600
      const summaryText = report.summary || "No summary available.";
      cursorY += addWrappedText(summaryText, margin, cursorY, pageWidth - margin * 2);
      
      cursorY += 20;

      // Section: Core Metrics
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("2. Career Metrics", margin, cursorY);
      cursorY += 25;
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      const metrics = [
        `Overall Career Health: ${report.career_health_score || report.employability_score || 0}/100`,
        `Market Demand Score: ${report.market_demand_score || 0}/100`,
        `Expected Salary Range: ${report.expected_salary_range || 'N/A'}`,
        `Target Role: ${report.target_role || 'Not specified'}`
      ];
      
      metrics.forEach(m => {
        doc.circle(margin + 5, cursorY - 4, 3, 'F');
        doc.text(m, margin + 15, cursorY);
        cursorY += 20;
      });
      
      cursorY += 20;

      const checkPageBreak = (neededSpace) => {
        if (cursorY + neededSpace > pageHeight - 50) {
          doc.addPage();
          cursorY = margin;
        }
      };

      // Section: Strengths & Weaknesses
      if (report.top_strengths?.length > 0) {
        checkPageBreak(100);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("3. Key Strengths", margin, cursorY);
        cursorY += 25;
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        report.top_strengths.forEach(s => {
          checkPageBreak(25);
          doc.circle(margin + 5, cursorY - 4, 3, 'F');
          cursorY += addWrappedText(s.skill || s.title || s.name || s, margin + 15, cursorY, pageWidth - margin * 2 - 15);
        });
        cursorY += 20;
      }
      
      if (report.top_weaknesses?.length > 0) {
        checkPageBreak(100);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("4. Areas for Improvement", margin, cursorY);
        cursorY += 25;
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        report.top_weaknesses.forEach(w => {
          checkPageBreak(25);
          doc.circle(margin + 5, cursorY - 4, 3, 'F');
          cursorY += addWrappedText(w.skill || w.title || w.name || w, margin + 15, cursorY, pageWidth - margin * 2 - 15);
        });
        cursorY += 20;
      }

      // Section: AI Recommendation
      if (report.ai_tip) {
         checkPageBreak(100);
         doc.setFillColor(241, 245, 249); // slate-100
         doc.rect(margin, cursorY, pageWidth - margin * 2, 80, 'F');
         cursorY += 20;
         doc.setTextColor(30, 41, 59);
         doc.setFontSize(14);
         doc.setFont("helvetica", "bold");
         doc.text("AI Recommendation", margin + 15, cursorY);
         cursorY += 20;
         
         doc.setFontSize(11);
         doc.setFont("helvetica", "italic");
         cursorY += addWrappedText(report.ai_tip, margin + 15, cursorY, pageWidth - margin * 2 - 30);
      }
      
      // Footer
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(`Page ${i} of ${totalPages} - Lucohire Confidential`, pageWidth / 2, pageHeight - 20, { align: 'center' });
      }
      
      doc.save(`Career_Health_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast.dismiss("pdf-toast");
      toast.success("Custom PDF Report generated successfully!");
    } catch (err) {
      console.error("PDF Error:", err);
      toast.dismiss("pdf-toast");
      toast.error(`Failed: ${err.message || String(err)}`);
    }
  };

  const fetchSalaryDetails = async (role) => {
    if (salaryDetails || !isPro) return;
    try {
      setLoadingSalary(true);
      const profileSkills = report?.top_strengths ? report.top_strengths.slice(0, 3).map(s => typeof s === 'string' ? s : s.name || s.skill).join(', ') : '';
      const skillString = role + (profileSkills ? ` with skills: ${profileSkills}` : '');
      const userLocationStr = typeof user?.location === 'string' ? user.location : '';
      let baseCountry = user?.location?.country || user?.country || user?.profile?.country || user?.profile?.location?.country;
      let userCountry = (typeof baseCountry === 'string' && baseCountry.trim()) ? baseCountry : "India";
      let userCity = user?.location?.city || user?.city || user?.profile?.city || user?.profile?.location?.city;
      if (!userCity && user?.locations?.[0]) {
        userCity = typeof user.locations[0] === 'string' ? user.locations[0] : user.locations[0].city || user.locations[0].name || '';
      }
      if (['us', 'usa', 'united states'].includes(userCountry.toLowerCase())) {
        userCountry = "India"; // Override dummy DB data for testing
        userCity = ""; // Clear city to avoid "New York, India" confusion
      }
      const loc = userCountry || userCity || report?.location || report?.city || 'India';
      
      const res = await providerAPI.getWageEstimate({
        skill: skillString,
        cityName: '', // Clear city to allow AI to generate top Indian cities generally
        country: 'India', // Force India based on user requirement for Indian cities
        pricingType: 'yearly'
      });
      if (res.data?.success) {
        setSalaryDetails(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to fetch real-time salary insights.');
    } finally {
      setLoadingSalary(false);
    }
  };

  useEffect(() => {
    if (report && report.target_role) {
      fetchSalaryDetails(report.target_role);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report]);

  const displayData = report || {};

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-[#059669] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-semibold text-gray-500">{t("Analyzing your career profile...")}</p>
      </div>
    );
  }

  // --- Dynamic Data Mapping with Fallbacks ---
  const healthScore = displayData.career_health_score || displayData.employability_score || 0;
  const growthScore = displayData.salary_growth_score || 0;
  const marketScore = displayData.market_demand_score || 0;
  const expScore = displayData.employability_breakdown?.experience_relevance || displayData.experience_relevance_score || 0;
  const overallFit = displayData.overall_fit_score || 0;
  const targetRole = displayData.target_role || "Target Role";
  const expectedSalary = displayData.expected_salary_range || "N/A";
  const aiTip = displayData.ai_tip || "Update your profile description to get personalized AI tips.";

  const strengths = displayData.top_strengths?.length > 0 
    ? displayData.top_strengths.slice(0, 4) 
    : [];

  const weaknesses = displayData.top_weaknesses?.length > 0
    ? displayData.top_weaknesses.slice(0, 4)
    : [];

  const radarData = displayData.radar_data || [];

  const roleFitIcons = [MdOutlineMenuBook, MdOutlineWorkOutline, BiBriefcase, MdOutlineMonitor, FiTarget, MdOutlineHandshake];
  const roleFitFactors = displayData.role_fit_breakdown?.map((factor, idx) => ({
    ...factor,
    icon: roleFitIcons[idx % roleFitIcons.length]
  })) || [];

  const marketDemandData = displayData.market_demand_trend || [];

  const skillsToImprove = displayData.skills_to_improve || [];

  const inDemandSkills = displayData.in_demand_skills || [];

  const timelineRoles = displayData.career_growth_path || [];

  const marketInsights = displayData.market_insights || {
    jobsInDemand: "N/A",
    jobsGrowth: "N/A",
    avgSalary: "N/A",
    salaryGrowth: "N/A",
    topCities: "N/A"
  };

  let baseCountry = user?.location?.country || user?.country || user?.profile?.country || user?.profile?.location?.country;
  let userCountry = (typeof baseCountry === 'string' && baseCountry.trim()) ? baseCountry : "India";
  if (['us', 'usa', 'united states'].includes(userCountry.toLowerCase())) {
    userCountry = "India";
  }

  return (
    <div className="w-full bg-[#f8fafc] min-h-screen text-slate-800 pb-24 font-sans">
      <div className="w-full p-4 md:p-6 lg:p-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <Link to="/provider/dashboard" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 font-medium mb-3">
              <HiOutlineArrowLeft className="w-4 h-4" />{t("Back to AI Dashboard")}</Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{t("Career Analysis")}</h1>
              <span className="bg-emerald-50 text-emerald-600 text-xs font-bold px-2 py-1 rounded-md border border-emerald-100">
                {(aiUsage.limits?.careerHealth === -1 || aiUsage.limits?.careerHealth > 0) ? 'Pro' : 'Beta'}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">{t("Deep AI insights about your career growth and opportunities")}</p>
          </div>
          <button
            onClick={handleDownloadReport}
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <HiOutlineDownload className="w-4 h-4" />
            {t("Export Report")}
          </button>
        </div>

        <div id="report-content" className="pt-2">
        {/* Usage Banner */}
        {!usageLoading && (
          <div className="bg-white border border-slate-200 p-3 md:px-6 md:py-3 rounded-2xl flex items-center justify-between gap-3 md:gap-2 shadow-sm mb-6">
            <div className="flex flex-col md:flex-row md:items-center gap-0.5 md:gap-2">
              <Sparkles className="hidden md:block w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-[13px] md:text-sm font-medium text-emerald-900 mr-1 md:mr-0">{t("Career Health AI Limit:")}</span>
              {(() => {
                const limit = aiUsage.limits['careerHealth'] || 0;
                const used = aiUsage.usage['careerHealth'] || 0;
                if (limit === -1) return <span className="text-[12px] md:text-sm font-bold text-emerald-700">{t("Unlimited")}</span>;
                if (limit === 0) return <span className="text-[12px] md:text-sm font-bold text-red-600">{t("Not included")}</span>;
                return (
                  <span className="text-[12px] md:text-sm font-bold text-emerald-700">
                    {Math.max(0, limit - used)}/{limit} {t("requests remaining")}
                  </span>
                );
              })()}
            </div>
            
            <div className="flex items-center gap-2">
              {isPro && (
                <button
                  onClick={handleImprove}
                  disabled={improving || (aiUsage.limits['careerHealth'] !== -1 && aiUsage.usage['careerHealth'] >= aiUsage.limits['careerHealth'])}
                  className="shrink-0 flex items-center justify-center text-center text-[11px] md:text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 md:py-1 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
                >
                  {improving ? (
                    <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>{t("Refreshing...")}</>
                  ) : (
                    <><Sparkles className="w-3 h-3 mr-1 hidden sm:block" />{t("Refresh")}</>
                  )}
                </button>
              )}
              <Link to="/provider/plans" className="shrink-0 flex items-center justify-center text-center text-[11px] md:text-xs font-black text-emerald-700 hover:text-emerald-900 bg-emerald-100 px-3 md:px-3 py-1 md:py-1 rounded-lg transition-colors whitespace-nowrap">{t("Upgrade Plan")}</Link>
            </div>
          </div>
        )}

        <div className="relative">
          <div className="transition-all duration-300">
          {/* Top Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {/* Card 1: Health Score */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-slate-700">{t("Career Health Score")}</span>
              <FiAlertCircle className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 shrink-0">
                <div className={!isPro ? 'blur-[6px] opacity-70 select-none' : ''}>
                  <CircularProgressbar 
                    value={healthScore} 
                    text={`${healthScore}%`}
                    styles={buildStyles({
                      textSize: '24px',
                      pathColor: '#059669',
                      textColor: '#059669',
                      trailColor: '#ecfdf5',
                      pathTransitionDuration: 0.5,
                    })}
                  />
                </div>
              </div>
              <div>
                <div className={`text-emerald-600 font-bold ${!isPro ? 'blur-[5px] opacity-70 select-none' : ''}`}>{healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : 'Fair'}</div>
              </div>
            </div>
            <div className={`text-xs font-medium text-slate-500 mt-4 leading-relaxed ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>
              {displayData.summary || "AI is analyzing your profile to generate a detailed summary."}
            </div>
          </div>

          {/* Card 2: Market Demand */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="text-sm font-semibold text-slate-700 mb-2">{t("Market Demand")}</div>
            <div>
              <div className={`text-xl font-bold text-emerald-600 ${!isPro ? 'blur-[5px] opacity-70 select-none' : ''}`}>{marketScore >= 80 ? 'High' : marketScore >= 60 ? 'Medium' : 'Low'}</div>
              <div className={`text-xs text-slate-500 mt-1 ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>{marketScore >= 80 ? 'Excellent opportunities in your field' : marketScore >= 60 ? 'Moderate opportunities available' : 'Tough market conditions'}</div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div className="text-left sm:text-center bg-slate-50 rounded p-1.5 border border-slate-100">
                <div className="text-[10px] text-slate-500 font-medium">{t("Job Trend")}</div>
                <div className={`text-xs font-bold text-slate-700 ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>{displayData.market_demand_breakdown?.job_openings_trend || 0}/100</div>
              </div>
              <div className="text-left sm:text-center bg-slate-50 rounded p-1.5 border border-slate-100">
                <div className="text-[10px] text-slate-500 font-medium">{t("Remote")}</div>
                <div className={`text-xs font-bold text-slate-700 ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>{displayData.market_demand_breakdown?.remote_opportunities || 0}/100</div>
              </div>
              <div className="text-left sm:text-center bg-slate-50 rounded p-1.5 border border-slate-100">
                <div className="text-[10px] text-slate-500 font-medium">{t("Growth")}</div>
                <div className={`text-xs font-bold text-slate-700 ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>{displayData.market_demand_breakdown?.industry_growth_rate || 0}/100</div>
              </div>
            </div>
          </div>

          {/* Card 3: Experience Relevance */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="text-sm font-semibold text-slate-700 mb-2">{t("Experience Relevance")}</div>
            <div>
              <div className={`text-xl font-bold text-emerald-600 ${!isPro ? 'blur-[5px] opacity-70 select-none' : ''}`}>{expScore >= 70 ? 'Good' : 'Needs Improvement'}</div>
              <div className={`text-xs text-slate-500 mt-1 ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>{expScore >= 70 ? 'Strong alignment with target roles' : 'Needs more relevant experience'}</div>
            </div>
            <div className="mt-4">
              <div className={`text-sm font-bold text-emerald-600 mb-1 ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>{expScore}%</div>
              <div className={`w-full bg-slate-100 rounded-full h-1.5 ${!isPro ? 'blur-[3px] opacity-80' : ''}`}>
                <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${expScore}%` }}></div>
              </div>
            </div>
          </div>

          {/* Card 4: Growth Potential */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="text-sm font-semibold text-slate-700 mb-2">{t("Growth Potential")}</div>
            <div>
              <div className={`text-xl font-bold text-emerald-600 ${!isPro ? 'blur-[5px] opacity-70 select-none' : ''}`}>{growthScore >= 80 ? 'High' : growthScore >= 60 ? 'Medium' : 'Low'}</div>
              <div className={`text-xs text-slate-500 mt-1 ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>{growthScore >= 80 ? 'Strong growth path ahead' : growthScore >= 60 ? 'Steady growth potential' : 'Limited growth in current path'}</div>
            </div>
            <div className="mt-4">
              <div className={`text-sm font-bold text-emerald-600 mb-1 ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>{growthScore}%</div>
              <div className={`w-full bg-slate-100 rounded-full h-1.5 ${!isPro ? 'blur-[3px] opacity-80' : ''}`}>
                <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${growthScore}%` }}></div>
              </div>
            </div>
          </div>

          {/* Card 5: Salary Potential */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="text-sm font-semibold text-slate-700 mb-2">{t("Salary Potential")}</div>
            <div>
              <div className={`text-xl font-bold text-slate-800 ${!isPro ? 'blur-[5px] opacity-70 select-none' : ''}`}>
                {loadingSalary ? (
                  <div className="flex items-center gap-2 py-1">
                    <div className="w-4 h-4 border-2 border-slate-300 border-t-emerald-600 rounded-full animate-spin"></div>
                    <span className="text-sm text-slate-400 font-normal">{t("Fetching...")}</span>
                  </div>
                ) : salaryDetails ? (
                  <span className="text-emerald-600">
                    {new Intl.NumberFormat(getLocale(getCurrencyCode(userCountry)), { style: 'currency', currency: getCurrencyCode(userCountry), maximumFractionDigits: 0 }).format(salaryDetails.minWage)} - {new Intl.NumberFormat(getLocale(getCurrencyCode(userCountry)), { style: 'currency', currency: getCurrencyCode(userCountry), maximumFractionDigits: 0 }).format(salaryDetails.maxWage)}
                  </span>
                ) : (
                  formatSalaryByCountry(expectedSalary, userCountry)
                )}
              </div>
              <div className="text-xs text-slate-500 mt-1">{t("Expected salary range")}<br/>{t("for")}<span className={!isPro ? 'blur-[3px] opacity-80 select-none' : ''}> {targetRole}</span></div>
            </div>
            {salaryDetails && !loadingSalary && (
              <div className={`text-[10px] text-slate-400 mt-2 font-medium uppercase tracking-wide flex items-center gap-1 ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>
                <Sparkles className="w-3 h-3 text-emerald-500" />{t("Average:")}{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(salaryDetails.avgWage)}
              </div>
            )}
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT COLUMN (Spans 2/3) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Career Fit & Breakdown Box */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row overflow-hidden">
              {/* Radar Chart Area */}
              <div className="p-6 border-b md:border-b-0 md:border-r border-slate-100 flex-1 relative">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-slate-800">{t("Career Fit Overview")}</h3>
                  <FiAlertCircle className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-xs text-slate-500 mb-4">{t("How well your profile fits your target role:")}{targetRole}</p>
                
                <div className={`h-[240px] w-full ${!isPro ? 'blur-[6px] opacity-70 select-none pointer-events-none' : ''}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11 }} />
                      <Radar name="Profile" dataKey="A" stroke="#059669" fill="#059669" fillOpacity={0.2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Overall Fit Badge */}
                <div className={`absolute right-4 bottom-4 md:right-8 md:bottom-1/4 bg-white border border-slate-100 p-3 rounded-lg shadow-sm text-center ${!isPro ? 'blur-[5px] opacity-70 select-none' : ''}`}>
                  <div className="text-xs text-slate-500 font-medium">{t("Overall Fit")}</div>
                  <div className="text-2xl font-bold text-emerald-600 my-0.5">{overallFit}%</div>
                  <div className="text-[10px] font-bold text-emerald-600">{overallFit >= 80 ? 'Strong Match' : overallFit >= 60 ? 'Good Match' : 'Fair Match'}</div>
                </div>
              </div>

              {/* Breakdown Area */}
              <div className="p-6 flex-1 flex flex-col bg-slate-50/30">
                <h3 className="font-semibold text-slate-800 mb-4">{t("Role Fit Breakdown")}</h3>
                
                <div className="flex text-xs font-semibold text-slate-400 mb-3 px-1">
                  <div className="flex-1 min-w-0">{t("Factor")}</div>
                  <div className="w-20 text-right shrink-0">{t("Your Score")}</div>
                  <div className="w-20 text-right shrink-0">{t("Benchmark")}</div>
                </div>

                <div className="space-y-4 mb-6">
                  {roleFitFactors.slice(0, 3).map((factor, idx) => {
                    const IconComponent = factor.icon || roleFitIcons[idx % roleFitIcons.length];
                    return (
                    <div key={idx} className="flex items-center text-sm">
                      <div className="flex-1 flex items-center gap-2 text-slate-600 min-w-0 pr-2">
                        <IconComponent className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className={`truncate ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>{factor.name}</span>
                      </div>
                      <div className="w-20 flex items-center gap-2 shrink-0">
                        <div className={`w-12 bg-slate-200 h-1.5 rounded-full overflow-hidden ${!isPro ? 'blur-[3px] opacity-80' : ''}`}>
                          <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${factor.score}%` }}></div>
                        </div>
                        <span className={`font-semibold text-slate-700 text-xs ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>{factor.score}%</span>
                      </div>
                      <div className="w-20 flex items-center gap-2 justify-end shrink-0">
                        <div className={`w-12 bg-slate-200 h-1.5 rounded-full overflow-hidden hidden sm:block ${!isPro ? 'blur-[3px] opacity-80' : ''}`}>
                          <div className="bg-slate-400 h-full rounded-full" style={{ width: `${factor.benchmark}%` }}></div>
                        </div>
                        <span className={`text-slate-500 text-xs ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>{factor.benchmark}%</span>
                      </div>
                    </div>
                  )})}
                </div>

                {isPro && (
                  <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-xs text-emerald-800">{t(
                    "Great! You are strongly aligned with this role. Focus on improving the areas on the right to become an excellent fit."
                  )}</div>
                )}
                
                {roleFitFactors.length > 3 && (
                  <button onClick={() => isPro && setActiveModal('breakdown')} className={`text-emerald-600 text-sm font-semibold text-center mt-4 hover:text-emerald-700 w-full ${!isPro ? 'opacity-50 cursor-not-allowed' : ''}`}>{t("View Detailed Breakdown →")}</button>
                )}
              </div>
            </div>

            {/* Bottom Row inside Left Column */}
            <div className="flex flex-col gap-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top Skills to Improve */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-full flex flex-col">
                  <h3 className="font-semibold text-slate-800 mb-1">{t("Top Skills to Improve")}</h3>
                  <p className="text-xs text-slate-500 mb-5">{t("Improve these skills to increase your match score")}</p>
                  
                  <div className="space-y-4 flex-1">
                    {skillsToImprove.map((skill, i) => (
                      <div key={i} className="flex items-start justify-between pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                        <div className="flex-1 pr-3">
                          <div className="flex items-start gap-2 text-sm text-slate-700 mb-2">
                            <FiLock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-1" />
                            <span className={`leading-tight font-medium ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>{skill.name}</span>
                          </div>
                          <div className={`w-full bg-slate-100 h-1.5 rounded-full mt-1 ${!isPro ? 'blur-[3px] opacity-80' : ''}`}>
                            <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${skill.score}%` }}></div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0 w-[45%]">
                          <span className={`text-sm font-bold text-slate-700 ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>{skill.score}%</span>
                          <span className={`text-[10px] font-bold text-right leading-snug mt-1 ${skill.impactColor || 'text-slate-500'} ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>{skill.impact || 'High Impact'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* In-Demand Skills */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-full flex flex-col">
                  <h3 className="font-semibold text-slate-800 mb-1 break-words">{t("In-Demand Skills for")} <span className={!isPro ? 'blur-[4px] opacity-80 select-none' : ''}>{targetRole}</span></h3>
                  <p className="text-xs text-slate-500 mb-4">{t("Skills in high demand in the market")}</p>
                  
                  <div className={`flex flex-wrap gap-2 mb-4 transition-all duration-300 flex-1 content-start ${!isPro ? 'blur-[5px] opacity-70 select-none' : ''}`}>
                    {inDemandSkills.slice(0, showAllSkills ? undefined : 6).map((sk, i) => (
                      <span key={i} className="px-4 py-2 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-full border border-emerald-100">
                        {sk}
                      </span>
                    ))}
                  </div>

                  {inDemandSkills.length > 6 && (
                    <button 
                      onClick={() => isPro && setShowAllSkills(!showAllSkills)} 
                      className={`text-emerald-600 text-sm font-semibold w-full text-left hover:text-emerald-700 mt-2 ${!isPro ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {showAllSkills ? t("Show Less ↑") : t("Explore All Skills ↓")}
                    </button>
                  )}
                </div>
              </div>

              {/* Market Insights */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 w-full">
                <h3 className="font-semibold text-slate-700 mb-1">{t("Market Insights")}</h3>
                <p className="text-xs text-slate-400 mb-6 truncate">{targetRole} • {userCountry}</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="flex items-start gap-4 p-4 rounded-lg bg-slate-50/70 border border-slate-100/70">
                    <div className="mt-1 shrink-0"><BiBriefcase className="w-5 h-5 text-emerald-500" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium tracking-wide uppercase text-slate-400 mb-1">{t("Jobs in demand")}</div>
                      <div className={`flex flex-col ${!isPro ? 'blur-[5px] opacity-70 select-none' : ''}`}>
                        <span className="text-lg font-semibold text-slate-700 break-words leading-tight">{marketInsights.jobsInDemand}</span>
                        <span className="text-xs font-medium text-emerald-600 mt-1">{marketInsights.jobsGrowth}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 rounded-lg bg-slate-50/70 border border-slate-100/70">
                    <div className="mt-1 shrink-0"><FiAlertCircle className="w-5 h-5 text-emerald-500" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium tracking-wide uppercase text-slate-400 mb-1">{t("Avg. Salary")}</div>
                      <div className={`flex flex-col ${!isPro ? 'blur-[5px] opacity-70 select-none' : ''}`}>
                        <span className="text-lg font-semibold text-slate-700 break-words leading-tight">{salaryDetails?.avgWage ? formatSalaryByCountry(salaryDetails.avgWage, userCountry) : formatSalaryByCountry(marketInsights.avgSalary, userCountry)}</span>
                        <span className="text-xs font-medium text-emerald-600 mt-1">{marketInsights.salaryGrowth}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 rounded-lg bg-slate-50/70 border border-slate-100/70">
                    <div className="mt-1 shrink-0"><BiLineChart className="w-5 h-5 text-emerald-500" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium tracking-wide uppercase text-slate-400 mb-1">{t("Top Cities")}</div>
                      <div className={`text-[15px] font-medium text-slate-600 leading-tight mt-1 truncate ${!isPro ? 'blur-[5px] opacity-70 select-none' : ''}`}>
                        {salaryDetails?.topCities?.length ? salaryDetails.topCities.join(", ") : marketInsights.topCities}
                      </div>
                    </div>
                  </div>
                </div>

                {!isPro ? (
                  <button 
                    onClick={() => navigate('/provider/plans')} 
                    className="w-full md:w-auto px-8 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-lg shadow-sm hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition-all font-semibold flex items-center justify-center gap-2 group mx-auto"
                  >
                    <FiLock className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                    {t("Unlock Full Market Report")}
                  </button>
                ) : (
                  <button 
                    onClick={() => setActiveModal('market')} 
                    className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg shadow-sm hover:shadow-md hover:from-emerald-600 hover:to-teal-600 transition-all font-semibold flex items-center justify-center gap-2 group mx-auto"
                  >
                    <BiLineChart className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    {t("View Full Market Report")}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (Spans 1/3) */}
          <div className="space-y-6">
            
            {/* Key Strengths */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <BiTrophy className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-lg">{t("Key Strengths")}</h3>
              </div>
              <ul className={`space-y-3 mb-6 ${!isPro ? 'blur-[5px] opacity-70 select-none' : ''}`}>
                {strengths.map((str, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                    <FiCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
              {displayData.top_strengths?.length > 4 && (
                <button onClick={() => setActiveModal('strengths')} className="w-full py-2 text-center text-sm font-semibold text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors">{t("See All Strengths →")}</button>
              )}
            </div>

            {/* Areas to Improve */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <BiLineChart className="w-5 h-5 text-red-700" />
                <h3 className="font-bold text-slate-800 text-lg">{t("Areas to Improve")}</h3>
              </div>
              <ul className={`space-y-3 mb-6 ${!isPro ? 'blur-[5px] opacity-70 select-none' : ''}`}>
                {weaknesses.map((wk, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                    <FiCheck className="w-4 h-4 text-red-700 mt-0.5 shrink-0" />
                    <span>{wk}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Career Growth Path */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-5 h-5 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-emerald-600 rounded-sm"></div>
                </div>
                <h3 className="font-bold text-slate-800 text-lg">{t("Career Growth Path")}</h3>
              </div>
              
              <div className="relative pl-3 mb-6">
                {/* Vertical Line */}
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-200"></div>
                
                <ul className="space-y-6">
                  {timelineRoles.slice(0, 3).map((role, i) => (
                    <li key={i} className="relative flex items-center gap-4">
                      {role.current ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0 z-10 shadow-[0_0_0_4px_white]"></div>
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full border-2 border-slate-300 bg-white shrink-0 z-10 shadow-[0_0_0_4px_white]"></div>
                      )}
                      
                      <div className="flex-1 flex justify-between items-center">
                        <span className={`text-sm ${role.current ? 'font-bold text-slate-800' : 'text-slate-600'} ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>
                          {role.title}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          role.status === 'Current' ? 'bg-emerald-100 text-emerald-700' :
                          role.status === 'Next Step' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'
                        } ${!isPro ? 'blur-[4px] opacity-80 select-none' : ''}`}>
                          {role.status}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              
              <button onClick={() => setActiveModal('roadmap')} className="text-emerald-600 text-sm font-semibold w-full text-center hover:text-emerald-700">{t("View Full Roadmap →")}</button>
            </div>
          </div>
        </div>
        </div>
          
        </div>
        
        </div>
      </div>
      
      {/* POPUP MODALS */}
      {activeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 animate-fadeIn" onClick={() => setActiveModal(null)}>
          <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-xl flex flex-col overflow-hidden relative animate-slideUp" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white z-10 sticky top-0">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                {activeModal === 'breakdown' && <FiTarget className="w-5 h-5 text-emerald-600" />}
                {activeModal === 'skills' && <BiBriefcase className="w-5 h-5 text-emerald-600" />}
                {activeModal === 'market' && <BiLineChart className="w-5 h-5 text-emerald-600" />}
                {activeModal === 'strengths' && <BiTrophy className="w-5 h-5 text-emerald-600" />}
                {activeModal === 'improvement' && <FiAlertCircle className="w-5 h-5 text-red-700" />}
                {activeModal === 'roadmap' && <MdOutlineLocationOn className="w-5 h-5 text-emerald-600" />}
                
                {activeModal === 'breakdown' && t("Detailed Role Fit Breakdown")}
                {activeModal === 'skills' && t("All In-Demand Skills")}
                {activeModal === 'market' && t("Full Market Report")}
                {activeModal === 'strengths' && t("All Key Strengths")}
                {activeModal === 'improvement' && t("Full Improvement Plan")}
                {activeModal === 'roadmap' && t("Complete Career Roadmap")}
              </h2>
              <button onClick={() => setActiveModal(null)} className="w-8 h-8 min-w-[32px] min-h-[32px] aspect-square flex-none flex items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition shadow-sm border border-red-600" aria-label="Close modal">
                <span className="text-xl font-medium leading-none mb-[2px]">&times;</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
              {activeModal === 'breakdown' && (
                <div className="space-y-4">
                  {roleFitFactors.map((factor, idx) => {
                    const IconComponent = factor.icon || roleFitIcons[idx % roleFitIcons.length];
                    return (
                    <div key={idx} className="flex flex-col bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 font-semibold text-slate-700">
                          <IconComponent className="w-5 h-5 text-emerald-600" />
                          {factor.name}
                        </div>
                        <span className="font-bold text-emerald-600">{factor.score}%</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                         <span>Benchmark: {factor.benchmark}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${factor.score}%` }}></div>
                      </div>
                    </div>
                  )})}
                </div>
              )}
              {activeModal === 'skills' && (
                <div className="flex flex-wrap gap-2">
                  {displayData.in_demand_skills?.map((sk, i) => (
                    <span key={i} className="px-3 py-1.5 bg-white shadow-sm text-emerald-700 text-sm font-medium rounded-full border border-emerald-100">
                      {sk}
                    </span>
                  ))}
                </div>
              )}
              {activeModal === 'market' && (
                <div className="space-y-6">
                  {/* Hero Section */}
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white relative overflow-hidden shadow-lg">
                    <div className="absolute top-0 right-0 opacity-10 pointer-events-none translate-x-1/4 -translate-y-1/4">
                      <BiLineChart className="w-48 h-48" />
                    </div>
                    <h3 className="text-xl font-bold mb-2 relative z-10">{t("Market Demand Analysis")}</h3>
                    <p className="text-slate-300 text-sm leading-relaxed relative z-10 max-w-lg">
                      {t("Comprehensive analysis indicates strong demand in technology hubs, with remote opportunities expanding. Compensation growth is steady, especially for specialized skills.")}
                    </p>
                  </div>
                  
                  {/* Stats Grid */}
                  {marketInsights && (
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div className="bg-white border border-slate-100 shadow-sm p-4 rounded-xl flex flex-col items-center justify-center text-center">
                          <div className="w-10 h-10 rounded-full bg-blue-50/80 text-blue-500 flex items-center justify-center mb-2">
                            <BiBriefcase className="w-5 h-5" />
                          </div>
                          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1">{t("Jobs in demand")}</div>
                          <div className="text-xl font-medium text-slate-700">{marketInsights.jobsInDemand}</div>
                        </div>
                        <div className="bg-white border border-slate-100 shadow-sm p-4 rounded-xl flex flex-col items-center justify-center text-center">
                          <div className="w-10 h-10 rounded-full bg-emerald-50/80 text-emerald-500 flex items-center justify-center mb-2">
                            <FiAlertCircle className="w-5 h-5" />
                          </div>
                          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1">{t("Avg. Salary")}</div>
                          <div className="text-xl font-medium text-slate-700">{formatSalaryByCountry(salaryDetails?.avgWage || marketInsights.avgSalary, userCountry)}</div>
                        </div>
                        <div className="bg-white border border-slate-100 shadow-sm p-4 rounded-xl flex flex-col items-center justify-center text-center">
                          <div className="w-10 h-10 rounded-full bg-indigo-50/80 text-indigo-500 flex items-center justify-center mb-2">
                            <HiArrowUp className="w-5 h-5" />
                          </div>
                          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1">{t("Growth Rate")}</div>
                          <div className="text-xl font-medium text-slate-700">{marketInsights.jobsGrowth}</div>
                        </div>
                     </div>
                  )}

                  <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-5">
                    <h4 className="font-bold text-slate-800 mb-4">{t("Salary & Demand Trend (5 Years)")}</h4>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={[
                          { year: '2020', salary: Math.round((salaryDetails?.avgWage || marketInsights?.avgSalary || 1450000) * 0.65) },
                          { year: '2021', salary: Math.round((salaryDetails?.avgWage || marketInsights?.avgSalary || 1450000) * 0.73) },
                          { year: '2022', salary: Math.round((salaryDetails?.avgWage || marketInsights?.avgSalary || 1450000) * 0.81) },
                          { year: '2023', salary: Math.round((salaryDetails?.avgWage || marketInsights?.avgSalary || 1450000) * 0.90) },
                          { year: '2024', salary: salaryDetails?.avgWage || marketInsights?.avgSalary || 1450000 },
                        ]}>
                          <defs>
                            <linearGradient id="colorSalary" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dx={-10} tickFormatter={(val) => {
                            const cur = getCurrencyCode(userCountry);
                            const sym = cur === 'USD' || cur === 'CAD' || cur === 'AUD' ? '$' : cur === 'GBP' ? '£' : cur === 'EUR' ? '€' : '₹';
                            return cur === 'INR' ? `${sym}${(val/100000).toFixed(val % 100000 === 0 ? 0 : 1)}L` : `${sym}${(val/1000).toFixed(val % 1000 === 0 ? 0 : 1)}k`;
                          }} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                            formatter={(value) => [new Intl.NumberFormat(getLocale(getCurrencyCode(userCountry)), { style: 'currency', currency: getCurrencyCode(userCountry), maximumFractionDigits: 0 }).format(value), "Average Salary"]}
                          />
                          <Area type="monotone" dataKey="salary" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSalary)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
              {activeModal === 'strengths' && (
                <ul className="space-y-3">
                  {displayData.top_strengths?.map((str, i) => (
                    <li key={i} className="flex items-start gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-100 text-sm text-slate-700">
                      <FiCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              )}
              {activeModal === 'improvement' && (
                <div className="space-y-6">
                  {displayData.top_weaknesses?.length > 0 && (
                    <div>
                      <h3 className="font-bold text-slate-800 mb-3">{t("Areas to Improve")}</h3>
                      <ul className="space-y-3">
                        {displayData.top_weaknesses.map((wk, i) => (
                          <li key={i} className="flex items-start gap-3 bg-white p-4 rounded-xl shadow-sm border border-red-50 text-sm text-slate-700">
                            <FiAlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
                            <span>{wk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {displayData.next_best_actions?.length > 0 && (
                    <div>
                      <h3 className="font-bold text-slate-800 mb-3">{t("Action Plan")}</h3>
                      <ul className="space-y-3">
                        {displayData.next_best_actions.map((act, i) => (
                          <li key={i} className="flex items-start gap-3 bg-white p-4 rounded-xl shadow-sm border border-indigo-50 text-sm text-slate-700">
                            <div className="w-6 h-6 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-xs">{i+1}</div>
                            <span>{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              {activeModal === 'roadmap' && (
                <div className="relative pl-4 py-4">
                  <div className="absolute left-[23px] top-4 bottom-4 w-0.5 bg-slate-200"></div>
                  <ul className="space-y-4">
                    {displayData.career_growth_path?.map((role, i) => (
                      <li key={i} className="relative flex gap-4">
                        {role.current ? (
                          <div className="w-4 h-4 rounded-full bg-emerald-600 shrink-0 z-10 shadow-[0_0_0_4px_white] mt-1"></div>
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-slate-300 bg-white shrink-0 z-10 shadow-[0_0_0_4px_white] mt-1"></div>
                        )}
                        <div className="flex-1 bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-2">
                          <div className="flex justify-between items-center">
                            <span className={`text-base font-bold ${role.current ? 'text-emerald-700' : 'text-slate-800'}`}>
                              {role.title}
                            </span>
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                              role.status === 'Current' ? 'bg-emerald-100 text-emerald-700' :
                              role.status === 'Next Step' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 bg-slate-100'
                            }`}>
                              {role.status}
                            </span>
                          </div>
                          {role.description && (
                            <p className="text-sm text-slate-600 leading-relaxed">
                              {role.description}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

