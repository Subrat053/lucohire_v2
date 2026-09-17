import { Helmet } from 'react-helmet-async';
import { ArrowRight, FileText, Video, Headphones, BookOpen } from 'lucide-react';
import useTranslation from '../hooks/useTranslation';

export default function Resources() {
  const { t } = useTranslation();

  const resources = [
    {
      icon: FileText,
      category: "Guides & Templates",
      title: "The Ultimate Resume Template",
      description: "Download our ATS-friendly resume template that has helped thousands land interviews at top tech companies.",
      linkText: "Download PDF",
      color: "bg-blue-100 text-blue-600"
    },
    {
      icon: Video,
      category: "Webinars",
      title: "Mastering the Technical Interview",
      description: "Watch our recorded session with ex-FAANG engineers on how to approach system design and algorithms.",
      linkText: "Watch Video",
      color: "bg-indigo-100 text-indigo-600"
    },
    {
      icon: Headphones,
      category: "Podcasts",
      title: "The Lucohire Career Show",
      description: "Listen to weekly interviews with industry leaders, hiring managers, and career coaches.",
      linkText: "Listen Now",
      color: "bg-violet-100 text-violet-600"
    },
    {
      icon: BookOpen,
      category: "E-Books",
      title: "Salary Negotiation Playbook",
      description: "Learn the exact scripts and strategies to negotiate your compensation package with confidence.",
      linkText: "Read E-Book",
      color: "bg-purple-100 text-purple-600"
    }
  ];

  return (
    <>
      <Helmet>
        <title>{t("Resources")} | Lucohire</title>
        <meta name="description" content="Free resources, guides, templates, and webinars to help you navigate your career journey." />
      </Helmet>

      <div className="bg-gray-50 min-h-screen py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl tracking-tight mb-6">
              Free <span className="text-blue-600">Resources</span>
            </h1>
            <p className="text-lg text-gray-700 leading-relaxed">
              Everything you need to advance your career. From resume templates to expert webinars, we've got you covered.
            </p>
          </div>

          {/* Resources Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {resources.map((item, index) => (
              <div 
                key={index}
                className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300 flex flex-col h-full"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-12 h-12 rounded-2xl ${item.color} flex items-center justify-center shrink-0`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                    {item.category}
                  </span>
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-700 leading-relaxed mb-8 flex-grow">
                  {item.description}
                </p>
                
                <button className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors group mt-auto w-fit">
                  {item.linkText} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            ))}
          </div>

          {/* Featured Section */}
          <div className="mt-20 max-w-5xl mx-auto bg-[#0B1536] rounded-3xl p-8 sm:p-12 overflow-hidden relative">
             <div className="absolute top-0 right-0 -mr-8 -mt-8 w-64 h-64 rounded-full bg-blue-900 opacity-40 blur-3xl"></div>
             
             <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
               <div className="max-w-xl">
                 <h2 className="text-3xl font-bold text-white mb-4">Are you a hiring manager?</h2>
                 <p className="text-gray-400 mb-6 text-lg">
                   Check out our recruiter resources for insights on writing better job descriptions, improving interview processes, and employer branding.
                 </p>
                 <button className="bg-white text-[#0B1536] font-bold px-6 py-3 rounded-xl hover:bg-gray-100 transition-colors">
                   View Recruiter Resources
                 </button>
               </div>
               
               <div className="hidden md:flex shrink-0 w-48 h-48 bg-blue-800/30 rounded-full items-center justify-center border border-blue-700/50">
                 <FileText className="w-20 h-20 text-blue-700" />
               </div>
             </div>
          </div>

        </div>
      </div>
    </>
  );
}
