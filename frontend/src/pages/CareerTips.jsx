import { Helmet } from 'react-helmet-async';
import { Target, Lightbulb, MessageSquare, Briefcase, DollarSign, FileCheck, Share2, Rocket } from 'lucide-react';
import useTranslation from '../hooks/useTranslation';

export default function CareerTips() {
  const { t } = useTranslation();

  const tips = [
    {
      icon: FileCheck,
      title: "Tailor Your Resume for ATS",
      description: "Applicant Tracking Systems (ATS) scan your resume before a human ever sees it. Avoid complex formatting like tables or graphics. Use industry-standard keywords found directly in the job description, and ensure your bullet points highlight quantifiable achievements rather than just responsibilities (e.g., 'Increased sales by 20%' instead of 'Responsible for sales').",
      color: "text-blue-600 bg-blue-50 border-blue-100"
    },
    {
      icon: Target,
      title: "Master the 'Tell Me About Yourself' Pitch",
      description: "Use the Past-Present-Future framework. Start with how you got into the field (Past), what you are currently doing and your most recent accomplishments (Present), and finish with why you are excited about this specific opportunity and what you are looking for next (Future). Keep it under 2 minutes.",
      color: "text-indigo-600 bg-indigo-50 border-indigo-100"
    },
    {
      icon: Lightbulb,
      title: "Use the STAR Method for Interviews",
      description: "When answering behavioral questions ('Tell me about a time when...'), structure your response using STAR: Situation (set the scene), Task (what was your responsibility), Action (what exact steps did you take), and Result (what was the outcome, ideally with metrics). This keeps your answers concise and impactful.",
      color: "text-purple-600 bg-purple-50 border-purple-100"
    },
    {
      icon: DollarSign,
      title: "Salary Negotiation Rules",
      description: "Never be the first to give a number. If asked for your salary expectations early on, pivot by asking about the approved range for the role. Once an offer is made, always negotiate. Research your market value using Glassdoor or Levels.fyi, and frame your counter-offer based on the unique value and skills you bring to the team.",
      color: "text-emerald-600 bg-emerald-50 border-emerald-100"
    },
    {
      icon: Briefcase,
      title: "Build a Proof-of-Work Portfolio",
      description: "Don't just say you can do the work—show it. Whether you are a developer, designer, or marketer, having a personal website or a well-documented GitHub repository showing real-world projects sets you apart from 90% of candidates who only submit a resume.",
      color: "text-amber-600 bg-amber-50 border-amber-100"
    },
    {
      icon: MessageSquare,
      title: "The 24-Hour Follow Up",
      description: "Send a brief, personalized thank-you email within 24 hours of your interview. Reiterate your enthusiasm for the role, briefly mention a specific topic you enjoyed discussing with the interviewer, and concisely remind them of why you are a great fit.",
      color: "text-cyan-600 bg-cyan-50 border-cyan-100"
    },
    {
      icon: Rocket,
      title: "Continuous Upskilling",
      description: "The job market is constantly evolving, especially with AI. Dedicate at least 2 hours a week to learning a new tool or reading industry publications. Highlighting recent courses or certifications shows employers that you are adaptable and eager to grow.",
      color: "text-rose-600 bg-rose-50 border-rose-100"
    }
  ];

  return (
    <>
      <Helmet>
        <title>{t("Career Tips")} | Lucohire</title>
        <meta name="description" content="Actionable career tips to help you stand out, ace interviews, and advance your professional journey." />
      </Helmet>

      <div className="bg-white min-h-screen py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header */}
          <div className="mb-16 border-b border-gray-100 pb-10">
            <h1 className="text-4xl font-extrabold text-[#0B1536] sm:text-5xl tracking-tight mb-6">
              Actionable <span className="text-blue-600">Career Tips</span>
            </h1>
            <p className="text-lg text-gray-700 leading-relaxed max-w-2xl">
              Skip the fluff. Here are proven, high-impact strategies to help you land interviews, negotiate better offers, and accelerate your professional growth.
            </p>
          </div>

          {/* Tips List (Article / Timeline Style) */}
          <div className="space-y-12">
            {tips.map((tip, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-6 group">
                {/* Number / Icon Column */}
                <div className="shrink-0 flex flex-col items-center">
                  <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center ${tip.color} transition-transform duration-300 group-hover:scale-105`}>
                    <tip.icon className="w-8 h-8" />
                  </div>
                  {/* Visual connector line for timeline effect (hidden on last item) */}
                  {index !== tips.length - 1 && (
                    <div className="w-px h-full bg-gray-100 mt-6 hidden sm:block"></div>
                  )}
                </div>

                {/* Content Column */}
                <div className="pb-6 sm:pb-0 sm:pt-2">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-sm font-bold text-gray-400">0{index + 1}</span>
                    <h2 className="text-2xl font-bold text-[#0B1536]">{tip.title}</h2>
                  </div>
                  <p className="text-gray-700 leading-relaxed text-lg">
                    {tip.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </>
  );
}
