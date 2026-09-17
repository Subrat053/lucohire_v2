import { useState, useEffect } from 'react';
import { ChevronDown, Sparkles, HelpCircle } from 'lucide-react';
import { adminAPI } from '../../services/api';
import useTranslation from '../../hooks/useTranslation';



const LandingFaqSection = () => {
  const { t } = useTranslation();
  const [faqs, setFaqs] = useState([]);
  const [openIndex, setOpenIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    adminAPI.getContent('faq')
      .then(res => {
        const raw = res.data || '';
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              setFaqs(parsed);
            } else if (parsed && Array.isArray(parsed.sections)) {
              setFaqs(parsed.sections.map((s, i) => ({
                id: String(i),
                question: s.title || s.question,
                answer: s.body || s.answer
              })));
            }
          } catch {
            // handle error if needed
          }
        }
      })
      .catch(() => {});
  }, []);

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  if (faqs.length === 0) return null;

  return (
    <div className="w-full bg-slate-50 py-16 sm:py-24 relative overflow-hidden">
      
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent opacity-50"></div>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Upper FAQ Header */}
        <div className="text-center space-y-3 mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-100/80 text-blue-800 text-xs font-bold tracking-wide uppercase shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            {t('landingFaq.badge', 'FAQ')}
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            {t("landingFaq.titlePrefix", "Frequently Asked")} <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">{t("landingFaq.titleSuffix", "Questions")}</span>
          </h2>
          <p className="text-sm sm:text-base text-gray-500 font-medium max-w-2xl mx-auto">
            {t("landingFaq.subtitle", "Find answers to common questions about Lucohire AI matching and recruiter tools.")}
          </p>
        </div>

        {/* Vertically Stacked Question Cards */}
        <div className="w-full space-y-3 sm:space-y-4 relative">
          {(showAll ? faqs : faqs.slice(0, 4)).map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div 
                key={item.id || idx} 
                className={`group rounded-2xl transition-all duration-300 overflow-hidden w-full border ${
                  isOpen 
                    ? 'bg-white shadow-xl shadow-blue-900/5 border-blue-200/60 scale-[1.01]' 
                    : 'bg-white/60 hover:bg-white border-transparent hover:border-gray-200/80 shadow-sm'
                }`}
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 font-bold text-gray-900 text-base sm:text-lg hover:text-blue-700 transition-colors text-left"
                >
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                    isOpen 
                      ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30 rotate-12' 
                      : 'bg-blue-50 text-blue-600 shadow-sm border border-blue-100/50 group-hover:scale-110'
                  }`}>
                    <HelpCircle className="w-5 h-5" />
                  </span>

                  <span className="flex-1 font-bold text-gray-900 leading-tight text-left">{item.question}</span>

                  <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                    isOpen 
                      ? 'bg-blue-100 text-blue-700 rotate-180' 
                      : 'bg-gray-100 text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-600'
                  }`}>
                    <ChevronDown className="w-4.5 h-4.5 transition-transform" />
                  </span>
                </button>

                <div 
                  className={`grid transition-all duration-300 ease-in-out ${
                    isOpen ? 'grid-rows-[1fr] opacity-100 pb-5' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="px-5 sm:px-19 text-sm sm:text-base text-gray-700 font-medium leading-relaxed">
                      <p className="pt-2 border-t border-gray-100/80">{item.answer}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* View More Button */}
          {!showAll && faqs.length > 4 && (
            <div className="flex justify-center pt-6 pb-2">
              <button
                onClick={() => setShowAll(true)}
                className="flex items-center gap-2 px-6 py-2.5 bg-white text-blue-600 font-bold rounded-full shadow-md border border-blue-100 hover:bg-blue-50 transition-all hover:scale-105"
              >
                {t('landingFaq.viewMore', 'View All Questions')}
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* View Less Button */}
          {showAll && faqs.length > 4 && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => {
                  setShowAll(false);
                  setOpenIndex(0);
                }}
                className="flex items-center gap-2 px-6 py-2.5 bg-white text-gray-600 font-bold rounded-full shadow-sm border border-gray-200 hover:bg-gray-50 transition-all hover:scale-105"
              >
                {t('landingFaq.viewLess', 'View Less')}
                <ChevronDown className="w-4 h-4 rotate-180" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LandingFaqSection;
