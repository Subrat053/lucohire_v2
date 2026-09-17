import React from 'react';
import { Plus } from 'lucide-react';
import { useResume } from '../ResumeContext';
import InlineFormBlock, { FormInput, FormTextarea } from '../InlineFormBlock';

const Show = ({ when, children }) => (when ? children : null);

const AddItemButton = ({ onClick, label }) => (
  <button 
    type="button"
    className="mt-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-gray-900 border-2 border-dashed border-gray-200 hover:border-gray-400 bg-gray-50/50 hover:bg-gray-50 p-2 w-full rounded-lg transition-all opacity-0 hover:opacity-100 group-hover:opacity-100"
    onClick={onClick}
    title={label}
  >
    <Plus className="w-3.5 h-3.5" /> {label}
  </button>
);

export default function TemplateJane() {
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

  const renderSectionContent = (section) => {
    switch (section.type) {
      case 'summary':
        return (
          <InlineFormBlock
            renderPreview={() => (
              <div className="text-[13.5px] leading-relaxed text-gray-700 whitespace-pre-wrap flex">
                <span className="mr-3 mt-2 w-3 h-[1px] bg-gray-800 shrink-0"></span>
                <span>{section.data?.text || "Add Professional Summary..."}</span>
              </div>
            )}
            renderForm={() => (
              <FormTextarea label="Professional Summary" value={section.data?.text} onChange={(v) => updateSectionData(section.id, { text: v })} />
            )}
            isDraggable={false}
          />
        );
      case 'experience':
      case 'projects':
        return (
          <div className="flex flex-col gap-4 group">
            {section.data.map((item, i) => (
              <InlineFormBlock
                key={item.id}
                onDelete={() => updateSectionData(section.id, section.data.filter((_, idx) => idx !== i))}
                onMoveUp={() => moveItem(section.id, section.data, i, -1)}
                onMoveDown={() => moveItem(section.id, section.data, i, 1)}
                renderPreview={() => (
                  <div className="flex gap-3">
                    <span className="mt-2 w-3 h-[1px] bg-gray-800 shrink-0"></span>
                    <div className="flex flex-col gap-1 w-full">
                      <div className="flex justify-between items-end gap-4 w-full flex-wrap">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-bold text-[14px] text-gray-900">{item.role || item.name || "Title"}</h3>
                          <Show when={item.githubUrl || item.liveUrl || item.link}>
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
                        <Show when={item.duration}>
                          <div className="text-[13px] text-gray-700">{item.duration}</div>
                        </Show>
                      </div>
                      <Show when={item.company || item.technologies}>
                        <div className="text-[13px] font-medium text-gray-800">{item.company || item.technologies}</div>
                      </Show>
                      <Show when={item.description}>
                        <div className="text-[13px] leading-relaxed text-gray-700 whitespace-pre-wrap">{item.description}</div>
                      </Show>
                    </div>
                  </div>
                )}
                renderForm={() => (
                  <>
                    <FormInput label="Title" value={item.role || item.name} onChange={v => handleArrayChange(section.id, section.data, i, item.role !== undefined ? 'role' : 'name', v)} />
                    <FormInput label="Subtitle" value={item.company || item.technologies} onChange={v => handleArrayChange(section.id, section.data, i, item.company !== undefined ? 'company' : 'technologies', v)} />
                    <FormInput label="Duration" value={item.duration} onChange={v => handleArrayChange(section.id, section.data, i, 'duration', v)} />
                    <div className="grid grid-cols-2 gap-2">
                      <FormInput label="GitHub URL" value={item.githubUrl || item.link} onChange={v => handleArrayChange(section.id, section.data, i, 'githubUrl', v)} />
                      <FormInput label="Live Demo URL" value={item.liveUrl} onChange={v => handleArrayChange(section.id, section.data, i, 'liveUrl', v)} />
                    </div>
                    <FormTextarea label="Description" value={item.description} onChange={v => handleArrayChange(section.id, section.data, i, 'description', v)} />
                  </>
                )}
              />
            ))}
            <AddItemButton label="Add Item" onClick={() => updateSectionData(section.id, [...section.data, { id: `itm-${Date.now()}`, role: 'New Item', company: '', duration: '', description: '' }])} />
          </div>
        );
      case 'education':
        return (
          <div className="flex flex-col gap-4 group">
            {section.data.map((edu, i) => (
              <InlineFormBlock
                key={edu.id}
                onDelete={() => updateSectionData(section.id, section.data.filter((_, idx) => idx !== i))}
                onMoveUp={() => moveItem(section.id, section.data, i, -1)}
                onMoveDown={() => moveItem(section.id, section.data, i, 1)}
                renderPreview={() => (
                  <div className="flex gap-3">
                    <span className="mt-2 w-3 h-[1px] bg-gray-800 shrink-0"></span>
                    <div className="flex flex-col gap-1 w-full">
                      <h3 className="font-bold text-[14px] text-gray-900">{edu.degree || "Degree Name"}</h3>
                      <div className="text-[13px] text-gray-700">
                        {edu.institution}{edu.institution && edu.year ? ' - ' : ''}{edu.year}
                      </div>
                      <Show when={edu.coursework}>
                        <div className="text-[13px] text-gray-700 mt-0.5">Relevant Coursework: {edu.coursework}</div>
                      </Show>
                      <Show when={edu.grade}>
                        <div className="text-[13px] text-gray-700">GPA: {edu.grade}</div>
                      </Show>
                    </div>
                  </div>
                )}
                renderForm={() => (
                  <>
                    <FormInput label="Degree / Program" value={edu.degree} onChange={v => handleArrayChange(section.id, section.data, i, 'degree', v)} />
                    <FormInput label="Institution & Location" value={edu.institution} onChange={v => handleArrayChange(section.id, section.data, i, 'institution', v)} />
                    <div className="grid grid-cols-2 gap-2">
                      <FormInput label="Graduation Year" value={edu.year} onChange={v => handleArrayChange(section.id, section.data, i, 'year', v)} />
                      <FormInput label="CGPA / Score" value={edu.grade} onChange={v => handleArrayChange(section.id, section.data, i, 'grade', v)} />
                    </div>
                    <FormInput label="Relevant Coursework" value={edu.coursework} onChange={v => handleArrayChange(section.id, section.data, i, 'coursework', v)} />
                  </>
                )}
              />
            ))}
            <AddItemButton label="Add Education" onClick={() => updateSectionData(section.id, [...section.data, { id: `edu-${Date.now()}`, degree: 'New Degree', institution: '', year: '', grade: '' }])} />
          </div>
        );
      case 'skills':
      case 'certifications':
      case 'achievements':
        return (
          <div className="flex flex-col gap-3 group">
            {section.data.map((item, i) => (
              <InlineFormBlock
                key={item.id}
                onDelete={() => updateSectionData(section.id, section.data.filter((_, idx) => idx !== i))}
                onMoveUp={() => moveItem(section.id, section.data, i, -1)}
                onMoveDown={() => moveItem(section.id, section.data, i, 1)}
                renderPreview={() => (
                  <div className="flex gap-3 text-[13px] leading-relaxed text-gray-700">
                    <span className="mt-2 w-3 h-[1px] bg-gray-800 shrink-0"></span>
                    <span className="flex-1">
                      <Show when={item.category || item.name || item.title}>
                        <span className="font-medium text-gray-900">{item.category || item.name || item.title}</span>
                      </Show>
                      <Show when={item.items || item.issuer || item.description}>
                        <span>{(item.category || item.name || item.title) ? ' - ' : ''}{item.items || item.issuer || item.description}</span>
                      </Show>
                      <Show when={item.date}>
                        <span> - {item.date}</span>
                      </Show>
                    </span>
                  </div>
                )}
                renderForm={() => (
                  <>
                    <FormInput label="Name/Category" value={item.category || item.name || item.title} onChange={v => handleArrayChange(section.id, section.data, i, item.category !== undefined ? 'category' : (item.name !== undefined ? 'name' : 'title'), v)} />
                    <FormTextarea label="Details/Items" value={item.items || item.issuer || item.description} onChange={v => handleArrayChange(section.id, section.data, i, item.items !== undefined ? 'items' : (item.issuer !== undefined ? 'issuer' : 'description'), v)} />
                    <Show when={item.date !== undefined}>
                      <FormInput label="Date" value={item.date} onChange={v => handleArrayChange(section.id, section.data, i, 'date', v)} />
                    </Show>
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

  const leftColumnTypes = ['skills', 'certifications', 'achievements', 'languages'];
  const rightColumnTypes = ['summary', 'experience', 'education', 'projects'];
  
  const leftSections = sections.filter(s => leftColumnTypes.includes(s.type) && s.visible);
  const rightSections = sections.filter(s => rightColumnTypes.includes(s.type) && s.visible);

  return (
    <div className="bg-white p-12 grow w-full box-border break-words font-sans text-gray-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1">
          <InlineFormBlock
            renderPreview={() => <h1 className="text-5xl text-gray-900 font-serif tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>{personal.name || 'Jane Smith'}</h1>}
            renderForm={() => <FormInput label="Full Name" value={personal.name} onChange={v => updatePersonal('name', v)} />}
            isDraggable={false}
          />
          <div className="mt-2">
            <InlineFormBlock
              renderPreview={() => <p className="text-xl text-gray-700 tracking-wide">{personal.designation || 'Student'}</p>}
              renderForm={() => <FormInput label="Professional Title" value={personal.designation} onChange={v => updatePersonal('designation', v)} />}
              isDraggable={false}
            />
          </div>
        </div>
        <Show when={personal.photo}>
          <div className="w-28 h-28 shrink-0 overflow-hidden rounded-full ml-4">
            <img src={personal.photo} alt="Profile" className="w-full h-full object-cover grayscale" />
          </div>
        </Show>
      </div>

      <hr className="border-t-[1.5px] border-gray-900 mb-8" />

      <div className="flex gap-10">
        {/* Left Column */}
        <div className="w-[35%] flex flex-col gap-8">
          {/* Contact Section */}
          <div className="flex flex-col gap-3">
            <h2 className="text-xl text-gray-800 font-normal">Contact:</h2>
            <div className="flex flex-col gap-5 text-[13px] text-gray-700">
              <InlineFormBlock
                renderPreview={() => (
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    <span>{personal.city || '8 College Street, Town, 543'}</span>
                  </div>
                )}
                renderForm={() => <FormInput label="Location" value={personal.city} onChange={v => updatePersonal('city', v)} />}
                isDraggable={false}
              />
              <InlineFormBlock
                renderPreview={() => (
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                    <span>{personal.email || 'janesmith@email.com'}</span>
                  </div>
                )}
                renderForm={() => <FormInput label="Email" value={personal.email} onChange={v => updatePersonal('email', v)} />}
                isDraggable={false}
              />
                <InlineFormBlock
                  renderPreview={() => (
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                      <span>{personal.phone || '(987) 654-3210'}</span>
                    </div>
                  )}
                  renderForm={() => <FormInput label="Phone" value={personal.phone} onChange={v => updatePersonal('phone', v)} />}
                  isDraggable={false}
                />
                
                <InlineFormBlock
                  renderPreview={() => (
                    <div className="flex flex-col gap-3">
                      {personal.links?.map((link, i) => (
                        <Show when={link.url} key={i}>
                          <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                            <a onClick={(e) => e.stopPropagation()} href={link.url?.startsWith('http') ? link.url : `https://${link.url}`} target="_blank" rel="noreferrer" className="text-gray-700 hover:underline break-all">
                              {link.platform || 'Link'}
                            </a>
                          </div>
                        </Show>
                      ))}
                      {(!personal.links || personal.links.length === 0) && (
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                          <span className="text-gray-400 italic">Add Links...</span>
                        </div>
                      )}
                    </div>
                  )}
                  renderForm={() => (
                    <div className="flex flex-col gap-2 min-w-[300px]">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Custom Links</label>
                      {(personal.links || []).map((link, i) => (
                        <div key={i} className="flex gap-2 mb-2 items-start font-sans">
                          <input value={link.platform} onChange={(e) => { const nl = [...(personal.links||[])]; nl[i].platform = e.target.value; updatePersonal('links', nl); }} placeholder="Platform (e.g. LinkedIn)" className="w-1/3 px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-500 bg-white" />
                          <input value={link.url} onChange={(e) => { const nl = [...(personal.links||[])]; nl[i].url = e.target.value; updatePersonal('links', nl); }} placeholder="URL" className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-500 bg-white" />
                          <button type="button" onClick={() => updatePersonal('links', personal.links.filter((_, idx) => idx !== i))} className="p-1.5 text-red-700 hover:bg-red-50 rounded bg-[#ffffff] border border-gray-200">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={() => updatePersonal('links', [...(personal.links || []), { platform: '', url: '' }])} className="text-gray-700 text-sm font-bold flex items-center gap-1 hover:text-gray-800">
                        <Plus className="w-4 h-4" /> Add Link
                      </button>
                    </div>
                  )}
                  isDraggable={false}
                />
              </div>
          </div>

          {leftSections.map(section => (
            <div key={section.id} className="flex flex-col gap-4">
              <InlineFormBlock
                renderPreview={() => <h2 className="text-xl text-gray-800 font-normal">{section.title}:</h2>}
                renderForm={() => <FormInput label="Section Title" value={section.title} onChange={v => updateSectionTitle(section.id, v)} />}
                isDraggable={false}
              />
              {renderSectionContent(section)}
            </div>
          ))}
        </div>

        {/* Right Column */}
        <div className="w-[65%] border-l-[1.5px] border-gray-400 pl-10 flex flex-col gap-10">
          {rightSections.map(section => (
            <div key={section.id} className="flex flex-col gap-4">
              <InlineFormBlock
                renderPreview={() => <h2 className="text-xl text-gray-800 font-normal">{section.title}:</h2>}
                renderForm={() => <FormInput label="Section Title" value={section.title} onChange={v => updateSectionTitle(section.id, v)} />}
                isDraggable={false}
              />
              {renderSectionContent(section)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
