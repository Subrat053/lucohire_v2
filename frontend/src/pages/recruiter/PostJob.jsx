import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiSave, HiArrowLeft, HiBriefcase,
  HiLocationMarker, HiCurrencyRupee, HiDocumentText,
  HiCheckCircle, HiUsers,
} from 'react-icons/hi';
import { FaBullhorn } from 'react-icons/fa';
import { recruiterAPI } from '../../services/api';
import SkillPicker from '../../components/common/SkillPicker';
import LocationSearch from '../../components/LocationSearch';
import useTranslation from '../../hooks/useTranslation';
import toast from 'react-hot-toast';
import { getPlacePredictions, getPlaceDetails, normalizeGooglePlace } from '../../services/googlePlacesService';
import SubscriptionPlansPopup from '../../components/common/SubscriptionPlansPopup';

/* ── Illustration ─────────────────────────────────────────────────── */
const PostJobIllustration = () => (
  <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-40 h-32 drop-shadow-xl">
    <rect x="10" y="30" width="140" height="110" rx="12" fill="white" fillOpacity="0.2" />
    <rect x="24" y="46" width="112" height="12" rx="4" fill="white" fillOpacity="0.5" />
    <rect x="24" y="64" width="80" height="8" rx="3" fill="white" fillOpacity="0.35" />
    <rect x="24" y="78" width="60" height="8" rx="3" fill="white" fillOpacity="0.25" />
    <rect x="24" y="92" width="100" height="8" rx="3" fill="white" fillOpacity="0.2" />
    <rect x="24" y="106" width="70" height="8" rx="3" fill="white" fillOpacity="0.15" />
    <circle cx="165" cy="55" r="30" fill="white" fillOpacity="0.15" stroke="white" strokeOpacity="0.4" strokeWidth="2" />
    <path d="M152 55 L162 65 L178 45" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="24" cy="126" r="8" fill="#fbbf24" />
    <path d="M20 126 L23 129 L29 123" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SectionCard = ({ icon: Icon, iconBg, iconColor, title, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-6">
    <h2 className="text-base font-extrabold text-gray-900 mb-5 flex items-center gap-2">
      <Icon className={`w-4 h-4 ${iconColor}`} /> {title}
    </h2>
    {children}
  </div>
);

const inputCls = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none text-sm bg-white transition';

const Label = ({ text, required }) => (
  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
    {text} {required && <span className="text-red-700">*</span>}
  </label>
);

const PostJob = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showPlans, setShowPlans] = useState(false);
  const [aiMeta, setAiMeta] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [stepError, setStepError] = useState('');
  const [aiUsage, setAiUsage] = useState({ limits: {}, usage: {} });
  const [usageLoading, setUsageLoading] = useState(true);
  const draftTimerRef = useRef(null);
  const [form, setForm] = useState({
    title: '', skills: [], city: '', budgetMin: '', budgetMax: '',
    budgetType: 'negotiable', description: '', requirements: '',
    location: null,
    workMode: 'onsite',
    urgency: 'normal'
  });

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  useEffect(() => {
    try {
      const raw = localStorage.getItem('recruiter:postJobDraft');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        setForm((prev) => ({ ...prev, ...parsed }));
        if (parsed.aiPrompt) setAiPrompt(parsed.aiPrompt);
      }
    } catch (_) {
      // ignore draft load errors
    }
  }, []);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const res = await recruiterAPI.getAiUsage();
        if (res.data?.success) {
          setAiUsage({ limits: res.data.limits || {}, usage: res.data.usage || {} });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setUsageLoading(false);
      }
    };
    fetchUsage();
  }, []);

  useEffect(() => {
    try {
      if (form.title || form.description || form.skill) {
        const payload = { ...form, aiPrompt };
        localStorage.setItem('recruiter:postJobDraft', JSON.stringify(payload));
      }
    } catch (_) {
      // ignore
    }
  }, [form, aiPrompt]);

  const handleGenerateAI = async () => {
    const prompt = aiPrompt.trim() || form.title.trim() || form.skill.trim() || form.description.trim();
    if (!prompt) {
      toast.error(t('recruiter.aiPromptRequired', 'Add a short requirement prompt first'));
      return;
    }

    setAiGenerating(true);
    try {
      const { data } = await recruiterAPI.generateJobDescription({
        prompt,
        skill: form.skill,
        city: form.city,
        budgetMin: form.budgetMin ? parseInt(form.budgetMin, 10) : 0,
        budgetMax: form.budgetMax ? parseInt(form.budgetMax, 10) : 0,
        budgetType: form.budgetType,
      });

      let resolvedLoc = null;
      let resolvedCity = data.city || '';

      if (data.city) {
        try {
          const predictions = await getPlacePredictions(data.city);
          if (predictions && predictions.length > 0) {
            const firstPlace = predictions[0];
            const details = await getPlaceDetails(firstPlace.place_id);
            if (details) {
              resolvedLoc = normalizeGooglePlace(details);
              resolvedCity = resolvedLoc.city || resolvedLoc.name || data.city;
            }
          }
        } catch (geoErr) {
          console.warn('[AI Job Location Resolution Error]', geoErr);
        }
      }

      setForm((prev) => ({
        ...prev,
        title: data.title || prev.title,
        description: data.fullDescription || prev.description,
        skill: (data.skills && data.skills.length > 0) ? data.skills[0] : prev.skill,
        city: resolvedCity || prev.city,
        location: resolvedLoc || prev.location,
        budgetMin: data.budget?.min ? String(data.budget.min) : prev.budgetMin,
        budgetMax: data.budget?.max ? String(data.budget.max) : prev.budgetMax,
        budgetType: data.budget?.type || prev.budgetType,
      }));

      setAiMeta({ status: data.aiStatus, model: data.model });
      toast.success(t('recruiter.aiGenerated', 'AI draft generated. Review and edit before posting.'));
      // re-fetch usage after success
      recruiterAPI.getAiUsage().then(res => {
        if (res.data?.success) {
          setAiUsage({ limits: res.data.limits || {}, usage: res.data.usage || {} });
        }
      });
    } catch (err) {
      toast.error(err.response?.data?.message || t('recruiter.aiGenerationFailed', 'AI generation failed'));
    } finally {
      setAiGenerating(false);
    }
  };

  const validateStep = async (currentStep) => {
    setStepError('');
    return new Promise((resolve) => {
      setTimeout(() => {
        if (currentStep === 1) {
          if (!form.title.trim() || !form.skills.length || !form.city.trim()) {
            setStepError(t('recruiter.step1Required', 'Add title, at least one skill, and city to continue.'));
            resolve(false);
            return;
          }
        }

        if (currentStep === 2) {
          if (!form.description.trim()) {
            setStepError(t('recruiter.step2Required', 'Add a job description to continue.'));
            resolve(false);
            return;
          }
        }

        resolve(true);
      }, 0);
    });
  };

  const handleNext = async () => {
    const ok = await validateStep(1);
    if (ok) setStep(2);
  };

  const handleBack = () => {
    setStepError('');
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await validateStep(2);
    if (!ok) return;
    setLoading(true);
    try {
      const payload = {
        ...form,
        skill: form.skills[0] || '',
        skillsTags: form.skills,
        budgetMin: form.budgetMin ? parseInt(form.budgetMin) : 0,
        budgetMax: form.budgetMax ? parseInt(form.budgetMax) : 0,
        aiGenerated: aiMeta ? { status: aiMeta.status, model: aiMeta.model || '' } : null,
        requirements: form.requirements
          ? form.requirements.split('\n').map((r) => r.trim()).filter(Boolean)
          : [],
      };
      const { data } = await recruiterAPI.postJob(payload);
      setMatchCount(data.matchedCount || 0);
      setSubmitted(true);
      try {
        localStorage.removeItem('recruiter:postJobDraft');
      } catch (_) {
        // ignore
      }
      toast.success(t('recruiter.jobPostedSuccess', 'Job posted! {{count}} providers notified.', { count: data.matchedCount || 0 }));
    } catch (err) {
      if (err.response?.data?.upgradeRequired) {
        toast.error(err.response.data.message || "Limit Reached");
        setShowPlans(true);
      } else {
        toast.error(err.response?.data?.message || t('recruiter.failedPostJob', 'Failed to post job'));
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── Success state ────────────────────────────────────────────────── */
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(160deg,#f0f4ff 0%,#f8f9ff 100%)' }}>
        <div className="bg-white rounded-3xl border border-gray-100 p-10 max-w-md w-full text-center shadow-xl">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <HiCheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">{t('recruiter.jobPostedTitle', 'Job Posted!')}</h2>
          <p className="text-gray-500 text-sm mb-2">
            {t('recruiter.jobPostedDesc', 'Your requirement is live and {{count}} provider(s) have been notified via WhatsApp.', { count: matchCount })}
          </p>
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => { setSubmitted(false); setForm({ title: '', skills: [], city: '', budgetMin: '', budgetMax: '', budgetType: 'negotiable', description: '', requirements: '' }); }}
              className="flex-1 border-2 border-blue-200 text-blue-700 font-bold py-2.5 rounded-xl hover:bg-blue-50 transition text-sm"
            >
              {t('recruiter.postAnother', 'Post Another')}
            </button>
            <button
              onClick={() => navigate('/recruiter/dashboard')}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition text-sm shadow-sm"
            >
              {t('common.dashboard', 'Dashboard')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg,#f0f4ff 0%,#f8f9ff 60%,#fafafa 100%)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Header banner ─────────────────────────────────────────── */}
        <div
          className="rounded-3xl p-6 sm:p-8 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 overflow-hidden relative"
          style={{ background: 'linear-gradient(135deg,#1d4ed8 0%,#4f46e5 60%,#7c3aed 100%)' }}
        >
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <button
              onClick={() => navigate('/recruiter/dashboard')}
              className="inline-flex items-center gap-1.5 text-blue-200 hover:text-white text-sm mb-3 transition"
            >
              <HiArrowLeft className="w-4 h-4" /> {t('common.back', 'Back')}
            </button>
            <h1 className="text-2xl font-extrabold text-white">{t('recruiter.postJob', 'Post a Job')}</h1>
            <p className="text-blue-100 text-sm mt-1">{t('recruiter.notifyDesc', 'Matching providers will be notified automatically via WhatsApp.')}</p>
          </div>
          <div className="relative z-10 shrink-0">
            <PostJobIllustration />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Plan Limits Card */}
          {!usageLoading && aiUsage?.limits && (
            <div className="bg-white rounded-xl border border-indigo-100 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-gray-500 text-xs mb-0.5">{t('common.currentPlan', 'Current Plan')}</span>
                  <span className="text-indigo-600 font-bold capitalize bg-indigo-50 px-2 py-0.5 rounded text-xs tracking-wide border border-indigo-100 self-start">
                    {aiUsage.planDetails?.name || aiUsage.planDetails?.slug || 'Free'}
                  </span>
                </div>
                <div className="h-8 w-px bg-gray-200 hidden md:block"></div>
                <div className="flex flex-col">
                  <span className="text-gray-500 text-xs flex items-center gap-1"><HiBriefcase className="w-3 h-3 text-blue-500"/> {t('recruiter.jobPostLimit', 'Job Postings')}</span>
                  <span className="text-slate-800 font-bold text-sm">
                    {aiUsage.limits.jobPostLimit === -1 ? 'Unlimited' : 
                      `${Math.max(0, (aiUsage.limits.jobPostLimit || 0) - (aiUsage.usage?.activeJobs || 0))} / ${aiUsage.limits.jobPostLimit || 0} ${t('common.credits', 'Credits')}`}
                  </span>
                </div>
                <div className="h-8 w-px bg-gray-200 hidden md:block"></div>
                <div className="flex flex-col">
                  <span className="text-gray-500 text-xs flex items-center gap-1"><FaBullhorn className="w-3 h-3 text-orange-500"/> {t('recruiter.aiJdGenerator', 'AI JD Generator')}</span>
                  <span className="text-slate-800 font-bold text-sm">
                    {aiUsage.limits.aiJdGenerator === -1 ? 'Unlimited' : 
                      `${Math.max(0, (aiUsage.limits.aiJdGenerator || 0) - (aiUsage.usage?.aiJdGenerator || 0))} / ${aiUsage.limits.aiJdGenerator || 0} ${t('common.credits', 'Credits')}`}
                  </span>
                </div>
              </div>
              <button type="button" onClick={() => navigate('/recruiter/plans')} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition">
                {t('common.upgrade', 'Upgrade Plan')}
              </button>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-blue-100 p-4">
            <p className="text-sm font-semibold text-blue-800 mb-2">{t('recruiter.aiHelper', 'AI Job Description Helper')}</p>
            <div className="grid sm:grid-cols-[1fr_auto] gap-2">
              <input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={t('recruiter.aiPromptPlaceholder', 'e.g. Maid chahiye for morning cleaning in Andheri')}
                className={inputCls}
              />
              <button
                type="button"
                onClick={handleGenerateAI}
                disabled={aiGenerating || (aiUsage.limits.aiJdGenerator !== -1 && aiUsage.usage.aiJdGenerator >= (aiUsage.limits.aiJdGenerator || 0))}
                className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex flex-col items-center justify-center"
              >
                <span>{aiGenerating ? t('common.generating', 'Generating…') : t('recruiter.generateWithAI', 'Generate with AI')}</span>
                {!usageLoading && aiUsage.limits.aiJdGenerator !== undefined && aiUsage.limits.aiJdGenerator !== -1 && (
                  <span className="text-[10px] opacity-80 mt-0.5">
                    ({Math.max(0, aiUsage.limits.aiJdGenerator - (aiUsage.usage.aiJdGenerator || 0))} left)
                  </span>
                )}
              </button>
            </div>
            {aiMeta && (
              <p className="mt-2 text-xs text-blue-700">{t('common.status', 'Status')}: {aiMeta.status} {aiMeta.model ? `• ${t('common.model', 'Model')}: ${aiMeta.model}` : ''}</p>
            )}
          </div>

          {stepError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {stepError}
            </div>
          )}

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ── Job Details ─────────────────────────────────────────── */}
              <SectionCard icon={HiBriefcase} iconColor="text-blue-500" title={t('recruiter.jobDetails', 'Job Details')}>
                <div className="space-y-4">
                  <div>
                    <Label text={t('recruiter.jobTitle', 'Job Title')} required />
                    <input
                      name="title"
                      value={form.title}
                      onChange={set('title')}
                      placeholder={t('recruiter.jobTitlePlaceholder', 'e.g. Need a driver for daily commute')}
                      className={inputCls}
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label text={t('recruiter.skillRequired', 'Skills Required')} required />
                      <SkillPicker
                        selectedSkills={form.skills}
                        onChange={(skills) => setForm({ ...form, skills })}
                        maxSkills={10}
                        placeholder={t('recruiter.pickSkill', 'Add up to 10 skills…')}
                      />
                    </div>
                    <div>
                      <Label text={t('common.city', 'City')} required />
                      <LocationSearch
                        value={form.city}
                        onChange={(value) => setForm({ ...form, city: value })}
                        onSelect={(item) => setForm({ ...form, city: item?.name || form.city, location: item })}
                        placeholder={t('common.cityPlaceholder', 'e.g. Delhi')}
                      />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <Label text={t('common.workMode', 'Work Mode')} />
                      <select name="workMode" value={form.workMode} onChange={set('workMode')} className={inputCls}>
                        <option value="onsite">{t("Onsite")}</option>
                        <option value="remote">{t("Remote")}</option>
                        <option value="hybrid">{t("Hybrid")}</option>
                        <option value="travel">{t("Travel")}</option>
                      </select>
                    </div>
                    <div>
                      <Label text={t('common.urgency', 'Urgency')} />
                      <select name="urgency" value={form.urgency} onChange={set('urgency')} className={inputCls}>
                        <option value="low">{t("Low")}</option>
                        <option value="normal">{t("Normal")}</option>
                        <option value="high">{t("High")}</option>
                        <option value="immediate">{t("Immediate")}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* ── Budget ──────────────────────────────────────────────── */}
              <SectionCard icon={HiCurrencyRupee} iconColor="text-green-500" title={t('common.budget', 'Budget')}>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <Label text={t('common.minBudget', 'Min Budget (₹)')} />
                    <input
                      type="number"
                      name="budgetMin"
                      value={form.budgetMin}
                      onChange={set('budgetMin')}
                      placeholder={t("0")}
                      min="0"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <Label text={t('common.maxBudget', 'Max Budget (₹)')} />
                    <input
                      type="number"
                      name="budgetMax"
                      value={form.budgetMax}
                      onChange={set('budgetMax')}
                      placeholder={t("0")}
                      min="0"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <Label text={t('common.budgetType', 'Budget Type')} />
                    <select
                      name="budgetType"
                      value={form.budgetType}
                      onChange={set('budgetType')}
                      className={inputCls}
                    >
                      <option value="negotiable">{t('common.negotiable', 'Negotiable')}</option>
                      <option value="fixed">{t('common.fixed', 'Fixed')}</option>
                      <option value="hourly">{t('common.hourly', 'Hourly')}</option>
                      <option value="monthly">{t('common.monthly', 'Monthly')}</option>
                    </select>
                  </div>
                </div>
              </SectionCard>
            </div>

            <SectionCard icon={HiDocumentText} iconColor="text-purple-500" title={t('common.jobDescription', 'Job Description & Requirements')}>
              <div className="space-y-4">
                <div>
                  <Label text={t('common.jobDescription', 'Job Description')} required />
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={set('description')}
                    placeholder={t('common.descPlaceholder', 'Describe your requirement in detail…')}
                    rows={4}
                    className={`${inputCls} resize-none`}
                  />
                </div>
                <div>
                  <Label text={t('recruiter.reqList', 'Requirements (one per line)')} />
                  <textarea
                    name="requirements"
                    value={form.requirements}
                    onChange={set('requirements')}
                    placeholder={t('recruiter.reqPlaceholder', 'e.g.\nValid license\n3+ years experience\nMust have own tools')}
                    rows={4}
                    className={`${inputCls} resize-none`}
                  />
                  <p className="text-xs text-gray-400 mt-1">{t('recruiter.reqHint', 'Enter each requirement on a new line')}</p>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* ── Submit ──────────────────────────────────────────────── */}
          <div className="flex flex-col gap-2 pt-4">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/recruiter/dashboard')}
                className="flex-1 border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition text-sm"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={loading || (!usageLoading && aiUsage.limits.jobPostLimit !== -1 && (aiUsage.usage?.activeJobs || 0) >= (aiUsage.limits.jobPostLimit || 0))}
                className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed relative group"
              >
                <HiSave className="w-5 h-5" />
                {loading ? t('common.posting', 'Posting…') : (!usageLoading && aiUsage.limits.jobPostLimit !== -1 && (aiUsage.usage?.activeJobs || 0) >= (aiUsage.limits.jobPostLimit || 0)) ? 'Limit Reached' : t('recruiter.postJobNow', 'Post Job Now')}
              </button>
            </div>
            {!usageLoading && aiUsage.limits.jobPostLimit !== -1 && (
              <p className="text-center text-xs text-gray-500 font-medium">
                Active Jobs: {aiUsage.usage?.activeJobs || 0} / {aiUsage.limits.jobPostLimit || 0}
                {(aiUsage.usage?.activeJobs || 0) >= (aiUsage.limits.jobPostLimit || 0) && (
                  <span className="text-red-500 block mt-1">You have reached your active job limit.</span>
                )}
              </p>
            )}
          </div>
        </form>
      </div>
      
      <SubscriptionPlansPopup 
        open={showPlans} 
        onClose={() => setShowPlans(false)} 
        role="recruiter" 
        reason="job_post_limit" 
      />
    </div>
  );
};

export default PostJob;
