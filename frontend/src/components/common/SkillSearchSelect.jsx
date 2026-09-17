import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, X, Sparkles } from 'lucide-react';
import { categoriesAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function SkillSearchSelect({
  selected = [],
  onAdd,
  onRemove,
  maxAllowed = 1,
  plan = 'free',
  tier = '',
  onTriggerUpgrade,
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    async function loadSkills() {
      setLoading(true);
      try {
        const { data } = await categoriesAPI.getCategories();
        setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch skill categories:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSkills();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Extract all sub-skills flat list from all active categories
  const allSkills = categories
    .filter(cat => cat.isActive !== false)
    .filter(cat => {
      if (query.trim() !== '') return true;
      if (!tier) return true;
      return String(cat.tier || '').toLowerCase() === String(tier || '').toLowerCase();
    })
    .flatMap(cat => 
      (cat.skills || [])
        .filter(s => s.isActive !== false)
        .map(s => ({
          name: s.name,
          category: cat.name,
          tier: cat.tier
        }))
    );

  const filteredSkills = allSkills.filter(
    skill =>
      !selected.includes(skill.name) &&
      skill.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleAdd = (skillName, skillTier) => {
    if (selected.includes(skillName)) return;

    if (selected.length >= maxAllowed) {
      if (String(plan).toLowerCase() === 'free' && onTriggerUpgrade) {
        onTriggerUpgrade();
      } else {
        toast.error(`Your plan allows a maximum of ${maxAllowed} role${maxAllowed > 1 ? 's' : ''}. Upgrade to add more.`);
      }
      return;
    }

    onAdd(skillName, skillTier);
    setQuery('');
  };

  return (
    <div ref={dropdownRef} className="relative w-full font-sans">
      {/* Selected Chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selected.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1.5 bg-violet-50 border border-violet-100 text-violet-700 text-xs font-bold px-3 py-1.5 rounded-full shadow-xs"
            >
              <span>{skill}</span>
              <button
                type="button"
                onClick={() => onRemove(skill)}
                className="text-violet-400 hover:text-red-700 transition leading-none font-bold ml-1"
                aria-label={`Remove skill ${skill}`}
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
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
        aria-label="Toggle specialities dropdown"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls="specialities-dropdown-menu"
      >
        <span className={selected.length === 0 ? 'text-slate-400 font-normal' : ''}>
          {selected.length === 0
            ? 'Select specialities / skills...'
            : `${selected.length} specialit${selected.length > 1 ? 'ies' : 'y'} selected`}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div id="specialities-dropdown-menu" className="absolute z-40 mt-2 w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-fade-in">
          {/* Search Input */}
          <div className="p-3 border-b border-slate-100 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search or type speciality..."
              className="w-full text-sm outline-none bg-transparent text-slate-700 placeholder-slate-400"
              autoFocus
            />
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
            {loading ? (
              <div className="px-4 py-3 text-xs text-slate-400 italic">Loading specialities...</div>
            ) : filteredSkills.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-400 italic">
                {query.trim() ? `No matches for "${query}"` : 'All roles selected'}
              </div>
            ) : (
              // Grouped by Category
              Object.entries(
                filteredSkills.reduce((acc, skill) => {
                  if (!acc[skill.category]) acc[skill.category] = [];
                  acc[skill.category].push(skill);
                  return acc;
                }, {})
              ).map(([categoryName, group]) => (
                <div key={categoryName} className="py-1">
                  <div className="px-4 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/50">
                    {categoryName}
                  </div>
                  {group.map((skill) => (
                    <button
                      key={skill.name}
                      type="button"
                      onClick={() => handleAdd(skill.name, skill.tier)}
                      className="w-full text-left px-5 py-2.5 text-xs text-slate-700 font-semibold hover:bg-violet-50/40 hover:text-violet-700 transition flex items-center justify-between"
                    >
                      <span>{skill.name}</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100">
                        {skill.tier}
                      </span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Custom Tag Insertion if not found */}
          {query.trim() && !allSkills.some(s => s.name.toLowerCase() === query.trim().toLowerCase()) && (
            <button
              type="button"
              onClick={() => handleAdd(query.trim())}
              className="w-full text-left px-5 py-3 text-xs text-violet-600 font-extrabold hover:bg-violet-50 transition border-t border-slate-100 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              Add custom speciality &ldquo;{query.trim()}&rdquo;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
