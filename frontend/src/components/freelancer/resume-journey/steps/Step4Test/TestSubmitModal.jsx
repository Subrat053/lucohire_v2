import React from 'react';

export default function TestSubmitModal({
  answeredCount,
  totalCount,
  flaggedCount,
  onConfirm,
  onCancel,
}) {
  const unansweredCount = totalCount - answeredCount;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#E6E3F7] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div>
          <h3 className="text-[18px] font-bold text-[#141A33] m-0" style={{ fontFamily: 'Fraunces, serif' }}>
            Ready to Submit Your Assessment?
          </h3>
          <p className="text-[12.5px] text-[#767B8A] mt-1 m-0">
            Once submitted, your responses will be evaluated to calculate your dynamic Job-Ready score.
          </p>
        </div>

        {/* Summary Chips */}
        <div className="grid grid-cols-3 gap-2.5 p-3.5 bg-[#FAF9FE] border border-[#ECEAF9] rounded-xl text-center">
          <div>
            <div className="text-[16px] font-bold text-[#0E8F5F]">{answeredCount}</div>
            <div className="text-[10.5px] text-[#767B8A]">Answered</div>
          </div>
          <div>
            <div className={`text-[16px] font-bold ${unansweredCount > 0 ? 'text-[#B3492F]' : 'text-[#767B8A]'}`}>
              {unansweredCount}
            </div>
            <div className="text-[10.5px] text-[#767B8A]">Unanswered</div>
          </div>
          <div>
            <div className="text-[16px] font-bold text-[#B9791A]">{flaggedCount}</div>
            <div className="text-[10.5px] text-[#767B8A]">Flagged</div>
          </div>
        </div>

        {unansweredCount > 0 && (
          <div className="text-[11.5px] text-[#B3492F] bg-[#FBEAE8] p-2.5 rounded-lg border border-[#FBEAE8]">
            ⚠️ You have {unansweredCount} unanswered {unansweredCount === 1 ? 'question' : 'questions'}. You can still go back and answer them before time runs out.
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-[#D8D2FA] text-[12.5px] font-semibold text-[#5B21D6] hover:bg-[#F0EDFC] transition-colors cursor-pointer"
          >
            Review Questions
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-[#5B21D6] hover:bg-[#4A3AE0] text-white font-semibold text-[12.5px] shadow-xs transition-colors cursor-pointer"
          >
            Yes, Submit Now
          </button>
        </div>
      </div>
    </div>
  );
}
