import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { HiStar, HiLocationMarker, HiBadgeCheck, HiPhone, HiMail, HiExternalLink, HiBriefcase, HiTranslate, HiCurrencyRupee, HiEye, HiCheckCircle, HiCalendar, HiLockClosed, HiOutlinePencil, HiOutlineDocumentText } from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';
import { recruiterAPI } from '../services/api';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
const ReviewSection = lazy(() => import('../components/common/ReviewSection'));
import toast from 'react-hot-toast';
import { toOptimizedMediaUrl } from '../utils/media';
import { DUMMY_PROVIDERS } from '../data/skillsData';
import { findProviderById, normalizeProviderData } from '../utils/providerData';
import { getProviderById as fetchProviderById } from '../services/providerService';
import useTranslation from '../hooks/useTranslation';
import Seo from '../components/common/Seo';
import SafeExternalLink from '../components/common/SafeExternalLink';
import { generateBreadcrumbSchema } from '../utils/seoSchemas';
import SubscriptionPlansPopup from '../components/common/SubscriptionPlansPopup';

const ProviderPublicProfile = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contactUnlocked, setContactUnlocked] = useState(false);
  const [contactInfo, setContactInfo] = useState(null);
  const [showPlans, setShowPlans] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  
  const [activeTab, setActiveTab] = useState('about'); // 'about' or 'reviews'

  const getFallbackProviderPayload = (providerId) => {
    const dummyProvider = findProviderById(DUMMY_PROVIDERS, providerId);
    if (!dummyProvider) return null;

    const normalized = normalizeProviderData(dummyProvider, 0, { isDummy: true });

    return {
      profile: {
        _id: normalized.id,
        id: normalized.id,
        isDummy: true,
        user: {
          _id: normalized.id,
          name: normalized.name,
          avatar: normalized.image,
        },
        photo: normalized.image,
        profilePhoto: normalized.image,
        city: normalized.location,
        rating: normalized.rating || 0,
        totalReviews: dummyProvider.totalReviews || 0,
        currentPlan: 'free',
        isVerified: true,
        category: normalized.category,
        description: normalized.description,
        skills: Array.isArray(normalized.skills) ? normalized.skills : [],
        services: Array.isArray(normalized.services) ? normalized.services : [],
        experience: normalized.experience || 'N/A',
        languages: ['Hindi', 'English'],
        profileViews: 0,
      },
      reviews: [],
      contact: {
        phone: '',
        whatsappNumber: '',
        email: '',
      },
    };
  };

  useEffect(() => {
    fetchProfile();
  }, [id]);

  // Check unlock status when authenticated recruiter visits
  useEffect(() => {
    if (isAuthenticated && (user?.activeRole || user?.role) === 'recruiter' && id) {
      recruiterAPI.checkUnlockStatus(id).then(({ data }) => {
        if (data.isUnlocked) {
          setContactUnlocked(true);
          setContactInfo(data.contactInfo || null);
        }
      }).catch(() => {});
    }
  }, [isAuthenticated, user, id]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { profile: fetchedProfile, reviews: fetchedReviews } = await fetchProviderById(id);
      if (fetchedProfile) {
        setProfile(fetchedProfile);
        setReviews(fetchedReviews || []);
        return;
      }

      const fallbackPayload = getFallbackProviderPayload(id);
      if (fallbackPayload) {
        setProfile(fallbackPayload.profile);
        setReviews(fallbackPayload.reviews);
        setContactUnlocked(false);
        setContactInfo(null);
        return;
      }

      setProfile(null);
      setReviews([]);
    } catch (err) {
      const fallbackPayload = getFallbackProviderPayload(id);
      if (fallbackPayload) {
        setProfile(fallbackPayload.profile);
        setReviews(fallbackPayload.reviews);
        setContactUnlocked(false);
        setContactInfo(null);
      } else {
        setProfile(null);
        setReviews([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    if (!isAuthenticated) return toast.error(t('common.loginFirst', 'Please login first'));
    if ((user?.activeRole || user?.role) !== 'recruiter') return toast.error(t('recruiter.onlyRecruitersUnlock', 'Only recruiters can unlock contacts'));
    setUnlocking(true);
    try {
      const { data } = await recruiterAPI.unlockContact(id);
      setContactUnlocked(true);
      setContactInfo(data.contact || data.contactInfo);
      toast.success(t('recruiter.contactUnlocked', 'Contact unlocked!'));
    } catch (err) {
      if (err.response?.data?.upgradeRequired) {
        toast.error(err.response.data.message || t('recruiter.failedUnlock', 'Limit reached'));
        setShowPlans(true);
      } else {
        const msg = err.response?.data?.message || t('recruiter.failedUnlock', 'Failed to unlock');
        if (msg.toLowerCase().includes('unlock') || msg.toLowerCase().includes('plan') || msg.toLowerCase().includes('credits') || msg.toLowerCase().includes('upgrade')) {
          toast.error(msg);
          navigate('/recruiter/plans');
        } else {
          toast.error(msg);
        }
      }
    } finally {
      setUnlocking(false);
    }
  };

  const handleContactClick = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error(t('common.loginFirst', "Please login first"));
      navigate('/login');
      return;
    }
    
    try {
      const res = await api.post(`/provider/public/${id}/contact-click`, { actionType: 'whatsapp' });
      if (res.data.success && res.data.url) {
        window.open(res.data.url, '_blank');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('common.actionFailed', "Action failed"));
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F4F7FC]"><LoadingSpinner size="lg" /></div>;
  
  if (!profile) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F7FC] p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm max-w-md w-full text-center border border-[#E5E9F2]">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
          <span className="text-4xl text-gray-400">🕵️</span>
        </div>
        <h2 className="text-xl font-bold text-[#1E293B] mb-2">{t('common.providerNotFound', 'Provider not found')}</h2>
        <p className="text-[#64748B] mb-6 text-sm">The profile you are looking for does not exist or has been removed.</p>
        <button onClick={() => navigate('/search')} className="bg-[#1E293B] text-white px-6 py-2.5 rounded-xl font-medium hover:bg-slate-800 transition w-full shadow-sm text-sm">
          Go back to Search
        </button>
      </div>
    </div>
  );

  const isPublic = profile?.user?.isPublicProfile === true;
  const isOwner = isAuthenticated && user?._id === profile?.user?._id;
  const isAdminOrRecruiter = isAuthenticated && (user?.activeRole === 'recruiter' || user?.activeRole === 'admin' || user?.role === 'admin');
  const canView = isPublic || isOwner || isAdminOrRecruiter || profile.isDummy;

  if (!canView) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F7FC] p-4">
        <Seo title="Profile Private" robots="noindex, nofollow" />
        <div className="bg-white p-8 rounded-2xl shadow-sm max-w-md w-full text-center border border-[#E5E9F2]">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
            <span className="text-4xl text-gray-400">🔒</span>
          </div>
          <h2 className="text-xl font-bold text-[#1E293B] mb-2">Profile is Private</h2>
          <p className="text-[#64748B] mb-6 text-sm">This provider has chosen not to make their profile public.</p>
          <button onClick={() => navigate('/search')} className="bg-[#1E293B] text-white px-6 py-2.5 rounded-xl font-medium hover:bg-slate-800 transition w-full shadow-sm text-sm">
            Go back to Search
          </button>
        </div>
      </div>
    );
  }

  const seoTitle = profile.user?.name ? `${profile.user.name} - ${t('common.profile', 'Profile')}` : t('common.profile', 'Profile');
  const seoDescription = profile.description || t('provider.profileDescription', 'View verified provider profile, skills, and reviews on Lucohire.');
  const seoImage = profile.photo || profile.profilePhoto || '';

  const userName = profile.user?.name || 'Service Provider';
  const firstName = (userName || '').split(' ')[0] || 'Provider';

  const approvedLinks = (profile.portfolioLinks || []).filter(link => {
    if (typeof link === 'string') return true;
    return link.status === 'approved';
  });

  const combinedSchema = [
    {
      "@context": "https://schema.org",
      "@type": ["ProfilePage", "Person"],
      "name": userName,
      "jobTitle": profile.category || (Array.isArray(profile.skills) ? profile.skills[0] : 'Professional'),
      "description": seoDescription,
      "image": seoImage,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": profile.city || "India"
      }
    },
    generateBreadcrumbSchema([
      { name: "Home", item: "https://www.lucohire.com" },
      { name: "Providers", item: "https://www.lucohire.com/search" },
      { name: profile.city || "India", item: `https://www.lucohire.com/search?location=${profile.city || ""}` },
      { name: userName, item: `https://www.lucohire.com/p/${id}` }
    ])
  ];

  return (
    <div className="min-h-screen bg-[#F4F7FC] pb-24 pt-8 px-4 sm:px-6 lg:px-8 font-sans">
      <Seo
        title={seoTitle}
        description={seoDescription}
        canonicalPath={`/p/${id}`}
        image={seoImage}
        robots={isPublic && !profile.isDummy ? 'index, follow' : 'noindex, nofollow'}
        schema={combinedSchema}
      />
      
      <div className="max-w-[1200px] mx-auto">
        
        {/* TOP ROW: 3 Columns on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          {/* Card 1: Avatar & Contact */}
          <div className="bg-white rounded-[1.25rem] shadow-sm border border-[#E5E9F2] p-8 flex flex-col items-center text-center">
            <div className="w-[120px] h-[120px] rounded-full mb-6 shadow-sm border border-gray-100 overflow-hidden relative bg-gray-50">
              {profile.photo || profile.profilePhoto ? (
                <img
                  src={toOptimizedMediaUrl(profile.photo || profile.profilePhoto, { width: 240, height: 240, crop: 'fill', dpr: 'auto' })}
                  alt={userName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                  <span className="text-4xl font-bold text-slate-400">{userName[0]}</span>
                </div>
              )}
            </div>
            
            <h1 className="text-[22px] font-bold text-[#1E293B] leading-tight mb-2 flex items-center gap-2">
              {userName}
              {profile.isVerified && <HiBadgeCheck className="w-5 h-5 text-blue-500 shrink-0" title="Verified" />}
            </h1>
            <p className="text-sm font-medium text-[#64748B] mb-6 px-4">
              {profile.category || (Array.isArray(profile.skills) ? profile.skills[0] : 'Professional')}
            </p>

            {/* Contact Details (Blue links) */}
            <div className="w-full mt-auto space-y-3">
              {profile.isDummy && (
                <div className="text-[12px] font-medium text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mb-2">
                  Demo profile contact hidden.
                </div>
              )}

              {contactUnlocked && contactInfo ? (
                <>
                  {(contactInfo.phone || contactInfo.whatsappNumber) && (
                    <a href={`tel:${contactInfo.phone || contactInfo.whatsappNumber}`} className="text-[#3B82F6] font-medium text-[15px] hover:underline block break-all">
                      {contactInfo.phone || contactInfo.whatsappNumber}
                    </a>
                  )}
                  {contactInfo.email && (
                    <a href={`mailto:${contactInfo.email}`} className="text-[#3B82F6] font-medium text-[15px] hover:underline block break-all">
                      {contactInfo.email}
                    </a>
                  )}
                  <a 
                    href={profile.whatsappAlerts === false ? undefined : `https://wa.me/${(contactInfo.whatsappNumber || contactInfo.phone || '').replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-4 w-full border border-[#E5E9F2] text-[#1E293B] py-2 rounded-lg text-sm font-semibold flex justify-center items-center gap-2 ${profile.whatsappAlerts === false ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:bg-gray-50'}`}
                    onClick={(e) => {
                      if (profile.whatsappAlerts === false) e.preventDefault();
                    }}
                  >
                    <FaWhatsapp className="text-[#075E54] w-4 h-4"/> WhatsApp
                  </a>
                </>
              ) : (
                <>
                  {profile.phone && <div className="text-[#3B82F6] font-medium text-[15px] blur-[4px] select-none">+1 (555) 000-0000</div>}
                  {profile.email && <div className="text-[#3B82F6] font-medium text-[15px] blur-[4px] select-none">contact@example.com</div>}
                  {isPublic && profile.user?.whatsappConsent ? (
                    <button 
                      onClick={handleContactClick}
                      className="mt-4 w-full border border-[#075E54] text-[#075E54] py-2 rounded-lg text-sm font-semibold flex justify-center items-center gap-2 hover:bg-[#075E54] hover:text-white transition-colors"
                    >
                      <FaWhatsapp className="w-4 h-4"/> Contact via WhatsApp
                    </button>
                  ) : (
                    <button 
                      disabled={unlocking}
                      onClick={handleUnlock} 
                      className={`mt-4 w-full bg-[#1E293B] text-white py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition shadow-sm ${unlocking ? 'opacity-70 cursor-wait' : ''}`}
                    >
                      {unlocking ? 'Unlocking...' : t('provider.unlockContactInfo', 'Unlock Contact Info')}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Card 2: General Information */}
          <div className="bg-white rounded-[1.25rem] shadow-sm border border-[#E5E9F2] p-6 lg:p-8">
            <h2 className="text-[17px] font-semibold text-[#1E293B] flex items-center gap-2 mb-6">
              General information
              <div className="w-5 h-5 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#3B82F6]">
                <HiOutlinePencil className="w-3 h-3" />
              </div>
            </h2>
            
            <div className="space-y-0">
              <div className="grid grid-cols-[120px_1fr] py-3.5 border-b border-[#F1F5F9]">
                <span className="text-[13px] text-[#64748B] font-medium">Location</span>
                <span className="text-[14px] text-[#1E293B] font-medium text-right">{profile.city || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] py-3.5 border-b border-[#F1F5F9]">
                <span className="text-[13px] text-[#64748B] font-medium">Experience</span>
                <span className="text-[14px] text-[#1E293B] font-medium text-right">{profile.experience || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] py-3.5 border-b border-[#F1F5F9]">
                <span className="text-[13px] text-[#64748B] font-medium">Languages</span>
                <span className="text-[14px] text-[#1E293B] font-medium text-right">{(profile.languages || []).join(', ') || 'English'}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] py-3.5 border-b border-[#F1F5F9]">
                <span className="text-[13px] text-[#64748B] font-medium">Pricing</span>
                <span className="text-[14px] text-[#1E293B] font-medium text-right">
                  {profile.pricing ? `₹${profile.pricing}${profile.pricingType ? `/${profile.pricingType}` : ''}` : 'Upon Request'}
                </span>
              </div>
              <div className="grid grid-cols-[120px_1fr] py-3.5">
                <span className="text-[13px] text-[#64748B] font-medium">Profile Views</span>
                <span className="text-[14px] text-[#1E293B] font-medium text-right">{profile.profileViews || 0}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Anamnesis -> Core Expertise & Services */}
          <div className="bg-white rounded-[1.25rem] shadow-sm border border-[#E5E9F2] p-6 lg:p-8">
            <h2 className="text-[17px] font-semibold text-[#1E293B] flex items-center gap-2 mb-6">
              Expertise & Services
              <div className="w-5 h-5 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#3B82F6]">
                <HiOutlinePencil className="w-3 h-3" />
              </div>
            </h2>
            
            <div className="space-y-0">
              <div className="grid grid-cols-[100px_1fr] py-3.5 border-b border-[#F1F5F9]">
                <span className="text-[13px] text-[#64748B] font-medium">Skills</span>
                <span className="text-[14px] text-[#1E293B] font-medium text-right">
                  {(profile.skills || []).length > 0 ? profile.skills.join(', ') : 'Not specified'}
                </span>
              </div>
              <div className="grid grid-cols-[100px_1fr] py-3.5 border-b border-[#F1F5F9]">
                <span className="text-[13px] text-[#64748B] font-medium">Services</span>
                <span className="text-[14px] text-[#1E293B] font-medium text-right">
                  {(profile.services || []).length > 0 ? profile.services.join(', ') : 'Not specified'}
                </span>
              </div>
              <div className="grid grid-cols-[100px_1fr] py-3.5 border-b border-[#F1F5F9]">
                <span className="text-[13px] text-[#64748B] font-medium">Rating</span>
                <span className="text-[14px] text-[#1E293B] font-medium text-right flex items-center justify-end gap-1">
                  {profile.rating || '0.0'} <HiStar className="w-4 h-4 text-amber-400 -mt-0.5"/>
                </span>
              </div>
              {profile.tier && (
                <div className="grid grid-cols-[100px_1fr] py-3.5">
                  <span className="text-[13px] text-[#64748B] font-medium">Tier</span>
                  <span className="text-[14px] text-[#1E293B] font-medium text-right capitalize">
                    {profile.tier.replace('-', ' ')}
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* BOTTOM ROW: Left (Tabs+Lists), Right (Files) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Area (Tabs) */}
          <div className="lg:col-span-2 bg-white rounded-[1.25rem] shadow-sm border border-[#E5E9F2] p-6 lg:p-8 h-fit">
            {/* Custom Tabs */}
            <div className="flex gap-8 border-b border-[#E5E9F2] mb-6">
              <button 
                onClick={() => setActiveTab('about')}
                className={`pb-3 text-[15px] font-bold transition-colors ${activeTab === 'about' ? 'text-[#3B82F6] border-b-[3px] border-[#3B82F6]' : 'text-[#94A3B8] hover:text-[#64748B]'}`}
              >
                About Provider
              </button>
              <button 
                onClick={() => setActiveTab('reviews')}
                className={`pb-3 text-[15px] font-bold transition-colors ${activeTab === 'reviews' ? 'text-[#3B82F6] border-b-[3px] border-[#3B82F6]' : 'text-[#94A3B8] hover:text-[#64748B]'}`}
              >
                Client Reviews ({profile.totalReviews || reviews.length || 0})
              </button>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
              {activeTab === 'about' && (
                <div className="text-[14px] text-[#475569] leading-relaxed max-w-3xl whitespace-pre-wrap">
                  {profile.description || `${firstName} is a professional ${profile.category || 'service provider'} based in ${profile.city || 'their city'}. They have a track record of providing excellent service and ensuring customer satisfaction.`}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-4">
                  {reviews && reviews.length > 0 ? (
                    reviews.map((rev, i) => {
                      // Alternate border colors for visual style
                      const borderColors = ['border-l-[#A855F7]', 'border-l-[#14B8A6]', 'border-l-[#3B82F6]', 'border-l-[#F59E0B]'];
                      const bgColors = ['bg-[#F9F5FF]', 'bg-[#F0FDFA]', 'bg-[#EFF6FF]', 'bg-[#FFFBEB]'];
                      const cIndex = i % borderColors.length;
                      
                      return (
                        <div key={i} className={`flex flex-col sm:flex-row gap-4 sm:items-center p-4 rounded-r-xl border-l-4 ${borderColors[cIndex]} ${bgColors[cIndex]}`}>
                          <div className="flex-1">
                            <div className="text-[12px] text-[#64748B] mb-1">
                              {new Date(rev.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                            <div className="font-semibold text-[#1E293B] text-[15px]">{rev.reviewerName || 'Client'}</div>
                          </div>
                          
                          <div className="flex-1">
                            <div className="text-[12px] text-[#64748B] mb-1">Rating</div>
                            <div className="flex items-center text-amber-500">
                              {[...Array(5)].map((_, j) => (
                                <HiStar key={j} className={`w-4 h-4 ${j < rev.rating ? 'text-amber-500' : 'text-amber-200'}`} />
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex-1 sm:text-right">
                            <div className="text-[12px] text-[#64748B] mb-1">Feedback</div>
                            <div className="text-[14px] text-[#1E293B] font-medium truncate max-w-[200px] sm:ml-auto" title={rev.comment}>
                              {rev.comment || 'Great service'}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center py-10 text-[#94A3B8] text-sm">No reviews found.</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Area (Files/Links) */}
          <div className="lg:col-span-1 space-y-6">
            
            <div className="bg-white rounded-[1.25rem] shadow-sm border border-[#E5E9F2] p-6 lg:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[17px] font-semibold text-[#1E293B]">Portfolio & Links</h2>
                {approvedLinks.length > 0 && (
                  <button className="text-[11px] font-bold text-[#3B82F6] border border-[#BFDBFE] px-3 py-1 rounded-full uppercase tracking-wider hover:bg-[#EFF6FF] transition">
                    Open All
                  </button>
                )}
              </div>

              {approvedLinks.length > 0 ? (
                <div className="space-y-4">
                  {approvedLinks.map((link, i) => {
                    const platformName = typeof link === 'string' ? 'Web Link' : link.platform;
                    const linkUrl = typeof link === 'string' ? link : link.url;
                    return (
                      <SafeExternalLink key={i} href={linkUrl} className="flex items-center gap-3 p-2 hover:bg-[#F8FAFC] rounded-lg transition group">
                        <div className="w-8 h-8 rounded bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center shrink-0">
                          <HiOutlineDocumentText className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[14px] font-semibold text-[#1E293B] capitalize truncate">{platformName}</div>
                        </div>
                        <div className="text-[12px] text-[#94A3B8] group-hover:text-[#3B82F6] flex items-center gap-1 transition">
                          Link <HiExternalLink className="w-3 h-3"/>
                        </div>
                      </SafeExternalLink>
                    )
                  })}
                </div>
              ) : (
                <div className="text-[13px] text-[#94A3B8] py-4">No portfolio links added.</div>
              )}
            </div>
            
            {/* Optional Notes Section if needed */}
            {profile.resumeUrl && profile.hasResume && (
              <div className="bg-white rounded-[1.25rem] shadow-sm border border-[#E5E9F2] p-6 lg:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[17px] font-semibold text-[#1E293B]">Resume</h2>
                  <button onClick={handleUnlock} disabled={unlocking || profile.isDummy || contactUnlocked} className="text-[11px] font-bold text-[#3B82F6] border border-[#BFDBFE] px-3 py-1 rounded-full uppercase tracking-wider hover:bg-[#EFF6FF] transition disabled:opacity-50">
                    DOWNLOAD
                  </button>
                </div>
                <div className="flex items-center gap-3 p-2">
                  <div className="w-8 h-8 rounded bg-[#F3F4F6] text-[#64748B] flex items-center justify-center shrink-0">
                    <HiOutlineDocumentText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-[#1E293B] truncate">Resume.pdf</div>
                  </div>
                  <div className="text-[12px] text-[#94A3B8]">
                    {contactUnlocked ? 'Available' : 'Locked'}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
      
      <SubscriptionPlansPopup 
        open={showPlans} 
        onClose={() => setShowPlans(false)} 
        role="recruiter" 
        reason="unlock_limit" 
      />
    </div>
  );
};

export default ProviderPublicProfile;
