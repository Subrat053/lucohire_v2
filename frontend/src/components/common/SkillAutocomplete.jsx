import React, { useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';

const commonSkills = [
  "React", "Node.js", "Python", "Java", "JavaScript", "TypeScript",
  "HTML", "CSS", "Tailwind CSS", "MongoDB", "SQL", "PostgreSQL",
  "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Git", "GitHub",
  "Figma", "UI/UX Design", "Graphic Design", "Adobe Photoshop", "Adobe Illustrator",
  "Data Analysis", "Machine Learning", "Artificial Intelligence", "Data Science",
  "Carpentry", "Plumbing", "Electrical", "Welding", "Masonry", "Painting",
  "Digital Marketing", "SEO", "Content Writing", "Copywriting", "Social Media Management",
  "Project Management", "Agile", "Scrum", "Business Analysis", "Sales", "Customer Service",
  "Accounting", "Finance", "Bookkeeping", "HR", "Recruiting"
];

const SkillAutocomplete = ({ onAddSkill, placeholder = "Add a skill (e.g. React, Carpentry)", suggestionsList = commonSkills, showOnFocus = false }) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateSuggestions = (text) => {
    if (text.trim().length > 0) {
      const lowerText = text.toLowerCase();
      const filtered = suggestionsList.filter(item => 
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

      setSuggestions(filtered.slice(0, 10));
      setIsOpen(true);
    } else if (showOnFocus) {
      setSuggestions(suggestionsList.slice(0, 10));
      setIsOpen(true);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  };

  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputValue(text);
    updateSuggestions(text);
  };

  const handleAdd = (skillToAdd) => {
    const trimmed = (skillToAdd || inputValue).trim();
    if (trimmed) {
      onAddSkill(trimmed);
      setInputValue('');
      setSuggestions([]);
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div ref={containerRef} className="flex-1 flex gap-2 relative">
      <div className="flex-1 relative">
        <input 
          type="text" 
          placeholder={placeholder} 
          className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-200 outline-none focus:border-emerald-500"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (inputValue.trim().length > 0 && suggestions.length > 0) {
              setIsOpen(true);
            } else if (showOnFocus) {
              updateSuggestions(inputValue);
            }
          }}
          autoComplete="off"
        />
        {isOpen && suggestions.length > 0 && (
          <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <div 
                key={index}
                className="px-4 py-2 hover:bg-emerald-50 cursor-pointer text-[13px] text-slate-700 border-b border-slate-50 last:border-none flex items-center gap-2"
                onClick={() => handleAdd(suggestion)}
              >
                <Plus className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="font-semibold text-slate-700">{suggestion}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <button 
        type="button" 
        onClick={() => handleAdd()}
        className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-[13px] font-bold hover:bg-emerald-700 shrink-0"
      >
        Add
      </button>
    </div>
  );
};

export default SkillAutocomplete;
