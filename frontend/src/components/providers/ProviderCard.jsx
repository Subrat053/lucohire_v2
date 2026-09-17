import { memo } from 'react';
import { MapPin, Phone, MessageCircle, Star, CheckCircle2, Briefcase, Calendar, Zap, BadgeCheck, MoreVertical, Clock, Wallet, Eye } from 'lucide-react';
import { HiBadgeCheck } from 'react-icons/hi';
import { toOptimizedMediaUrl } from '../../utils/media';
import useTranslation from '../../hooks/useTranslation';

const landingAvatarColors = [
  'bg-[#DFFBF0] text-[#08905B]',
  'bg-[#EAF2FF] text-[#1677FF]',
  'bg-[#FFF3E6] text-[#E56700]',
  'bg-[#F4E8FF] text-[#8A38D6]',
  'bg-[#FEF3C7] text-[#B45309]',
  'bg-[#DCFCE7] text-[#15803D]',
];

const getInitials = (name = 'Provider') =>
  String(name)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'P';

const formatDistance = (dist) => {
  if (dist == null || !Number.isFinite(Number(dist))) return '';
  const num = Number(dist);
  if (num < 1) {
    return `~${Math.round(num * 1000)} m`;
  }
  return `~${num.toFixed(1)} km`;
};

const ProviderCard = ({ provider = {}, variant = 'search', badge = '', onClick, index = 0 }) => {
  // Respect the provider's WhatsApp notification preference.
  // whatsappAlerts defaults to true in normalizeProviderData, so false means explicitly disabled.
  const whatsappEnabled = provider.whatsappAlerts !== false;
  const { t } = useTranslation();
  const image = provider.image || provider.profilePhoto || provider.photo || provider.avatar || provider.user?.avatar;
  const name = provider.name || provider.user?.name || 'Service Provider';
  const initials = provider.initials || getInitials(name);
  const rating = provider.rating || provider.averageRating || 0;
  const reviews = provider.totalReviews || provider.reviews || 0;
  const location = provider.location || provider.city || provider.locationLabel || '';
  const skills = Array.isArray(provider.skills) ? provider.skills : [];
  const ratePerHour = provider.ratePerHour || provider.rate || 0;
  const available = provider.isAvailable !== false;
  const planBadge = provider.planBadge || (provider.isBoosted ? 'Boosted' : '');
  const visibilityLevel = provider.visibilityLevel || '';
  const badgeStyleByLevel = {
    country_top: 'bg-[#E6F2FF] text-[#0B6BFF] border border-[#CFE2FF]',
    city_top: 'bg-[#EAF7F0] text-[#16A34A] border border-[#CDEEDB]',
    pincode_top: 'bg-[#FFF4E6] text-[#D97706] border border-[#FAD7A0]',
    custom: 'bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB]',
    basic: 'bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB]',
  };
  const planBadgeStyle = badgeStyleByLevel[visibilityLevel] || 'bg-[#E6F2FF] text-[#0B6BFF] border border-[#CFE2FF]';

  // Limit skills to 2 or 3
  const maxSkillsToShow = 2;
  const visibleSkills = skills.slice(0, maxSkillsToShow);
  const remainingSkills = skills.length - maxSkillsToShow;

  if (variant === 'landing') {
    const roleText = provider.role || provider.category || provider.headline || t('common.professional', 'Professional');
    return (
      <div
        onClick={onClick}
        className="bg-white rounded-2xl border border-[#E7ECF4] p-5 hover:shadow-[0_10px_40px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition cursor-pointer flex flex-col h-full gap-3 justify-between"
      >
        {/* Header section */}
        <div className="flex items-center gap-3 min-h-[44px]">
          {image ? (
            <img
              src={toOptimizedMediaUrl(image, { width: 88, height: 88, crop: 'fill', dpr: 'auto' })}
              alt={name}
              width={44}
              height={44}
              loading="lazy"
              decoding="async"
              className="w-11 h-11 rounded-full object-cover border border-[#E7ECF4] shrink-0"
            />
          ) : (
            <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${provider.avatarBg || landingAvatarColors[index % landingAvatarColors.length]}`}>
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-[#081B3A] text-sm truncate" title={name}>{name}</h3>
              {provider.isVerified !== false && <CheckCircle2 className="w-4 h-4 text-[#12B76A] shrink-0" />}
            </div>
            <p className="text-xs text-[#6B7280] truncate" title={roleText}>{roleText}</p>
          </div>
        </div>

        {/* Rating section */}
        <div className="flex items-center gap-1.5 text-xs h-4">
          <Star className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B] shrink-0" />
          <span className="font-bold text-[#081B3A]">{rating}</span>
          <span className="text-[#6B7280]">({reviews} {t('common.reviews', 'reviews')})</span>
        </div>

        {/* Location section */}
        <div className="flex items-center gap-1 text-xs text-[#6B7280] h-4 truncate">
          <MapPin className="w-3 h-3 shrink-0" /> <span className="truncate">{location || t('common.locationUnavailable', 'Location N/A')}</span>
        </div>

        {/* Skills section (fixed height) */}
        <div className="flex flex-wrap items-center gap-1.5 h-7 overflow-hidden">
          {visibleSkills.map((skill) => (
            <span
              key={skill}
              className="text-[11px] font-medium text-[#374151] bg-[#F3F6FB] border border-[#E7ECF4] px-2 py-0.5 rounded-md truncate max-w-[100px]"
            >
              {skill}
            </span>
          ))}
          {remainingSkills > 0 && (
            <span className="text-[11px] font-medium text-[#6B7280] bg-[#F3F4F6] border border-[#E5E7EB] px-2 py-0.5 rounded-md shrink-0">
              +{remainingSkills} more
            </span>
          )}
        </div>

        {/* Price and distance section */}
        <div className="flex items-baseline justify-between pt-1 border-t border-[#F3F6FB] mt-auto">
          <div>
            {provider.pricing ? (
              <>
                <span className="text-lg font-extrabold text-[#081B3A]">₹{provider.pricing}</span>
                {provider.pricingType && (
                  <span className="text-xs text-[#6B7280]"> /{provider.pricingType === 'hourly' ? 'hr' : provider.pricingType === 'daily' ? 'day' : provider.pricingType === 'monthly' ? 'mo' : provider.pricingType}</span>
                )}
              </>
            ) : ratePerHour ? (
              <>
                <span className="text-lg font-extrabold text-[#081B3A]">₹{ratePerHour}</span>
                <span className="text-xs text-[#6B7280]"> /hr</span>
              </>
            ) : (
              <span className="text-xs text-[#6B7280]">Rate N/A</span>
            )}
          </div>
          <span className="text-xs text-[#6B7280]">
            {formatDistance(provider.distanceKm)}
          </span>
        </div>

        {/* CTA buttons row */}
        <div className="flex gap-2 pt-1 mt-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              // If WhatsApp is enabled and a number is available → open WhatsApp directly.
              // Otherwise navigate to the provider's profile so the user can unlock contact details.
              const waNum = provider.whatsappNumber || provider.user?.whatsappNumber;
              if (whatsappEnabled && waNum) {
                const cleanNum = String(waNum).replace(/\D/g, '');
                window.open(`https://wa.me/${cleanNum}`, '_blank');
              } else {
                onClick?.();
              }
            }}
            className="flex-1 flex items-center justify-center gap-1.5 border border-[#E7ECF4] text-[#374151] text-xs font-semibold py-2 rounded-xl hover:bg-[#F7F9FC] transition h-9"
          >
            <MessageCircle className="w-3.5 h-3.5" /> {t('common.whatsapp', 'WhatsApp')}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
            className="flex-1 flex items-center justify-center gap-1.5 bg-[#1677FF] hover:bg-[#0E5FCC] text-white text-xs font-bold py-2 rounded-xl transition h-9"
          >
            <Phone className="w-3.5 h-3.5" /> {t('common.callNow', 'Call Now')}
          </button>
        </div>
      </div>
    );
  }

  const tierColors = { unskilled:'bg-emerald-100 text-emerald-700', 'semi-skilled':'bg-amber-100 text-amber-700', skilled:'bg-indigo-100 text-indigo-700' };
  const tierLabels = {
    unskilled: t('search.tierUnskilled'),
    'semi-skilled': t('search.tierSemiSkilled'),
    skilled: t('search.tierSkilled'),
  };

  const roleText = provider.role || provider.category || provider.headline || t('common.professional', 'Professional');
  const experienceText = provider.experienceYears ? `${provider.experienceYears}+ Yrs` : provider.experience || 'N/A';

  return (
    <div onClick={onClick} className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full relative overflow-hidden group cursor-pointer">
      
      {/* Top Section */}
      <div className="flex gap-4 mb-5">
        {/* Left: Avatar with Available Now pill */}
        <div className="relative shrink-0">
          {image ? (
            <img src={toOptimizedMediaUrl(image, { width: 88, height: 88, crop: 'fill', dpr: 'auto' })} alt={name} className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-1 ring-gray-100" loading="lazy" />
          ) : (
            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center text-3xl font-bold ring-1 ring-gray-100 ${provider.avatarBg || landingAvatarColors[index % landingAvatarColors.length]}`}>
              {initials}
            </div>
          )}
          {available && (
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-green-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap shadow-md">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
              {t('common.available', 'Available')}
            </div>
          )}
        </div>
        
        {/* Right: Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex justify-between items-start mb-1">
            <div className="flex items-center gap-1.5">
              <h3 className="text-lg font-bold text-gray-900 tracking-tight truncate" title={name}>{name}</h3>
              {provider.isVerified !== false && <BadgeCheck className="w-5 h-5 text-blue-600 fill-blue-600/10" strokeWidth={2.5} />}
            </div>
            <MoreVertical className="w-4 h-4 text-gray-400 cursor-pointer" />
          </div>
          
          <p className="text-[13px] font-bold text-indigo-700 mb-2 truncate" title={roleText}>
            {roleText}
          </p>
          
          <div className="flex flex-col gap-1.5 text-[12px] text-gray-700 font-medium">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="truncate" title={location}>{location || t('common.india', 'India')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              {t("Last active:")} <span className="text-green-700 font-bold ml-0.5">{t("Today")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Stats Row */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="flex items-center gap-2 bg-indigo-50/50 p-2 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <div className="text-[12px] font-bold text-gray-900 truncate">{experienceText}</div>
            <div className="text-[10px] text-gray-500 font-medium truncate">{t("Experience")}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-blue-50/50 p-2 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <div className="min-w-0">
            <div className="text-[12px] font-bold text-gray-900 truncate">25{t("h/wk")}</div>
            <div className="text-[10px] text-gray-500 font-medium truncate">{t("Availability")}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-green-50/50 p-2 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-green-700" />
          </div>
          <div className="min-w-0">
            <div className="text-[12px] font-bold text-gray-900 truncate">{t("Ready")}</div>
            <div className="text-[10px] text-gray-500 font-medium truncate">{t("To Start")}</div>
          </div>
        </div>
      </div>

      {/* Top Skills */}
      <div className="mb-5 flex-grow">
        <div className="flex flex-wrap gap-1.5">
          {skills.slice(0, 4).map((tag, idx) => (
            <span key={idx} className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-[11px] font-bold">
              {tag}
            </span>
          ))}
          {skills.length > 4 && (
            <span className="bg-gray-50 text-gray-500 px-2.5 py-1 rounded-lg text-[11px] font-bold">
              +{skills.length - 4} {t("More")}
            </span>
          )}
        </div>
      </div>

      {/* Rate & Verifications */}
      <div className="flex gap-4 mb-5 border-t border-gray-100 pt-5">
        <div className="flex-1 bg-[#f0fdf4] rounded-xl p-3 flex flex-col justify-center border border-green-100">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-green-700" />
            <span className="text-[11px] text-green-800 font-bold uppercase tracking-wider">{t("Hourly Rate")}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-gray-900">₹{provider.pricing || ratePerHour || '1200'}</span>
            <span className="text-[12px] font-bold text-gray-500">{t("/hr")}</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center space-y-1.5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 fill-green-500/10" />
            <span className="text-[11px] text-gray-700 font-medium">{t("Resume Verified")}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 fill-green-500/10" />
            <span className="text-[11px] text-gray-700 font-medium">{t("Mobile Verified")}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 fill-green-500/10" />
            <span className="text-[11px] text-gray-700 font-medium">{t("Email Verified")}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-auto flex flex-col gap-2.5">
        <div className="flex gap-2.5">
          <button
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const waNum = provider.user?.whatsappNumber || provider.whatsappNumber;
                if (!whatsappEnabled || !waNum) {
                    onClick?.();
                } else {
                    const cleanNum = String(waNum).replace(/\D/g, '');
                    window.open(`https://wa.me/${cleanNum}`, '_blank');
                }
            }}
            className="flex-[1.5] py-2.5 rounded-xl bg-[#075E54] text-white font-bold hover:bg-[#04433B] transition-colors text-[13px] flex items-center justify-center gap-2 shadow-sm"
          >
            <MessageCircle className="w-4 h-4" fill="currentColor" strokeWidth={0} /> {t("Chat on WhatsApp")}
          </button>
          <button 
            onClick={(e) => { 
                e.preventDefault();
                e.stopPropagation(); 
                const telNum = provider.user?.whatsappNumber || provider.whatsappNumber;
                if (telNum) {
                    window.location.href = `tel:${telNum}`;
                } else {
                    onClick?.();
                }
            }}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors text-[13px] flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Phone className="w-4 h-4" /> {t("Call")}
          </button>
        </div>
        <button 
          onClick={(e) => {
              if (onClick) {
                  e.preventDefault();
                  e.stopPropagation();
                  onClick();
              }
              // If no onClick is provided, let it bubble to the parent Link
          }}
          className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors text-[13px] flex items-center justify-center gap-2"
        >
          <Eye className="w-4 h-4" strokeWidth={2.5} /> {t("View Full Profile")}
        </button>
      </div>
    </div>
  );
};

export default memo(ProviderCard);
