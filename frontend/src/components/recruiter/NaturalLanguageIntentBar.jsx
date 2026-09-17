import useTranslation from "../../hooks/useTranslation";
import { useState } from 'react';
import { searchAPI } from '../../services/api';

function Chip({ label }) {
  const {
    t
  } = useTranslation();

  return <span className="text-xs px-2 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700">{label}</span>;
}

export default function NaturalLanguageIntentBar({ query, onChange, onApplyIntent }) {
  const {
    t
  } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [intent, setIntent] = useState(null);

  const parseIntent = async () => {
    if (!String(query || '').trim()) return;
    setLoading(true);
    try {
      const { data } = await searchAPI.parseIntentAI({ query });
      setIntent(data.parsed || null);
      if (typeof onApplyIntent === 'function') {
        onApplyIntent(data.parsed || null);
      }
    } catch (_) {
      setIntent(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
      <p className="text-xs font-semibold text-blue-800 mb-1">{t("Natural Language Search")}</p>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("Part time cook evening me, Noida sector 137")}
          className="flex-1 rounded-lg border border-blue-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
        />
        <button
          type="button"
          onClick={parseIntent}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? 'Parsing…' : 'Parse'}
        </button>
      </div>
      {intent && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {intent.extractedSkill && <Chip label={`Skill: ${intent.extractedSkill}`} />}
          {intent.extractedCity && <Chip label={`City: ${intent.extractedCity}`} />}
          {intent.extractedUrgency && <Chip label={`Urgency: ${intent.extractedUrgency}`} />}
          {(intent.extractedBudgetMin || intent.extractedBudgetMax) && (
            <Chip label={`Budget: ${intent.extractedBudgetMin || 0}-${intent.extractedBudgetMax || 0}`} />
          )}
          {intent.extractedTimeOfDay && <Chip label={`Time: ${intent.extractedTimeOfDay}`} />}
        </div>
      )}
    </div>
  );
}
