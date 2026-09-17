import React from 'react';
import { Plus, Phone, Mail, Globe, MapPin } from 'lucide-react';
import { useResume } from '../ResumeContext';
import InlineFormBlock, { FormInput, FormTextarea } from '../InlineFormBlock';

const Show = ({ when, children }) => (when ? children : null);

const AddItemButton = ({ onClick, label }) => (
  <button 
    type="button"
    className="mt-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-500 hover:text-blue-700 border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/50 hover:bg-blue-50 p-2 w-full rounded-lg transition-all opacity-0 hover:opacity-100 group-hover:opacity-100"
    onClick={onClick}
    title={label}
  >
    <Plus className="w-3.5 h-3.5" /> {label}
  </button>
);

export default function TemplateIvana() {
  const { resumeData, updatePersonal, updateSectionData, updateSectionTitle } = useResume();
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

  const renderSectionContent = (section, isLeftColumn) => {
    switch (section.type) {
      case 'summary':
        return (
          <InlineFormBlock
            renderPreview={() => (
              <div className="text-[13px] font-medium leading-relaxed text-gray-800 text-justify whitespace-pre-wrap">
                {section.data?.text || "Astute and exceptionally dedicated professional with 6+ years of experience..."}
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
        return (
          <div className="flex flex-wrap gap-2 mt-2 group">
            {section.data.map((item, i) => (
              <InlineFormBlock
                key={item.id}
                onDelete={() => updateSectionData(section.id, section.data.filter((_, idx) => idx !== i))}
                onMoveUp={() => moveItem(section.id, section.data, i, -1)}
                onMoveDown={() => moveItem(section.id, section.data, i, 1)}
                renderPreview={() => (
                  <div className={`${section.type === 'skills' ? 'bg-[#7ba9c2] text-white px-3 py-1 rounded text-[12px] font-medium' : 'text-[12px] text-gray-700 w-[45%]'}`}>
                    <Show when={item.category || item.name || item.title}>
                      <span className={section.type === 'languages' ? 'font-bold block text-gray-900' : ''}>{item.category || item.name || item.title}</span>
                    </Show>
                    <Show when={item.items || item.issuer || item.description}>
                      <span className={section.type === 'languages' ? 'italic text-gray-500' : ''}>{(section.type === 'languages') ? item.items || item.issuer || item.description : ((item.category || item.name || item.title) ? ': ' + (item.items || item.issuer || item.description) : item.items || item.issuer || item.description)}</span>
                    </Show>
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
            <div className="w-full">
              <AddItemButton label="Add Item" onClick={() => updateSectionData(section.id, [...section.data, { id: `itm-${Date.now()}`, name: 'New Item', description: '' }])} />
            </div>
          </div>
        );
      case 'certifications':
      case 'education':
        return (
          <div className="flex flex-col gap-4 mt-2 group relative">
            {section.data.map((item, i) => {
              const isEdu = section.type === 'education';
              const title = isEdu ? item.degree : (item.role || item.name || item.title);
              const subtitle = isEdu ? item.institution : (item.company || item.technologies || item.issuer);
              const duration = isEdu ? item.year : (item.duration || item.date);
              
              return (
                <InlineFormBlock
                  key={item.id}
                  onDelete={() => updateSectionData(section.id, section.data.filter((_, idx) => idx !== i))}
                  onMoveUp={() => moveItem(section.id, section.data, i, -1)}
                  onMoveDown={() => moveItem(section.id, section.data, i, 1)}
                  renderPreview={() => (
                    <div className="flex flex-col relative group/item">
                      <h3 className="font-bold text-[14px] text-gray-900">{isEdu ? subtitle : title}</h3>
                      <div className="text-[13px] text-gray-800 font-medium">{isEdu ? title : subtitle}</div>
                      <div className="text-[12px] text-[#7ba9c2] italic">{duration}</div>
                    </div>
                  )}
                  renderForm={() => (
                    <>
                      <FormInput label="Title" value={title} onChange={v => handleArrayChange(section.id, section.data, i, isEdu ? 'degree' : (item.role !== undefined ? 'role' : (item.title !== undefined ? 'title' : 'name')), v)} />
                      <FormInput label="Subtitle" value={subtitle} onChange={v => handleArrayChange(section.id, section.data, i, isEdu ? 'institution' : (item.company !== undefined ? 'company' : (item.issuer !== undefined ? 'issuer' : 'technologies')), v)} />
                      <FormInput label="Duration/Year" value={duration} onChange={v => handleArrayChange(section.id, section.data, i, isEdu ? 'year' : (item.duration !== undefined ? 'duration' : 'date'), v)} />
                    </>
                  )}
                />
              )
            })}
            <AddItemButton label="Add Item" onClick={() => updateSectionData(section.id, [...section.data, { id: `itm-${Date.now()}`, role: 'New Item', company: '', duration: '', description: '' }])} />
          </div>
        );
      case 'experience':
      case 'projects':
      case 'achievements':
        return (
          <div className="flex flex-col gap-6 mt-3 group relative">
            {section.data.map((item, i) => {
              const title = item.role || item.name || item.title;
              const subtitle = item.company || item.technologies || item.issuer;
              const duration = item.duration || item.date;
              
              return (
                <InlineFormBlock
                  key={item.id}
                  onDelete={() => updateSectionData(section.id, section.data.filter((_, idx) => idx !== i))}
                  onMoveUp={() => moveItem(section.id, section.data, i, -1)}
                  onMoveDown={() => moveItem(section.id, section.data, i, 1)}
                  renderPreview={() => (
                    <div className="flex flex-col relative group/item">
                      <h3 className="font-bold text-[16px] text-gray-900">{title || "Role Title"}</h3>
                      <Show when={subtitle}>
                        <div className="text-[14px] text-[#56b196] font-bold">{subtitle}</div>
                      </Show>
                      <div className="flex justify-between items-center text-[12px] text-[#7ba9c2] italic mb-2 mt-1">
                        <span>{duration || "06/2016 - Present"}</span>
                        <span>{item.location || ""}</span>
                      </div>
                      <Show when={item.description}>
                        <div className="text-[12.5px] leading-relaxed text-gray-700">
                          {item.description?.split('\n').map((line, idx) => line.trim() && (
                            <div key={idx} className="relative pl-4 mb-1 before:content-[''] before:absolute before:left-0 before:top-1.5 before:w-1.5 before:h-1.5 before:bg-[#56b196] before:rounded-full">
                              {line}
                            </div>
                          ))}
                        </div>
                      </Show>
                      <Show when={item.githubUrl || item.liveUrl || item.link}>
                        <div className="flex gap-4 mt-2 text-[12px] font-medium">
                          <Show when={item.githubUrl || item.link}>
                            <a onClick={(e) => e.stopPropagation()} href={(item.githubUrl || item.link)?.startsWith('http') ? (item.githubUrl || item.link) : `https://${item.githubUrl || item.link}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                              GitHub
                            </a>
                          </Show>
                          <Show when={item.liveUrl}>
                            <a onClick={(e) => e.stopPropagation()} href={item.liveUrl?.startsWith('http') ? item.liveUrl : `https://${item.liveUrl}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                              Live Demo
                            </a>
                          </Show>
                        </div>
                      </Show>
                    </div>
                  )}
                  renderForm={() => (
                    <>
                      <FormInput label="Title" value={title} onChange={v => handleArrayChange(section.id, section.data, i, item.role !== undefined ? 'role' : (item.title !== undefined ? 'title' : 'name'), v)} />
                      <FormInput label="Subtitle" value={subtitle} onChange={v => handleArrayChange(section.id, section.data, i, item.company !== undefined ? 'company' : (item.issuer !== undefined ? 'issuer' : 'technologies'), v)} />
                      <div className="grid grid-cols-2 gap-2">
                        <FormInput label="Duration/Year" value={duration} onChange={v => handleArrayChange(section.id, section.data, i, item.duration !== undefined ? 'duration' : 'date', v)} />
                        <FormInput label="Location" value={item.location} onChange={v => handleArrayChange(section.id, section.data, i, 'location', v)} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <FormInput label="GitHub URL" value={item.githubUrl || item.link} onChange={v => handleArrayChange(section.id, section.data, i, 'githubUrl', v)} />
                        <FormInput label="Live Demo URL" value={item.liveUrl} onChange={v => handleArrayChange(section.id, section.data, i, 'liveUrl', v)} />
                      </div>
                      <FormTextarea label="Description (one point per line)" value={item.description} onChange={v => handleArrayChange(section.id, section.data, i, 'description', v)} />
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

  const getSection = (type) => sections.find(s => s.type === type && s.visible);
  
  const summarySection = getSection('summary');
  
  const leftColumnTypes = ['experience', 'projects', 'achievements'];
  const rightColumnTypes = ['skills', 'languages', 'certifications', 'education'];
  
  const leftSections = sections.filter(s => leftColumnTypes.includes(s.type) && s.visible);
  const rightSections = sections.filter(s => rightColumnTypes.includes(s.type) && s.visible);

  return (
    <div className="bg-[#ffffff] grow w-full box-border break-words font-sans text-gray-900 py-10 px-10" style={{ fontFamily: '"Arial", "Helvetica", sans-serif' }}>
      
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1 pr-4">
          <InlineFormBlock
            renderPreview={() => <h1 className="text-[38px] font-bold text-[#2a7b9b] leading-tight">{personal.name || 'Ivana Johnson'}</h1>}
            renderForm={() => <FormInput label="Full Name" value={personal.name} onChange={v => updatePersonal('name', v)} />}
            isDraggable={false}
          />
          <div className="mt-1">
            <InlineFormBlock
              renderPreview={() => <p className="text-[16px] text-gray-500 font-medium">{personal.designation || 'HR Professional'}</p>}
              renderForm={() => <FormInput label="Professional Title" value={personal.designation} onChange={v => updatePersonal('designation', v)} />}
              isDraggable={false}
            />
          </div>
        </div>
        
        <div className="flex flex-col gap-1.5 text-[12px] text-gray-700 font-medium pt-2">
           <InlineFormBlock
            renderPreview={() => (
              <div className="flex items-center justify-end gap-2">
                <span>{personal.email || 'ivana@novoresume.com'}</span>
                <Mail className="w-3.5 h-3.5 text-[#2a7b9b]" />
              </div>
            )}
            renderForm={() => <FormInput label="Email" value={personal.email} onChange={v => updatePersonal('email', v)} />}
            isDraggable={false}
          />
          <InlineFormBlock
            renderPreview={() => (
              <div className="flex items-center justify-end gap-2">
                <span>{personal.phone || '(123) 5343 444'}</span>
                <Phone className="w-3.5 h-3.5 text-[#2a7b9b]" />
              </div>
            )}
            renderForm={() => <FormInput label="Phone" value={personal.phone} onChange={v => updatePersonal('phone', v)} />}
            isDraggable={false}
          />
          <InlineFormBlock
            renderPreview={() => (
              <div className="flex items-center justify-end gap-2">
                <span>{personal.city || 'Bloomington, IN'}</span>
                <MapPin className="w-3.5 h-3.5 text-[#2a7b9b]" />
              </div>
            )}
            renderForm={() => <FormInput label="Location" value={personal.city} onChange={v => updatePersonal('city', v)} />}
            isDraggable={false}
          />
          {personal.links?.map((link, i) => (
            <Show when={link.url} key={i}>
                <div className="flex items-center justify-end gap-2">
                  <span>{link.url}</span>
                  <Globe className="w-3.5 h-3.5 text-[#2a7b9b]" />
                </div>
            </Show>
          ))}
          <InlineFormBlock
              renderPreview={() => (
                <div className="opacity-40 hover:opacity-100 text-blue-500 text-right text-[12px] mt-1 cursor-pointer font-semibold">
                  + Add Custom Links (LinkedIn, etc)
                </div>
              )}
              renderForm={() => (
                <div className="flex flex-col gap-2 min-w-[300px]">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Custom Links</label>
                  {(personal.links || []).map((link, i) => (
                    <div key={i} className="flex gap-2 mb-2 items-start font-sans">
                      <input value={link.platform} onChange={(e) => { const nl = [...(personal.links||[])]; nl[i].platform = e.target.value; updatePersonal('links', nl); }} placeholder="Platform" className="w-1/3 px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
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

      {summarySection && (
        <div className="mb-4">
           {renderSectionContent(summarySection, false)}
        </div>
      )}

      <div className="w-full h-0.5 bg-[#2a7b9b] mb-6"></div>

      <div className="flex flex-row gap-10">
         {/* Left Column */}
         <div className="w-[55%] flex flex-col gap-6">
            {leftSections.map(section => (
               <div key={section.id} className="flex flex-col">
                  <InlineFormBlock
                    renderPreview={() => <h2 className="text-[16px] font-bold uppercase text-gray-900 border-b border-gray-300 pb-1 mb-2">{section.title}</h2>}
                    renderForm={() => <FormInput label="Section Title" value={section.title} onChange={v => updateSectionTitle(section.id, v)} />}
                    isDraggable={false}
                  />
                  {renderSectionContent(section, true)}
               </div>
            ))}
         </div>

         {/* Right Column */}
         <div className="w-[45%] flex flex-col gap-6">
            {rightSections.map(section => (
               <div key={section.id} className="flex flex-col">
                  <InlineFormBlock
                    renderPreview={() => <h2 className="text-[16px] font-bold uppercase text-gray-900 border-b border-gray-300 pb-1 mb-2">{section.title}</h2>}
                    renderForm={() => <FormInput label="Section Title" value={section.title} onChange={v => updateSectionTitle(section.id, v)} />}
                    isDraggable={false}
                  />
                  {renderSectionContent(section, false)}
               </div>
            ))}
         </div>
      </div>
    </div>
  );
}
