import useTranslation from "../../hooks/useTranslation";
import { useState } from 'react';
import { providerAPI } from '../../services/api';

export default function PricingSuggestionCard({ skill, city }) {
  const {
    t
  } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFetch = async () => {
    if (!skill || !city) {
      setError('Pricing suggestion ke liye skill aur city dono required hain.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { data } = await providerAPI.getPricingSuggestion({ skill, city });
      setResult(data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Pricing suggestion fetch failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-emerald-800">{t("AI Pricing Suggestion")}</p>
        <button
          type="button"
          onClick={handleFetch}
          disabled={loading}
          className="text-xs px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {loading ? 'Loading…' : 'Get Suggestion'}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {result && (
        <div className="text-xs text-emerald-900 space-y-1">
          <p>{t("Recommended Range:")}<span className="font-semibold">₹{result.min} - ₹{result.max}</span>
          </p>
          <p>{t("Avg:")}<span className="font-semibold">₹{result.avg}</span>
          </p>
          <p className="text-emerald-700">{result.reasoning}</p>
          <p className="text-[11px] text-emerald-600">{t("Confidence:")}{Math.round(Number(result.confidence || 0) * 100)}% · {result.aiStatus}
          </p>
        </div>
      )}
    </div>
  );
}
