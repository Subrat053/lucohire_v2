/**
 * BlurredLockedProfile.jsx
 * Security-safe blurred profile card for locked candidates.
 *
 * IMPORTANT: This component NEVER receives full candidate data.
 * It only accepts `lockedCandidatePreview` — the partial/masked data
 * returned by the locked API response. Full data is never in the DOM.
 */

import { Lock, MapPin, Star, Briefcase, ChevronRight } from 'lucide-react';

export default function BlurredLockedProfile({ lockedCandidatePreview, onUnlock, isLoading }) {
  if (!lockedCandidatePreview) return null;

  const {
    name,           // Already masked: "R**** S****"
    skills = [],
    city,
    state,
    experienceYears,
    tier,
    rating,
    totalReviews,
    pricingRange,
    summaryPreview,
    isVerified,
  } = lockedCandidatePreview;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden relative">
      {/* Lock overlay badge */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-gray-900/80 backdrop-blur-sm rounded-full px-3 py-1">
        <Lock className="w-3.5 h-3.5 text-yellow-400" />
        <span className="text-xs text-white font-medium">Locked</span>
      </div>

      {/* Header / Photo placeholder (blurred visual dummy) */}
      <div className="relative h-24 bg-gradient-to-br from-indigo-50 to-purple-50">
        {/* Blurred dummy photo — no real data */}
        <div
          className="absolute -bottom-8 left-6 w-16 h-16 rounded-2xl border-4 border-white bg-gradient-to-br from-indigo-200 to-purple-300"
          style={{ filter: 'blur(8px)', pointerEvents: 'none', userSelect: 'none' }}
          aria-hidden="true"
        />
      </div>

      <div className="pt-12 px-6 pb-6">
        {/* Name (already masked by server) */}
        <div className="mb-3">
          <h3 className="text-lg font-bold text-gray-900 tracking-wide">{name}</h3>
          {tier && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1
              ${tier === 'skilled' ? 'bg-green-100 text-green-700' : tier === 'semi-skilled' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
              {tier.replace('-', ' ')}
            </span>
          )}
        </div>

        {/* Location + Experience */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
          {(city || state) && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              {[city, state].filter(Boolean).join(', ')}
            </span>
          )}
          {experienceYears && (
            <span className="flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-gray-400" />
              {experienceYears}
            </span>
          )}
          {rating > 0 && (
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
              {rating.toFixed(1)} ({totalReviews})
            </span>
          )}
        </div>

        {/* Skills */}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {skills.slice(0, 4).map((skill, i) => (
              <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium">
                {skill}
              </span>
            ))}
            {skills.length > 4 && (
              <span className="px-2.5 py-1 bg-gray-50 text-gray-400 rounded-lg text-xs">+{skills.length - 4} more</span>
            )}
          </div>
        )}

        {/* Summary preview */}
        {summaryPreview && (
          <p className="text-sm text-gray-500 mb-4 line-clamp-2">{summaryPreview}</p>
        )}

        {/* Pricing range (safe to show) */}
        {pricingRange && (
          <div className="bg-gray-50 rounded-lg px-3 py-2 mb-4">
            <span className="text-xs text-gray-400 block">Pricing range</span>
            <span className="text-sm font-semibold text-gray-700">{pricingRange}</span>
          </div>
        )}

        {/* Locked contact section — blurred dummy, no real data */}
        <div className="relative mb-4 pointer-events-none select-none" aria-hidden="true">
          <div
            className="bg-gray-50 rounded-xl p-3 space-y-2"
            style={{ filter: 'blur(5px)' }}
          >
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-300 rounded" />
              <div className="h-3 bg-gray-300 rounded w-36" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-300 rounded" />
              <div className="h-3 bg-gray-300 rounded w-48" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-300 rounded" />
              <div className="h-3 bg-gray-300 rounded w-32" />
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Lock className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        {/* Unlock CTA */}
        <button
          onClick={onUnlock}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
        >
          <Lock className="w-4 h-4" />
          Unlock Full Profile
          <ChevronRight className="w-4 h-4 ml-auto" />
        </button>
      </div>
    </div>
  );
}
