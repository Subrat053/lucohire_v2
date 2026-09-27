import React, { useMemo } from 'react';
import { useResumeJourney } from '../../context/ResumeJourneyContext';
import { ROLE_BY_PATH } from '../../data/batadoData';
import { generateVerificationId } from '../../engine/readinessEngine';
import { toast } from 'react-hot-toast';

export default function JobReadyCertificate() {
  const { profile, selectedPaths, readinessVerdict, serverData } = useResumeJourney();
  const activePathId = selectedPaths[0] || 'p1';
  const roleName = ROLE_BY_PATH[activePathId]?.role || 'Full-Stack Developer';

  const candidateName = profile?.name || profile?.userRecord?.name || 'Verified Freelancer';

  const verificationId = useMemo(() => {
    if (serverData?.certificate?.verificationId) {
      return serverData.certificate.verificationId;
    }
    return generateVerificationId(profile?.id || 'demo_candidate', activePathId);
  }, [serverData?.certificate?.verificationId, profile?.id, activePathId]);

  const todayStr = useMemo(() => {
    if (serverData?.certificate?.issuedAt) {
      return new Date(serverData.certificate.issuedAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
    return new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, [serverData?.certificate?.issuedAt]);

  const handleCopyCredential = () => {
    const credUrl = `${window.location.origin}/verify/certificate/${verificationId}`;
    navigator.clipboard.writeText(credUrl);
    toast.success('Certificate verification link copied to clipboard!');
  };

  const isCertified = Boolean(serverData?.certificate || (readinessVerdict?.combinedScore >= 70));

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

        <span className={`text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-xs ${
          isCertified ? 'bg-[#0E8F5F] text-white' : 'bg-[#B9791A] text-white'
        }`}>
          {isCertified ? 'Verified Active' : 'Benchmark: 70%+ Required'}
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
          disabled={!isCertified}
          className={`text-[11.5px] font-semibold px-3 py-1.5 rounded-lg transition-colors ${
            isCertified
              ? 'text-white bg-white/10 hover:bg-white/20 border border-white/20 cursor-pointer'
              : 'text-white/50 bg-white/5 border border-white/10 cursor-not-allowed'
          }`}
        >
          {isCertified ? '📋 Copy Credential Link' : '🔒 Unlocks at 70%+ Score'}
        </button>
      </div>
    </div>
  );
}
