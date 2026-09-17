import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { providerAPI, recruiterAPI } from '../../services/api';
import { useLocale } from '../../context/LocaleContext';
import LoadingSpinner from './LoadingSpinner';
import toast from 'react-hot-toast';

const PERIOD_LABELS = { 30: 'Monthly', 90: '3 Monthly', 180: 'Semi Annually', 365: 'Annually' };
const PLAN_RANK = { free: 0, starter: 1, basic: 1, business: 2, pro: 2, enterprise: 3, featured: 3 };
const PLAN_THEME = {
  free: {
    card: 'border-slate-300 bg-slate-50/70',
    badge: 'bg-slate-700 text-white',
    bullet: 'text-slate-700',
    action: 'bg-slate-700 text-white hover:bg-slate-800',
  },
  starter: {
    card: 'border-blue-300 bg-blue-50/70',
    badge: 'bg-blue-600 text-white',
    bullet: 'text-blue-700',
    action: 'bg-blue-600 text-white hover:bg-blue-700',
  },
  business: {
    card: 'border-emerald-300 bg-emerald-50/70',
    badge: 'bg-emerald-600 text-white',
    bullet: 'text-emerald-700',
    action: 'bg-emerald-600 text-white hover:bg-emerald-700',
  },
  enterprise: {
    card: 'border-amber-300 bg-amber-50/70',
    badge: 'bg-amber-600 text-white',
    bullet: 'text-amber-700',
    action: 'bg-amber-600 text-white hover:bg-amber-700',
  },
};
const PLAN_THEME_BY_SLUG = {
  free: PLAN_THEME.free,
  starter: PLAN_THEME.starter,
  basic: PLAN_THEME.starter,
  business: PLAN_THEME.business,
  pro: PLAN_THEME.business,
  enterprise: PLAN_THEME.enterprise,
  featured: PLAN_THEME.enterprise,
};

const SubscriptionPlansPopup = ({ role, currentPlan = 'free', open, onClose, redirectTo, reason = '' }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const { formatPrice } = useLocale();

  useEffect(() => {
    if (!open) return;

    const fetchPlans = async () => {
      setLoading(true);
      try {
        const api = role === 'provider' ? providerAPI : recruiterAPI;
        const { data } = await api.getPlans();
        const allPlans = Array.isArray(data) ? data : [];
        setPlans(allPlans.filter(plan => String(plan.slug || '').toLowerCase() !== 'free'));
      } catch {
        toast.error('Failed to load subscription plans');
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [open, role]);

  const normalizedCurrentPlan = useMemo(() => String(currentPlan || 'free').toLowerCase(), [currentPlan]);
  const currentPlanSortOrder = useMemo(() => {
    const active = plans.find((plan) => String(plan.slug || '').toLowerCase() === normalizedCurrentPlan);
    if (active) return Number(active.sortOrder || 0);
    return Number(PLAN_RANK[normalizedCurrentPlan] || 0);
  }, [plans, normalizedCurrentPlan]);
  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || Number(a.duration || 0) - Number(b.duration || 0)),
    [plans]
  );
  const basePath = role === 'provider' ? '/provider/plans' : '/recruiter/plans';
  const redirectQuery = encodeURIComponent(redirectTo || (role === 'provider' ? '/provider/plans' : '/recruiter/dashboard'));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} />

      <div className="relative z-10 flex w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-blue-100 bg-white shadow-2xl sm:rounded-3xl max-h-[92vh]">
        <div className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 px-4 pb-4 pt-5 backdrop-blur sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900">Choose Your Plan</h3>
              <p className="mt-1 text-sm text-gray-500">
                Current Plan: <span className="font-semibold capitalize text-gray-800">{currentPlan || 'free'}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 shrink-0 rounded-full bg-gray-100 text-gray-700 transition hover:bg-gray-200"
              aria-label="Close subscription popup"
            >
              X
            </button>
          </div>
          {!!reason && (
            <p className="mt-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-medium text-orange-700 sm:text-sm">
              {reason}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-14">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="overflow-y-auto px-4 pb-5 pt-4 sm:px-6 sm:pb-6">
            {sortedPlans.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-700">
                No plans available right now. Please try again in a moment.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sortedPlans.map((plan) => {
              const theme = PLAN_THEME_BY_SLUG[String(plan.slug || '').toLowerCase()] || PLAN_THEME.starter;
              const isActive = normalizedCurrentPlan === String(plan.slug || '').toLowerCase();
              const isLowerPlan = currentPlanSortOrder > 0 && Number(plan.sortOrder || 0) < currentPlanSortOrder;
              const isUpgradeDisabled = isActive || isLowerPlan;
              return (
                <div
                  key={plan._id}
                  className={`flex h-full flex-col rounded-2xl border p-4 shadow-sm transition ${
                    isActive
                      ? 'border-green-400 ring-2 ring-green-200 bg-green-50/40'
                      : theme.card
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-lg font-bold text-gray-900">{plan.name}</h4>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${isActive ? 'bg-green-500 text-white' : theme.badge}`}>
                      {isActive ? 'Active' : String(plan.slug || 'plan')}
                    </span>
                  </div>
                  <p className="text-3xl font-extrabold text-indigo-900 mt-2">
                    ₹{plan.price}
                    <span className="text-sm text-slate-500 font-medium tracking-normal ml-1">/ {plan.duration} days</span>
                  </p>
                  <ul className="mt-3 flex-1 list-disc space-y-1 pl-5 text-sm text-gray-700">
                    {(plan.features || []).slice(0, 4).map((feature, index) => (
                      <li key={index} className={theme.bullet}>{feature}</li>
                    ))}
                  </ul>
                  {isUpgradeDisabled ? (
                    <div className="mt-4 block cursor-not-allowed rounded-xl bg-gray-100 py-2 text-center text-sm font-semibold text-gray-400">
                      {isActive ? 'Current Plan' : 'Lower Plan Disabled'}
                    </div>
                  ) : (
                    <Link
                      to={`${basePath}?redirect=${redirectQuery}`}
                      className={`mt-4 block rounded-xl py-2 text-center text-sm font-semibold transition ${
                        isActive ? 'bg-green-100 text-green-700' : theme.action
                      }`}
                    >
                      {isActive ? 'Current Plan' : 'Upgrade'}
                    </Link>
                  )}
                </div>
              );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionPlansPopup;