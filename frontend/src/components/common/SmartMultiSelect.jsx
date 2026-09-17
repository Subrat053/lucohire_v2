/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, X, Plus } from 'lucide-react';

const LANGUAGE_OPTIONS = [
  { label: 'English', value: 'english', popular: true },
  { label: 'Hindi', value: 'hindi', popular: true },
  { label: 'Bengali', value: 'bengali', aliases: ['Bangla'], popular: true },
  { label: 'Telugu', value: 'telugu', popular: true },
  { label: 'Marathi', value: 'marathi', popular: true },
  { label: 'Tamil', value: 'tamil', popular: true },
  { label: 'Urdu', value: 'urdu', popular: true },
  { label: 'Gujarati', value: 'gujarati', popular: true },
  { label: 'Kannada', value: 'kannada', popular: true },
  { label: 'Malayalam', value: 'malayalam', popular: true },
  { label: 'Odia', value: 'odia', aliases: ['Oriya'], popular: true },
  { label: 'Punjabi', value: 'punjabi', popular: true },
  { label: 'Assamese', value: 'assamese' },
  { label: 'Sanskrit', value: 'sanskrit' },
  { label: 'Arabic', value: 'arabic', popular: true },
  { label: 'Spanish', value: 'spanish', popular: true },
  { label: 'French', value: 'french', popular: true },
  { label: 'German', value: 'german', popular: true },
  { label: 'Portuguese', value: 'portuguese', popular: true },
  { label: 'Russian', value: 'russian' },
  { label: 'Chinese (Mandarin)', value: 'chinese_mandarin', aliases: ['Mandarin', 'Chinese Mandarin'], popular: true },
  { label: 'Cantonese', value: 'cantonese' },
  { label: 'Japanese', value: 'japanese', popular: true },
  { label: 'Korean', value: 'korean', popular: true },
  { label: 'Italian', value: 'italian', popular: true },
  { label: 'Dutch', value: 'dutch' },
  { label: 'Turkish', value: 'turkish' },
  { label: 'Persian', value: 'persian', aliases: ['Farsi'] },
  { label: 'Indonesian', value: 'indonesian' },
  { label: 'Malay', value: 'malay' },
  { label: 'Thai', value: 'thai' },
  { label: 'Vietnamese', value: 'vietnamese' },
  { label: 'Filipino', value: 'filipino', aliases: ['Tagalog'] },
  { label: 'Swahili', value: 'swahili' },
  { label: 'Hebrew', value: 'hebrew' },
  { label: 'Greek', value: 'greek' },
  { label: 'Polish', value: 'polish' },
  { label: 'Ukrainian', value: 'ukrainian' },
  { label: 'Romanian', value: 'romanian' },
  { label: 'Nepali', value: 'nepali' },
  { label: 'Sinhala', value: 'sinhala' },
  { label: 'Burmese', value: 'burmese' },
  { label: 'Tibetan', value: 'tibetan' },
  { label: 'Pashto', value: 'pashto' },
  { label: 'Kurdish', value: 'kurdish' },
  { label: 'Somali', value: 'somali' },
  { label: 'Hausa', value: 'hausa' },
  { label: 'Yoruba', value: 'yoruba' },
  { label: 'Zulu', value: 'zulu' },
  { label: 'Afrikaans', value: 'afrikaans' },
  { label: 'Amharic', value: 'amharic' },
  { label: 'Armenian', value: 'armenian' },
  { label: 'Azerbaijani', value: 'azerbaijani' },
  { label: 'Bosnian', value: 'bosnian' },
  { label: 'Bulgarian', value: 'bulgarian' },
  { label: 'Catalan', value: 'catalan' },
  { label: 'Czech', value: 'czech' },
  { label: 'Danish', value: 'danish' },
  { label: 'Finnish', value: 'finnish' },
  { label: 'Georgian', value: 'georgian' },
  { label: 'Hungarian', value: 'hungarian' },
  { label: 'Icelandic', value: 'icelandic' },
  { label: 'Irish', value: 'irish' },
  { label: 'Javanese', value: 'javanese' },
  { label: 'Kazakh', value: 'kazakh' },
  { label: 'Khmer', value: 'khmer' },
  { label: 'Lao', value: 'lao' },
  { label: 'Latin', value: 'latin' },
  { label: 'Latvian', value: 'latvian' },
  { label: 'Lithuanian', value: 'lithuanian' },
  { label: 'Macedonian', value: 'macedonian' },
  { label: 'Maithili', value: 'maithili' },
  { label: 'Mongolian', value: 'mongolian' },
  { label: 'Norwegian', value: 'norwegian' },
  { label: 'Serbian', value: 'serbian' },
  { label: 'Sindhi', value: 'sindhi' },
  { label: 'Slovak', value: 'slovak' },
  { label: 'Slovenian', value: 'slovenian' },
  { label: 'Swedish', value: 'swedish' },
  { label: 'Tajik', value: 'tajik' },
  { label: 'Uzbek', value: 'uzbek' },
  { label: 'Welsh', value: 'welsh' },
];

const normalizeText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

const getIndexes = (option) => {
  const aliases = Array.isArray(option.aliases) ? option.aliases : [];
  return [option.label, option.value, ...aliases].map(normalizeText).filter(Boolean);
};

const resolveOption = (value) => {
  const needle = normalizeText(value);
  if (!needle) return null;
  return LANGUAGE_OPTIONS.find((option) => getIndexes(option).includes(needle)) || null;
};

const normalizeLanguageSelection = (values = []) => {
  const seen = new Set();
  const result = [];

  for (const rawValue of values) {
    const text = String(rawValue || '').trim();
    if (!text) continue;
    const option = resolveOption(text);
    const label = option?.label || text;
    const key = normalizeText(option?.value || label);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(label);
  }

  return result;
};

export default function SmartMultiSelect({
  options = LANGUAGE_OPTIONS,
  selectedValues = [],
  onChange,
  allowCustom = true,
  placeholder = 'Search or type language',
  maxItems,
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const normalizedSelected = useMemo(() => normalizeLanguageSelection(selectedValues), [selectedValues]);
  const selectedKeys = useMemo(() => new Set(normalizedSelected.map(normalizeText)), [normalizedSelected]);

  const optionPool = useMemo(() => {
    const list = Array.isArray(options) && options.length > 0 ? options : LANGUAGE_OPTIONS;
    return list.map((option) => ({
      ...option,
      label: option.label || String(option.value || '').trim(),
      value: option.value || normalizeText(option.label),
      aliases: Array.isArray(option.aliases) ? option.aliases : [],
      popular: Boolean(option.popular),
    }));
  }, [options]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    const matches = optionPool
      .filter((option) => !selectedKeys.has(normalizeText(option.value)))
      .filter((option) => {
        if (!normalizedQuery) return true;
        return getIndexes(option).some((candidate) => candidate.includes(normalizedQuery));
      })
      .sort((a, b) => {
        if (!query.trim()) {
          return Number(b.popular) - Number(a.popular) || a.label.localeCompare(b.label);
        }
        const aExact = getIndexes(a).some((candidate) => candidate === normalizedQuery);
        const bExact = getIndexes(b).some((candidate) => candidate === normalizedQuery);
        if (aExact !== bExact) return Number(bExact) - Number(aExact);
        return a.label.localeCompare(b.label);
      });
    return matches;
  }, [optionPool, query, selectedKeys]);

  const addValue = (rawValue) => {
    const text = String(rawValue || '').trim();
    if (!text) return;
    const option = resolveOption(text);
    const label = option?.label || text;
    const key = normalizeText(option?.value || label);
    if (selectedKeys.has(key)) return;

    onChange?.([...normalizedSelected, label]);
    setQuery('');
    setOpen(false);
  };

  const addTypedValue = () => {
    const typed = String(query || '').trim();
    if (!typed) return;
    const option = resolveOption(typed);
    if (option) {
      addValue(option.label);
      return;
    }
    if (!allowCustom) return;
    addValue(typed);
  };

  const atLimit = Number.isFinite(Number(maxItems)) && normalizedSelected.length >= Number(maxItems);

  return (
    <div ref={rootRef} className={`relative w-full ${open ? 'z-50' : 'z-0'}`}>
      <div className="flex flex-wrap gap-2 mb-3">
        {normalizedSelected.map((value) => (
          <span
            key={normalizeText(value)}
            className="inline-flex items-center gap-1.5 bg-violet-50 border border-violet-100 text-violet-700 text-xs font-bold px-3 py-1.5 rounded-full shadow-xs"
          >
            <span>{value}</span>
            <button
              type="button"
              onClick={() => onChange?.(normalizedSelected.filter((item) => normalizeText(item) !== normalizeText(value)))}
              className="text-violet-400 hover:text-red-700 transition leading-none font-bold ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        ))}
      </div>

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTypedValue();
            }
          }}
          placeholder={placeholder}
          disabled={atLimit}
          className="w-full px-4 py-3 pr-10 text-sm rounded-xl border border-slate-200 focus:border-violet-500 outline-none focus:ring-4 focus:ring-violet-100 bg-white shadow-inner transition text-left text-slate-700 font-semibold disabled:bg-slate-50 disabled:text-slate-400"
        />
        <button
          type="button"
          onClick={() => setOpen((next) => !next)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && !atLimit && (
        <div className="absolute z-[100] mt-2 w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-fade-in">
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
            {!query.trim() && (
              <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/70">
                Popular languages
              </div>
            )}

            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-400 italic">
                No matches for &ldquo;{query.trim()}&rdquo;
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isChecked = selectedKeys.has(normalizeText(option.value));
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => addValue(option.label)}
                    className={`w-full text-left px-5 py-2.5 text-sm transition flex items-center justify-between ${isChecked ? 'bg-violet-50/60 text-violet-700 font-extrabold' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    <span>{option.label}</span>
                    {isChecked && <Check className="w-3.5 h-3.5 text-violet-600 stroke-3" />}
                  </button>
                );
              })
            )}

            {allowCustom && query.trim() && !filteredOptions.some((option) => normalizeText(option.label) === normalizeText(query)) && (
              <button
                type="button"
                onClick={addTypedValue}
                className="w-full text-left px-5 py-2.5 text-sm transition flex items-center gap-2 text-violet-700 hover:bg-violet-50 font-semibold"
              >
                <Plus className="w-4 h-4" />
                Add &ldquo;{query.trim()}&rdquo;
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
