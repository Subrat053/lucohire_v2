/**
 * ResumeUploadParser.jsx
 * AI-powered resume upload and parsing component for provider profile.
 *
 * Features:
 * - Drag-and-drop file upload
 * - Upload progress
 * - AI parsing status polling
 * - Parsed result preview with editable acceptance
 * - Apply to profile / Retry buttons
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import {
  Upload, FileText, CheckCircle2, XCircle, Loader2, RefreshCw,
  Sparkles, ChevronDown, ChevronUp, AlertCircle, Info
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const ACCEPTED_TYPES = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/msword': '.doc',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

export default function ResumeUploadParser({ onApplied }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parseStatus, setParseStatus] = useState(null); // null | 'processing' | 'completed' | 'failed'
  const [parsedData, setParsedData] = useState(null);
  const [confidenceScore, setConfidenceScore] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [acceptedFields, setAcceptedFields] = useState({});
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const pollRef = useRef(null);
  const fileInputRef = useRef(null);

  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // ─── Poll parse status ──────────────────────────────────────────────────────
  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await axios.get(`${API_BASE}/provider/resume/parse-status`, {
          headers: getAuthHeader(),
        });
        const { status, parsedResumeData, confidenceScore: cs, errorMessage: em } = res.data;
        setParseStatus(status);
        if (status === 'completed') {
          setParsedData(parsedResumeData);
          setConfidenceScore(cs);
          // Pre-select all fields by default
          setAcceptedFields({
            skills: true, experience: true, city: true,
            languages: true, description: true, portfolioLinks: true,
          });
          clearInterval(pollRef.current);
        } else if (status === 'failed') {
          setErrorMessage(em || 'AI parsing failed. Please retry.');
          clearInterval(pollRef.current);
        }
      } catch (_) {}
    }, 3000);
  }, []);

  useEffect(() => {
    // On mount, check if there's already parsed data
    axios.get(`${API_BASE}/provider/resume/parse-status`, { headers: getAuthHeader() })
      .then(res => {
        if (res.data.status === 'completed') {
          setParsedData(res.data.parsedResumeData);
          setParseStatus('completed');
          setConfidenceScore(res.data.confidenceScore);
          setAcceptedFields({ skills: true, experience: true, city: true, languages: true, description: true, portfolioLinks: true });
        } else if (res.data.status === 'processing') {
          setParseStatus('processing');
          startPolling();
        } else if (res.data.status === 'failed') {
          setParseStatus('failed');
          setErrorMessage(res.data.errorMessage);
        }
      })
      .catch(() => {});

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // ─── Handle file ────────────────────────────────────────────────────────────
  const handleFile = useCallback(async (file) => {
    if (!file) return;
    if (!ACCEPTED_TYPES[file.type]) {
      setErrorMessage('Unsupported file type. Please upload PDF, DOCX, DOC, or image.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setErrorMessage('');
    setParsedData(null);
    setParseStatus(null);
    setApplied(false);

    const formData = new FormData();
    formData.append('resume', file);

    try {
      await axios.post(`${API_BASE}/provider/resume/parse`, formData, {
        headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          setUploadProgress(Math.round((e.loaded * 100) / e.total));
        },
      });

      setUploadProgress(100);
      setParseStatus('processing');
      startPolling();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Upload failed. Please try again.');
      setParseStatus('failed');
    } finally {
      setUploading(false);
    }
  }, [startPolling]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ─── Apply parsed data ──────────────────────────────────────────────────────
  const handleApply = async () => {
    setApplying(true);
    try {
      await axios.patch(
        `${API_BASE}/provider/resume/apply-parsed`,
        { acceptedFields },
        { headers: getAuthHeader() }
      );
      setApplied(true);
      if (onApplied) onApplied();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to apply data.');
    } finally {
      setApplying(false);
    }
  };

  // ─── Retry ──────────────────────────────────────────────────────────────────
  const handleRetry = async () => {
    setParseStatus('processing');
    setErrorMessage('');
    try {
      await axios.post(`${API_BASE}/provider/resume/retry-parse`, {}, { headers: getAuthHeader() });
      startPolling();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Retry failed.');
      setParseStatus('failed');
    }
  };

  const toggleField = (key) => setAcceptedFields(prev => ({ ...prev, [key]: !prev[key] }));

  const confidenceColor = confidenceScore >= 0.8 ? 'text-green-700' : confidenceScore >= 0.5 ? 'text-amber-600' : 'text-red-700';
  const confidenceBg = confidenceScore >= 0.8 ? 'bg-green-50' : confidenceScore >= 0.5 ? 'bg-amber-50' : 'bg-red-50';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          <h3 className="font-semibold text-gray-900">AI Resume Parser</h3>
        </div>
        {parseStatus === 'completed' && parsedData && (
          <button
            onClick={() => setShowPreview(p => !p)}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700"
          >
            {showPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showPreview ? 'Hide' : 'Show'} preview
          </button>
        )}
      </div>

      <div className="p-6">
        {/* ── Upload Zone ────────────────────────────────────────────────── */}
        {(!parseStatus || parseStatus === 'failed') && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition
              ${dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {uploading ? (
              <div>
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700 mb-2">Uploading...</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                  <div
                    className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400">{uploadProgress}%</p>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">
                  {dragOver ? 'Drop your resume here' : 'Drag & drop or click to upload resume'}
                </p>
                <p className="text-xs text-gray-400 mt-1">PDF, DOCX, DOC, JPG, PNG — max 10MB</p>
              </>
            )}
          </div>
        )}

        {/* ── Processing State ───────────────────────────────────────────── */}
        {parseStatus === 'processing' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-indigo-500" />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-indigo-300 border-t-transparent animate-spin" />
            </div>
            <p className="text-sm font-medium text-gray-700">AI is parsing your resume...</p>
            <p className="text-xs text-gray-400">This usually takes 10–30 seconds</p>
          </div>
        )}

        {/* ── Error State ────────────────────────────────────────────────── */}
        {parseStatus === 'failed' && errorMessage && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mt-4">
            <XCircle className="w-5 h-5 text-red-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-700 font-medium">Parsing failed</p>
              <p className="text-xs text-red-700 mt-1">{errorMessage}</p>
              <button
                onClick={handleRetry}
                className="mt-2 flex items-center gap-1.5 text-xs text-red-600 hover:text-red-800 font-medium"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry with AI
              </button>
            </div>
          </div>
        )}

        {/* ── Completed: Parsed Preview ──────────────────────────────────── */}
        {parseStatus === 'completed' && parsedData && showPreview && (
          <div className="mt-2">
            {/* Confidence score */}
            {confidenceScore !== null && (
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2 mb-4 ${confidenceBg}`}>
                <Info className={`w-4 h-4 flex-shrink-0 ${confidenceColor}`} />
                <span className={`text-sm font-medium ${confidenceColor}`}>
                  Confidence: {Math.round(confidenceScore * 100)}%
                </span>
                <span className="text-xs text-gray-400 ml-1">
                  {confidenceScore >= 0.8 ? '(High)' : confidenceScore >= 0.5 ? '(Medium)' : '(Low)'}
                </span>
              </div>
            )}

            <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              Select which fields to apply to your profile. Only empty fields will be updated.
            </p>

            {/* Field toggles */}
            <div className="space-y-2 mb-4">
              {[
                { key: 'skills', label: 'Skills', value: parsedData.skills?.join(', ') || parsedData.specialities?.join(', ') },
                { key: 'experience', label: 'Experience', value: parsedData.experienceYears },
                { key: 'city', label: 'City', value: parsedData.city },
                { key: 'languages', label: 'Languages', value: parsedData.languages?.join(', ') },
                { key: 'description', label: 'Bio/Description', value: parsedData.bio },
                { key: 'portfolioLinks', label: 'Portfolio Links', value: parsedData.portfolioLinks?.map(l => l.url).join(', ') },
              ].filter(f => f.value).map(({ key, label, value }) => (
                <label
                  key={key}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition
                    ${acceptedFields[key] ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'}`}
                >
                  <input
                    type="checkbox"
                    checked={!!acceptedFields[key]}
                    onChange={() => toggleField(key)}
                    className="mt-0.5 accent-indigo-600"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-gray-700 block">{label}</span>
                    <span className="text-sm text-gray-800 truncate block" title={value}>{value}</span>
                  </div>
                </label>
              ))}
            </div>

            {/* Apply / Applied */}
            {applied ? (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <CheckCircle2 className="w-5 h-5 text-green-700" />
                <span className="text-sm font-medium text-green-700">Applied to your profile successfully!</span>
              </div>
            ) : (
              <button
                onClick={handleApply}
                disabled={applying || !Object.values(acceptedFields).some(Boolean)}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                {applying ? <><Loader2 className="w-4 h-4 animate-spin" /> Applying...</> : <><CheckCircle2 className="w-4 h-4" /> Apply to Profile</>}
              </button>
            )}

            {/* Re-upload link */}
            <button
              onClick={() => { setParseStatus(null); setParsedData(null); setApplied(false); }}
              className="w-full text-center text-sm text-gray-400 hover:text-gray-700 mt-3 py-1"
            >
              Upload a different resume
            </button>
          </div>
        )}

        {/* ── Completed: No Preview ──────────────────────────────────────── */}
        {parseStatus === 'completed' && !showPreview && (
          <div className="flex items-center gap-3 py-4 px-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-sm font-medium text-gray-700">Resume parsed successfully</p>
              <button onClick={() => setShowPreview(true)} className="text-xs text-indigo-600 hover:text-indigo-800">
                Show parsed data
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
