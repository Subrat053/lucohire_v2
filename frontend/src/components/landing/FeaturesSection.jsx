import { useState } from 'react';
import { Brain, CheckCircle2, MessageCircle, Scale, Briefcase, Users, Building2, Target, Search, Zap, ArrowRight, MapPin, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import useTranslation from '../../hooks/useTranslation';

export default function FeaturesSection() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('candidates');

  return (
    <>
      {/* 6. Why Choose Lucohire? */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-10 sm:mb-12">{t("Why Choose")} <span className="text-blue-600">Lucohire</span>?</h2>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-12 sm:mb-16">
          <div className="text-center sm:text-left flex flex-col items-center sm:items-start">
            <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-3">
              <Brain className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1.5 text-sm">{t("AI-Powered Matching")}</h3>
            <p className="text-xs text-gray-500 leading-relaxed">{t("Our AI matches the right talent to the right opportunity in seconds.")}</p>
          </div>
          <div className="text-center sm:text-left flex flex-col items-center sm:items-start">
            <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center text-green-700 mb-3">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1.5 text-sm">{t("Verified & Trusted")}</h3>
            <p className="text-xs text-gray-500 leading-relaxed">{t("Every profile and job is verified for authenticity and trust.")}</p>
          </div>
          <div className="text-center sm:text-left flex flex-col items-center sm:items-start">
            <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center text-green-700 mb-3">
              <MessageCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1.5 text-sm">{t("WhatsApp-First")}</h3>
            <p className="text-xs text-gray-500 leading-relaxed">{t("Communicate instantly with candidates or recruiters via WhatsApp.")}</p>
          </div>
          <div className="text-center sm:text-left flex flex-col items-center sm:items-start">
            <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-3">
              <Scale className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1.5 text-sm">{t("Fair Distribution")}</h3>
            <p className="text-xs text-gray-500 leading-relaxed">{t("Equal visibility for everyone — no favoritism, just fairness.")}</p>
          </div>
        </div>

        {/* Stats Banner */}
        <div className="bg-[#f8fbff] border border-blue-100 rounded-2xl p-5 sm:p-8 grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          <div className="flex items-center justify-center sm:justify-start">
            <Briefcase className="w-7 h-7 text-blue-600 mr-3 hidden sm:block" />
            <div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900">10K+</div>
              <div className="text-xs text-gray-500 font-medium">{t("Jobs Live")}</div>
            </div>
          </div>
          <div className="flex items-center justify-center sm:justify-start">
            <CheckCircle2 className="w-7 h-7 text-blue-600 mr-3 hidden sm:block" />
            <div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900">50K+</div>
              <div className="text-xs text-gray-500 font-medium">{t("Verified Providers")}</div>
            </div>
          </div>
          <div className="flex items-center justify-center sm:justify-start">
            <Building2 className="w-7 h-7 text-blue-600 mr-3 hidden sm:block" />
            <div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900">2K+</div>
              <div className="text-xs text-gray-500 font-medium">{t("Companies")}</div>
            </div>
          </div>
          <div className="flex items-center justify-center sm:justify-start">
            <Target className="w-7 h-7 text-blue-600 mr-3 hidden sm:block" />
            <div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900">98%</div>
              <div className="text-xs text-gray-500 font-medium">{t("Success Rate")}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 7. How Lucohire Works */}
      <div className="w-full bg-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-8 sm:mb-10">{t("How")} <span className="text-blue-600">Lucohire</span> {t("Works")}</h2>
          
          {/* Tabs */}
          <div className="flex justify-center mb-8 sm:mb-10">
            <div className="inline-flex bg-gray-100 rounded-full p-1">
              <button
                onClick={() => setActiveTab('candidates')}
                className={`px-5 sm:px-8 py-2 rounded-full text-sm font-semibold transition ${activeTab === 'candidates' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700 hover:text-gray-800'}`}
              >
                {t("For Candidates")}
              </button>
              <button
                onClick={() => setActiveTab('recruiters')}
                className={`px-5 sm:px-8 py-2 rounded-full text-sm font-semibold transition ${activeTab === 'recruiters' ? 'bg-green-700 text-white shadow-sm' : 'text-gray-700 hover:text-gray-800'}`}
              >
                {t("For Recruiters")}
              </button>
            </div>
          </div>

          {/* Steps */}
          {activeTab === 'candidates' ? (
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 lg:gap-10">
              {[
                { icon: <Users className="w-7 h-7" />, title: t('Create Profile'), desc: t('Build your profile in minutes.'), color: 'text-blue-600', bg: 'bg-blue-50' },
                { icon: <Search className="w-7 h-7" />, title: t('AI Match'), desc: t('Get AI-matched jobs that fit you best.'), color: 'text-blue-600', bg: 'bg-blue-50' },
                { icon: <Briefcase className="w-7 h-7" />, title: t('Get Hired'), desc: t('Apply, connect and get hired faster.'), color: 'text-blue-600', bg: 'bg-blue-50' },
              ].map((step, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                  <div className="flex flex-col items-center text-center max-w-[130px]">
                    <div className={`w-14 h-14 ${step.bg} rounded-full flex items-center justify-center ${step.color} mb-3`}>
                      {step.icon}
                    </div>
                    <h3 className="font-bold text-sm text-gray-900 mb-1">{step.title}</h3>
                    <p className="text-xs text-gray-500">{step.desc}</p>
                  </div>
                  {idx < 2 && (
                    <>
                      <ArrowRight className="w-5 h-5 text-gray-300 hidden sm:block shrink-0" />
                      <div className="block sm:hidden text-gray-300 rotate-90">
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 lg:gap-10">
              {[
                { icon: <Building2 className="w-7 h-7" />, title: t('Post Job'), desc: t('Post your job for free in minutes.'), color: 'text-green-700', bg: 'bg-green-50' },
                { icon: <Zap className="w-7 h-7" />, title: t('AI Shortlist'), desc: t('AI finds and shortlists the best matches.'), color: 'text-green-700', bg: 'bg-green-50' },
                { icon: <CheckCircle2 className="w-7 h-7" />, title: t('Hire Faster'), desc: t('Connect, interview and hire the right talent.'), color: 'text-green-700', bg: 'bg-green-50' },
              ].map((step, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                  <div className="flex flex-col items-center text-center max-w-[130px]">
                    <div className={`w-14 h-14 ${step.bg} rounded-full flex items-center justify-center ${step.color} mb-3`}>
                      {step.icon}
                    </div>
                    <h3 className="font-bold text-sm text-gray-900 mb-1">{step.title}</h3>
                    <p className="text-xs text-gray-500">{step.desc}</p>
                  </div>
                  {idx < 2 && (
                    <>
                      <ArrowRight className="w-5 h-5 text-gray-300 hidden sm:block shrink-0" />
                      <div className="block sm:hidden text-gray-300 rotate-90">
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 8. Trusted By */}
      <div className="w-full border-y border-gray-100 py-8 sm:py-10 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="flex justify-between items-center space-x-6 sm:space-x-8 grayscale hover:grayscale-0 transition duration-500 flex-nowrap overflow-x-auto hide-scrollbar">
            <h3 className="text-lg sm:text-xl font-bold tracking-tighter shrink-0"><span className="text-blue-500">G</span>oogle</h3>
            <h3 className="text-lg sm:text-xl font-bold tracking-tighter shrink-0 text-gray-700">Microsoft</h3>
            <h3 className="text-lg sm:text-xl font-bold tracking-tighter shrink-0 text-blue-700">Infosys</h3>
            <h3 className="text-lg sm:text-xl font-bold tracking-tighter shrink-0 text-red-700">tcs</h3>
            <h3 className="text-lg sm:text-xl font-bold tracking-tighter shrink-0 text-green-800">Deloitte.</h3>
            <h3 className="text-lg sm:text-xl font-bold tracking-tighter shrink-0">accenture</h3>
            <h3 className="text-lg sm:text-xl font-bold tracking-tighter shrink-0 text-red-600">wipro</h3>
            <h3 className="text-lg sm:text-xl font-bold tracking-tighter shrink-0 text-yellow-800">amazon</h3>
            <h3 className="text-lg sm:text-xl font-bold tracking-tighter shrink-0 text-blue-900">IBM</h3>
            <h3 className="text-lg sm:text-xl font-bold tracking-tighter shrink-0 text-blue-700">Capgemini</h3>
          </div>
        </div>
      </div>

      {/* 9. Why Candidates / Recruiters Love Lucohire */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-20">
          
          {/* Candidates Love */}
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-blue-600 mb-6 sm:mb-8 text-left">{t("Why Candidates Love Lucohire")}</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:gap-y-6">
              {[
                { icon: <Search className="w-4 h-4" />, title: t('AI Resume Analysis'), desc: t('Get AI feedback to improve your resume.') },
                { icon: <Target className="w-4 h-4" />, title: t("Why I'm Not Getting Hired"), desc: t("AI tells you what's holding you back.") },
                { icon: <Zap className="w-4 h-4" />, title: t('Skill Gap Analysis'), desc: t('Discover skill gaps and upskill smartly.') },
                { icon: <MapPin className="w-4 h-4" />, title: t('Global Opportunities'), desc: t('Explore jobs across India & 5+ countries.') },
                { icon: <ShieldCheck className="w-4 h-4" />, title: t('Verified Jobs Only'), desc: t('Apply only to verified and genuine jobs.') },
                { icon: <MessageCircle className="w-4 h-4" />, title: t('WhatsApp Updates'), desc: t('Get interview calls & status on WhatsApp.') },
              ].map((item, idx) => (
                <div key={idx}>
                  <div className="flex items-center mb-1.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 flex justify-center items-center text-blue-600 mr-2.5 shrink-0">
                      {item.icon}
                    </div>
                    <h4 className="font-bold text-gray-900 text-xs sm:text-sm">{item.title}</h4>
                  </div>
                  <p className="text-[11px] text-gray-500 pl-[38px]">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recruiters Love */}
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-green-700 mb-6 sm:mb-8 text-left">{t("Why Recruiters Love Lucohire")}</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:gap-y-6">
              {[
                { icon: <Users className="w-4 h-4" />, title: t('Verified Talent Pool'), desc: t('Hire from trusted and verified professionals.') },
                { icon: <CheckCircle2 className="w-4 h-4" />, title: t('Duplicate Detection'), desc: t('AI removes duplicate profiles automatically.') },
                { icon: <Scale className="w-4 h-4" />, title: t('AI Candidate Ranking'), desc: t('AI ranks candidates by best match.') },
                { icon: <Zap className="w-4 h-4" />, title: t('AI Shortlisting'), desc: t('Save time with AI shortlisting the best candidates.') },
                { icon: <Briefcase className="w-4 h-4" />, title: t('Free Job Posting'), desc: t('Post jobs for free and start hiring instantly.') },
                { icon: <Building2 className="w-4 h-4" />, title: t('ATS Dashboard'), desc: t('Manage jobs, applicants and pipelines easily.') },
              ].map((item, idx) => (
                <div key={idx}>
                  <div className="flex items-center mb-1.5">
                    <div className="w-7 h-7 rounded-lg bg-green-50 flex justify-center items-center text-green-700 mr-2.5 shrink-0">
                      {item.icon}
                    </div>
                    <h4 className="font-bold text-gray-900 text-xs sm:text-sm">{item.title}</h4>
                  </div>
                  <p className="text-[11px] text-gray-500 pl-[38px]">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 10. Bottom Stats */}
      <div className="w-full border-t border-gray-100 py-8 sm:py-10 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-y-6 gap-x-4 sm:flex sm:flex-wrap sm:justify-between sm:items-center sm:gap-6">
            <div className="flex items-center">
              <Briefcase className="w-5 h-5 text-blue-600 mr-2.5" />
              <div>
                <div className="font-bold text-gray-900">25K+</div>
                <div className="text-[11px] text-gray-500">{t("Jobs Posted Today")}</div>
              </div>
            </div>
            <div className="flex items-center ml-2.5 sm:ml-0">
              <Users className="w-5 h-5 text-green-500 mr-2.5" />
              <div>
                <div className="font-bold text-gray-900">1.5L+</div>
                <div className="text-[11px] text-gray-500">{t("Candidates Hired")}</div>
              </div>
            </div>
            <div className="flex items-center">
              <CheckCircle2 className="w-5 h-5 text-blue-600 mr-2.5" />
              <div>
                <div className="font-bold text-gray-900">12K+</div>
                <div className="text-[11px] text-gray-500">{t("Active Recruiters")}</div>
              </div>
            </div>
            <div className="flex items-center ml-2.5 sm:ml-0">
              <MapPin className="w-5 h-5 text-blue-600 mr-2.5" />
              <div>
                <div className="font-bold text-gray-900">5+</div>
                <div className="text-[11px] text-gray-500">{t("Countries")}</div>
              </div>
            </div>
            <div className="flex items-center">
              <Building2 className="w-5 h-5 text-blue-600 mr-2.5" />
              <div>
                <div className="font-bold text-gray-900">1000+</div>
                <div className="text-[11px] text-gray-500">{t("Top Companies")}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 11. Final CTA Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6">
        <div className="bg-[#0a1930] rounded-2xl p-6 sm:p-10 md:p-12 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0 text-center md:text-left">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{t("Ready to Hire Smarter?")}</h2>
            <p className="text-blue-200 text-sm sm:text-base">{t("Join Lucohire and experience the power of AI in hiring.")}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Link 
              to="/candidate-landing"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 sm:px-8 rounded-xl flex justify-center items-center gap-2 transition whitespace-nowrap text-sm block text-center"
            >
              <div className="flex items-center justify-center gap-2">
                {t("Find Matching Jobs")} <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
            <Link 
              to="/recruiter-discovery"
              className="bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-6 sm:px-8 rounded-xl flex justify-center items-center gap-2 transition whitespace-nowrap text-sm block text-center"
            >
              <div className="flex items-center justify-center gap-2">
                {t("Post Free Job")} <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
