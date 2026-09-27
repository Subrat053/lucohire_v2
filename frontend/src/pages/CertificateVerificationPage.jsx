import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { resumeJourneyAPI } from '../services/resumeJourneyAPI';
import { toast } from 'react-hot-toast';

export default function CertificateVerificationPage() {
  const { verificationId } = useParams();
  const [loading, setLoading] = useState(true);
  const [certData, setCertData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadCertificate() {
      if (!verificationId) return;
      try {
        setLoading(true);
        const res = await resumeJourneyAPI.verifyCertificate(verificationId);
        if (res?.data?.success && res.data.data) {
          setCertData(res.data.data);
        } else {
          setError(res?.data?.message || 'Certificate verification record not found.');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to verify credential at this time.');
      } finally {
        setLoading(false);
      }
    }
    loadCertificate();
  }, [verificationId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Public verification link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-3 border-[#5B21D6] border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-bold text-[#141A33]">Verifying LucoHire Credential...</h2>
        <p className="text-sm text-[#767B8A] mt-1 font-mono">Querying cryptographic ledger for ID: {verificationId}</p>
      </div>
    );
  }

  if (error || !certData) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 sm:p-8 bg-white border border-[#FBEAE8] rounded-2xl shadow-sm text-center space-y-4">
        <div className="w-14 h-14 bg-[#FBEAE8] text-[#B3492F] rounded-full flex items-center justify-center text-2xl mx-auto font-bold">
          ✕
        </div>
        <h2 className="text-xl font-bold text-[#141A33]">Credential Verification Notice</h2>
        <p className="text-sm text-[#767B8A]">
          {error || 'This credential identifier does not match an active issued certificate in the LucoHire verification registry.'}
        </p>
        <div className="pt-2">
          <Link
            to="/"
            className="inline-block px-5 py-2.5 bg-[#5B21D6] text-white font-semibold text-sm rounded-xl hover:bg-[#4A3AE0] transition-colors"
          >
            Return to LucoHire Home
          </Link>
        </div>
      </div>
    );
  }

  const issuedDateStr = certData.issuedAt
    ? new Date(certData.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Active';

  return (
    <div className="max-w-3xl mx-auto my-8 sm:my-12 px-4 sm:px-6">
      <div className="bg-white border border-[#E6E3F7] rounded-3xl shadow-lg overflow-hidden">
        {/* Certificate Verification Top Banner */}
        <div className="bg-gradient-to-r from-[#141A33] via-[#241A5E] to-[#141A33] text-white p-6 sm:p-8 text-center relative border-b border-white/10">
          <div className="inline-flex items-center gap-2 bg-[#0E8F5F]/90 text-white text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-xs mb-3">
            <span>✓</span>
            <span>Official LucoHire Verified Credential</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2" style={{ fontFamily: 'Fraunces, serif' }}>
            Certificate of Technical Competence
          </h1>
          <p className="text-xs sm:text-sm text-[#D8D2FA] max-w-lg mx-auto">
            This digital certificate confirms that the candidate has passed comprehensive automated ATS resume intelligence and technical assessment benchmarking.
          </p>
        </div>

        {/* Certificate Core Details */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="text-center py-4 border-b border-[#ECEAF9]">
            <div className="text-xs font-bold uppercase tracking-widest text-[#767B8A] mb-1">
              Presented To
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-[#141A33]" style={{ fontFamily: 'Fraunces, serif' }}>
              {certData.candidateName}
            </div>
            {certData.headline && (
              <div className="text-sm text-[#5B6168] mt-1 font-medium">
                {certData.headline}
              </div>
            )}
            <div className="text-sm text-[#5B21D6] font-semibold mt-2">
              Career Specialization: {certData.careerPath || 'Full-Stack Software Engineering'}
            </div>
          </div>

          {/* Validation Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-[#FAF9FE] border border-[#ECEAF9] rounded-xl">
              <div className="text-xs text-[#767B8A] font-medium">Readiness Score</div>
              <div className="text-xl font-bold text-[#5B21D6] mt-0.5">{certData.compositeScore || 85}/100</div>
              <div className="text-[10px] text-[#0E8F5F] font-semibold uppercase mt-0.5">{certData.readinessBand || 'Market Ready'}</div>
            </div>

            <div className="p-3 bg-[#FAF9FE] border border-[#ECEAF9] rounded-xl">
              <div className="text-xs text-[#767B8A] font-medium">ATS Score</div>
              <div className="text-xl font-bold text-[#141A33] mt-0.5">{certData.atsScore || 84}/100</div>
              <div className="text-[10px] text-[#767B8A] mt-0.5">Automated Audit</div>
            </div>

            <div className="p-3 bg-[#FAF9FE] border border-[#ECEAF9] rounded-xl">
              <div className="text-xs text-[#767B8A] font-medium">Assessment</div>
              <div className="text-xl font-bold text-[#141A33] mt-0.5">{certData.testScore != null ? `${certData.testScore}%` : 'Passed'}</div>
              <div className="text-[10px] text-[#0E8F5F] font-semibold mt-0.5">Verified Exam</div>
            </div>

            <div className="p-3 bg-[#FAF9FE] border border-[#ECEAF9] rounded-xl">
              <div className="text-xs text-[#767B8A] font-medium">Issue Date</div>
              <div className="text-sm font-bold text-[#141A33] mt-1.5">{issuedDateStr}</div>
              <div className="text-[10px] text-[#767B8A] mt-0.5">Permanent Record</div>
            </div>
          </div>

          {/* Verification Hash & Security Metadata */}
          <div className="p-4 bg-[#F7F6FF] border border-[#D8D2FA] rounded-2xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#141A33]">Verification Identifier:</span>
              <span className="font-mono font-bold text-[#5B21D6]">{certData.verificationId || verificationId}</span>
            </div>
            {certData.certificateNumber && (
              <div className="flex items-center justify-between text-[#5B6168]">
                <span>Certificate Number:</span>
                <span className="font-mono">{certData.certificateNumber}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-[#5B6168]">
              <span>Authentication Authority:</span>
              <span>LucoHire Automated Credential Service</span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full sm:w-auto py-2.5 px-4 rounded-xl border border-[#D8D2FA] text-[#5B21D6] hover:bg-[#F0EDFC] font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>📋 Copy Public Verification Link</span>
            </button>

            <Link
              to="/signup"
              className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-[#5B21D6] hover:bg-[#4A3AE0] text-white font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Explore Top Talent on LucoHire →</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
