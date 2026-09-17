import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { 
  HiUsers, HiUserAdd, HiBriefcase, HiCheckCircle, HiArrowRight, 
  HiSearch, HiFilter, HiChevronRight, HiPhotograph,
  HiOfficeBuilding, HiCurrencyRupee, HiDocumentText, HiRefresh, 
  HiBell, HiCalendar, HiChevronDown 
} from 'react-icons/hi';
import { adminAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

// Import all the new dashboard components
import DashboardStatsCard from '../../components/admin/DashboardStatsCard';
const RevenueChart = lazy(() => import('../../components/admin/RevenueChart'));
const EarningsSourceChart = lazy(() => import('../../components/admin/EarningsSourceChart'));
import TopPartnersTable from '../../components/admin/TopPartnersTable';
import RewardProgramTable from '../../components/admin/RewardProgramTable';
import PlatformSummary from '../../components/admin/PlatformSummary';
import PlanSummary from '../../components/admin/PlanSummary';
import RewardPoolCard from '../../components/admin/RewardPoolCard';

import DashboardAlerts from '../../components/admin/DashboardAlerts';
import QuickActions from '../../components/admin/QuickActions';
import SystemHealth from '../../components/admin/SystemHealth';
import ActionRequired from '../../components/admin/ActionRequired';
import RecentActivity from '../../components/admin/RecentActivity';
import CountryOverview from '../../components/admin/CountryOverview';
import AutomationInsights from '../../components/admin/AutomationInsights';
import SubscriptionOverview from '../../components/admin/SubscriptionOverview';

const DASHBOARD_CACHE_TTL = 60 * 1000;
const dashboardCache = {
  data: null,
  ts: 0,
  inflight: null,
};

const Dashboard = () => {
  const { user: admin } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Local state for select fields
  const [selectedDateRange, setSelectedDateRange] = useState('last30');
  const [selectedGroupBy, setSelectedGroupBy] = useState('country');
  const [selectedPlanType, setSelectedPlanType] = useState('all');
  const [selectedPartnerType, setSelectedPartnerType] = useState('all');

  // Track applied filters separately to avoid trigger requests on select changes
  const [appliedFilters, setAppliedFilters] = useState({
    dateRange: 'last30',
    groupBy: 'country',
    planType: 'all',
    partnerType: 'all',
  });

  const loadDashboardStats = useCallback(async (forceRefresh = false, activeFilters = null) => {
    // Only show full page loader if we have no data at all
    if (!dashboardCache.data) setLoading(true);
    
    const now = Date.now();
    const isFresh =
      !forceRefresh &&
      dashboardCache.data &&
      now - dashboardCache.ts < DASHBOARD_CACHE_TTL;

    if (forceRefresh) {
      // Intentionally DO NOT clear dashboardCache.data here to allow seamless background updates
      dashboardCache.ts = 0;
      dashboardCache.inflight = null;
    }

    if (isFresh) {
      setStats(dashboardCache.data);
      setLoading(false);
      return;
    }

    try {
      const filters = activeFilters || appliedFilters;
      if (!dashboardCache.inflight) {
        dashboardCache.inflight = adminAPI.getDashboardStats(filters);
      }

      const { data } = await dashboardCache.inflight;
      dashboardCache.data = data;
      dashboardCache.ts = Date.now();
      setStats(data);
    } catch (err) {
      toast.error('Failed to load dashboard stats');
    } finally {
      dashboardCache.inflight = null;
      setLoading(false);
    }
  }, [appliedFilters]);

  const handleApplyFilters = () => {
    const nextFilters = {
      dateRange: selectedDateRange,
      groupBy: selectedGroupBy,
      planType: selectedPlanType,
      partnerType: selectedPartnerType,
    };
    setAppliedFilters(nextFilters);
    loadDashboardStats(true, nextFilters);
  };

  const handleResetFilters = () => {
    setSelectedDateRange('last30');
    setSelectedGroupBy('country');
    setSelectedPlanType('all');
    setSelectedPartnerType('all');
    const defaultFilters = {
      dateRange: 'last30',
      groupBy: 'country',
      planType: 'all',
      partnerType: 'all',
    };
    setAppliedFilters(defaultFilters);
    loadDashboardStats(true, defaultFilters);
  };

  useEffect(() => {
    const loadIfActive = async () => {
      await loadDashboardStats();
    };

    loadIfActive();
  }, [loadDashboardStats]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading admin dashboard..." />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-50/50 min-h-screen">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#0F172A] flex items-center gap-2">
            Welcome back, {admin?.name || 'Super Admin'} 👋
          </h1>
          <p className="text-[13px] font-medium text-gray-500 mt-0.5">Here's what's happening on LucoHire today.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <input 
            type="date" 
            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            defaultValue={new Date().toISOString().split('T')[0]}
            onChange={(e) => {
              // A simple functional hook-up that triggers a reload if needed
              loadDashboardStats(true, appliedFilters);
            }}
          />
        </div>
      </div>

      {/* KPI Cards Row (6 cols) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <DashboardStatsCard 
          icon={HiUsers} 
          label="Total Candidates" 
          value={(stats.totalProviders || 0).toLocaleString('en-IN')} 
          trend={12.5}
          bgClass="bg-emerald-50"
          colorClass="text-emerald-500"
          sparklineColor="#10B981"
          link="/admin/users"
        />
        <DashboardStatsCard 
          icon={HiBriefcase} 
          label="Total Recruiters" 
          value={(stats.totalRecruiters || 0).toLocaleString('en-IN')} 
          trend={8.3}
          bgClass="bg-purple-50"
          colorClass="text-purple-500"
          sparklineColor="#8B5CF6"
          link="/admin/recruiters"
        />
        <DashboardStatsCard 
          icon={HiOfficeBuilding} 
          label="Total Partners" 
          value={(stats.totalCompanySources || stats.activePartners || 0).toLocaleString('en-IN')} 
          trend={5.6}
          bgClass="bg-blue-50"
          colorClass="text-blue-500"
          sparklineColor="#3B82F6"
          link="/admin/partners"
        />
        <DashboardStatsCard 
          icon={HiBriefcase} 
          label="Active Jobs" 
          value={(stats.totalExternalJobs || stats.totalJobsPosted || 0).toLocaleString('en-IN')} 
          trend={10.2}
          bgClass="bg-orange-50"
          colorClass="text-orange-500"
          sparklineColor="#F97316"
          link="/admin/data-pipeline/jobs"
        />
        <DashboardStatsCard 
          icon={HiDocumentText} 
          label="Total Users" 
          value={(stats.totalUsers || 0).toLocaleString('en-IN')} 
          trend={9.7}
          trendLabel="vs yesterday"
          bgClass="bg-teal-50"
          colorClass="text-teal-500"
          sparklineColor="#14B8A6"
          link="/admin/users"
        />
        <DashboardStatsCard 
          icon={HiCurrencyRupee} 
          label="Monthly Revenue" 
          value={`₹${(stats.totalRevenue || 0).toLocaleString('en-IN')}`} 
          trend={18.4}
          trendLabel="vs last month"
          bgClass="bg-rose-50"
          colorClass="text-rose-500"
          sparklineColor="#F43F5E"
          link="/admin/payments"
        />
      </div>

      {/* Row 2: Alerts & Team Performance */}
      <DashboardAlerts 
        criticalAlerts={stats.criticalAlerts} 
        teamPerformance={stats.teamPerformance} 
      />

      {/* Row 3: Platform Overview | Quick Actions | System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        <div className="lg:col-span-5 h-auto lg:h-[320px]">
          <Suspense fallback={<div className="bg-white rounded-xl border border-gray-100 h-full flex items-center justify-center text-xs text-gray-400 shadow-sm">Loading Chart...</div>}>
            <RevenueChart 
              data={stats.revenueTrend || []} 
              onPeriodChange={(p) => loadDashboardStats(true, { ...appliedFilters, dateRange: p })}
            />
          </Suspense>
        </div>
        <div className="lg:col-span-4 h-auto lg:h-[320px]">
          <QuickActions />
        </div>
        <div className="lg:col-span-3 h-auto lg:h-[320px]">
          <SystemHealth systemHealth={stats.systemHealth} />
        </div>
      </div>

      {/* Row 4: Action Required | Recent Activity | Country Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <ActionRequired actionRequired={stats.actionRequired} />
        <RecentActivity activities={stats.recentActivity} />
        <CountryOverview data={stats.countryOverview} />
      </div>

      {/* Row 5: Automation Insights & Subscription Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <AutomationInsights data={stats.automationInsights} />
        <SubscriptionOverview data={stats.subscriptionOverview} planSummary={stats.planSummary || {}} />
      </div>

      {/* Legacy/Extra Data (Kept as requested to not lose functionality) */}
      <div className="pt-8 border-t border-gray-200">
        <h2 className="text-sm font-bold text-gray-900 mb-4 px-1">Additional Reports & Summaries</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <PlatformSummary 
            totalUsers={stats.totalUsers} 
            totalProviders={stats.totalProviders} 
            totalRecruiters={stats.totalRecruiters}
            totalCities={stats.totalCities || 0}
            totalCountries={stats.countryOverview?.length || 0}
          />
          <PlanSummary plans={stats.planSummary || {}} />
          <RewardPoolCard pool={stats.rewardPool} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopPartnersTable partners={stats.topPartners || []} />
          <RewardProgramTable topPartners={stats.topPartners || []} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

