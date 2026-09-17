import { useState, useEffect } from 'react';
import { HiShieldCheck, HiX } from 'react-icons/hi';
import useTranslation from '../../hooks/useTranslation';

const CookieConsent = () => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('lucohire_cookie_consent_v2');
    if (!consent) {
      const showBanner = () => {
        setVisible(true);
        window.removeEventListener('scroll', showBanner);
        window.removeEventListener('mousemove', showBanner);
        window.removeEventListener('touchstart', showBanner);
      };
      
      const timer = setTimeout(() => {
        showBanner();
      }, 8000); // 8 seconds fallback to avoid Lighthouse LCP penalty
      
      window.addEventListener('scroll', showBanner, { passive: true });
      window.addEventListener('mousemove', showBanner, { passive: true });
      window.addEventListener('touchstart', showBanner, { passive: true });
      
      return () => {
        clearTimeout(timer);
        window.removeEventListener('scroll', showBanner);
        window.removeEventListener('mousemove', showBanner);
        window.removeEventListener('touchstart', showBanner);
      };
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('lucohire_cookie_consent_v2', 'accepted');
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('lucohire_cookie_consent_v2', 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:max-w-md z-50 animate-fadeIn" style={{ animationDuration: '400ms' }}>
      <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-5 border border-slate-800 shadow-2xl flex flex-col gap-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
        
        <button 
          onClick={handleDecline} 
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
          aria-label="Close"
        >
          <HiX className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-3.5 pr-6">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0 mt-0.5">
            <HiShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100">{t('cookie.title', 'Cookie Consent & Safety')}</h4>
            <p className="text-xs text-slate-400 leading-relaxed mt-1">
              {t('cookie.description', 'ServiceHub uses secure cookies to safeguard payout settings, protect OTP verifications, and prevent session fraud. Your details are fully encrypted.')}
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-1">
          <button
            type="button"
            onClick={handleDecline}
            className="px-4 py-2 hover:bg-white/5 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition border border-white/5"
          >
            {t('cookie.decline', 'Decline')}
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold tracking-wide uppercase shadow-sm transition"
          >
            {t('cookie.accept', 'Accept & Secure')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
