import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

import api from '../../services/api';

const defaultSuggestions = [];

const JobSearchAutocomplete = ({
  value,
  onChange,
  onSelect,
  placeholder = "Search jobs by title, skills, or company",
  liveJobsList = [],
  className = "bg-transparent border-none"
}) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const [adminRoles, setAdminRoles] = useState([]);

  useEffect(() => {
    api.get('/job-roles')
      .then(res => {
        if (res.data && res.data.length > 0) {
          setAdminRoles(res.data.map(r => r.roleName));
        }
      })
      .catch(err => console.error("Failed to fetch admin roles", err));
  }, []);

  // Combine live job titles, companies, and skills, make unique
  const getCombinedSuggestions = () => {
    const liveTitles = (liveJobsList || []).map(job => job.title).filter(Boolean);
    const liveCompanies = (liveJobsList || []).map(job => job.companyName || job.company).filter(Boolean);
    const liveSkills = (liveJobsList || []).flatMap(job => job.skills || []).filter(Boolean);
    
    const combined = [...liveTitles, ...liveCompanies, ...liveSkills, ...adminRoles];
    return [...new Set(combined)];
  };

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

  const showRecommendations = (text = '') => {
    const allSuggestions = getCombinedSuggestions();
    const trimmed = text.trim();
    if (trimmed.length > 0) {
      const lowerText = trimmed.toLowerCase();
      
      const filtered = allSuggestions.filter(item => 
        item.toLowerCase().includes(lowerText)
      );

      // Sort: prioritize those starting with the query
      filtered.sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(lowerText);
        const bStarts = b.toLowerCase().startsWith(lowerText);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.localeCompare(b);
      });

      setSuggestions(filtered.slice(0, 10)); // Top 10 results
    } else {
      setSuggestions(allSuggestions.slice(0, 10)); // Default recommendations
    }
    setIsOpen(true);
  };

  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputValue(text);
    if (onChange) onChange(text);
    showRecommendations(text);
  };

  const handleSelect = (suggestion) => {
    setInputValue(suggestion);
    if (onChange) onChange(suggestion);
    if (onSelect) onSelect(suggestion);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`flex-1 flex items-center px-4 py-1 sm:py-0 w-full sm:w-auto relative ${className}`}>
      <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 shrink-0" />
      <input 
        type="text" 
        placeholder={placeholder} 
        className="w-full bg-transparent border-none focus:ring-0 ml-2 py-1.5 sm:py-2 outline-none text-xs text-gray-900 truncate"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => showRecommendations(inputValue)}
        autoComplete="off"
      />
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto py-1.5 min-w-full md:min-w-[320px] animate-fadeIn">
          {suggestions.map((suggestion, index) => (
            <div 
              key={index}
              className="px-4 py-2 hover:bg-blue-50/50 cursor-pointer text-sm text-gray-700 border-b border-gray-50/60 last:border-none flex items-center gap-2.5 transition-colors duration-150"
              onClick={() => handleSelect(suggestion)}
            >
              <Search className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="font-semibold text-gray-700 truncate">{suggestion}</span>
            </div>
          ))}
          {inputValue.trim() && !suggestions.some(s => s.toLowerCase() === inputValue.trim().toLowerCase()) && (
            <div 
              className="px-4 py-2 hover:bg-blue-50/50 cursor-pointer text-sm text-blue-600 font-medium border-b border-gray-50/60 last:border-none flex items-center gap-2.5 transition-colors duration-150"
              onClick={() => handleSelect(inputValue.trim())}
            >
              <Search className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">Search for "{inputValue}"</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JobSearchAutocomplete;
