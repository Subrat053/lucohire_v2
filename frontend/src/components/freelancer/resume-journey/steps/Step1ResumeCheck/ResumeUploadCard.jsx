import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useResumeJourney } from '../../context/ResumeJourneyContext';
import ScoreGauge from '../../common/ScoreGauge';
import { toast } from 'react-hot-toast';

export default function ResumeUploadCard() {
  const {
    currentResume,
    atsScore,
    atsAuditData,
    resumeFileInputRef,
    handleResumeUpload,
    uploadingResume,
    runAutoFixAts,
  } = useResumeJourney();

  const [fixingAts, setFixingAts] = useState(false);
  const [fixedAts, setFixedAts] = useState(atsScore >= 84);
  const [showPillarsModal, setShowPillarsModal] = useState(false);
  const [optimizationReport, setOptimizationReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const handleStartAutoFix = async () => {
    if (fixingAts) return;
    setFixingAts(true);
    try {
      const report = await runAutoFixAts();
      if (report) {
        setOptimizationReport(report);
        setShowReportModal(true);
        setFixedAts(true);
        toast.success(`ATS score optimized to ${report.optimizedScore}!`);
      }
    } catch {
      toast.error('Optimization could not be completed.');
    } finally {
      setFixingAts(false);
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const syntheticEvent = { target: { files: [file] } };
      handleResumeUpload(syntheticEvent);
    }
  };

  const components = atsAuditData?.components || [
    { category: 'Keyword Match', label: 'Target Path Keywords', score: Math.round(atsScore * 0.35), max: 35, note: 'Matches core skills for target path' },
    { category: 'Action & Impact', label: 'Quantified Impact & Verbs', score: Math.round(atsScore * 0.25), max: 25, note: 'Detects strong action verbs and numbers' },
    { category: 'Structure', label: 'ATS Standard Sections', score: Math.round(atsScore * 0.20), max: 20, note: 'Contact, experience, education completeness' },
    { category: 'Parseability', label: 'Text Density & Hygiene', score: Math.round(atsScore * 0.10), max: 10, note: 'Clean text extraction density' },
    { category: 'Tech Modernity', label: 'Modern Tech Ratio', score: Math.round(atsScore * 0.10), max: 10, note: 'Modern frameworks vs legacy flags' },
  ];

  return (
    <div className="bg-white border border-[#E6E3F7] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* Header & Active Resume Status */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-[#5B21D6] bg-[#F0EDFC] px-2.5 py-0.5 rounded-full mb-1">
            Step 1 of 5 · Batao
          </span>
          <h2 className="text-[17px] font-bold text-[#141A33] tracking-tight m-0" style={{ fontFamily: 'Fraunces, serif' }}>
            Resume Check &amp; ATS Score
          </h2>
          <p className="text-[12px] text-[#767B8A] mt-0.5 m-0">
            Benchmarked against 18,000+ real corporate job postings
          </p>
        </div>

        {currentResume?.url && (
          <a
            href={currentResume.url}
            target="_blank"
            rel="noreferrer"
            className="text-[11.5px] font-medium text-[#1B4FE0] hover:underline flex items-center gap-1 shrink-0 mt-1"
          >
            <span>Preview</span> ↗
          </a>
        )}
      </div>

      {/* Resume File Badge with Dropzone Re-upload */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleFileDrop}
        className="p-3.5 bg-[#F6F5FC] border border-dashed border-[#D8D2FA] rounded-xl flex items-center justify-between gap-3 transition-colors hover:border-[#5B21D6]"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#ECEAF9] text-[#5B21D6] flex items-center justify-center font-bold text-xs shrink-0">
            📄
          </div>
          <div className="min-w-0">
            <div className="text-[12.5px] font-semibold text-[#181B24] truncate">
              {currentResume?.name || 'Candidate_Resume.pdf'}
            </div>
            <div className="text-[11px] text-[#767B8A]">
              {uploadingResume ? 'Re-uploading & parsing...' : `${currentResume?.size || '1.2 MB'} · ${currentResume?.isReal ? 'Verified Upload' : 'Parsed File'}`}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => resumeFileInputRef?.current?.click()}
          disabled={uploadingResume}
          className="text-[11.5px] font-semibold text-[#5B21D6] hover:text-[#4A3AE0] bg-white border border-[#D8D2FA] py-1.5 px-3 rounded-lg hover:shadow-xs transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
        >
          {uploadingResume ? 'Parsing...' : 'Replace PDF'}
        </button>
      </div>

      {/* ATS Score Strip */}
      <div className="bg-[#FAF9FE] border border-[#ECEAF9] rounded-xl p-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ScoreGauge
            score={atsScore}
            max={100}
            size={52}
            strokeWidth={5}
            status={atsScore >= 75 ? 'good' : atsScore >= 50 ? 'mid' : 'low'}
          />
          <div>
            <div className="text-[13.5px] font-bold text-[#141A33] flex items-center gap-1.5">
              <span>Resume score: {atsScore}/100</span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  atsScore >= 75
                    ? 'bg-[#E5F6EE] text-[#0E8F5F]'
                    : atsScore >= 50
                    ? 'bg-[#FBF1DF] text-[#B9791A]'
                    : 'bg-[#FBEAE8] text-[#B3492F]'
                }`}
              >
                {atsScore >= 75 ? 'Strong match' : atsScore >= 50 ? 'Needs work' : 'Low match'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowPillarsModal(true)}
              className="text-[11px] text-[#5B21D6] font-semibold hover:underline mt-0.5 flex items-center gap-1 cursor-pointer"
            >
              <span>View 5-Pillar corporate breakdown</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary Pills */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="p-2 rounded-xl bg-[#FBEAE8]/40 border border-[#FBEAE8]">
          <div className="text-[14px] font-bold text-[#B3492F]" style={{ fontFamily: 'Fraunces, serif' }}>
            {atsAuditData?.skillsAnalysis?.outdatedCount || 2}
          </div>
          <div className="text-[9.5px] font-medium text-[#767B8A]">To drop</div>
        </div>
        <div className="p-2 rounded-xl bg-[#E5F6EE]/40 border border-[#E5F6EE]">
          <div className="text-[14px] font-bold text-[#0E8F5F]" style={{ fontFamily: 'Fraunces, serif' }}>
            +{atsAuditData?.skillsAnalysis?.acquiredCount || 4}
          </div>
          <div className="text-[9.5px] font-medium text-[#767B8A]">Rising skills</div>
        </div>
        <div className="p-2 rounded-xl bg-[#F0EDFC]/50 border border-[#E4DFFB]">
          <div className="text-[14px] font-bold text-[#5B21D6]" style={{ fontFamily: 'Fraunces, serif' }}>
            {atsAuditData?.fixes?.length || 4}
          </div>
          <div className="text-[9.5px] font-medium text-[#767B8A]">Line fixes</div>
        </div>
        <div className="p-2 rounded-xl bg-[#FAF9FE] border border-[#ECEAF9]">
          <div className="text-[14px] font-bold text-[#141A33]" style={{ fontFamily: 'Fraunces, serif' }}>
            +12.7k
          </div>
          <div className="text-[9.5px] font-medium text-[#767B8A]">Jobs open</div>
        </div>
      </div>

      {/* ATS Automated Optimization Action Box */}
      <div className="p-3.5 bg-gradient-to-br from-[#F7F6FF] to-[#FAF9FE] border border-[#D8D2FA] rounded-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="text-[12.5px] font-bold text-[#141A33]">
            ATS Keyword Optimizer
          </div>
          <span className="text-[10.5px] text-[#5B21D6] font-semibold bg-white border border-[#D8D2FA] px-2 py-0.5 rounded-full">
            {fixedAts ? '✓ Optimized' : '+16 pts potential'}
          </span>
        </div>
        <p className="text-[11.5px] text-[#767B8A] leading-relaxed m-0">
          Our system automatically optimizes keyword weighting, transforms passive duties to action verbs, and identifies specific fixes.
        </p>

        {fixingAts ? (
          <div className="space-y-1.5 py-2">
            <div className="flex items-center justify-center gap-2 text-[11.5px] font-medium text-[#5B21D6]">
              <span className="w-3.5 h-3.5 border-2 border-[#5B21D6] border-t-transparent rounded-full animate-spin" />
              <span>Analyzing weaknesses and optimizing resume...</span>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleStartAutoFix}
            className={`w-full py-2 px-3 rounded-xl text-[12px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              fixedAts
                ? 'bg-[#E5F6EE] text-[#0E8F5F] border border-[#0E8F5F]/30'
                : 'bg-[#5B21D6] text-white hover:bg-[#4A3AE0] shadow-xs'
            }`}
          >
            <span>{fixedAts ? '✓ View Optimization Report' : '⚡ Auto-Fix ATS Score Now'}</span>
          </button>
        )}
      </div>

      {/* Modal 1: 5-Pillar ATS Breakdown Modal */}
      {showPillarsModal && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setShowPillarsModal(false)}
          className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-[#E6E3F7] rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto relative z-[100000]"
          >
            <div className="flex items-center justify-between border-b border-[#ECEAF9] pb-3">
              <div>
                <h3 className="text-[16px] font-bold text-[#141A33] m-0" style={{ fontFamily: 'Fraunces, serif' }}>
                  5-Pillar Corporate ATS Audit Breakdown
                </h3>
                <p className="text-[11.5px] text-[#767B8A] m-0 mt-0.5">
                  How Fortune 500 ATS systems score your resume (Total: {atsScore}/100)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPillarsModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer px-1.5 py-0.5"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {components.map((p, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-[#FAF9FE] border border-[#ECEAF9] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[12.5px] font-bold text-[#141A33]">
                      {p.label || p.category}
                    </span>
                    <span className="text-[12px] font-bold text-[#5B21D6]">
                      {p.score} / {p.max} pts
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#E4DFFB] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#5B21D6] rounded-full"
                      style={{ width: `${Math.round((p.score / p.max) * 100)}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-[#767B8A] pt-0.5">
                    {p.note || 'Evaluated against corporate benchmark.'}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPillarsModal(false)}
                className="py-2 px-4 rounded-xl bg-[#5B21D6] text-white text-[12px] font-semibold hover:bg-[#4A3AE0] cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal 2: Optimization Report Modal */}
      {showReportModal && optimizationReport && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setShowReportModal(false)}
          className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-[#E6E3F7] rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto relative z-[100000]"
          >
            <div className="flex items-center justify-between border-b border-[#ECEAF9] pb-3">
              <div>
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#0E8F5F] bg-[#E5F6EE] px-2 py-0.5 rounded-full">
                  Optimization Complete
                </span>
                <h3 className="text-[17px] font-bold text-[#141A33] m-0 mt-1" style={{ fontFamily: 'Fraunces, serif' }}>
                  ATS Score Boost: {optimizationReport.previousScore} → {optimizationReport.optimizedScore} (+{optimizationReport.scoreBoost} pts)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer px-1.5 py-0.5"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-[#E5F6EE]/40 border border-[#0E8F5F]/30 rounded-xl flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[#0E8F5F]">
                Target: {optimizationReport.targetTitle}
              </span>
              <span className="text-[12px] font-bold text-[#0E8F5F]">
                +{optimizationReport.scoreBoost} points gained
              </span>
            </div>

            <div className="space-y-2.5">
              <div className="text-[12px] font-bold text-[#141A33]">
                What our system optimized for your resume:
              </div>
              {optimizationReport.fixesApplied?.map((fix, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-[#FAF9FE] border border-[#ECEAF9] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[12.5px] font-bold text-[#141A33]">
                      {fix.title}
                    </span>
                    <span className="text-[11px] font-bold text-[#0E8F5F] bg-[#E5F6EE] px-1.5 py-0.5 rounded">
                      {fix.pointsGained}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-[#767B8A] m-0 leading-relaxed">
                    {fix.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="py-2 px-4 rounded-xl bg-[#5B21D6] text-white text-[12px] font-semibold hover:bg-[#4A3AE0] cursor-pointer"
              >
                Close &amp; Keep Optimized Score
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
