import { useEffect, useMemo, useRef, useState } from 'react';
import { HiCheck, HiChevronDown, HiGlobeAlt, HiSearch } from 'react-icons/hi';
import useTranslation from '../hooks/useTranslation';

const POPULAR_CODES = ['en', 'hi', 'bn', 'kn', 'ta', 'te', 'mr', 'gu', 'ml', 'pa', 'ur'];

const LanguageDropdown = ({ mobile = false, onChangeComplete }) => {
  const { t, selectedLanguage, languages, setSelectedLanguage } = useTranslation();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const menuRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  // Parse original language labels to get name and nativeName for advanced matching
  const parsedLanguages = useMemo(() => {
    return languages.map((item) => {
      let name = item.label;
      let nativeName = '';
      const match = item.label.match(/^([^(]+)\s*\(([^)]+)\)$/);
      if (match) {
        name = match[1].trim();
        nativeName = match[2].trim();
      }
      return {
        code: item.code,
        name,
        nativeName: nativeName || name,
        label: item.label,
      };
    });
  }, [languages]);

  const activeLanguage = useMemo(() => {
    return languages.find((item) => item.code === selectedLanguage) || languages[0];
  }, [languages, selectedLanguage]);

  // Compute filtered list of languages based on query and popularity ranking
  const filteredLanguages = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      // Prioritize popular languages when search query is empty
      const popular = parsedLanguages.filter((lang) => POPULAR_CODES.includes(lang.code));
      // Sort popular languages according to POPULAR_CODES order
      popular.sort((a, b) => POPULAR_CODES.indexOf(a.code) - POPULAR_CODES.indexOf(b.code));

      const others = parsedLanguages.filter((lang) => !POPULAR_CODES.includes(lang.code));
      return { popular, others, flatList: [...popular, ...others] };
    }

    const matches = parsedLanguages.filter((lang) => {
      return (
        lang.name.toLowerCase().includes(q) ||
        lang.nativeName.toLowerCase().includes(q) ||
        lang.code.toLowerCase().includes(q)
      );
    });

    return { popular: [], others: matches, flatList: matches };
  }, [parsedLanguages, searchQuery]);

  const displayedList = filteredLanguages.flatList;

  // Sync scroll on key navigation
  useEffect(() => {
    if (!open || !listRef.current) return;
    const highlightedElement = listRef.current.children[highlightedIndex];
    if (highlightedElement) {
      highlightedElement.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, open]);

  // Reset search and highlight states when dropdown toggles
  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setHighlightedIndex(0);
      // Short timeout to guarantee search input ref is bound and visible
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [open]);

  // Handle click outside and escape keys
  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutside = (event) => {
      if (!menuRef.current || menuRef.current.contains(event.target)) return;
      setOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutside);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
    };
  }, [open]);

  const handleSelect = async (code) => {
    await setSelectedLanguage(code);
    setOpen(false);
    setSearchQuery('');
    if (onChangeComplete) onChangeComplete();
  };

  const handleKeyDown = (event) => {
    if (!open) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setHighlightedIndex((prev) => (displayedList.length > 0 ? (prev + 1) % displayedList.length : 0));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlightedIndex((prev) =>
          displayedList.length > 0 ? (prev - 1 + displayedList.length) % displayedList.length : 0
        );
        break;
      case 'Enter':
        event.preventDefault();
        if (displayedList[highlightedIndex]) {
          handleSelect(displayedList[highlightedIndex].code);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setOpen(false);
        break;
      case 'Tab':
        // Close dropdown when user tabs away
        setOpen(false);
        break;
      default:
        break;
    }
  };

  const isSearchEmpty = searchQuery.trim() === '';

  return (
    <div 
      ref={menuRef} 
      className={`relative ${mobile ? 'w-full py-1' : ''}`}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center space-x-2 bg-gray-50 rounded-full px-3 py-1.5 hover:bg-gray-100 transition border border-gray-200 ${
          mobile ? 'w-full justify-between' : ''
        }`}
        aria-label="Select language"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls="language-dropdown-menu"
      >
        <span className="flex items-center space-x-2 min-w-0">
          <HiGlobeAlt className="text-indigo-500 w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="text-sm font-semibold text-gray-700 truncate max-w-32">
            {activeLanguage?.label || 'English'}
          </span>
        </span>
        <HiChevronDown className={`text-gray-500 w-4 h-4 transition shrink-0 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div 
          id="language-dropdown-menu"
          className={`${
            mobile 
              ? 'relative w-full mt-2 border border-gray-200 bg-gray-50' 
              : 'absolute right-0 mt-2 w-72 bg-white border border-gray-100 shadow-xl'
          } rounded-2xl py-3 z-50 flex flex-col max-h-80`}
        >
          {/* Search Input block */}
          <div className="px-3 pb-2 border-b border-gray-100">
            <div className="relative flex items-center">
              <HiSearch className="absolute left-3 text-gray-400 w-4 h-4" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search language..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                className="w-full bg-gray-100 hover:bg-gray-200/60 focus:bg-white text-sm pl-9 pr-3 py-1.5 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 transition duration-150 outline-none"
              />
            </div>
          </div>

          {/* Scrollable Language List */}
          <div 
            ref={listRef} 
            className="overflow-y-auto flex-1 mt-1 pr-1"
            style={{ maxHeight: '220px' }}
          >
            {displayedList.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No language found
              </div>
            ) : (
              <>
                {isSearchEmpty ? (
                  <>
                    {/* Popular Indian Languages Header */}
                    {filteredLanguages.popular.length > 0 && (
                      <div className="px-4 py-1.5 text-[10px] font-bold tracking-wider text-gray-400 uppercase bg-gray-50/50">
                        Popular Languages
                      </div>
                    )}
                    {filteredLanguages.popular.map((item, index) => {
                      const globalIndex = index;
                      const isSelected = item.code === selectedLanguage;
                      const isHighlighted = globalIndex === highlightedIndex;

                      return (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => handleSelect(item.code)}
                          className={`w-full flex items-center justify-between text-left px-4 py-2 text-sm transition ${
                            isHighlighted ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-700'
                          } ${isSelected ? 'text-indigo-600 font-semibold' : ''}`}
                        >
                          <span className="truncate">{item.label}</span>
                          {isSelected && <HiCheck className="text-indigo-500 w-4 h-4 shrink-0" aria-hidden="true" />}
                        </button>
                      );
                    })}

                    {/* All Other Languages Header */}
                    {filteredLanguages.others.length > 0 && (
                      <div className="px-4 py-1.5 text-[10px] font-bold tracking-wider text-gray-400 uppercase bg-gray-50/50 mt-1">
                        All Languages
                      </div>
                    )}
                    {filteredLanguages.others.map((item, index) => {
                      const globalIndex = filteredLanguages.popular.length + index;
                      const isSelected = item.code === selectedLanguage;
                      const isHighlighted = globalIndex === highlightedIndex;

                      return (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => handleSelect(item.code)}
                          className={`w-full flex items-center justify-between text-left px-4 py-2 text-sm transition ${
                            isHighlighted ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-700'
                          } ${isSelected ? 'text-indigo-600 font-semibold' : ''}`}
                        >
                          <span className="truncate">{item.label}</span>
                          {isSelected && <HiCheck className="text-indigo-500 w-4 h-4 shrink-0" aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </>
                ) : (
                  displayedList.map((item, index) => {
                    const isSelected = item.code === selectedLanguage;
                    const isHighlighted = index === highlightedIndex;

                    return (
                      <button
                        key={item.code}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleSelect(item.code)}
                        className={`w-full flex items-center justify-between text-left px-4 py-2 text-sm transition ${
                          isHighlighted ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-700'
                        } ${isSelected ? 'text-indigo-600 font-semibold' : ''}`}
                      >
                        <span className="truncate">{item.label}</span>
                        {isSelected && <HiCheck className="text-indigo-500 w-4 h-4 shrink-0" aria-hidden="true" />}
                      </button>
                    );
                  })
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageDropdown;
