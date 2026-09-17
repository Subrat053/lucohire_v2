import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

const commonPlatforms = [
  "GitHub", "Behance", "Dribbble", "LinkedIn", "Medium", 
  "Personal Website", "Stack Overflow", "Kaggle", "LeetCode",
  "HackerRank", "CodePen", "Twitter", "Instagram", "Facebook",
  "YouTube", "Vimeo", "Figma", "Notion", "Substack", "Dev.to"
];

const PlatformAutocomplete = ({ value, onChange, placeholder = "e.g. GitHub, Behance", className = "" }) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputValue(text);
    if (onChange) onChange(text);
    
    if (text.trim().length > 0) {
      const lowerText = text.toLowerCase();
      const filtered = commonPlatforms.filter(item => 
        item.toLowerCase().includes(lowerText)
      );

      // Prioritize startsWith
      filtered.sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(lowerText);
        const bStarts = b.toLowerCase().startsWith(lowerText);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.localeCompare(b);
      });

      setSuggestions(filtered.slice(0, 5));
      setIsOpen(true);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  };

  const handleSelect = (suggestion) => {
    setInputValue(suggestion);
    if (onChange) onChange(suggestion);
    setSuggestions([]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input 
        type="text" 
        placeholder={placeholder} 
        className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-200 outline-none focus:border-emerald-500 bg-white"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => {
          if (inputValue.trim().length > 0 && suggestions.length > 0) {
            setIsOpen(true);
          }
        }}
        autoComplete="off"
      />
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div 
              key={index}
              className="px-4 py-2 hover:bg-emerald-50 cursor-pointer text-[13px] text-slate-700 border-b border-slate-50 last:border-none flex items-center gap-2"
              onClick={() => handleSelect(suggestion)}
            >
              <span className="font-semibold text-slate-700">{suggestion}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlatformAutocomplete;
