import React, { useMemo } from 'react';
import { useResumeJourney } from '../../context/ResumeJourneyContext';
import { ROLE_BY_PATH } from '../../data/batadoData';
import { toast } from 'react-hot-toast';

export default function JobReadyCertificate() {
  const { profile, user, displayName, selectedPaths, readinessVerdict, serverCertificate, atsScore, testState } = useResumeJourney();
  const activePathId = selectedPaths[0] || 'p1';
  const roleName = serverCertificate?.targetRole || readinessVerdict?.planA?.role || ROLE_BY_PATH[activePathId]?.role || 'Full-Stack Developer';

  // Real candidate name resolution
  const candidateName =
    serverCertificate?.candidateName ||
    displayName ||
    profile?.profileName ||
    profile?.name ||
    profile?.userRecord?.name ||
    user?.name ||
    'Verified Candidate';

  const verificationId = serverCertificate?.verificationId || (readinessVerdict?.certificate?.verificationId ?? null);

  const issuedDateStr = useMemo(() => {
    const rawDate = serverCertificate?.issuedAt || readinessVerdict?.certificate?.issuedAt;
    if (rawDate) {
      return new Date(rawDate).toLocaleDateString('en-IN', {
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
  }, [serverCertificate?.issuedAt, readinessVerdict?.certificate?.issuedAt]);

  const compositeScore = readinessVerdict?.combinedScore || 75;
  const isCertified = Boolean(verificationId || compositeScore >= 70);

  const displayVerificationId = verificationId || (isCertified ? 'LH-VER-2026-ACTIVE' : 'LH-VER-PENDING');

  const handleCopyCredential = () => {
    if (!verificationId) {
      toast.error('Complete the assessment with 70%+ score to generate your official verification ID.');
      return;
    }
    const credUrl = `${window.location.origin}/verify/certificate/${verificationId}`;
    navigator.clipboard.writeText(credUrl);
    toast.success('Official certificate verification link copied to clipboard!');
  };

  const handleOpenPublicLedger = () => {
    if (!verificationId) return;
    window.open(`/verify/certificate/${verificationId}`, '_blank');
  };

  return (
    <div className="bg-gradient-to-br from-[#141A33] via-[#20184A] to-[#2B1B69] text-white border border-[#3E2D85] rounded-2xl p-5 sm:p-6 shadow-md space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-xl shrink-0 border border-white/10">
            🏆
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#D8D2FA]">
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
          {isCertified ? '✓ Verified Active' : 'Benchmark: 70%+ Required'}
        </span>
      </div>

      {/* Candidate Name & Achievement Overview */}
      <div className="space-y-1.5 text-center py-2.5">
        <div className="text-[11px] uppercase tracking-widest text-[#D8D2FA] font-medium">
          Awarded To
        </div>
        <div className="text-[22px] sm:text-[25px] font-bold text-white tracking-wide leading-tight" style={{ fontFamily: 'Fraunces, serif' }}>
          {candidateName}
        </div>
        <div className="text-[13px] text-[#E4DFFB] font-medium pt-0.5">
          Demonstrated Technical Competence in <strong>{roleName}</strong>
        </div>

        {/* Achievement breakdown pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px]">
          <span className="bg-white/10 border border-white/15 px-2.5 py-0.5 rounded-full text-[#ECEAF9]">
            Composite Score: <strong className="text-white">{compositeScore}/100</strong>
          </span>
          <span className="bg-white/10 border border-white/15 px-2.5 py-0.5 rounded-full text-[#ECEAF9]">
            ATS Score: <strong className="text-white">{atsScore}/100</strong>
          </span>
          <span className="bg-white/10 border border-white/15 px-2.5 py-0.5 rounded-full text-[#ECEAF9]">
            Issued: <strong className="text-white">{issuedDateStr}</strong>
          </span>
        </div>
      </div>

      {/* Verification ID Ledger & Actions */}
      <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#D8D2FA]">
          <span className="text-white/60">ID:</span>
          <span className="font-bold tracking-wider">{displayVerificationId}</span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {verificationId && (
            <button
              type="button"
              onClick={handleOpenPublicLedger}
              className="flex-1 sm:flex-none text-[11.5px] font-semibold px-3 py-1.5 rounded-lg text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors cursor-pointer text-center"
            >
              🔍 View Public Ledger
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyCredential}
            disabled={!isCertified}
            className={`flex-1 sm:flex-none text-[11.5px] font-semibold px-3 py-1.5 rounded-lg transition-colors text-center ${
              isCertified
                ? 'text-[#141A33] bg-white hover:bg-[#FAF9FE] shadow-xs cursor-pointer font-bold'
                : 'text-white/50 bg-white/5 border border-white/10 cursor-not-allowed'
            }`}
          >
            {isCertified ? '📋 Copy Credential Link' : '🔒 Unlocks at 70%+ Score'}
          </button>
        </div>
      </div>
    </div>
  );
}

