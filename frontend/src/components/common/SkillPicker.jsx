/**
 * SkillPicker ??" reusable skill selector for provider/recruiter profiles
 *
 * Props:
 *   selectedSkills  : string[]         ??" current list
 *   onChange        : (string[]) => void
 *   maxSkills?      : number            ??" 0 = unlimited
 *   placeholder?    : string
 */
import { useState, useEffect, useRef } from 'react';
import { HiX, HiSearch, HiPlus, HiChevronDown } from 'react-icons/hi';
import { categoriesAPI } from '../../services/api';
import { SKILL_CATEGORIES } from '../../data/skillsData';

const TIER_LABELS = {
  unskilled: { label: 'Unskilled', color: 'bg-amber-100 text-amber-700' },
  'semi-skilled': { label: 'Semi-Skilled', color: 'bg-blue-100 text-blue-700' },
  skilled: { label: 'Skilled', color: 'bg-green-100 text-green-700' },
};

const SkillPicker = ({
  selectedSkills = [],
  onChange,
  maxSkills = 0,
  placeholder = 'Search or select a skill...',
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState([]);
  const [otherMode, setOtherMode] = useState(false);
  const [customSkill, setCustomSkill] = useState('');
  const containerRef = useRef(null);

  // Fetch from 'backend'; fall back to static data
  useEffect(() => {
    categoriesAPI.getCategories({ isActive: true })
      .then(({ data }) => {
        if (Array.isArray(data) && data.length > 0) setCategories(data);
        else setCategories(SKILL_CATEGORIES);
      })
      .catch(() => setCategories(SKILL_CATEGORIES));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setOtherMode(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Flat list of all skill names from 'all' categories
  const allSkills = categories.flatMap((cat) =>
    (cat.skills || []).filter((s) => s.isActive !== false).map((s) => ({
      name: s.name,
      categoryName: cat.name,
      tier: cat.tier,
    }))
  );

  const filtered = search.trim()
    ? allSkills.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    : null;

  const addSkill = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (selectedSkills.includes(trimmed)) return;
    if (maxSkills > 0 && selectedSkills.length >= maxSkills) return;
    onChange([...selectedSkills, trimmed]);
    setSearch('');
    setOtherMode(false);
    setCustomSkill('');
  };

  const removeSkill = (name) => onChange(selectedSkills.filter((s) => s !== name));

  const atMax = maxSkills > 0 && selectedSkills.length >= maxSkills;

  return (
    <div ref={containerRef} className="relative w-full h-full ">
      {/* Selected chips */}
      {selectedSkills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedSkills.map((skill) => (
            <span key={skill}
              className="inline-flex items-center gap-1 px-3 py-1 bg-stone-100 text-stone-800 rounded-full text-sm font-medium border border-stone-200">
              {skill}
              <button
                type="button"
                onClick={() => removeSkill(skill)}
                className="text-stone-400 hover:text-red-700 transition ml-0.5"
                aria-label={`Remove skill ${skill}`}
              >
                <HiX className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Trigger */}
      <button
        type="button"
        disabled={atMax}
        onClick={() => { setOpen((v) => !v); setSearch(''); setOtherMode(false); }}
        className={`w-full flex items-center justify-between px-4 py-2.5 border rounded-xl text-sm transition
          ${atMax
            ? 'bg-stone-50 border-stone-100 text-stone-400 cursor-not-allowed'
            : 'bg-white border-stone-200 text-stone-600 hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400'
          }`}
        aria-label="Toggle skill picker dropdown"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls="skill-picker-dropdown"
      >
        <span className={selectedSkills.length === 0 ? 'text-stone-400' : ''}>
          {atMax ? `Max ${maxSkills} skills reached` : placeholder}
        </span>
        <HiChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {/* Dropdown panel */}
      {open && !atMax && (
        <div id="skill-picker-dropdown" className="relative z-50 mt-1 w-full bg-white border border-stone-200 rounded-2xl shadow-xl overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-stone-100">
            <div className="relative">
              <HiSearch className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (search.trim()) {
                      // If exact match exists in filtered, pick first; else treat as custom
                      const match = filtered?.find((s) => s.name.toLowerCase() === search.trim().toLowerCase());
                      addSkill(match ? match.name : search.trim());
                    }
                  }
                  if (e.key === 'Escape') { setOpen(false); setSearch(''); }
                }}
                placeholder="Type to search skills..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none"
              />
            </div>
          </div>

          <div className="max-h-68 overflow-y-auto">
            {/* Filtered results */}
            {search.trim() ? (
              <div className="p-1">
                {filtered && filtered.length > 0 ? (
                  filtered.map((s) => (
                    <button
                      key={s.name}
                      type="button"
                      disabled={selectedSkills.includes(s.name)}
                      onClick={() => addSkill(s.name)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition
                        ${selectedSkills.includes(s.name)
                          ? 'text-stone-400 cursor-default'
                          : 'text-stone-700 hover:bg-amber-50 hover:text-stone-900'
                        }`}
                    >
                      <span>{s.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${TIER_LABELS[s.tier]?.color || 'bg-stone-100 text-stone-500'}`}>
                        {s.categoryName}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-stone-500">
                    No match — press Enter to add <strong>&ldquo;{search.trim()}&rdquo;</strong> as a custom skill
                  </div>
                )}
              </div>
            ) : (
              /* Grouped by tier & category when not searching */
              Object.keys(TIER_LABELS).map((tier) => {
                const tierCats = categories.filter((c) => c.tier === tier && c.isActive !== false);
                if (tierCats.length === 0) return null;
                return (
                  <div key={tier}>
                    <div className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest ${TIER_LABELS[tier].color} sticky top-0`}>
                      {TIER_LABELS[tier].label}
                    </div>
                    {tierCats.map((cat) => {
                      const catSkills = (cat.skills || []).filter((s) => s.isActive !== false);
                      if (catSkills.length === 0) return null;
                      return (
                        <div key={cat._id || cat.slug} className="px-1 pb-1">
                          <div className="px-3 py-1 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                            {cat.icon} {cat.name}
                          </div>
                          <div className="flex flex-wrap gap-1.5 px-3 pb-2">
                            {catSkills.map((s) => {
                              const picked = selectedSkills.includes(s.name);
                              return (
                                <button
                                  key={s._id || s.slug || s.name}
                                  type="button"
                                  disabled={picked}
                                  onClick={() => addSkill(s.name)}
                                  className={`px-3 py-1 rounded-full text-xs font-medium border transition
                                    ${picked
                                      ? 'bg-stone-900 text-white border-stone-900 cursor-default'
                                      : 'bg-white border-stone-200 text-stone-600 hover:border-amber-400 hover:bg-amber-50'
                                    }`}
                                >
                                  {picked ? '✓ ' : ''}{s.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}

            {/* Other / manual entry */}
            {!otherMode ? (
              <div className="border-t border-stone-100 p-2">
                <button
                  type="button"
                  onClick={() => setOtherMode(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-stone-500 hover:bg-stone-50 hover:text-stone-800 transition"
                >
                  <HiPlus className="w-4 h-4" />
                  <span>Other — add a custom skill</span>
                </button>
              </div>
            ) : (
              <div className="border-t border-stone-100 p-2">
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={customSkill}
                    onChange={(e) => setCustomSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addSkill(customSkill); }
                      if (e.key === 'Escape') { setOtherMode(false); setCustomSkill(''); }
                    }}
                    placeholder="Type custom skill & press Enter"
                    className="flex-1 px-3 py-2 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => addSkill(customSkill)}
                    className="px-3 py-2 bg-stone-900 text-white rounded-xl text-sm hover:bg-stone-700 transition"
                  >
                    Add
                  </button>
                </div>
                <p className="text-xs text-stone-400 mt-1 px-1">Press Esc to cancel</p>
              </div>
            )}
          </div>
        </div>
      )}

      {maxSkills > 0 && (
        <p className="text-xs text-stone-400 mt-1">
          {selectedSkills.length}/{maxSkills} skills selected
          {selectedSkills.length < maxSkills
            ? ` — ${maxSkills - selectedSkills.length} more allowed`
            : ' — upgrade your plan to add more'}
        </p>
      )}
    </div>
  );
};

export default SkillPicker;
