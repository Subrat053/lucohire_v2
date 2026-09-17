import React from 'react';
import { Plus } from 'lucide-react';
import { useResume } from '../ResumeContext';
import InlineFormBlock, { FormInput, FormTextarea } from '../InlineFormBlock';

const Show = ({ when, children }) => (when ? children : null);

const AddItemButton = ({ onClick, label }) => (
  <button 
    type="button"
    className="mt-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-900 border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/50 hover:bg-blue-50 p-2 w-full rounded-lg transition-all opacity-0 hover:opacity-100 group-hover:opacity-100"
    onClick={onClick}
    title={label}
  >
    <Plus className="w-3.5 h-3.5" /> {label}
  </button>
);

export default function TemplateRichard() {
  const { resumeData, updatePersonal, updateSectionData, updateSectionTitle, moveSection } = useResume();
  const { personal, sections } = resumeData;

  const handleArrayChange = (sectionId, dataArray, index, field, value) => {
    const newData = [...dataArray];
    newData[index] = { ...newData[index], [field]: value };
    updateSectionData(sectionId, newData);
  };

  const moveItem = (sectionId, dataArray, index, dir) => {
    if (index + dir < 0 || index + dir >= dataArray.length) return;
    const newData = [...dataArray];
    const temp = newData[index];
    newData[index] = newData[index + dir];
    newData[index + dir] = temp;
    updateSectionData(sectionId, newData);
  };

  const renderLeftSectionContent = (section) => {
    switch (section.type) {
      case 'summary':
        return (
          <InlineFormBlock
            renderPreview={() => (
              <div className="text-[12.5px] leading-relaxed text-blue-50 text-justify whitespace-pre-wrap">
                {section.data?.text || "Add Professional Summary..."}
              </div>
            )}
            renderForm={() => (
              <FormTextarea label="Professional Summary" value={section.data?.text} onChange={(v) => updateSectionData(section.id, { text: v })} />
            )}
            isDraggable={false}
          />
        );
      case 'skills':
      case 'languages':
      case 'certifications':
      case 'achievements':
        return (
          <div className="flex flex-col gap-1.5 group">
            {section.data.map((item, i) => (
              <InlineFormBlock
                key={item.id}
                onDelete={() => updateSectionData(section.id, section.data.filter((_, idx) => idx !== i))}
                onMoveUp={() => moveItem(section.id, section.data, i, -1)}
                onMoveDown={() => moveItem(section.id, section.data, i, 1)}
                renderPreview={() => (
                  <div className="flex gap-2 text-[12.5px] leading-relaxed text-blue-50 items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-white mt-1.5 shrink-0"></span>
                    <span className="flex-1">
                      <Show when={item.category || item.name || item.title}>
                        <span className="font-semibold text-white">{item.category || item.name || item.title}</span>
                      </Show>
                      <Show when={item.items || item.issuer || item.description}>
                        <span>{(item.category || item.name || item.title) ? ': ' : ''}{item.items || item.issuer || item.description}</span>
                      </Show>
                    </span>
                  </div>
                )}
                renderForm={() => (
                  <>
                    <FormInput label="Name/Category" value={item.category || item.name || item.title} onChange={v => handleArrayChange(section.id, section.data, i, item.category !== undefined ? 'category' : (item.name !== undefined ? 'name' : 'title'), v)} />
                    <FormTextarea label="Details/Items" value={item.items || item.issuer || item.description} onChange={v => handleArrayChange(section.id, section.data, i, item.items !== undefined ? 'items' : (item.issuer !== undefined ? 'issuer' : 'description'), v)} />
                  </>
                )}
              />
            ))}
            <AddItemButton label="Add Item" onClick={() => updateSectionData(section.id, [...section.data, { id: `itm-${Date.now()}`, name: 'New Item', description: '' }])} />
          </div>
        );
      default:
        return null;
    }
  };

  const renderRightSectionContent = (section) => {
    switch (section.type) {
      case 'experience':
      case 'projects':
      case 'education':
        return (
          <div className="flex flex-col group relative">
            {section.data.map((item, i) => {
              // Determine if it's education or experience based on fields
              const isEdu = item.degree !== undefined;
              const title = isEdu ? item.degree : (item.role || item.name);
              const subtitle = isEdu ? item.institution : (item.company || item.technologies);
              
              return (
                <InlineFormBlock
                  key={item.id}
                  onDelete={() => updateSectionData(section.id, section.data.filter((_, idx) => idx !== i))}
                  onMoveUp={() => moveItem(section.id, section.data, i, -1)}
                  onMoveDown={() => moveItem(section.id, section.data, i, 1)}
                  renderPreview={() => (
                    <div className="flex pb-6 relative group/item">
                      <div className="w-24 shrink-0 text-right pr-6 font-bold text-[13px] text-gray-800 pt-0.5">
                        {isEdu ? item.year : item.duration}
                      </div>
                      
                      <div className="absolute left-[91px] top-1.5 w-2 h-2 rounded-full bg-gray-800 ring-4 ring-[#f4f5f6] z-10"></div>
                      
                      {i !== section.data.length - 1 && (
                        <div className="absolute left-[94px] top-2 h-[calc(100%+8px)] w-[2px] bg-gray-400"></div>
                      )}
                      
                      <div className="pl-6 flex-1 flex flex-col gap-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-bold text-[14.5px] text-gray-900">{title || "Title"}</h3>
                          <Show when={!isEdu && (item.githubUrl || item.liveUrl || item.link)}>
                            <div className="flex items-center gap-2 text-[12px]">
                              <Show when={item.liveUrl}>
                                <a onClick={(e) => e.stopPropagation()} href={item.liveUrl?.startsWith('http') ? item.liveUrl : `https://${item.liveUrl}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                  Live Demo
                                </a>
                              </Show>
                              <Show when={item.githubUrl || item.link}>
                                <a onClick={(e) => e.stopPropagation()} href={(item.githubUrl || item.link)?.startsWith('http') ? (item.githubUrl || item.link) : `https://${item.githubUrl || item.link}`} target="_blank" rel="noreferrer" className="text-gray-500 hover:underline">
                                  GitHub
                                </a>
                              </Show>
                            </div>
                          </Show>
                        </div>
                        <div className="text-[13.5px] text-gray-700">{subtitle}</div>
                        
                        <Show when={isEdu ? (item.grade || item.coursework) : item.description}>
                          <div className="text-[13px] leading-relaxed text-gray-700 mt-1">
                            {isEdu ? (
                              <>
                                <Show when={item.coursework}><div>{item.coursework}</div></Show>
                                <Show when={item.grade}><div className="font-semibold mt-0.5 text-gray-800">GPA: {item.grade}</div></Show>
                              </>
                            ) : (
                              <div className="whitespace-pre-wrap pl-4 relative before:content-[''] before:absolute before:left-0 before:top-2 before:w-1 before:h-1 before:bg-gray-400 before:rounded-full">
                                {item.description}
                              </div>
                            )}
                          </div>
                        </Show>
                      </div>
                    </div>
                  )}
                  renderForm={() => (
                    <>
                      <FormInput label="Title" value={title} onChange={v => handleArrayChange(section.id, section.data, i, isEdu ? 'degree' : (item.role !== undefined ? 'role' : 'name'), v)} />
                      <FormInput label="Subtitle" value={subtitle} onChange={v => handleArrayChange(section.id, section.data, i, isEdu ? 'institution' : (item.company !== undefined ? 'company' : 'technologies'), v)} />
                      <FormInput label="Duration/Year" value={isEdu ? item.year : item.duration} onChange={v => handleArrayChange(section.id, section.data, i, isEdu ? 'year' : 'duration', v)} />
                      {!isEdu && (
                        <div className="grid grid-cols-2 gap-2">
                          <FormInput label="GitHub URL" value={item.githubUrl || item.link} onChange={v => handleArrayChange(section.id, section.data, i, 'githubUrl', v)} />
                          <FormInput label="Live Demo URL" value={item.liveUrl} onChange={v => handleArrayChange(section.id, section.data, i, 'liveUrl', v)} />
                        </div>
                      )}
                      <FormTextarea label="Description/Details" value={isEdu ? item.coursework : item.description} onChange={v => handleArrayChange(section.id, section.data, i, isEdu ? 'coursework' : 'description', v)} />
                    </>
                  )}
                />
              )
            })}
            <AddItemButton label="Add Item" onClick={() => updateSectionData(section.id, [...section.data, { id: `itm-${Date.now()}`, role: 'New Item', company: '', duration: '', description: '' }])} />
          </div>
        );
      default:
        return null;
    }
  };

  const leftColumnTypes = ['summary', 'skills', 'languages', 'certifications'];
  const rightColumnTypes = ['experience', 'education', 'projects', 'achievements'];
  
  const leftSections = sections.filter(s => leftColumnTypes.includes(s.type) && s.visible);
  const rightSections = sections.filter(s => rightColumnTypes.includes(s.type) && s.visible);

  return (
    <div className="bg-[#f4f5f6] flex flex-row grow w-full box-border break-words font-sans" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* Left Sidebar */}
      <div className="w-[33%] bg-[#1a365d] text-white flex flex-col pt-12 pb-8 px-8 shrink-0">
        <div className="flex justify-center mb-10">
          <Show when={personal.photo}>
            <div className="w-40 h-40 shrink-0 overflow-hidden rounded-full border-4 border-white/20 shadow-xl">
              <img src={personal.photo} alt="Profile" className="w-full h-full object-cover" />
            </div>
          </Show>
          <Show when={!personal.photo}>
            <div className="w-40 h-40 shrink-0 overflow-hidden rounded-full border-4 border-white/20 shadow-xl bg-blue-800 flex items-center justify-center text-5xl font-bold text-white/50">
              {(personal.name || "RS").substring(0, 2).toUpperCase()}
            </div>
          </Show>
        </div>

        <div className="flex flex-col gap-8">
          {leftSections.map(section => (
            <div key={section.id} className="flex flex-col gap-3">
              <InlineFormBlock
                renderPreview={() => <h2 className="text-[15px] text-white font-bold tracking-widest uppercase mb-1">{section.title}</h2>}
                renderForm={() => <FormInput label="Section Title" value={section.title} onChange={v => updateSectionTitle(section.id, v)} />}
                isDraggable={false}
              />
              {renderLeftSectionContent(section)}
            </div>
          ))}
        </div>
      </div>

      {/* Right Content */}
      <div className="w-[67%] py-12 px-10 flex flex-col gap-8">
        
        {/* Header */}
        <div className="flex flex-col pb-6 border-b-2 border-gray-300">
          <InlineFormBlock
            renderPreview={() => <h1 className="text-4xl text-[#1a365d] font-black uppercase tracking-wider">{personal.name || 'RICHARD SANCHEZ'}</h1>}
            renderForm={() => <FormInput label="Full Name" value={personal.name} onChange={v => updatePersonal('name', v)} />}
            isDraggable={false}
          />
          <div className="mt-2">
            <InlineFormBlock
              renderPreview={() => <p className="text-[17px] text-gray-700 tracking-widest uppercase font-medium">{personal.designation || 'Marketing Manager'}</p>}
              renderForm={() => <FormInput label="Professional Title" value={personal.designation} onChange={v => updatePersonal('designation', v)} />}
              isDraggable={false}
            />
          </div>
          
          <div className="flex items-center gap-4 text-[12px] text-gray-700 mt-6 pt-4 border-t border-gray-300">
            <InlineFormBlock
              renderPreview={() => <span>{personal.email || 'hello@reallygreatsite.com'}</span>}
              renderForm={() => <FormInput label="Email" value={personal.email} onChange={v => updatePersonal('email', v)} />}
              isDraggable={false}
            />
            <span className="text-gray-300">|</span>
            <InlineFormBlock
              renderPreview={() => <span>{personal.phone || '+123-456-7890'}</span>}
              renderForm={() => <FormInput label="Phone" value={personal.phone} onChange={v => updatePersonal('phone', v)} />}
              isDraggable={false}
            />
            <span className="text-gray-300">|</span>
            <InlineFormBlock
              renderPreview={() => <span>{personal.city || '123 Anywhere St., Any City'}</span>}
              renderForm={() => <FormInput label="Location" value={personal.city} onChange={v => updatePersonal('city', v)} />}
              isDraggable={false}
            />
            
            <InlineFormBlock
              renderPreview={() => (
                <div className="flex items-center gap-4">
                  {personal.links?.map((link, i) => (
                    <Show when={link.url} key={i}>
                      <span className="text-gray-300">|</span>
                      <a onClick={(e) => e.stopPropagation()} href={link.url?.startsWith('http') ? link.url : `https://${link.url}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                        {link.platform || 'Link'}
                      </a>
                    </Show>
                  ))}
                  {(!personal.links || personal.links.length === 0) && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span className="text-gray-400 italic">Add Links...</span>
                    </>
                  )}
                </div>
              )}
              renderForm={() => (
                <div className="flex flex-col gap-2 min-w-[300px] mt-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Custom Links</label>
                  {(personal.links || []).map((link, i) => (
                    <div key={i} className="flex gap-2 mb-2 items-start font-sans">
                      <input value={link.platform} onChange={(e) => { const nl = [...(personal.links||[])]; nl[i].platform = e.target.value; updatePersonal('links', nl); }} placeholder="Platform (e.g. LinkedIn)" className="w-1/3 px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                      <input value={link.url} onChange={(e) => { const nl = [...(personal.links||[])]; nl[i].url = e.target.value; updatePersonal('links', nl); }} placeholder="URL" className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                      <button type="button" onClick={() => updatePersonal('links', personal.links.filter((_, idx) => idx !== i))} className="p-1.5 text-red-700 hover:bg-red-50 rounded bg-[#ffffff] border border-gray-200">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => updatePersonal('links', [...(personal.links || []), { platform: '', url: '' }])} className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:text-blue-800">
                    <Plus className="w-4 h-4" /> Add Link
                  </button>
                </div>
              )}
              isDraggable={false}
            />
          </div>
        </div>

        {/* Right Sections */}
        <div className="flex flex-col gap-8">
          {rightSections.map(section => (
            <div key={section.id} className="flex flex-col gap-5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#1a365d] flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                </div>
                <InlineFormBlock
                  renderPreview={() => <h2 className="text-[16px] text-[#1a365d] font-bold tracking-widest uppercase">{section.title}</h2>}
                  renderForm={() => <FormInput label="Section Title" value={section.title} onChange={v => updateSectionTitle(section.id, v)} />}
                  isDraggable={false}
                />
              </div>
              
              <div className="pl-5">
                {renderRightSectionContent(section)}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
