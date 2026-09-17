import React, { useState } from 'react';
import SafeExternalLink from './SafeExternalLink';

const SUPPORTED_PLATFORMS = [
  { id: 'website', name: 'Personal Website', placeholder: 'https://mywebsite.com' },
  { id: 'linkedin', name: 'LinkedIn', placeholder: 'https://linkedin.com/in/username' },
  { id: 'github', name: 'GitHub', placeholder: 'https://github.com/username' },
  { id: 'behance', name: 'Behance', placeholder: 'https://behance.net/username' },
  { id: 'dribbble', name: 'Dribbble', placeholder: 'https://dribbble.com/username' },
  { id: 'instagram', name: 'Instagram', placeholder: 'https://instagram.com/username' },
  { id: 'youtube', name: 'YouTube', placeholder: 'https://youtube.com/c/channelname' }
];

const PortfolioLinksManager = ({ value = [], onChange }) => {
  const [selectedPlatform, setSelectedPlatform] = useState('website');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const links = Array.isArray(value) ? value : [];

  const handleAddLink = () => {
    setError('');
    let trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setError('URL is required.');
      return;
    }

    // Strip javascript: or data: protocols
    const lowerUrl = trimmedUrl.toLowerCase();
    if (lowerUrl.includes('javascript:') || lowerUrl.includes('data:') || lowerUrl.includes('<script>')) {
      setError('Harmful protocols or scripts are blocked.');
      return;
    }

    // Default to https:// if protocol is missing
    if (!/^https?:\/\//i.test(trimmedUrl)) {
      trimmedUrl = `https://${trimmedUrl}`;
    }

    // Simple URL regex check
    try {
      new URL(trimmedUrl);
    } catch (_) {
      setError('Please enter a valid URL.');
      return;
    }

    // Platform specific domain validation
    if (selectedPlatform !== 'website') {
      const platformDomain = selectedPlatform === 'linkedin' ? 'linkedin.com'
                           : selectedPlatform === 'github' ? 'github.com'
                           : selectedPlatform === 'behance' ? 'behance.net'
                           : selectedPlatform === 'dribbble' ? 'dribbble.com'
                           : selectedPlatform === 'instagram' ? 'instagram.com'
                           : selectedPlatform === 'youtube' ? 'youtube.com'
                           : '';
      
      const parsed = new URL(trimmedUrl);
      const host = parsed.hostname.toLowerCase();
      if (platformDomain && !host.endsWith(platformDomain) && !host.includes(`.${platformDomain}`)) {
        setError(`URL must belong to domain ${platformDomain}`);
        return;
      }
    }

    // Check if duplicate url is added
    const exactDup = links.find(l => l.url.toLowerCase() === trimmedUrl.toLowerCase() && l.platform === selectedPlatform);
    if (exactDup) {
      setError('This link is already in your portfolio list.');
      return;
    }

    // Update list:
    // If a link for this platform exists:
    // - If it was approved, we keep the old approved link and add the new one as pending!
    // - If it was pending or rejected, we overwrite/replace it.
    const platformLinks = links.filter(l => l.platform === selectedPlatform);
    const approvedLink = platformLinks.find(l => l.status === 'approved');

    let nextLinks = [];

    if (approvedLink) {
      // Keep approved link, remove any pending/rejected ones for this platform, and add new pending
      nextLinks = links.filter(l => !(l.platform === selectedPlatform && l.status !== 'approved'));
      nextLinks.push({
        platform: selectedPlatform,
        url: trimmedUrl,
        status: 'pending',
        submittedAt: new Date()
      });
    } else {
      // No approved link exists, replace all other links for this platform with this new pending one
      nextLinks = links.filter(l => l.platform !== selectedPlatform);
      nextLinks.push({
        platform: selectedPlatform,
        url: trimmedUrl,
        status: 'pending',
        submittedAt: new Date()
      });
    }

    onChange(nextLinks);
    setUrl('');
    setError('');
  };

  const handleRemoveLink = (platform, linkUrl) => {
    // If we delete a link, we remove it. If the platform has both approved and pending,
    // and we delete the pending one, the approved one stays. If we delete the approved one,
    // we delete both. Let's make it simple: remove the exact link selected.
    const nextLinks = links.filter(l => !(l.platform === platform && l.url === linkUrl));
    onChange(nextLinks);
  };

  // Check if there are any pending changes to display notification
  const hasPending = links.some(l => l.status === 'pending');

  return (
    <div className="space-y-4">
      {/* Input section */}
      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/60">
        <div className="flex flex-col md:flex-row gap-3 items-end">
          <div className="w-full md:w-[30%]">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Platform</label>
            <select
              value={selectedPlatform}
              onChange={(e) => {
                setSelectedPlatform(e.target.value);
                setError('');
              }}
              className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:border-violet-500 focus:outline-none transition-colors"
            >
              {SUPPORTED_PLATFORMS.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          
          <div className="w-full md:w-[55%]">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Portfolio Link URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError('');
              }}
              placeholder={SUPPORTED_PLATFORMS.find(p => p.id === selectedPlatform)?.placeholder}
              className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:border-violet-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="w-full md:w-[15%]">
            <button
              type="button"
              onClick={handleAddLink}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white text-xs font-black py-2.5 rounded-xl transition-all shadow-sm shrink-0 active:scale-95 text-center"
            >
              Add Link
            </button>
          </div>
        </div>

        {error && (
          <p className="text-[11px] text-red-700 font-semibold mt-2 animate-shake">{error}</p>
        )}
      </div>

      {/* Message regarding pending approvals */}
      {hasPending && (
        <div className="bg-amber-50/70 border border-amber-100 rounded-xl px-4 py-2.5 flex items-center space-x-2 animate-pulse">
          <span className="text-amber-500 font-bold text-sm">ℹ</span>
          <p className="text-[11px] text-amber-700 font-semibold leading-relaxed">
            Updated portfolio links will be visible on your public profile after admin approval.
          </p>
        </div>
      )}

      {/* Links List */}
      {links.length > 0 ? (
        <div className="max-h-[120px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
          {links.map((link, i) => {
            const platformObj = SUPPORTED_PLATFORMS.find(p => p.id === link.platform) || { name: link.platform };
            return (
              <div
                key={i}
                className="flex items-center justify-between bg-white border border-slate-100 rounded-xl p-2.5 shadow-xs hover:border-slate-200 transition-colors duration-200"
              >
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {platformObj.name}
                    </span>
                    
                    {/* Status Badge */}
                    {link.status === 'approved' && (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                        Approved
                      </span>
                    )}
                    {link.status === 'pending' && (
                      <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs animate-pulse">
                        Pending Review
                      </span>
                    )}
                    {link.status === 'rejected' && (
                      <span
                        className="bg-red-50 text-red-700 border border-red-100 text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs cursor-pointer group relative"
                        title={link.rejectionReason}
                      >
                        Rejected
                        {link.rejectionReason && (
                          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-[9px] font-medium p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-normal w-48 shadow-lg pointer-events-none mb-2 z-10">
                            Reason: {link.rejectionReason}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  <SafeExternalLink
                    href={link.url}
                    className="text-violet-600 hover:text-violet-800 text-xs font-semibold truncate block max-w-full hover:underline"
                  >
                    {link.url}
                  </SafeExternalLink>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveLink(link.platform, link.url)}
                  className="text-slate-300 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-400 text-xs italic bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
          No portfolio links configured. Add websites or socials above.
        </div>
      )}
    </div>
  );
};

export default PortfolioLinksManager;
