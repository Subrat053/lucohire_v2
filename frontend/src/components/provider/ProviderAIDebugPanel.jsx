import useTranslation from "../../hooks/useTranslation";
export default function ProviderAIDebugPanel({ debugState }) {
  const {
    t
  } = useTranslation();

  if (!debugState) return null;

  return (
    <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
      <p className="font-semibold">{t("AI Debug")}</p>
      <p>{t("Status:")}{debugState.lastApiStatus || '-'}</p>
      <p>{t("Intent:")}{debugState.lastIntent || '-'}</p>
      <p>{t("Skill:")}{debugState.lastSkill || '-'}</p>
      <p>{t("City:")}{debugState.lastCity || '-'}</p>
      <p>{t("LLM Used:")}{debugState.usedLLM ? 'Yes' : 'No'}</p>
      {debugState.fallbackReason ? <p>{t("Fallback:")}{debugState.fallbackReason}</p> : null}
    </div>
  );
}
