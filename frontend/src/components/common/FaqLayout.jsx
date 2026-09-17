import React, { useState } from 'react';

const EditableText = ({ tag: Tag, value, onChange, isEditMode, className, placeholder }) => {
  const handleBlur = (e) => {
    if (onChange) onChange(e.currentTarget.innerText);
  };

  if (!isEditMode) {
    return <Tag className={className}>{value || placeholder}</Tag>;
  }

  return (
    <Tag
      className={`${className} outline-none cursor-text hover:bg-gray-100/50 focus:bg-white focus:ring-2 focus:ring-blue-500/30 rounded px-1 -mx-1 transition-colors min-h-[1em] empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:italic`}
      contentEditable={true}
      suppressContentEditableWarning={true}
      onBlur={handleBlur}
      data-placeholder={placeholder}
    >
      {value}
    </Tag>
  );
};

export default function FaqLayout({ data = {}, onChange, isEditMode }) {
  const [openIndexes, setOpenIndexes] = useState(isEditMode ? (data.sections || []).map((_, i) => i) : []);

  const toggleAccordion = (index) => {
    if (isEditMode) return;
    setOpenIndexes(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const updateField = (field, value) => {
    if (!onChange) return;
    onChange({ ...data, [field]: value });
  };

  const updateSection = (index, field, value) => {
    if (!onChange) return;
    const newSections = [...(data.sections || [])];
    newSections[index] = { ...newSections[index], [field]: value };
    onChange({ ...data, sections: newSections });
  };

  const addSection = () => {
    if (!onChange) return;
    const newSections = [...(data.sections || []), { title: 'New Question', body: 'Answer goes here...' }];
    onChange({ ...data, sections: newSections });
    if (isEditMode) {
      setOpenIndexes(prev => [...prev, newSections.length - 1]);
    }
  };

  const removeSection = (index) => {
    if (!onChange) return;
    const newSections = (data.sections || []).filter((_, i) => i !== index);
    onChange({ ...data, sections: newSections });
  };

  const moveSection = (index, direction) => {
    if (!onChange) return;
    const newSections = [...(data.sections || [])];
    if (direction === 'up' && index > 0) {
      [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
    } else if (direction === 'down' && index < newSections.length - 1) {
      [newSections[index + 1], newSections[index]] = [newSections[index], newSections[index + 1]];
    }
    onChange({ ...data, sections: newSections });
  };

  return (
    <div className={`min-h-screen bg-gradient-to-b from-[#F8F9FA] to-white font-sans ${isEditMode ? '' : 'py-16 px-4 sm:px-6 lg:px-8'}`}>
      
      {isEditMode && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 text-center text-sm font-bold shadow-md relative z-50">
          FAQ Inline Edit Mode Active
        </div>
      )}

      <div className={`max-w-3xl mx-auto ${isEditMode ? 'my-12 px-4' : ''}`}>
        
        {/* Header Section */}
        <div className="text-center mb-12">
          <p className="text-sm font-bold text-blue-600 tracking-widest uppercase mb-4 drop-shadow-sm">
            <EditableText 
              tag="span" 
              value={data.badge || "TRUSTED BY"} 
              onChange={v => updateField('badge', v)} 
              isEditMode={isEditMode} 
              placeholder="Subheading"
            />
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-700 tracking-tight mb-4">
            <EditableText 
              tag="span" 
              value={data.title} 
              onChange={v => updateField('title', v)} 
              isEditMode={isEditMode} 
              placeholder="Frequently Asked Questions"
            />
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 mx-auto rounded-full"></div>
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {(data.sections || []).map((section, idx) => {
            const isOpen = isEditMode || openIndexes.includes(idx);
            
            return (
              <div key={idx} className="relative group">
                {isEditMode && (
                  <div className="absolute -left-14 top-4 opacity-0 group-hover:opacity-100 transition flex flex-col gap-1 z-10">
                    <button 
                      onClick={(e) => { e.stopPropagation(); moveSection(idx, 'up'); }}
                      className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-1.5 rounded-lg text-xs font-bold shadow-sm"
                      title="Move Up"
                    >
                      ↑
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); moveSection(idx, 'down'); }}
                      className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-1.5 rounded-lg text-xs font-bold shadow-sm"
                      title="Move Down"
                    >
                      ↓
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeSection(idx); }}
                      className="bg-red-50 text-red-600 hover:bg-red-100 p-1.5 rounded-lg text-xs font-bold shadow-sm mt-1"
                      title="Delete"
                    >
                      X
                    </button>
                  </div>
                )}

                <div 
                  className={`transition-all duration-300 ease-in-out border ${
                    isOpen 
                      ? 'bg-white rounded-3xl p-6 shadow-md border-blue-100' 
                      : 'bg-white hover:bg-gray-50 border-gray-100 rounded-full px-6 py-4 cursor-pointer flex justify-between items-center shadow-sm hover:shadow'
                  }`}
                  onClick={() => toggleAccordion(idx)}
                >
                  
                  {isOpen ? (
                    <div className="flex items-start justify-between w-full">
                      <div className="flex-1 pr-8">
                        <EditableText 
                          tag="h3" 
                          value={section.title} 
                          onChange={v => updateSection(idx, 'title', v)} 
                          isEditMode={isEditMode} 
                          placeholder="Question goes here?"
                          className="text-lg font-bold text-gray-900 mb-3"
                        />
                        <div onClick={e => isEditMode && e.stopPropagation()}>
                          <EditableText 
                            tag="p" 
                            value={section.body} 
                            onChange={v => updateSection(idx, 'body', v)} 
                            isEditMode={isEditMode} 
                            placeholder="Answer goes here..."
                            className="text-gray-700 leading-relaxed text-[15px] whitespace-pre-wrap"
                          />
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleAccordion(idx); }}
                        className="shrink-0 w-8 h-8 rounded-full bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600 transition"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-[15px] font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                        {section.title || 'Question goes here?'}
                      </h3>
                      <button className="shrink-0 w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {isEditMode && (
          <div className="pt-10 text-center">
            <button 
              onClick={addSection}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-full font-bold text-sm shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
            >
              + Add New Question
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
