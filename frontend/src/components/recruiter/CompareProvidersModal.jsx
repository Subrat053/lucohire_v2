import useTranslation from "../../hooks/useTranslation";
export default function CompareProvidersModal({ open, providers = [], onClose }) {
  const {
    t
  } = useTranslation();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white border border-gray-200 shadow-xl">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">{t("Compare Providers")}</h3>
          <button type="button" onClick={onClose} className="text-sm text-gray-500 hover:text-gray-900">{t("Close")}</button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-700">
                <th className="px-4 py-2">{t("Provider")}</th>
                <th className="px-4 py-2">{t("Match")}</th>
                <th className="px-4 py-2">{t("Trust")}</th>
                <th className="px-4 py-2">{t("Rating")}</th>
                <th className="px-4 py-2">{t("Distance")}</th>
                <th className="px-4 py-2">{t("AI Reason")}</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => (
                <tr key={p._id || p.user?._id} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-medium text-gray-800">{p.user?.name || p.name || 'Provider'}</td>
                  <td className="px-4 py-2">{Number(p.matchScore || 0).toFixed(1)}</td>
                  <td className="px-4 py-2">{Number(p.trustScore || 0).toFixed(1)}</td>
                  <td className="px-4 py-2">{Number(p.rating || 0).toFixed(1)}</td>
                  <td className="px-4 py-2">{Number.isFinite(Number(p.distanceKm)) ? `${Number(p.distanceKm).toFixed(1)} km` : 'N/A'}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">{Array.isArray(p.reasons) ? p.reasons.slice(0, 2).join(', ') : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
