import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Plus } from 'lucide-react';

export default function CreatableAutocomplete({
  value,
  onChange,
  options = [],
  placeholder = "Select or type...",
  className = "",
  inputClassName = "w-full px-3 py-2 text-[13px] rounded-lg border border-slate-200 outline-none focus:border-emerald-500 bg-white",
  onBlur
}) {
  const [inputValue, setInputValue] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
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

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(inputValue.toLowerCase())
  );
  
  const showCreateOption = inputValue.trim() !== '' && 
    !options.find(opt => opt.toLowerCase() === inputValue.trim().toLowerCase());

  // Reset highlight when typing
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [inputValue, isOpen]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val); // Save user input immediately
    setIsOpen(true);
  };

  const handleSelect = (val) => {
    setInputValue(val);
    onChange(val);
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevents form submission
      if (isOpen) {
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex]);
        } else if (showCreateOption && highlightedIndex === filteredOptions.length) {
          handleSelect(inputValue.trim());
        } else {
          // If they just hit enter without highlighting anything, select whatever they typed
          handleSelect(inputValue.trim());
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const maxIndex = showCreateOption ? filteredOptions.length : filteredOptions.length - 1;
        setHighlightedIndex(prev => (prev < maxIndex ? prev + 1 : prev));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          onBlur={(e) => {
            if (onBlur) onBlur(e.target.value);
          }}
          placeholder={placeholder}
          className={inputClassName}
        />
        <ChevronDown 
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 cursor-pointer pointer-events-none" 
        />
      </div>

      {isOpen && (options.length > 0 || inputValue.trim() !== '') && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, i) => (
              <div
                key={i}
                className={`px-3 py-2 text-[13px] cursor-pointer transition-colors ${
                  highlightedIndex === i ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
                onClick={() => handleSelect(opt)}
                onMouseEnter={() => setHighlightedIndex(i)}
              >
                {opt}
              </div>
            ))
          ) : !showCreateOption ? (
             <div className="px-3 py-2 text-[13px] text-slate-500 italic">No options found</div>
          ) : null}
          
          {showCreateOption && (
            <div
              className={`px-3 py-2 text-[13px] cursor-pointer border-t border-slate-100 flex items-center gap-1.5 ${
                highlightedIndex === filteredOptions.length ? 'bg-emerald-50 text-emerald-700' : 'text-emerald-600 hover:bg-emerald-50'
              }`}
              onClick={() => handleSelect(inputValue.trim())}
              onMouseEnter={() => setHighlightedIndex(filteredOptions.length)}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Use "{inputValue.trim()}"</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
