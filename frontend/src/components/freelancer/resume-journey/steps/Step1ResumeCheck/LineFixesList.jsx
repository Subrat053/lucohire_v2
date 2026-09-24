import React, { useState } from 'react';
import { FIXES } from '../../data/resumeStep1Data';
import { toast } from 'react-hot-toast';

export default function LineFixesList() {
  const [openIndex, setOpenIndex] = useState(0);

  const copyToClipboard = (text, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    toast.success('Improved bullet copied to clipboard!');
  };

  const getTagColor = (tag) => {
    switch (tag) {
      case 'Rewrite': return 'bg-[#F0EDFC] text-[#5B21D6] border-[#D8D2FA]';
      case 'Remove': return 'bg-[#FBEAE8] text-[#B3492F] border-[#FBEAE8]';
      case 'Add': return 'bg-[#E5F6EE] text-[#0E8F5F] border-[#E5F6EE]';
      case 'Reorder': return 'bg-[#FBF1DF] text-[#B9791A] border-[#FBF1DF]';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div id="secLineFixes" className="bg-white border border-[#E6E3F7] rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B21D6] bg-[#F0EDFC] px-2.5 py-0.5 rounded-full">
            Actionable Rewrites
          </span>
          <h3 className="text-[18px] sm:text-[20px] font-bold text-[#141A33] mt-1 m-0" style={{ fontFamily: 'Fraunces, serif' }}>
            Yeh mat likho, yeh likho
          </h3>
        </div>
        <span className="text-[12px] text-[#767B8A] hidden sm:inline-block">
          5 high-impact line improvements
        </span>
      </div>

      <p className="text-[12.5px] text-[#767B8A] m-0">
        Recruiters and ATS parsers scan for measurable outcomes and action verbs rather than passive duties.
      </p>

      <div className="space-y-3 pt-1">
        {FIXES.map((fix, idx) => {
          const isOpen = openIndex === idx;

          return (
            <div
              key={idx}
              className={`border rounded-xl transition-all overflow-hidden ${
                isOpen ? 'border-[#5B21D6] bg-[#FAF9FE] shadow-xs' : 'border-[#E6E3F7] bg-white hover:border-[#D8D2FA]'
              }`}
            >
              {/* Row Header */}
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? -1 : idx)}
                className="w-full p-3.5 sm:p-4 text-left flex items-start justify-between gap-3 cursor-pointer"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getTagColor(fix.tag)}`}>
                      {fix.tag}
                    </span>
                    <span className="text-[12px] font-semibold text-[#141A33] truncate">
                      Line Fix #{idx + 1}
                    </span>
                  </div>
                  <div className="text-[12.5px] text-[#767B8A] line-clamp-1 italic">
                    "{fix.before}"
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-1">
                  <span className="text-xs font-bold text-[#5B21D6]">
                    {isOpen ? '▲' : '▼'}
                  </span>
                </div>
              </button>

              {/* Expanded Comparison */}
              {isOpen && (
                <div className="px-3.5 pb-4 sm:px-4 sm:pb-5 pt-1 space-y-3 border-t border-[#E6E3F7]/60">
                  {/* Before Box */}
                  <div className="p-3 rounded-lg bg-[#FBEAE8]/40 border border-[#FBEAE8] space-y-1">
                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#B3492F] flex items-center gap-1">
                      <span>✕ Yeh mat likho (Current / Passive)</span>
                    </div>
                    <div className="text-[12.5px] text-[#181B24] leading-relaxed">
                      "{fix.before}"
                    </div>
                  </div>

                  {/* After Box */}
                  <div className="p-3 rounded-lg bg-[#E5F6EE]/50 border border-[#E5F6EE] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#0E8F5F] flex items-center gap-1">
                        <span>✓ Yeh likho (High-Impact / Quantified)</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => copyToClipboard(fix.after, e)}
                        className="text-[11px] font-semibold text-[#0E8F5F] hover:text-[#0a6c47] bg-white border border-[#0E8F5F]/30 px-2.5 py-1 rounded-md hover:shadow-xs transition-all cursor-pointer flex items-center gap-1"
                      >
                        📋 Copy Line
                      </button>
                    </div>
                    <div className="text-[12.5px] text-[#141A33] font-medium leading-relaxed">
                      "{fix.after}"
                    </div>
                  </div>

                  {/* Why it works */}
                  <div className="text-[11.5px] text-[#767B8A] bg-white p-2.5 rounded-lg border border-[#ECEAF9] flex items-start gap-2">
                    <span className="text-[#5B21D6] font-bold shrink-0">💡 Why:</span>
                    <span>{fix.why}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
