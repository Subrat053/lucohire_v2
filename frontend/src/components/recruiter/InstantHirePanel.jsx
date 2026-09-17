import useTranslation from "../../hooks/useTranslation";
import { useState } from 'react';
import { searchAPI } from '../../services/api';

export default function InstantHirePanel({ onResults }) {
  const {
    t
  } = useTranslation();

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInstantHire = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const { data } = await searchAPI.autoMatchPreview({ query, instantHire: true });
      if (typeof onResults === 'function') {
        onResults(data.topProviders || []);
      }
    } catch (_) {
      if (typeof onResults === 'function') {
        onResults([]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
      <p className="text-sm font-semibold text-indigo-800 mb-1">{t("Instant Hire Mode")}</p>
      <p className="text-xs text-indigo-700 mb-2">{t("Nearby + available providers with progressive radius expansion.")}</p>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Mujhe abhi driver chahiye")}
          className="flex-1 rounded-lg border border-indigo-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <button
          type="button"
          onClick={handleInstantHire}
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? 'Searching…' : 'Find Now'}
        </button>
      </div>
    </div>
  );
}
