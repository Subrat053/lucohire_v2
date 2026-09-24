import React, { useState } from 'react';
import { useResumeJourney } from '../../context/ResumeJourneyContext';
import ScoreGauge from '../../common/ScoreGauge';
import { toast } from 'react-hot-toast';

export default function ResumeUploadCard() {
  const {
    currentResume,
    atsScore,
    setCustomAtsScore,
    skillsAnalysis,
    resumeFileInputRef,
    handleResumeUpload,
    uploadingResume,
  } = useResumeJourney();

  const [fixingAts, setFixingAts] = useState(false);
  const [fixedAts, setFixedAts] = useState(false);
  const [fixProgress, setFixProgress] = useState(0);

  const startAtsFixSimulation = () => {
    if (fixingAts || fixedAts) return;
    setFixingAts(true);
    let p = 0;
    const interval = setInterval(() => {
      p += 10;
      setFixProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setFixingAts(false);
        setFixedAts(true);
        setCustomAtsScore(84); // optimized score
        toast.success('ATS keywords and impact metrics optimized! Score raised to 84.');
      }
    }, 180);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const syntheticEvent = { target: { files: [file] } };
      handleResumeUpload(syntheticEvent);
    }
  };

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
            Benchmarked against 18,000+ real dev job postings
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

      {/* Resume File Badge or Dropzone */}
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
              {currentResume?.name || 'My_Resume.pdf'}
            </div>
            <div className="text-[11px] text-[#767B8A]">
              {uploadingResume ? 'Uploading & parsing...' : `${currentResume?.size || '1.2 MB'} · ${currentResume?.isReal ? 'Live Profile Resume' : 'Parsed File'}`}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => resumeFileInputRef?.current?.click()}
          disabled={uploadingResume}
          className="text-[11.5px] font-semibold text-[#5B21D6] hover:text-[#4A3AE0] bg-white border border-[#D8D2FA] py-1.5 px-3 rounded-lg hover:shadow-xs transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
        >
          {uploadingResume ? 'Uploading...' : 'Replace PDF'}
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
            <div className="text-[11px] text-[#767B8A] mt-0.5">
              Better than 68% of candidates in this bracket
            </div>
          </div>
        </div>
      </div>

      {/* Stats Summary Pills */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="p-2 rounded-xl bg-[#FBEAE8]/40 border border-[#FBEAE8]">
          <div className="text-[14px] font-bold text-[#B3492F]" style={{ fontFamily: 'Fraunces, serif' }}>
            {skillsAnalysis.outdatedCount || 3}
          </div>
          <div className="text-[9.5px] font-medium text-[#767B8A]">To drop</div>
        </div>
        <div className="p-2 rounded-xl bg-[#E5F6EE]/40 border border-[#E5F6EE]">
          <div className="text-[14px] font-bold text-[#0E8F5F]" style={{ fontFamily: 'Fraunces, serif' }}>
            +{skillsAnalysis.risingAnalyzed.length || 4}
          </div>
          <div className="text-[9.5px] font-medium text-[#767B8A]">Rising skills</div>
        </div>
        <div className="p-2 rounded-xl bg-[#F0EDFC]/50 border border-[#E4DFFB]">
          <div className="text-[14px] font-bold text-[#5B21D6]" style={{ fontFamily: 'Fraunces, serif' }}>
            3
          </div>
          <div className="text-[9.5px] font-medium text-[#767B8A]">Quick wins</div>
        </div>
        <div className="p-2 rounded-xl bg-[#FAF9FE] border border-[#ECEAF9]">
          <div className="text-[14px] font-bold text-[#141A33]" style={{ fontFamily: 'Fraunces, serif' }}>
            +12.7k
          </div>
          <div className="text-[9.5px] font-medium text-[#767B8A]">Jobs open</div>
        </div>
      </div>

      {/* ATS Reality Check Interactive Action Box */}
      <div className="p-3.5 bg-gradient-to-br from-[#F7F6FF] to-[#FAF9FE] border border-[#D8D2FA] rounded-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="text-[12.5px] font-bold text-[#141A33]">
            ATS Keyword Optimizer
          </div>
          <span className="text-[10.5px] text-[#5B21D6] font-semibold bg-white border border-[#D8D2FA] px-2 py-0.5 rounded-full">
            {fixedAts ? '✓ Optimized' : '+18 pts potential'}
          </span>
        </div>
        <p className="text-[11.5px] text-[#767B8A] leading-relaxed m-0">
          75% of resumes are filtered before human review. Optimize keyword weighting and active verbs.
        </p>

        {fixingAts ? (
          <div className="space-y-1.5 py-1">
            <div className="flex justify-between text-[11px] font-medium text-[#5B21D6]">
              <span>Optimizing bullet points &amp; keywords...</span>
              <span>{fixProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#E4DFFB] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#5B21D6] transition-all duration-200"
                style={{ width: `${fixProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={startAtsFixSimulation}
            disabled={fixedAts}
            className={`w-full py-2 px-3 rounded-xl text-[12px] font-semibold transition-all cursor-pointer ${
              fixedAts
                ? 'bg-[#E5F6EE] text-[#0E8F5F] border border-[#0E8F5F]/30 cursor-default'
                : 'bg-[#5B21D6] text-white hover:bg-[#4A3AE0] shadow-xs'
            }`}
          >
            {fixedAts ? '✓ Resume Optimized (84/100)' : '⚡ Auto-Fix ATS Score Now'}
          </button>
        )}
      </div>
    </div>
  );
}
