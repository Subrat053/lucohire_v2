import useTranslation from "../../hooks/useTranslation";
export default function AIProfileAssistant({
  aiInput,
  onAiInputChange,
  onGenerate,
  aiLoading,
  aiMeta,
}) {
  const {
    t
  } = useTranslation();

  return (
    <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
      <p className="text-sm font-semibold text-blue-800 mb-1">{t("AI Profile Assistant")}</p>
      <p className="text-xs text-blue-700 mb-2">{t(
        "Write in your own words, for example: Main electrician hu, 5 saal ka experience."
      )}</p>
      <div className="flex flex-col gap-2">
        <textarea
          value={aiInput}
          onChange={(e) => onAiInputChange(e.target.value)}
          rows={2}
          placeholder={t("Describe your work, experience, and specialties")}
          className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-300 resize-none"
        />
        <button
          type="button"
          onClick={onGenerate}
          disabled={aiLoading}
          className="self-start px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60"
        >
          {aiLoading ? 'Generating...' : 'Generate AI Suggestions'}
        </button>
      </div>
      {aiMeta?.headline ? (
        <div className="mt-2 text-xs text-blue-800 space-y-1">
          <p><span className="font-semibold">{t("Suggested headline:")}</span> {aiMeta.headline}</p>
          {aiMeta.category ? <p><span className="font-semibold">{t("Category:")}</span> {aiMeta.category}</p> : null}
          {aiMeta.detectedLocation ? <p><span className="font-semibold">{t("Detected city:")}</span> {aiMeta.detectedLocation}</p> : null}
          {aiMeta.experienceLabel ? <p><span className="font-semibold">{t("Experience:")}</span> {aiMeta.experienceLabel}</p> : null}
          {Array.isArray(aiMeta.skills) && aiMeta.skills.length > 0 ? (
            <p><span className="font-semibold">{t("Parsed skills:")}</span> {aiMeta.skills.join(', ')}</p>
          ) : null}
          {aiMeta.suggestedPricingRange ? (
            <p><span className="font-semibold">{t("Pricing note:")}</span> {aiMeta.suggestedPricingRange}</p>
          ) : null}
          {Array.isArray(aiMeta.missingFields) && aiMeta.missingFields.length > 0 ? (
            <p><span className="font-semibold">{t("Missing fields:")}</span> {aiMeta.missingFields.join(', ')}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
