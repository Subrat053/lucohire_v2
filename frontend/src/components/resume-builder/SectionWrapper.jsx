import React, { useState } from 'react';
import { useResume } from './ResumeContext';
import { ArrowUp, ArrowDown, EyeOff, Eye, Trash2 } from 'lucide-react';

export default function SectionWrapper({ sectionId, index, totalSections, children }) {
  const { 
    resumeData, 
    toggleSectionVisibility, 
    reorderSections 
  } = useResume();
  const [isHovered, setIsHovered] = useState(false);

  const section = resumeData.sections.find(s => s.id === sectionId);
  if (!section) return null;

  if (!section.visible && !isHovered) {
    // If it's hidden and we aren't hovering, we just render a tiny placeholder in the editor
    return (
      <div 
        className="py-2 px-4 border border-dashed border-slate-300 rounded text-slate-400 text-xs flex justify-between items-center group cursor-pointer hover:bg-slate-50"
        onClick={() => toggleSectionVisibility(sectionId)}
      >
        <span>{section.title} (Hidden)</span>
        <Eye className="w-4 h-4 opacity-0 group-hover:opacity-100" />
      </div>
    );
  }

  return (
    <div 
      className={`relative group transition-all duration-200 ${!section.visible ? 'opacity-50 grayscale' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Hover Controls */}
      <div className={`absolute -left-12 top-0 flex flex-col gap-1 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'} bg-white shadow-md rounded-md p-1 border border-slate-200 z-10`}>
        <button 
          onClick={() => reorderSections(index, index - 1)}
          disabled={index === 0}
          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30"
          title="Move Up"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={() => reorderSections(index, index + 1)}
          disabled={index === totalSections - 1}
          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30"
          title="Move Down"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={() => toggleSectionVisibility(sectionId)}
          className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded"
          title={section.visible ? "Hide Section" : "Show Section"}
        >
          {section.visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
        {/* We can add Delete later if it's a custom section, for now hiding is safe enough */}
      </div>
      
      {children}
    </div>
  );
}
