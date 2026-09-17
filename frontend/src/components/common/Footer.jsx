import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useTranslation from '../../hooks/useTranslation';
import { useState, useEffect } from 'react';
import {
  FaFacebookF, FaInstagram, FaLinkedinIn, FaTwitter, FaYoutube,
  FaWhatsapp, FaTelegram, FaGithub, FaDiscord, FaTiktok, FaPinterest, FaReddit, FaGlobe
} from "react-icons/fa";
import { Lock, ShieldCheck, FileCheck, Award, Mail, Phone, MapPin } from "lucide-react";
import toast from 'react-hot-toast';
import API, { ADMIN_API, adminAPI } from '../../services/api';

const ICON_MAP = {
  facebook: FaFacebookF,
  twitter: FaTwitter,
  linkedin: FaLinkedinIn,
  instagram: FaInstagram,
  youtube: FaYoutube,
  whatsapp: FaWhatsapp,
  telegram: FaTelegram,
  github: FaGithub,
  discord: FaDiscord,
  tiktok: FaTiktok,
  pinterest: FaPinterest,
  reddit: FaReddit,
};

const getSocialEntries = (socials) => {
  if (socials && Array.isArray(socials._list)) {
    return socials._list.filter(item => item.enabled && item.url);
  }
  if (socials && typeof socials === 'object') {
    return Object.entries(socials)
      .filter(([k, url]) => k !== '_list' && url)
      .map(([key, url]) => ({ key, url }));
  }
  return [];
};

const Footer = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socials, setSocials] = useState({
    facebook: 'https://facebook.com/lucohire',
    twitter: 'https://twitter.com/lucohire',
    linkedin: 'https://linkedin.com/company/lucohire',
    instagram: 'https://instagram.com/lucohire'
  });
  const [companyDetails, setCompanyDetails] = useState({
    companyName: 'Lucohire',
    registrationDetails: '',
    footerDescription: '',
    addressLine1: '',
    addressLine2: '',
    gstNumber: '',
    footerCustomText: '',
    copyrightText: '',
    supportEmail: '',
    supportPhone: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [socRes, compRes] = await Promise.allSettled([
          ADMIN_API.get('/admin/content/socials'),
          adminAPI.getPublicCompanyDetails(),
        ]);
        if (socRes.status === 'fulfilled' && socRes.value.data) {
          setSocials(socRes.value.data);
        }
        if (compRes.status === 'fulfilled' && compRes.value.data) {
          setCompanyDetails(compRes.value.data);
        }
      } catch (err) {
        console.error('Failed to load footer metadata:', err);
      }
    };
    fetchData();
  }, []);

  const sections = [
    {
      title: t('footer.candidates', 'For Candidates'),
      links: [
        { label: t('footer.findJobs', 'Find Jobs'), href: '/candidate-landing' },
        { label: t('footer.createProfile', 'Create Profile'), href: '/signup?role=candidate' },
        { label: t('footer.careerTips', 'Career Tips'), href: '/career-tips' },
        { label: t('footer.pricing', 'Pricing'), href: '/pricing', ariaLabel: 'Pricing for Providers' },
        { label: t('footer.helpCenter', 'Help Center'), href: '/contact' },
      ],
    },
    {
      title: t('footer.recruiters', 'For Recruiters'),
      links: [
        { label: t('footer.postJob', 'Post a Job'), href: '/recruiter-discovery' },
        { label: t('footer.findCandidates', 'Find Candidates'), href: '/search' },
        { label: t('footer.pricing', 'Pricing'), href: '/pricing', ariaLabel: 'Pricing for Recruiters' },
        { label: t('footer.resources', 'Resources'), href: '/resources' },
      ],
    },
    {
      title: t('footer.company', 'Company'),
      links: [
        { label: t('footer.about', 'About Us'), href: '/about' },
        { label: t('footer.privacy', 'Privacy Policy'), href: '/privacy' },
        { label: t('footer.terms', 'Terms & Conditions'), href: '/terms' },
        { label: t('footer.contact', 'Contact Us'), href: '/contact' },
        { label: t('footer.refundPolicy', 'Refund Policy'), href: '/refund-policy' },
      ],
    },
  ];

  return (
    <footer className="bg-[#081B3A] text-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 sm:py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-10">
        {/* Brand Column */}
        <div className="col-span-1 md:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-14 h-14 bg-white rounded-full overflow-hidden flex items-center justify-center">
              <img src="/lucohire.webp" alt="Lucohire Logo" className="w-full h-full object-cover" />
            </div>
            <div className="leading-none flex flex-col justify-center">
              <p className="font-extrabold text-white tracking-tight text-lg leading-none">{companyDetails.companyName || 'Lucohire'}</p>
              <p className="text-[10px] font-medium text-gray-400 mt-1 leading-snug max-w-[200px]">
                AI-Powered Global Jobs & Hiring Platform
              </p>
            </div>
          </div>

          {/* Dynamic Footer Short Description / Tagline */}
          <p className="text-sm text-gray-400 leading-relaxed mb-3">
            {companyDetails.footerDescription || t('footer.description', "India's AI-powered hiring platform. Verified providers, fair distribution, WhatsApp-first.")}
          </p>

          {/* Government Certification / Registration Details Box */}
          {companyDetails.registrationDetails && (
            <div className="my-3 p-2.5 bg border border-emerald-500/30 rounded-xl text-xs text-emerald-200 bg-emerald-950/40 flex items-start gap-2">
              <Award className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block mb-0.5">Government Registration & Certification</span>
                <span className="leading-snug text-emerald-100 font-medium">{companyDetails.registrationDetails}</span>
              </div>
            </div>
          )}

          {/* Address & Contact Info if present */}
          {(companyDetails.addressLine1 || companyDetails.supportEmail || companyDetails.supportPhone) && (
            <div className="space-y-1 text-xs text-gray-400 mt-2 pt-2 border-t border-blue-900/50">
              {companyDetails.addressLine1 && (
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  <span>{companyDetails.addressLine1}{companyDetails.addressLine2 ? `, ${companyDetails.addressLine2}` : ''}</span>
                </div>
              )}
              {companyDetails.supportEmail && (
                <a href={`mailto:${companyDetails.supportEmail}`} className="flex items-center gap-1.5 hover:text-white transition !min-h-0 !py-0.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>{companyDetails.supportEmail}</span>
                </a>
              )}
              {companyDetails.supportPhone && (
                <a href={`tel:${companyDetails.supportPhone}`} className="flex items-center gap-1.5 hover:text-white transition !min-h-0 !py-0.5">
                  <Phone className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>{companyDetails.supportPhone}</span>
                </a>
              )}
            </div>
          )}
          
          {/* Social Icons */}
          <div className="flex flex-wrap items-center gap-2.5 mt-3">
            {getSocialEntries(socials).map((item, idx) => {
              const key = (item.key || '').toLowerCase();
              const IconComp = ICON_MAP[key] || FaGlobe;
              return (
                <a
                  key={key || idx}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-blue-900/50 hover:bg-blue-600 text-gray-300 hover:text-white flex items-center justify-center transition-all shadow-xs !min-h-0"
                  title={item.name || key}
                >
                  <IconComp size={15} />
                </a>
              );
            })}
          </div>
        </div>

        {/* Dynamic Navigation Link Columns */}
        {sections.map((section) => (
          <div key={section.title} className="h-max flex flex-col justify-start">
            <h3 className="font-semibold text-white mb-2 sm:mb-6">{section.title}</h3>
            <div className="flex flex-col gap-2 sm:gap-4 justify-start">
              {section.links.map((item) => (
                <Link key={item.label} to={item.href} className="text-sm text-gray-400 hover:text-white transition-colors cursor-pointer !min-h-0 !py-0 block leading-tight" aria-label={item.ariaLabel || item.label}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* Newsletter Column */}
        <div className="col-span-1 sm:col-span-1">
          <h4 className="font-semibold text-white mb-5 sm:mb-6">
            {t('footer.support', 'Stay Updated')}
          </h4>

          <p className="text-sm text-gray-400 mb-4 leading-relaxed">
            {t('footer.newsletter', 'Product news & city launches — once a month.')}
          </p>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (email.trim() && !isSubmitting) {
                setIsSubmitting(true);
                try {
                  const res = await API.post('/public/newsletter/subscribe', { email: email.trim() });
                  toast.success(res.data?.message || t('footer.subscribeSuccess', 'Subscribed successfully to the newsletter!'));
                  setEmail("");
                } catch (err) {
                  toast.error(err.response?.data?.message || 'Failed to subscribe to newsletter. Please try again.');
                } finally {
                  setIsSubmitting(false);
                }
              }
            }}
            className="flex flex-col gap-3 mb-5"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('footer.emailPlaceholder', 'you@email.com')}
              className="w-full bg-[#102A54] border border-[#1C3A66] rounded-lg px-4 py-3 text-sm text-white placeholder-gray-400 outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              required
              disabled={isSubmitting}
            />

            <button 
              type="submit"
              disabled={isSubmitting}
              className={`w-fit bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 font-semibold text-sm ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{t('footer.subscribing', 'Subscribing...')}</span>
                </>
              ) : (
                <>
                  <span>{t('footer.subscribe', 'Subscribe')}</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Bottom Bar: Copyright & Compliance */}
      <div className="border-t border-[#1C3A66]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <span>{companyDetails.copyrightText || t('footer.copyrightSimple', '© 2026 Lucohire. All rights reserved.')}</span>
          
          <div className="flex flex-wrap items-center justify-center gap-6">
            {companyDetails.gstNumber && (
              <span className="text-xs bg-blue-900/60 border border-blue-700/40 text-blue-200 px-2.5 py-1 rounded-md font-mono font-medium">
                {companyDetails.gstLabel || 'GSTIN'}: {companyDetails.gstNumber}
              </span>
            )}
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-700" />
              <span>Secure</span>
            </div>
            {companyDetails.footerCustomText && (
              <div className="flex items-center gap-2 text-gray-400">
                <span>{companyDetails.footerCustomText}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
