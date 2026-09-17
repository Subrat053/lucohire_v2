import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { ALL_LANGUAGES } from '../../pages/provider/Profile';

export default function LanguageSearchSelect({
  selected = [],
  onChange,
  placeholder = 'Select languages...',
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const toggleLanguage = (lang) => {
    const nextSelected = selected.includes(lang)
      ? selected.filter((l) => l !== lang)
      : [...selected, lang];
    onChange(nextSelected);
  };

  const filteredLanguages = ALL_LANGUAGES.filter(
    (lang) =>
      lang.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div ref={dropdownRef} className="relative w-full font-sans">
      {/* Selected Chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selected.map((lang) => (
            <span
              key={lang}
              className="inline-flex items-center gap-1.5 bg-violet-50 border border-violet-100 text-violet-700 text-xs font-bold px-3 py-1.5 rounded-full shadow-xs"
            >
              <span>{lang}</span>
              <button
                type="button"
                onClick={() => toggleLanguage(lang)}
                className="text-violet-400 hover:text-red-700 transition leading-none font-bold ml-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown Toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm rounded-xl border border-slate-200 focus:border-violet-500 outline-none focus:ring-4 focus:ring-violet-100 bg-slate-50/50 shadow-inner transition text-left text-slate-700 font-semibold"
      >
        <span className={selected.length === 0 ? 'text-slate-400 font-normal' : ''}>
          {selected.length === 0
            ? placeholder
            : `${selected.length} language${selected.length > 1 ? 's' : ''} selected`}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-40 mt-2 w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-fade-in">
          {/* Search Input */}
          <div className="p-3 border-b border-slate-100 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search or type language..."
              className="w-full text-sm outline-none bg-transparent text-slate-700 placeholder-slate-400"
              autoFocus
            />
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
            {filteredLanguages.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-400 italic">
                No matches for "{query}"
              </div>
            ) : (
              filteredLanguages.map((lang) => {
                const isChecked = selected.includes(lang);
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleLanguage(lang)}
                    className={`w-full text-left px-5 py-2.5 text-xs font-semibold transition flex items-center justify-between ${
                      isChecked
                        ? 'bg-violet-50/60 text-violet-700 font-extrabold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{lang}</span>
                    {isChecked && <Check className="w-3.5 h-3.5 text-violet-600 stroke-[3]" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
