import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { recruiterAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiDownload, FiCheckCircle, FiStar, FiLoader } from 'react-icons/fi';
import { HiSparkles, HiOutlineUser } from 'react-icons/hi2';
import { jsPDF } from 'jspdf';

const CandidateInterviewKit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(true);
  const [interviewKit, setInterviewKit] = useState(null);
  const [aiUsage, setAiUsage] = useState({ limits: {}, usage: {} });
  const [usageLoading, setUsageLoading] = useState(true);
  const hasGenerated = useRef(false);

  useEffect(() => {
    fetchUsage();
    fetchCandidateAndGenerateKit();
  }, [id]);

  const fetchUsage = async () => {
    try {
      const usageRes = await recruiterAPI.getAiUsage();
      setAiUsage({ limits: usageRes.data.limits || {}, usage: usageRes.data.usage || {} });
    } catch (err) {
      console.error(err);
    } finally {
      setUsageLoading(false);
    }
  };

  const fetchCandidateAndGenerateKit = async () => {
    try {
      setLoading(true);
      const res = await recruiterAPI.viewProvider(id);
      if (res.data && res.data.provider) {
        setCandidate(res.data.provider);
        // Start generating automatically
        generateKit(id);
      } else if (res.data.success) {
        setCandidate(res.data.data.providerProfile);
        generateKit(id);
      }
    } catch (err) {
      toast.error('Failed to load candidate details');
      navigate('/recruiter/candidates');
    } finally {
      setLoading(false);
    }
  };

  const generateKit = async (candidateId) => {
    if (hasGenerated.current) return;
    hasGenerated.current = true;
    
    setGenerating(true);
    try {
      const { data } = await recruiterAPI.generateCandidateInterviewKit(candidateId, {});
      if (data.success) {
        setInterviewKit(data.data);
        toast.success('Interview Kit generated successfully!');
      }
    } catch (error) {
      toast.error('Failed to generate interview kit');
    } finally {
      setGenerating(false);
    }
  };

  const loadingSteps = [
    "Analyzing Candidate Profile...",
    "Evaluating Skills & Experience...",
    "Designing Technical Questions...",
    "Drafting Behavioral Scenarios...",
    "Creating Scoring Rubric...",
    "Finalizing Interview Kit..."
  ];

  const [loadingStepIndex, setLoadingStepIndex] = useState(0);

  useEffect(() => {
    let interval;
    if (generating) {
      interval = setInterval(() => {
        setLoadingStepIndex((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
      }, 3000);
    } else {
      setLoadingStepIndex(0);
    }
    return () => clearInterval(interval);
  }, [generating]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <FiLoader className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const name = candidate?.user?.name || candidate?.name || 'Candidate';

  const downloadPdf = () => {
    if (!interviewKit) return;
    const doc = new jsPDF();
    let y = 20;
    
    doc.setFontSize(16);
    doc.text(`Interview Kit: ${name}`, 14, y);
    y += 10;
    
    doc.setFontSize(14);
    doc.text('Technical Questions', 14, y);
    y += 8;
    
    doc.setFontSize(11);
    interviewKit.technicalQuestions?.forEach((q, idx) => {
      const questionLines = doc.splitTextToSize(`${idx + 1}. ${q.question}`, 180);
      doc.text(questionLines, 14, y);
      y += questionLines.length * 6;
      
      const insightLines = doc.splitTextToSize(`Look for: ${q.expectedInsight}`, 180);
      doc.setTextColor(100);
      doc.text(insightLines, 14, y);
      doc.setTextColor(0);
      y += (insightLines.length * 6) + 4;
      
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    y += 10;
    if (y > 270) { doc.addPage(); y = 20; }
    
    doc.setFontSize(14);
    doc.text('Behavioral Questions', 14, y);
    y += 8;
    
    doc.setFontSize(11);
    interviewKit.behavioralQuestions?.forEach((q, idx) => {
      const questionLines = doc.splitTextToSize(`${idx + 1}. ${q.question}`, 180);
      doc.text(questionLines, 14, y);
      y += questionLines.length * 6;
      
      const insightLines = doc.splitTextToSize(`Look for: ${q.expectedInsight}`, 180);
      doc.setTextColor(100);
      doc.text(insightLines, 14, y);
      doc.setTextColor(0);
      y += (insightLines.length * 6) + 4;
      
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    y += 10;
    if (y > 270) { doc.addPage(); y = 20; }
    
    doc.setFontSize(14);
    doc.text('Scoring Rubric', 14, y);
    y += 8;
    doc.setFontSize(11);
    const rubricLines = doc.splitTextToSize(interviewKit.scoringRubric || '', 180);
    doc.text(rubricLines, 14, y);
    
    doc.save(`Interview_Kit_${name.replace(/\s+/g, '_')}.pdf`);
    toast.success('Downloaded Kit successfully!');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-50 text-gray-500 transition-colors">
              <FiArrowLeft className="w-5 h-5"/>
            </button>
            <div>
              <h1 className="text-[15px] font-bold text-gray-900 leading-tight">AI Interview Kit</h1>
              <p className="text-[12px] text-gray-500">Tailored for {name}</p>
            </div>
          </div>
          
          {interviewKit && (
            <button onClick={downloadPdf} className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-[12px] font-bold hover:bg-indigo-100 flex items-center gap-2 transition">
              <FiDownload className="w-4 h-4"/> Download Kit
            </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 mt-8">
        {generating && (
          <div className="h-[400px] bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center text-center p-8 shadow-sm">
            <div className="relative w-16 h-16 mb-6">
              <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
              <HiSparkles className="absolute inset-0 m-auto w-6 h-6 text-indigo-500 animate-pulse"/>
            </div>
            <h3 className="text-[16px] font-bold text-gray-900 mb-2">{loadingSteps[loadingStepIndex]}</h3>
            <div className="flex gap-1 mt-2">
              {loadingSteps.map((_, idx) => (
                <div key={idx} className={`h-1.5 rounded-full transition-all duration-500 ${idx <= loadingStepIndex ? 'w-6 bg-indigo-600' : 'w-2 bg-gray-200'}`}/>
              ))}
            </div>
          </div>
        )}

        {interviewKit && !generating && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className={`p-6 md:p-8 space-y-8 ${!usageLoading && aiUsage.limits.interviewKits !== -1 && aiUsage.usage.interviewKits >= (aiUsage.limits.interviewKits || 0) ? 'blur-md select-none pointer-events-none' : ''}`}>
              
              {/* Technical */}
              <div>
                <h4 className="text-[15px] font-bold text-gray-900 mb-4 flex items-center gap-2"><FiCheckCircle className="text-emerald-500 w-5 h-5"/> Technical & Domain Questions</h4>
                <div className="space-y-4">
                  {(interviewKit.technicalQuestions || []).map((q, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                      <div className="text-[14px] font-bold text-gray-900 mb-3 leading-relaxed"><span className="text-indigo-600 mr-1">Q{idx + 1}.</span> {q.question}</div>
                      <div className="text-[13px] text-gray-700 bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                        <div className="font-bold text-indigo-700 mb-1 text-[11px] uppercase tracking-wide">Expected Insight</div>
                        {q.expectedInsight}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Behavioral */}
              <div>
                <h4 className="text-[15px] font-bold text-gray-900 mb-4 flex items-center gap-2"><HiOutlineUser className="text-orange-500 w-5 h-5"/> Behavioral & Cultural Fit</h4>
                <div className="space-y-4">
                  {(interviewKit.behavioralQuestions || []).map((q, idx) => (
                    <div key={idx} className="bg-orange-50/30 rounded-xl p-5 border border-orange-100">
                      <div className="text-[14px] font-bold text-gray-900 mb-3 leading-relaxed"><span className="text-orange-600 mr-1">Q{idx + 1}.</span> {q.question}</div>
                      <div className="text-[13px] text-gray-700 bg-white p-4 rounded-lg border border-orange-100 shadow-sm">
                        <div className="font-bold text-orange-700 mb-1 text-[11px] uppercase tracking-wide">Expected Insight</div>
                        {q.expectedInsight}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rubric */}
              <div className="bg-indigo-50/50 p-6 rounded-xl border border-indigo-100">
                <h4 className="text-[14px] font-bold text-indigo-900 mb-3 flex items-center gap-2"><FiStar className="text-yellow-500 w-5 h-5"/> Scoring Rubric (5-Star Answer)</h4>
                <p className="text-[13px] text-indigo-800 leading-relaxed font-medium">{interviewKit.scoringRubric}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidateInterviewKit;
