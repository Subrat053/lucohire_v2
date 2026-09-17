import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User as UserIcon, Mail, Phone, MapPin, Calendar, Shield,
  CheckCircle2, XCircle, Clock, AlertCircle, FileText, Link2, Image,
  Briefcase, Globe, Star, MessageSquare, Send, Eye, ChevronRight,
  Building, Award, Layers, RefreshCw
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import { toAbsoluteMediaUrl } from '../../utils/media';
import toast from 'react-hot-toast';

/* ── Constants ─────────────────────────────────────────────────── */
const STATUS_STYLES = {
  approved:      { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle2 },
  rejected:      { bg: 'bg-red-50',   text: 'text-red-700',   border: 'border-red-200',   icon: XCircle },
  pending:       { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: Clock },
  not_submitted: { bg: 'bg-gray-50',  text: 'text-gray-400',  border: 'border-gray-200',  icon: AlertCircle },
};

const SECTION_ICONS = {
  profilePhoto:    Image,
  resume:          FileText,
  portfolio:       Link2,
  skills:          Star,
  serviceAreas:    MapPin,
  businessDetails: Briefcase,
  companyLogo:     Building,
  companyDetails:  Building,
  companyWebsite:  Globe,
  phone:           Phone,
  email:           Mail,
  businessInfo:    Award,
};

const ROLE_BADGE = {
  provider:  'bg-orange-100 text-orange-700 border-orange-200',
  recruiter: 'bg-teal-100 text-teal-700 border-teal-200',
  partner:   'bg-purple-100 text-purple-700 border-purple-200',
};

/* ── Tab system ─────────────────────────────────────────────────── */
const DETAIL_TABS = ['sections', 'activity'];

/* ── Completion ring ────────────────────────────────────────────── */
const CompletionRing = ({ pct = 0 }) => {
  const r = 30, circ = 2 * Math.PI * r;
  const dash = ((pct / 100) * circ).toFixed(2);
  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="80" height="80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#f1f5f9" strokeWidth="6" />
        <circle cx="40" cy="40" r={r} fill="none"
          stroke={pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'}
          strokeWidth="6" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className="text-sm font-bold text-gray-900">{pct}%</span>
    </div>
  );
};

/* ── Status Badge ───────────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const s = STATUS_STYLES[status] || STATUS_STYLES.not_submitted;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${s.bg} ${s.text} ${s.border}`}>
      <Icon className="w-3 h-3" />
      {status === 'not_submitted' ? 'Not Submitted' : status}
    </span>
  );
};

/* ── Section Card ───────────────────────────────────────────────── */
const SectionCard = ({
  section,
  onApprove,
  onReject,
  onAddRemark,
  onApprovePortfolioLink,
  onRejectPortfolioLink,
  profileId
}) => {
  const [showRemarkInput, setShowRemarkInput] = useState(false);
  const [remark, setRemark] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [useGoogleViewer, setUseGoogleViewer] = useState(true); // default: Google Docs Viewer (avoids Cloudinary raw download)

  const isPhoneOrEmail = section.key === 'phone' || section.key === 'email';
  const isServiceAreas = section.key === 'serviceAreas';

  const Icon = SECTION_ICONS[section.key] || FileText;
  const s = isServiceAreas ? { border: 'border-gray-200', bg: 'bg-white', text: 'text-blue-500' } : (STATUS_STYLES[section.status] || STATUS_STYLES.not_submitted);

  const handleApprove = async () => {
    setLoading(true);
    await onApprove(section.key);
    setLoading(false);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error('Please enter a rejection reason'); return; }
    setLoading(true);
    await onReject(section.key, rejectReason);
    setRejectReason('');
    setShowRejectInput(false);
    setLoading(false);
  };

  const handleAddRemark = async () => {
    if (!remark.trim()) return;
    setLoading(true);
    await onAddRemark(section.key, remark);
    setRemark('');
    setShowRemarkInput(false);
    setLoading(false);
  };

  return (
    <div className={`rounded-2xl border p-5 transition-all ${isServiceAreas ? 'border-gray-200 bg-white shadow-sm' : `${s.border} ${section.status === 'rejected' ? 'bg-red-50/30' : section.status === 'approved' ? 'bg-green-50/20' : 'bg-white'}`}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isServiceAreas ? 'bg-blue-50' : s.bg}`}>
            <Icon className={`w-4.5 h-4.5 ${isServiceAreas ? 'text-blue-500' : s.text}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">{section.label}</h3>
            {section.url && (
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-50">{section.url.split('/').pop()}</p>
            )}
          </div>
        </div>
        {!isServiceAreas && <StatusBadge status={section.status} />}
      </div>

      {/* Preview */}
      {(section.key === 'profilePhoto' || section.key === 'companyLogo') && section.url && (
        <div className="mb-4 flex gap-3">
          <img src={toAbsoluteMediaUrl(section.url)} alt={section.label}
            className="w-20 h-20 rounded-xl object-cover border border-gray-200 shadow-sm"
            onError={e => { e.target.style.display = 'none'; }} />
          <a href={toAbsoluteMediaUrl(section.url)} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline self-start mt-2">
            <Eye className="w-3.5 h-3.5" /> View full size
          </a>
        </div>
      )}
      {section.key === 'resume' && section.url && (() => {
        const absUrl = toAbsoluteMediaUrl(section.url);
        const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(absUrl);
        // Cloudinary raw files: add fl_inline to prevent forced download
        const inlineUrl = absUrl.includes('/raw/upload/')
          ? absUrl.replace('/raw/upload/', '/raw/upload/fl_inline/')
          : absUrl;
        const googleDocsUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(absUrl)}&embedded=true`;

        return (
          <div className="mb-4 space-y-3">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <a href={inlineUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg border border-blue-200 hover:bg-blue-100 transition">
                <FileText className="w-3.5 h-3.5" /> Open in New Tab
              </a>
              {!isImage && (
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setUseGoogleViewer(true)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition ${useGoogleViewer ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    Google Viewer
                  </button>
                  <button
                    onClick={() => setUseGoogleViewer(false)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition ${!useGoogleViewer ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    Direct Embed
                  </button>
                </div>
              )}
            </div>

            {/* Preview */}
            {isImage ? (
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white max-h-[600px] overflow-y-auto">
                <img src={absUrl} alt="Resume" className="w-full object-contain" />
              </div>
            ) : useGoogleViewer ? (
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white relative">
                <div className="absolute top-2 right-2 z-10">
                  <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                    via Google Docs Viewer
                  </span>
                </div>
                <iframe
                  key={`gdocs-${section.url}`}
                  src={googleDocsUrl}
                  className="w-full border-0"
                  style={{ height: '640px' }}
                  title="Resume Preview"
                  allow="fullscreen"
                />
              </div>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
                <object
                  data={inlineUrl}
                  type="application/pdf"
                  className="w-full border-0"
                  style={{ height: '640px' }}
                >
                  <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
                    <FileText className="w-10 h-10 text-gray-300 mb-3" />
                    <p className="text-sm font-medium text-gray-700">Direct preview unavailable</p>
                    <p className="text-xs text-gray-400 mt-1 mb-4">The file may require a different viewer</p>
                    <button
                      onClick={() => setUseGoogleViewer(true)}
                      className="px-4 py-2 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                      Switch to Google Viewer
                    </button>
                  </div>
                </object>
              </div>
            )}
          </div>
        );
      })()}
      {section.key === 'portfolio' && Array.isArray(section.items) && section.items.length > 0 && (
        <div className="mb-4 flex flex-col gap-3">
          {section.items.map((link, i) => (
            <div key={link._id || i} className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Link2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-xs font-bold text-gray-900 capitalize bg-white px-2 py-0.5 rounded border">
                    {link.platform || 'link'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLES[link.status]?.bg || 'bg-gray-50'} ${STATUS_STYLES[link.status]?.text || 'text-gray-400'} ${STATUS_STYLES[link.status]?.border || 'border-gray-200'}`}>
                    {link.status}
                  </span>
                </div>
                <a href={link.url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline truncate block font-medium">
                  {link.url}
                </a>
                {link.rejectionReason && (
                  <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg mt-2 border border-red-100">
                    <strong>Rejection Reason:</strong> {link.rejectionReason}
                  </p>
                )}
              </div>
              
              {/* Individual link action buttons */}
              {link.status === 'pending' && profileId && (
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => onApprovePortfolioLink(profileId, link._id)}
                    className="px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white text-xs font-semibold rounded-lg transition">
                    Approve Link
                  </button>
                  <button onClick={() => onRejectPortfolioLink(profileId, link._id)}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition">
                    Reject Link
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {section.key === 'documents' && Array.isArray(section.items) && section.items.length > 0 && (
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {section.items.map((docUrl, i) => {
            const fileName = docUrl.split('/').pop() || `Document ${i + 1}`;
            const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(docUrl);
            return (
              <div key={i} className="flex flex-col gap-2.5 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-gray-700 truncate" title={fileName}>
                    {fileName}
                  </span>
                  <a href={toAbsoluteMediaUrl(docUrl)} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline shrink-0 font-medium">
                    <Eye className="w-3.5 h-3.5" /> View
                  </a>
                </div>
                {isImage && (
                  <div className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 bg-white">
                    <img src={toAbsoluteMediaUrl(docUrl)} alt={fileName}
                      className="w-full h-full object-contain"
                      onError={e => { e.target.style.display = 'none'; }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {section.key === 'skills' && Array.isArray(section.items) && section.items.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {section.items.map((skill, i) => (
            <span key={i} className="px-2.5 py-1 bg-orange-50 text-orange-700 text-xs font-medium rounded-full border border-orange-200">{skill}</span>
          ))}
        </div>
      )}
      {section.key === 'serviceAreas' && (
        <div className="mb-4 space-y-4 text-left">
          {section.value && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Primary Location (Base Address)</p>
              <div className="px-3.5 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-700 font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                <span>{section.value}</span>
              </div>
            </div>
          )}
          {Array.isArray(section.items) && section.items.length > 0 && (() => {
            const uniqueItems = Array.from(new Set(section.items.map(item => String(item).trim()).filter(Boolean)));
            if (uniqueItems.length === 0) return null;
            return (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Service Coverage Cities/Areas</p>
                <div className="flex flex-wrap gap-1.5">
                  {uniqueItems.map((area, i) => (
                    <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200/80 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
          {!section.value && (!section.items || section.items.length === 0) && (
            <p className="text-xs text-gray-400 italic">No location or service areas provided</p>
          )}
        </div>
      )}
      {(section.key === 'email' || section.key === 'phone' || section.key === 'companyDetails' || section.key === 'companyWebsite') && section.value && (
        <div className="mb-4 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700 font-medium">
          {section.value}
        </div>
      )}
      {section.key === 'businessDetails' && (
        <div className="mb-4 space-y-2">
          {section.value && (
            <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Description / Bio</p>
              <p>{section.value}</p>
            </div>
          )}
          {(section.extraFields?.experience || section.extraFields?.tier || section.extraFields?.specialities || section.extraFields?.workMode) && (
            <div className="grid grid-cols-2 gap-2">
              {section.extraFields?.tier && (
                <div className="px-3 py-2 bg-indigo-50 rounded-lg border border-indigo-100 text-xs">
                  <p className="font-semibold text-indigo-400 uppercase tracking-wider mb-0.5">Tier</p>
                  <p className="capitalize font-medium text-gray-800">{section.extraFields.tier}</p>
                </div>
              )}
              {section.extraFields?.experience && (
                <div className="px-3 py-2 bg-amber-50 rounded-lg border border-amber-100 text-xs">
                  <p className="font-semibold text-amber-400 uppercase tracking-wider mb-0.5">Experience</p>
                  <p className="font-medium text-gray-800">{section.extraFields.experience}</p>
                </div>
              )}
              {section.extraFields?.workMode && (
                <div className="px-3 py-2 bg-teal-50 rounded-lg border border-teal-100 text-xs">
                  <p className="font-semibold text-teal-400 uppercase tracking-wider mb-0.5">Work Mode</p>
                  <p className="capitalize font-medium text-gray-800">{section.extraFields.workMode}</p>
                </div>
              )}
              {section.extraFields?.specialities && (
                <div className="px-3 py-2 bg-purple-50 rounded-lg border border-purple-100 text-xs col-span-2">
                  <p className="font-semibold text-purple-400 uppercase tracking-wider mb-0.5">Specialities</p>
                  <p className="font-medium text-gray-800">{section.extraFields.specialities}</p>
                </div>
              )}
            </div>
          )}
          {!section.value && !section.extraFields?.specialities && (
            <p className="text-xs text-gray-400 italic">No business details provided</p>
          )}
        </div>
      )}

      {/* Action buttons */}
      {section.status !== 'not_submitted' && section.key !== 'serviceAreas' && (
        <div className="flex items-center flex-wrap gap-2 mt-2">
          {section.status !== 'approved' && (
            <button onClick={handleApprove} disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-green-700 hover:bg-green-800 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50">
              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
            </button>
          )}
          {!isPhoneOrEmail && section.key !== 'skills' && section.status !== 'rejected' && (
            <button onClick={() => setShowRejectInput(v => !v)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition">
              <XCircle className="w-3.5 h-3.5" /> Mark Correction
            </button>
          )}
          {!isPhoneOrEmail && section.key !== 'skills' && (
            <button onClick={() => setShowRemarkInput(v => !v)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
              <MessageSquare className="w-3.5 h-3.5" /> Remark
            </button>
          )}
        </div>
      )}

      {/* Reject input */}
      {showRejectInput && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            ⚠️ This marks the section for correction. No email is sent yet — use <strong>Send Correction Email</strong> when all sections are reviewed.
          </p>
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
            placeholder="Describe what needs to be corrected..."
            rows={3}
            className="w-full px-3 py-2 border border-amber-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-300 resize-none bg-amber-50/30" />
          <div className="flex gap-2">
            <button onClick={handleReject} disabled={loading}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50">
              Mark for Correction
            </button>
            <button onClick={() => setShowRejectInput(false)}
              className="px-4 py-1.5 text-xs text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add remark input */}
      {showRemarkInput && (
        <div className="mt-3 space-y-2">
          <textarea value={remark} onChange={e => setRemark(e.target.value)}
            placeholder="Add an internal remark..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-300 resize-none" />
          <div className="flex gap-2">
            <button onClick={handleAddRemark} disabled={loading || !remark.trim()}
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50">
              Add Remark
            </button>
            <button onClick={() => setShowRemarkInput(false)}
              className="px-4 py-1.5 text-xs text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Remark history */}
      {Array.isArray(section.remarks) && section.remarks.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-3 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Remark History</p>
          {section.remarks.map((r, i) => (
            <div key={i} className="flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                <UserIcon className="w-3 h-3 text-purple-600" />
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                <p className="text-xs text-gray-700">{r.text}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {r.adminName || 'Admin'} · {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Legacy'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Activity Log Item ────────────────────────────────────────────── */
const ActivityItem = ({ log, isLast }) => {
  const iconMap = {
    approved: { icon: CheckCircle2, color: 'text-green-700', bg: 'bg-green-50' },
    rejected: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
    remark_added: { icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50' },
    correction_email_sent: { icon: Send, color: 'text-blue-600', bg: 'bg-blue-50' },
  };
  const cfg = iconMap[log.action] || { icon: AlertCircle, color: 'text-gray-400', bg: 'bg-gray-50' };
  const Icon = cfg.icon;

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${cfg.bg}`}>
          <Icon className={`w-4 h-4 ${cfg.color}`} />
        </div>
        {!isLast && <div className="w-px flex-1 bg-gray-100 mt-2" />}
      </div>
      <div className="pb-5 flex-1">
        <p className="text-sm font-semibold text-gray-900 capitalize">
          {log.adminName || 'Admin'} {log.action.replace(/_/g, ' ')} <span className="font-normal text-gray-500">{log.sectionLabel || log.section}</span>
        </p>
        {log.remark && (
          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5 mt-1">{log.remark}</p>
        )}
        <p className="text-xs text-gray-400 mt-1.5">
          {log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
          }) : '—'}
        </p>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════ */
export default function ProfileReviewDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sections');
  const [actionLoading, setActionLoading] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailNote, setEmailNote] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  /* ── Fetch detail ───────────────────────────────────────────── */
  const fetchDetail = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const { data: res } = await adminAPI.getProfileReviewDetail(userId);
      setData(res);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  /* ── Section approve ────────────────────────────────────────── */
  const handleApprove = async (sectionKey) => {
    try {
      setActionLoading(true);
      await adminAPI.approveProfileSection(userId, sectionKey);
      toast.success(`${sectionKey} approved`);
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Section reject ─────────────────────────────────────────── */
  const handleReject = async (sectionKey, reason) => {
    try {
      setActionLoading(true);
      await adminAPI.rejectProfileSection(userId, sectionKey, reason);
      toast.success(`${sectionKey} rejected`);
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject');
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Add remark ─────────────────────────────────────────────── */
  const handleAddRemark = async (sectionKey, remark) => {
    try {
      await adminAPI.addSectionRemark(userId, sectionKey, remark);
      toast.success('Remark added');
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add remark');
    }
  };

  /* ── Portfolio Link Actions ─────────────────────────────────── */
  const handleApprovePortfolioLink = async (profileId, linkId) => {
    try {
      setActionLoading(true);
      await adminAPI.approvePortfolioLink(profileId, linkId);
      toast.success('Portfolio link approved successfully');
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve portfolio link');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectPortfolioLinkPrompt = async (profileId, linkId) => {
    const reason = window.prompt('Enter rejection reason for this portfolio link:');
    if (reason === null) return; // Cancelled
    if (!reason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    try {
      setActionLoading(true);
      await adminAPI.rejectPortfolioLink(profileId, linkId, reason);
      toast.success('Portfolio link rejected successfully');
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject portfolio link');
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Send correction email ──────────────────────────────────── */
  const handleSendEmail = async () => {
    if (!data) return;
    const rejectedSections = (data.sections || [])
      .filter(s => s.status === 'rejected' || (s.remarks?.length > 0 && s.status !== 'approved'))
      .map(s => ({ key: s.key, label: s.label, reason: s.remarks?.[s.remarks.length - 1]?.text || '' }));

    if (rejectedSections.length === 0) {
      toast.error('No rejected sections to notify user about.');
      return;
    }
    setSendingEmail(true);
    try {
      await adminAPI.sendProfileCorrectionEmail(userId, { sections: rejectedSections, message: emailNote });
      toast.success('Correction email sent successfully');
      setShowEmailModal(false);
      setEmailNote('');
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/80 p-6">
        <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded-xl" />
          <div className="grid grid-cols-[300px,1fr] gap-6">
            <div className="bg-white rounded-2xl h-100 border border-gray-100" />
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-40 border border-gray-100" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return (
    <div className="min-h-screen bg-gray-50/80 flex items-center justify-center">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-semibold">Profile not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-purple-600 text-white text-sm rounded-xl hover:bg-purple-700 transition">
          Go Back
        </button>
      </div>
    </div>
  );

  const { user, profile, sections, activityLogs } = data;
  const photo = toAbsoluteMediaUrl(user.profilePhoto) || '';
  const locationParts = [profile?.city, profile?.state, profile?.country].filter(Boolean);
  const rejectedCount = sections.filter(s => s.status === 'rejected').length;
  const approvedCount = sections.filter(s => s.status === 'approved').length;
  const pendingCount = sections.filter(s => s.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-50/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* ── Header ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin/profile-approvals')}
              className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-gray-900 transition">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Approvals</span>
            </button>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <span className="text-sm text-gray-500 font-medium">{user.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchDetail}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button onClick={() => setShowEmailModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-xs font-semibold rounded-xl hover:bg-purple-700 transition">
              <Send className="w-3.5 h-3.5" /> Send Correction Email
            </button>
          </div>
        </div>

        {/* Header Profile Info Card (Reference Design style) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 items-center">
            {/* Left: Avatar & Role */}
            <div className="flex items-center gap-4 col-span-1 md:col-span-1 lg:col-span-2 border-b md:border-b-0 lg:border-r border-gray-100 pb-4 md:pb-0 lg:pr-6">
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-purple-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-md">
                  {photo
                    ? <img src={photo} alt={user.name} className="w-full h-full object-cover" />
                    : <UserIcon className="w-8 h-8 text-purple-400" />}
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-gray-900 truncate">{user.name || '—'}</h2>
                  <div className="flex flex-wrap gap-1">
                    {Array.isArray(user.roles) ? Array.from(new Set(user.roles)).map(r => (
                      <span key={r} className={`text-2xs font-semibold px-2 py-0.5 rounded-full border capitalize
                        ${ROLE_BADGE[r] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                        {r === 'provider' ? 'Provider' : r}
                      </span>
                    )) : (
                      <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full border capitalize
                        ${ROLE_BADGE[user.primaryRole] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                        {user.primaryRole === 'provider' ? 'Provider' : user.primaryRole}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-2 space-y-1 text-xs text-gray-500">
                  {user.email && (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>
                  )}
                  {user.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>{user.phone}</span>
                    </div>
                  )}
                  {user.phoneHistory && user.phoneHistory.length > 0 && (
                    <div className="mt-1.5 pl-3 border-l-2 border-purple-100 space-y-1 text-[10px] text-gray-400 text-left">
                      <span className="font-bold text-gray-400 uppercase tracking-wider block mb-1">Previous Numbers:</span>
                      {user.phoneHistory.map((historyItem, idx) => (
                        <div key={idx} className="flex flex-col leading-tight border-b border-gray-50 pb-1 last:border-0 last:pb-0">
                          <span className="font-semibold text-gray-700">{historyItem.phone}</span>
                          <span className="text-[9px] text-gray-400">
                            {new Date(historyItem.changedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>Joined {new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Completion */}
            <div className="flex flex-col items-center justify-center border-b md:border-b-0 lg:border-r border-gray-100 pb-4 md:pb-0 lg:pr-6">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Profile Completion</p>
              <CompletionRing pct={profile?.profileCompletion || 0} />
              <p className="text-2xs text-gray-400 mt-2 font-medium">{profile?.profileCompletion || 0}% complete</p>
            </div>

            {/* Section Summary */}
            <div className="flex flex-col justify-center border-b md:border-b-0 lg:border-r border-gray-100 pb-4 md:pb-0 lg:pr-6 lg:pl-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Section Summary</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-gray-500 font-medium">Approved</span>
                  </div>
                  <span className="font-bold text-green-700">{approvedCount}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-gray-500 font-medium">Pending</span>
                  </div>
                  <span className="font-bold text-amber-600">{pendingCount}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-gray-500 font-medium">Rejected</span>
                  </div>
                  <span className="font-bold text-red-600">{rejectedCount}</span>
                </div>
              </div>
            </div>

            {/* Account Status */}
            <div className="flex flex-col justify-center lg:pl-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Account Status</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-medium">Approval</span>
                  <span className={`font-semibold px-2 py-0.5 rounded capitalize text-2xs border ${user.approvalStatus === 'approved' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                    {user.approvalStatus || 'pending'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-medium">Blocked</span>
                  <span className={`font-semibold px-2 py-0.5 rounded text-2xs border ${user.isBlocked ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                    {user.isBlocked ? 'Blocked' : 'Active'}
                  </span>
                </div>
                {profile?.companyName && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-medium">Company</span>
                    <span className="font-semibold text-gray-700 truncate max-w-24" title={profile.companyName}>{profile.companyName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 mb-5">
          {[
            { key: 'sections', label: `Sections (${sections.length})` },
            { key: 'activity', label: `Activity Log (${activityLogs.length})` },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition
                ${activeTab === tab.key ? 'bg-purple-600 text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dynamic content rendering */}
        <div>
          {/* Sections Tab */}
          {activeTab === 'sections' && (
            sections.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <Layers className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No sections to review</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {sections.map(section => (
                  <div key={section.key} className={section.key === 'resume' || section.key === 'documents' || section.key === 'portfolio' ? 'lg:col-span-2' : ''}>
                    <SectionCard
                      section={section}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      onAddRemark={handleAddRemark}
                      onApprovePortfolioLink={handleApprovePortfolioLink}
                      onRejectPortfolioLink={handleRejectPortfolioLinkPrompt}
                      profileId={profile?._id}
                    />
                  </div>
                ))}
              </div>
            )
          )}

            {/* Activity Tab */}
            {activeTab === 'activity' && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                {activityLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No activity yet</p>
                    <p className="text-gray-300 text-sm mt-1">Actions you take will appear here.</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-5">Activity Timeline</p>
                    {[...activityLogs].reverse().map((log, i) => (
                      <ActivityItem key={i} log={log} isLast={i === activityLogs.length - 1} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      

      {/* ── Correction Email Modal ─────────────────────────────── */}
      {showEmailModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Send Correction Email</h3>
            <p className="text-sm text-gray-500 mb-1">
              The email below will be sent to <strong>{user.email || user.name}</strong> with all the sections marked for correction.
            </p>
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              ⚠️ This sends ONE consolidated email for all marked sections below. Make sure all corrections are marked before sending.
            </p>

            {/* Preview rejected sections */}
            <div className="mb-4 space-y-2 max-h-48 overflow-y-auto">
              {sections.filter(s => s.status === 'rejected').map(s => (
                <div key={s.key} className="flex items-start gap-2.5 px-3 py-2 bg-red-50 rounded-lg border border-red-100">
                  <XCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">{s.label}</p>
                    {s.remarks?.length > 0 && (
                      <p className="text-xs text-red-600 mt-0.5">{s.remarks[s.remarks.length - 1]?.text}</p>
                    )}
                  </div>
                </div>
              ))}
              {sections.filter(s => s.status === 'rejected').length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No rejected sections. Approve or reject sections first.</p>
              )}
            </div>

            <textarea value={emailNote} onChange={e => setEmailNote(e.target.value)}
              placeholder="Optional: Add a personal message to the email..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-300 resize-none" />

            <div className="flex items-center gap-3 mt-4">
              <button onClick={handleSendEmail} disabled={sendingEmail || sections.filter(s => s.status === 'rejected').length === 0}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50">
                <Send className="w-4 h-4" />
                {sendingEmail ? 'Sending...' : 'Send Email'}
              </button>
              <button onClick={() => setShowEmailModal(false)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
