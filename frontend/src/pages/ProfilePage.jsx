import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { HiLocationMarker, HiOfficeBuilding, HiPencilAlt } from 'react-icons/hi';
import { profileAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import useTranslation from '../hooks/useTranslation';
import Seo from '../components/common/Seo';

const ReviewSection = lazy(() => import('../components/common/ReviewSection'));
const profileCache = new Map();
const PROFILE_CACHE_TTL_MS = 60000;

const ProfilePage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editPayload, setEditPayload] = useState({});
  const [showReviews, setShowReviews] = useState(false);
  const reviewsRef = useRef(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const cacheKey = id ? `profile:${id}` : '';
      const cached = cacheKey ? profileCache.get(cacheKey) : null;

      if (cached && Date.now() - cached.timestamp < PROFILE_CACHE_TTL_MS) {
        setData(cached.data);
        setEditPayload({
          name: cached.data.user?.name || '',
          city: cached.data.profile?.city || '',
          description: cached.data.profile?.description || '',
          companyName: cached.data.profile?.companyName || '',
          skills: cached.data.profile?.skills || [],
          skillsNeeded: cached.data.profile?.skillsNeeded || [],
          languages: cached.data.profile?.languages || [],
        });
        setLoading(false);
        return;
      }

      try {
        const { data } = await profileAPI.getByUserId(id);
        setData(data);
        profileCache.set(cacheKey, { timestamp: Date.now(), data });
        setEditPayload({
          name: data.user?.name || '',
          city: data.profile?.city || '',
          description: data.profile?.description || '',
          companyName: data.profile?.companyName || '',
          skills: data.profile?.skills || [],
          skillsNeeded: data.profile?.skillsNeeded || [],
          languages: data.profile?.languages || [],
        });
      } catch (err) {
        toast.error(err.response?.data?.message || t('common.failedLoadProfile', 'Failed to load profile'));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [id, t]);

  useEffect(() => {
    if (!reviewsRef.current || showReviews) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShowReviews(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(reviewsRef.current);
    return () => observer.disconnect();
  }, [showReviews]);

  const saveProfile = async () => {
    if (!data?.isOwner) return;
    setSaving(true);
    try {
      const { data: updated } = await profileAPI.updateMyProfile(editPayload);
      setData((prev) => ({ ...prev, profile: updated.profile, user: updated.user }));
      toast.success(t('common.profileUpdated', 'Profile updated'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.failedUpdateProfile', 'Failed to update profile'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" text={t('common.loadingProfile', 'Loading profile...')} />
      </div>
    );
  }

  if (!data) {
    return <div className="max-w-3xl mx-auto py-10 text-center text-gray-500">{t('common.profileNotFound', 'Profile not found')}</div>;
  }

  const isOwner = data.isOwner;
  const profileType = data.profileType;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Seo title={data.user?.name || "Profile"} robots="noindex, nofollow" />
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{data.user?.name}</h1>
            <p className="text-sm text-gray-500 capitalize">{data.user?.role} {t('common.profile', 'profile')}</p>
            {data.profile?.city ? (
              <p className="text-sm text-gray-700 mt-1 flex items-center gap-1"><HiLocationMarker className="w-4 h-4" /> {data.profile.city}</p>
            ) : null}
            {profileType === 'recruiter' && data.profile?.companyName ? (
              <p className="text-sm text-gray-700 mt-1 flex items-center gap-1"><HiOfficeBuilding className="w-4 h-4" /> {data.profile.companyName}</p>
            ) : null}
          </div>
          {isOwner ? (
            <button
              onClick={saveProfile}
              disabled={saving}
              className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              <HiPencilAlt className="w-4 h-4" />
              {saving ? t('common.saving', 'Saving...') : t('common.saveChanges', 'Save Changes')}
            </button>
          ) : null}
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-5">
          <div>
            <label className="text-xs text-gray-500">{t('common.name', 'Name')}</label>
            <input
              value={editPayload.name || ''}
              onChange={(e) => setEditPayload((s) => ({ ...s, name: e.target.value }))}
              disabled={!isOwner}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">{t('common.city', 'City')}</label>
            <input
              value={editPayload.city || ''}
              onChange={(e) => setEditPayload((s) => ({ ...s, city: e.target.value }))}
              disabled={!isOwner}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
            />
          </div>

          {profileType === 'provider' ? (
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500">{t('common.skillsComma', 'Skills (comma-separated)')}</label>
              <input
                value={(editPayload.skills || []).join(', ')}
                onChange={(e) => setEditPayload((s) => ({
                  ...s,
                  skills: e.target.value.split(',').map((x) => x.trim()).filter(Boolean),
                }))}
                disabled={!isOwner}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
              />
            </div>
          ) : null}

          {profileType === 'recruiter' ? (
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500">{t('recruiter.companyName', 'Company Name')}</label>
              <input
                value={editPayload.companyName || ''}
                onChange={(e) => setEditPayload((s) => ({ ...s, companyName: e.target.value }))}
                disabled={!isOwner}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
              />
            </div>
          ) : null}

          <div className="md:col-span-2">
            <label className="text-xs text-gray-500">{t('common.description', 'Description')}</label>
            <textarea
              value={editPayload.description || ''}
              onChange={(e) => setEditPayload((s) => ({ ...s, description: e.target.value }))}
              disabled={!isOwner}
              rows={4}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
            />
          </div>
        </div>
      </div>

      <div ref={reviewsRef}>
        {showReviews ? (
          <Suspense fallback={<div className="bg-white rounded-2xl border border-gray-100 p-6 text-sm text-gray-500">Loading reviews...</div>}>
            <ReviewSection
              revieweeId={data.user?._id}
              initialReviews={data.reviews || []}
              initialSummary={data.ratingSummary || { avgRating: 0, totalReviews: 0 }}
            />
          </Suspense>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-sm text-gray-500">Reviews load when you reach this section.</div>
        )}
      </div>

      {!isOwner ? (
        <p className="text-xs text-gray-400 mt-3">{t('common.readOnlyProfile', 'Read-only profile view. Only the profile owner can edit.')}</p>
      ) : null}
    </div>
  );
};

export default ProfilePage;
