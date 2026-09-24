import React, { useMemo } from 'react';
import { useResumeJourney } from '../../context/ResumeJourneyContext';
import { ROLE_BY_PATH } from '../../data/batadoData';
import { generateVerificationId } from '../../engine/readinessEngine';
import { toast } from 'react-hot-toast';

export default function JobReadyCertificate() {
  const { profile, selectedPaths, readinessVerdict } = useResumeJourney();
  const activePathId = selectedPaths[0] || 'p1';
  const roleName = ROLE_BY_PATH[activePathId]?.role || 'Full-Stack Developer';

  const candidateName = profile?.name || profile?.userRecord?.name || 'Verified Freelancer';

  const verificationId = useMemo(() => {
    return generateVerificationId(profile?.id || 'demo_candidate', activePathId);
  }, [profile?.id, activePathId]);

  const todayStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const handleCopyCredential = () => {
    navigator.clipboard.writeText(verificationId);
    toast.success('Certificate verification ID copied to clipboard!');
  };

  return (
    <div className="bg-gradient-to-br from-[#141A33] to-[#241A5E] text-white border border-[#3E2D85] rounded-2xl p-5 sm:p-6 shadow-md space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏆</span>
          <div>
            <div className="text-[12px] font-bold uppercase tracking-wider text-[#D8D2FA]">
              LucoHire Official Credential
            </div>
            <div className="text-[14px] font-bold text-white">
              Job-Ready Certification
            </div>
          </div>
        </div>

        <span className="text-[10.5px] font-bold uppercase tracking-wider bg-[#0E8F5F] text-white px-2.5 py-1 rounded-full shadow-xs">
          Verified Active
        </span>
      </div>

      <div className="space-y-1 text-center py-2">
        <div className="text-[11px] uppercase tracking-widest text-[#D8D2FA]">
          Awarded To
        </div>
        <div className="text-[20px] sm:text-[22px] font-bold text-white tracking-wide" style={{ fontFamily: 'Fraunces, serif' }}>
          {candidateName}
        </div>
        <div className="text-[12.5px] text-[#E4DFFB] font-medium pt-1">
          Demonstrated Technical Competence in <strong>{roleName}</strong>
        </div>
        <div className="text-[11px] text-white/60">
          Composite Score: {readinessVerdict.combinedScore}/100 · Issued on {todayStr}
        </div>
      </div>

      <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="font-mono text-[11px] text-[#D8D2FA]">
          ID: {verificationId}
        </div>

        <button
          type="button"
          onClick={handleCopyCredential}
          className="text-[11.5px] font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          📋 Copy Credential Link
        </button>
      </div>
    </div>
  );
}
