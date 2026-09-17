import React from 'react';
import { Plus, Phone, Mail, Globe, MapPin } from 'lucide-react';
import { useResume } from '../ResumeContext';
import InlineFormBlock, { FormInput, FormTextarea } from '../InlineFormBlock';

const Show = ({ when, children }) => (when ? children : null);

const AddItemButton = ({ onClick, label }) => (
  <button 
    type="button"
    className="mt-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 border-2 border-dashed border-gray-200 hover:border-gray-400 bg-gray-50/50 hover:bg-gray-50 p-2 w-full rounded-lg transition-all opacity-0 hover:opacity-100 group-hover:opacity-100"
    onClick={onClick}
    title={label}
  >
    <Plus className="w-3.5 h-3.5" /> {label}
  </button>
);

export default function TemplateDavid() {
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

  const renderSectionContent = (section, isCompact = false) => {
    switch (section.type) {
      case 'summary':
        return (
          <InlineFormBlock
            renderPreview={() => (
              <div className="text-[12px] leading-relaxed text-gray-700 text-justify whitespace-pre-wrap">
                {section.data?.text || "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat..."}
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
        return (
          <div className="flex flex-col gap-1.5 group">
            {section.data.map((item, i) => (
              <InlineFormBlock
                key={item.id}
                onDelete={() => updateSectionData(section.id, section.data.filter((_, idx) => idx !== i))}
                onMoveUp={() => moveItem(section.id, section.data, i, -1)}
                onMoveDown={() => moveItem(section.id, section.data, i, 1)}
                renderPreview={() => (
                  <div className="flex gap-2 text-[12px] text-gray-700 items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 shrink-0"></span>
                    <span className="flex-1">
                      <Show when={item.category || item.name || item.title}>
                        <span className="font-semibold text-gray-900">{item.category || item.name || item.title}</span>
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
      case 'experience':
      case 'projects':
      case 'education':
      case 'achievements':
        return (
          <div className="flex flex-col gap-4 group relative">
            {section.data.map((item, i) => {
              const isEdu = item.degree !== undefined;
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
                    <div className="flex pb-2 relative group/item items-start">
                      <div className={`${isCompact ? 'w-20' : 'w-28'} shrink-0 text-left font-bold text-[12px] text-gray-800 pt-0.5 pr-2`}>
                        {duration || "20XX - Present"}
                      </div>
                      <div className="flex-1 flex flex-col gap-0.5">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-bold text-[13px] tracking-wider uppercase text-gray-900">{title || "Title"}</h3>
                        </div>
                        <div className="text-[12px] text-gray-700">{subtitle}</div>
                        <Show when={isEdu ? (item.grade || item.coursework) : item.description}>
                          <div className="text-[11.5px] leading-relaxed text-gray-500 mt-1 text-justify">
                            {isEdu ? (
                              <>
                                <Show when={item.coursework}><div>{item.coursework}</div></Show>
                                <Show when={item.grade}><div className="font-semibold mt-0.5 text-gray-700">GPA: {item.grade}</div></Show>
                              </>
                            ) : (
                              <div className="whitespace-pre-wrap">{item.description}</div>
                            )}
                          </div>
                        </Show>
                        <Show when={!isEdu && (item.githubUrl || item.liveUrl || item.link)}>
                          <div className="flex gap-3 mt-1.5 text-[11px] font-medium">
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
                    </div>
                  )}
                  renderForm={() => (
                    <>
                      <FormInput label="Title" value={title} onChange={v => handleArrayChange(section.id, section.data, i, isEdu ? 'degree' : (item.role !== undefined ? 'role' : (item.title !== undefined ? 'title' : 'name')), v)} />
                      <FormInput label="Subtitle" value={subtitle} onChange={v => handleArrayChange(section.id, section.data, i, isEdu ? 'institution' : (item.company !== undefined ? 'company' : (item.issuer !== undefined ? 'issuer' : 'technologies')), v)} />
                      <FormInput label="Duration/Year" value={duration} onChange={v => handleArrayChange(section.id, section.data, i, isEdu ? 'year' : (item.duration !== undefined ? 'duration' : 'date'), v)} />
                      {!isEdu && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
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

  const getSection = (type) => sections.find(s => s.type === type && s.visible);
  
  const summarySection = getSection('summary');
  const experienceSection = getSection('experience');
  
  const leftBottomTypes = ['education', 'achievements', 'projects'];
  const rightBottomTypes = ['skills', 'languages', 'certifications'];
  
  const leftBottomSections = sections.filter(s => leftBottomTypes.includes(s.type) && s.visible);
  const rightBottomSections = sections.filter(s => rightBottomTypes.includes(s.type) && s.visible);

  return (
    <div className="bg-[#fcfcfc] grow w-full box-border break-words font-sans text-gray-900 px-12 py-12" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex-1">
          <InlineFormBlock
            renderPreview={() => <h1 className="text-4xl font-black uppercase tracking-widest text-gray-900 leading-none">{personal.name || 'DAVID ANDERSON'}</h1>}
            renderForm={() => <FormInput label="Full Name" value={personal.name} onChange={v => updatePersonal('name', v)} />}
            isDraggable={false}
          />
          <div className="mt-2">
            <InlineFormBlock
              renderPreview={() => <p className="text-[13px] text-gray-700 tracking-[0.2em] uppercase font-semibold">{personal.designation || 'WEB & GRAPHIC DESIGNER'}</p>}
              renderForm={() => <FormInput label="Professional Title" value={personal.designation} onChange={v => updatePersonal('designation', v)} />}
              isDraggable={false}
            />
          </div>
        </div>
        
        <div className="flex flex-col gap-1.5 text-[11px] text-gray-700 pr-4">
          <InlineFormBlock
            renderPreview={() => (
              <div className="flex items-center gap-3 justify-end">
                <span>{personal.phone || '+00 1234 567 889'}</span>
                <div className="w-5 flex justify-center"><Phone className="w-3.5 h-3.5 text-gray-800" /></div>
              </div>
            )}
            renderForm={() => <FormInput label="Phone" value={personal.phone} onChange={v => updatePersonal('phone', v)} />}
            isDraggable={false}
          />
          <InlineFormBlock
            renderPreview={() => (
              <div className="flex items-center gap-3 justify-end">
                <span>{personal.email || 'yourname55@gmail.com'}</span>
                <div className="w-5 flex justify-center"><Mail className="w-3.5 h-3.5 text-gray-800" /></div>
              </div>
            )}
            renderForm={() => <FormInput label="Email" value={personal.email} onChange={v => updatePersonal('email', v)} />}
            isDraggable={false}
          />
          <InlineFormBlock
            renderPreview={() => (
              <div className="flex items-center gap-3 justify-end">
                <span>{personal.city || 'Country, City, MO 65347'}</span>
                <div className="w-5 flex justify-center"><MapPin className="w-3.5 h-3.5 text-gray-800" /></div>
              </div>
            )}
            renderForm={() => <FormInput label="Location" value={personal.city} onChange={v => updatePersonal('city', v)} />}
            isDraggable={false}
          />
          {personal.links?.map((link, i) => (
             <Show when={link.url} key={i}>
                <div className="flex items-center gap-3 justify-end">
                  <span>{link.url}</span>
                  <div className="w-5 flex justify-center"><Globe className="w-3.5 h-3.5 text-gray-800" /></div>
                </div>
             </Show>
          ))}
          <InlineFormBlock
              renderPreview={() => (
                <div className="opacity-40 hover:opacity-100 text-blue-500 text-right text-xs mt-1 cursor-pointer font-semibold">
                  + Add Custom Links (LinkedIn, etc)
                </div>
              )}
              renderForm={() => (
                <div className="flex flex-col gap-2 min-w-[300px]">
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

      <div className="w-full h-px bg-gray-300 mb-6"></div>

      <div className="flex flex-col gap-6">
        {summarySection && (
          <div className="flex flex-col gap-3">
             <InlineFormBlock
                renderPreview={() => <h2 className="text-[14px] font-bold tracking-[0.15em] uppercase text-gray-900">{summarySection.title}</h2>}
                renderForm={() => <FormInput label="Section Title" value={summarySection.title} onChange={v => updateSectionTitle(summarySection.id, v)} />}
                isDraggable={false}
              />
              {renderSectionContent(summarySection)}
              <div className="w-full h-px bg-gray-300 mt-4"></div>
          </div>
        )}

        {experienceSection && (
          <div className="flex flex-col gap-4">
             <InlineFormBlock
                renderPreview={() => <h2 className="text-[14px] font-bold tracking-[0.15em] uppercase text-gray-900">{experienceSection.title}</h2>}
                renderForm={() => <FormInput label="Section Title" value={experienceSection.title} onChange={v => updateSectionTitle(experienceSection.id, v)} />}
                isDraggable={false}
              />
              <div className="mt-1">
                {renderSectionContent(experienceSection)}
              </div>
              <div className="w-full h-px bg-gray-300 mt-2"></div>
          </div>
        )}

        {/* 2 Column Section */}
        <div className="flex flex-row gap-12 mt-2">
          {/* Left bottom column */}
          <div className="flex-1 flex flex-col gap-6">
             {leftBottomSections.map(section => (
                <div key={section.id} className="flex flex-col gap-4">
                  <InlineFormBlock
                    renderPreview={() => <h2 className="text-[14px] font-bold tracking-[0.15em] uppercase text-gray-900">{section.title}</h2>}
                    renderForm={() => <FormInput label="Section Title" value={section.title} onChange={v => updateSectionTitle(section.id, v)} />}
                    isDraggable={false}
                  />
                  {renderSectionContent(section, true)}
                </div>
             ))}
          </div>

          {/* Right bottom column */}
          <div className="flex-1 flex flex-col gap-6">
             {rightBottomSections.map(section => (
                <div key={section.id} className="flex flex-col gap-4">
                  <InlineFormBlock
                    renderPreview={() => <h2 className="text-[14px] font-bold tracking-[0.15em] uppercase text-gray-900">{section.title}</h2>}
                    renderForm={() => <FormInput label="Section Title" value={section.title} onChange={v => updateSectionTitle(section.id, v)} />}
                    isDraggable={false}
                  />
                  {renderSectionContent(section, true)}
                </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
