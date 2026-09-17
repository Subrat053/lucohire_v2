import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

export default function PolicyPageLayout({ data = {}, onChange, isEditMode, imageUrl, fullPage = true }) {
  const navigate = useNavigate();

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
    const newSections = [...(data.sections || []), { title: 'New Section', body: 'Add your content here...' }];
    onChange({ ...data, sections: newSections });
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

  const firstSection = data.sections && data.sections.length > 0 ? data.sections[0] : null;
  const remainingSections = data.sections && data.sections.length > 1 ? data.sections.slice(1) : [];

  return (
    <div className={`min-h-screen font-sans ${fullPage ? 'bg-white' : 'bg-gradient-to-br from-[#F8F9FA] via-[#F0F4FF] to-white'} ${isEditMode ? '' : (fullPage ? 'pt-4 sm:pt-8 pb-16 px-0 sm:px-6 lg:px-8' : 'py-6 sm:py-12 px-0 sm:px-6 lg:px-8')}`}>
      
      {isEditMode && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 text-center text-sm font-bold shadow-md relative z-50">
          Inline Edit Mode Active
        </div>
      )}

      <div className={`max-w-6xl mx-auto ${fullPage ? 'bg-white' : 'bg-white sm:bg-white/80 sm:backdrop-blur-md shadow-none sm:shadow-lg rounded-none sm:rounded-2xl overflow-hidden border-none sm:border sm:border-white/50'} ${isEditMode ? 'my-8' : ''}`}>
        
        {/* Top Content Section (2 columns on desktop) */}
        <div className="px-5 py-5 sm:p-12 lg:px-16 flex flex-col lg:flex-row gap-8 lg:gap-20 border-b border-gray-100 items-stretch bg-white">
          
          {/* Left Column: Text */}
          <div className="flex-1 space-y-10 flex flex-col justify-center">
            <div>
              {!isEditMode && (
                <button 
                  onClick={() => navigate(-1)}
                  className="flex items-center text-blue-600 font-bold text-sm hover:text-blue-700 hover:translate-x-[-4px] transition-all mb-8"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Back
                </button>
              )}
              
              <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-900 to-indigo-800 tracking-tight mb-3">
                <EditableText 
                  tag="span" 
                  value={data.title} 
                  onChange={v => updateField('title', v)} 
                  isEditMode={isEditMode} 
                  placeholder="Page Title"
                />
              </h1>
              <p className="text-blue-500 font-semibold text-sm tracking-wide uppercase mb-6 drop-shadow-sm">
                <EditableText 
                  tag="span" 
                  value={data.lastUpdated} 
                  onChange={v => updateField('lastUpdated', v)} 
                  isEditMode={isEditMode} 
                  placeholder="Last Updated: Date"
                />
              </p>

              <div className="text-gray-700 leading-relaxed text-lg bg-blue-50/50 p-6 rounded-2xl border border-blue-100/50">
                <EditableText 
                  tag="p" 
                  value={data.intro} 
                  onChange={v => updateField('intro', v)} 
                  isEditMode={isEditMode} 
                  placeholder="Introduction paragraph goes here..."
                />
              </div>
            </div>

            {/* First Section */}
            {firstSection && (
              <div className="relative group space-y-4 pt-4">
                {isEditMode && (
                  <div className="absolute -left-14 top-0 opacity-0 group-hover:opacity-100 transition flex flex-col gap-1 z-10">
                    <button 
                      onClick={() => removeSection(0)}
                      className="bg-red-50 text-red-600 hover:bg-red-100 p-1.5 rounded-lg text-xs font-bold shadow-sm"
                      title="Delete"
                    >
                      X
                    </button>
                  </div>
                )}
                
                <EditableText 
                  tag="h3" 
                  value={firstSection.title} 
                  onChange={v => updateSection(0, 'title', v)} 
                  isEditMode={isEditMode} 
                  placeholder="Section Header"
                  className="text-2xl font-bold text-gray-900 inline-block bg-gradient-to-r from-blue-100 to-transparent pr-4 border-l-4 border-blue-500 pl-3 py-1"
                />
                
                <EditableText 
                  tag="p" 
                  value={firstSection.body} 
                  onChange={v => updateSection(0, 'body', v)} 
                  isEditMode={isEditMode} 
                  placeholder="Section body text..."
                  className="text-gray-700 leading-loose text-base whitespace-pre-wrap pl-0 sm:pl-4 text-left"
                />
              </div>
            )}
          </div>

          {/* Right Column: Illustration */}
          <div className="w-full lg:w-[45%] shrink-0 flex items-center justify-center">
            {imageUrl ? (
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-200 to-indigo-100 rounded-full blur-3xl opacity-40"></div>
                <img 
                  src={imageUrl} 
                  alt={data.title} 
                  className="w-full h-auto object-contain relative z-10 hover:scale-105 transition-transform duration-500"
                />
              </div>
            ) : (
              <div className="w-full aspect-square bg-blue-50/50 rounded-3xl border-2 border-dashed border-blue-200 flex items-center justify-center text-blue-700 font-bold tracking-wider uppercase shadow-inner">
                Illustration Area
              </div>
            )}
          </div>

        </div>

        {/* Bottom Content Section (Full width) */}
        <div className="px-5 py-5 sm:p-12 lg:px-16 bg-white">
          <div className="space-y-12 w-full max-w-none">
            {remainingSections.map((section, idx) => {
              const actualIndex = idx + 1; // Since we skipped the first section
              return (
                <div key={actualIndex} className="relative group space-y-3 sm:space-y-4 w-full bg-transparent sm:bg-gray-50/50 hover:bg-transparent sm:hover:bg-blue-50/30 py-4 sm:p-8 rounded-none sm:rounded-3xl border border-transparent sm:hover:border-blue-100 transition-colors">
                  {isEditMode && (
                    <div className="absolute -left-4 top-8 opacity-0 group-hover:opacity-100 transition flex flex-col gap-1 z-10">
                      <button 
                        onClick={() => moveSection(actualIndex, 'up')}
                        className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-1.5 rounded-lg text-xs font-bold shadow-sm"
                        title="Move Up"
                      >
                        ↑
                      </button>
                      <button 
                        onClick={() => moveSection(actualIndex, 'down')}
                        className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-1.5 rounded-lg text-xs font-bold shadow-sm"
                        title="Move Down"
                      >
                        ↓
                      </button>
                      <button 
                        onClick={() => removeSection(actualIndex)}
                        className="bg-red-50 text-red-600 hover:bg-red-100 p-1.5 rounded-lg text-xs font-bold shadow-sm mt-1"
                        title="Delete"
                      >
                        X
                      </button>
                    </div>
                  )}
                  
                  <EditableText 
                    tag="h3" 
                    value={section.title} 
                    onChange={v => updateSection(actualIndex, 'title', v)} 
                    isEditMode={isEditMode} 
                    placeholder="Section Header"
                    className="text-2xl font-bold text-gray-900 flex items-center gap-3 before:content-[''] before:hidden sm:before:block before:w-8 before:h-1 before:bg-blue-500 before:rounded-full"
                  />
                  
                  <EditableText 
                    tag="p" 
                    value={section.body} 
                    onChange={v => updateSection(actualIndex, 'body', v)} 
                    isEditMode={isEditMode} 
                    placeholder="Section body text..."
                    className="text-gray-700 leading-loose text-base whitespace-pre-wrap ml-0 sm:ml-11 text-left"
                  />
                </div>
              );
            })}
          </div>

          {isEditMode && (
            <div className="pt-12 text-center">
              <button 
                onClick={addSection}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-full font-bold text-sm shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
              >
                + Add New Section
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
