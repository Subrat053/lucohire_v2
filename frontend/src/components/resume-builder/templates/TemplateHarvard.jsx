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

export default function TemplateHarvard() {
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
              <div className="text-[13px] leading-relaxed text-black text-justify whitespace-pre-wrap">
                {section.data?.text || "Add Professional Summary..."}
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
          <div className="flex flex-col gap-3 group">
            {section.data.map((exp, i) => (
              <InlineFormBlock
                key={exp.id}
                onDelete={() => updateSectionData(section.id, section.data.filter((_, idx) => idx !== i))}
                onMoveUp={() => moveItem(section.id, section.data, i, -1)}
                onMoveDown={() => moveItem(section.id, section.data, i, 1)}
                renderPreview={() => (
                  <div className="flex flex-col mb-2">
                    <div className="flex justify-between items-baseline flex-wrap gap-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-bold text-[14px] text-black">
                          {exp.company || exp.technologies || "Company"} – <span className="font-normal italic">{exp.role || exp.name || "Title"}</span>
                        </h3>
                        <Show when={exp.githubUrl || exp.liveUrl || exp.link}>
                          <div className="flex items-center gap-2 text-[12px] font-sans">
                            <Show when={exp.liveUrl}>
                              <a onClick={(e) => e.stopPropagation()} href={exp.liveUrl?.startsWith('http') ? exp.liveUrl : `https://${exp.liveUrl}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                Live Demo
                              </a>
                            </Show>
                            <Show when={exp.githubUrl || exp.link}>
                              <a onClick={(e) => e.stopPropagation()} href={(exp.githubUrl || exp.link)?.startsWith('http') ? (exp.githubUrl || exp.link) : `https://${exp.githubUrl || exp.link}`} target="_blank" rel="noreferrer" className="text-gray-700 hover:underline">
                                GitHub
                              </a>
                            </Show>
                          </div>
                        </Show>
                      </div>
                      <Show when={exp.duration}>
                        <div className="text-[13.5px] font-bold text-black">{exp.duration}</div>
                      </Show>
                    </div>
                    <Show when={exp.description}>
                      <div className="text-[13px] leading-relaxed text-black whitespace-pre-wrap pl-4 relative before:content-['•'] before:absolute before:left-0 before:top-0 mt-1">
                        {exp.description}
                      </div>
                    </Show>
                  </div>
                )}
                renderForm={() => (
                  <>
                    <FormInput label="Title" value={exp.role || exp.name} onChange={v => handleArrayChange(section.id, section.data, i, exp.role !== undefined ? 'role' : 'name', v)} />
                    <FormInput label="Subtitle" value={exp.company || exp.technologies} onChange={v => handleArrayChange(section.id, section.data, i, exp.company !== undefined ? 'company' : 'technologies', v)} />
                    <FormInput label="Duration" value={exp.duration} onChange={v => handleArrayChange(section.id, section.data, i, 'duration', v)} />
                    <div className="grid grid-cols-2 gap-2">
                      <FormInput label="GitHub URL" value={exp.githubUrl || exp.link} onChange={v => handleArrayChange(section.id, section.data, i, 'githubUrl', v)} />
                      <FormInput label="Live Demo URL" value={exp.liveUrl} onChange={v => handleArrayChange(section.id, section.data, i, 'liveUrl', v)} />
                    </div>
                    <FormTextarea label="Description" value={exp.description} onChange={v => handleArrayChange(section.id, section.data, i, 'description', v)} />
                  </>
                )}
              />
            ))}
            <AddItemButton label="Add Item" onClick={() => updateSectionData(section.id, [...section.data, { id: `itm-${Date.now()}`, role: 'New Role', company: '', duration: '', description: '' }])} />
          </div>
        );

      case 'education':
        return (
          <div className="flex flex-col gap-3 group">
            {section.data.map((edu, i) => (
              <InlineFormBlock
                key={edu.id}
                onDelete={() => updateSectionData(section.id, section.data.filter((_, idx) => idx !== i))}
                onMoveUp={() => moveItem(section.id, section.data, i, -1)}
                onMoveDown={() => moveItem(section.id, section.data, i, 1)}
                renderPreview={() => (
                  <div className="flex flex-col mb-1">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-bold text-[14px] text-black">
                        {edu.degree || "Degree Name"}
                      </h3>
                      <Show when={edu.year}>
                        <div className="text-[13.5px] font-bold text-black">{edu.year}</div>
                      </Show>
                    </div>
                    <div className="text-[13px] text-black">
                      {edu.institution}
                    </div>
                    <Show when={edu.coursework || edu.grade}>
                      <div className="text-[13px] leading-relaxed text-black whitespace-pre-wrap pl-4 relative before:content-['•'] before:absolute before:left-0 before:top-0 mt-1">
                        <Show when={edu.grade}>
                          <span className="font-semibold">GPA/Honors:</span> {edu.grade} <br/>
                        </Show>
                        <Show when={edu.coursework}>
                          <span className="font-semibold">Relevant Coursework:</span> {edu.coursework}
                        </Show>
                      </div>
                    </Show>
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
      case 'languages':
        return (
          <div className="flex flex-col gap-1.5 group">
            <div className="text-[13px] leading-relaxed text-black whitespace-pre-wrap pl-4 relative before:content-['•'] before:absolute before:left-0 before:top-0">
              {section.data.map((item, i) => (
                <InlineFormBlock
                  key={item.id}
                  onDelete={() => updateSectionData(section.id, section.data.filter((_, idx) => idx !== i))}
                  onMoveUp={() => moveItem(section.id, section.data, i, -1)}
                  onMoveDown={() => moveItem(section.id, section.data, i, 1)}
                  renderPreview={() => (
                    <span className="mr-2">
                      <Show when={item.category || item.name || item.title}>
                        <span className="font-bold">{item.category || item.name || item.title}: </span>
                      </Show>
                      <span>{item.items || item.issuer || item.description}</span>
                      {i < section.data.length - 1 ? <br/> : ''}
                    </span>
                  )}
                  renderForm={() => (
                    <>
                      <FormInput label="Name/Category" value={item.category || item.name || item.title} onChange={v => handleArrayChange(section.id, section.data, i, item.category !== undefined ? 'category' : (item.name !== undefined ? 'name' : 'title'), v)} />
                      <FormTextarea label="Details/Items" value={item.items || item.issuer || item.description} onChange={v => handleArrayChange(section.id, section.data, i, item.items !== undefined ? 'items' : (item.issuer !== undefined ? 'issuer' : 'description'), v)} />
                    </>
                  )}
                />
              ))}
            </div>
            <AddItemButton label="Add Item" onClick={() => updateSectionData(section.id, [...section.data, { id: `itm-${Date.now()}`, name: 'New Item', description: '' }])} />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-[#ffffff] px-12 py-12 grow w-full box-border break-words font-serif text-black" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
      
      {/* Header */}
      <div className="flex flex-col items-center justify-center mb-6">
        <InlineFormBlock
          renderPreview={() => <h1 className="text-4xl text-black font-bold uppercase tracking-wide text-center">{personal.name || 'HARVARD RESUME TEMPLATE'}</h1>}
          renderForm={() => <FormInput label="Full Name" value={personal.name} onChange={v => updatePersonal('name', v)} />}
          isDraggable={false}
        />
        
        <div className="flex items-center justify-center gap-3 text-[13px] text-black mt-2 font-sans">
          <InlineFormBlock
            renderPreview={() => <span>{personal.city || 'Manila, Philippines'}</span>}
            renderForm={() => <FormInput label="Location" value={personal.city} onChange={v => updatePersonal('city', v)} />}
            isDraggable={false}
          />
          <span className="font-bold">•</span>
          <InlineFormBlock
            renderPreview={() => <span>{personal.phone || '(+63) 912-345-6789'}</span>}
            renderForm={() => <FormInput label="Phone" value={personal.phone} onChange={v => updatePersonal('phone', v)} />}
            isDraggable={false}
          />
          <span className="font-bold">•</span>
          <InlineFormBlock
            renderPreview={() => <span>{personal.email || 'alexramirez@email.com'}</span>}
            renderForm={() => <FormInput label="Email" value={personal.email} onChange={v => updatePersonal('email', v)} />}
            isDraggable={false}
          />
          
          <InlineFormBlock
            renderPreview={() => (
              <div className="flex items-center gap-3">
                {personal.links?.map((link, i) => (
                  <Show when={link.url} key={i}>
                    <span className="font-bold">•</span>
                    <a onClick={(e) => e.stopPropagation()} href={link.url?.startsWith('http') ? link.url : `https://${link.url}`} target="_blank" rel="noreferrer" className="text-black hover:underline">
                      {link.platform || 'Link'}
                    </a>
                  </Show>
                ))}
                {(!personal.links || personal.links.length === 0) && (
                  <>
                    <span className="font-bold">•</span>
                    <span className="text-gray-400 italic">Add Links...</span>
                  </>
                )}
              </div>
            )}
            renderForm={() => (
              <div className="flex flex-col gap-2 min-w-[300px] mt-2 text-left">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Custom Links</label>
                {(personal.links || []).map((link, i) => (
                  <div key={i} className="flex gap-2 mb-2 items-start font-sans">
                    <input value={link.platform} onChange={(e) => { const nl = [...(personal.links||[])]; nl[i].platform = e.target.value; updatePersonal('links', nl); }} placeholder="Platform (e.g. LinkedIn)" className="w-1/3 px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-800 bg-white" />
                    <input value={link.url} onChange={(e) => { const nl = [...(personal.links||[])]; nl[i].url = e.target.value; updatePersonal('links', nl); }} placeholder="URL" className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-800 bg-white" />
                    <button type="button" onClick={() => updatePersonal('links', personal.links.filter((_, idx) => idx !== i))} className="p-1.5 text-red-700 hover:bg-red-50 rounded bg-[#ffffff] border border-gray-200">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => updatePersonal('links', [...(personal.links || []), { platform: '', url: '' }])} className="text-gray-800 text-sm font-bold flex items-center gap-1 hover:text-black">
                  <Plus className="w-4 h-4" /> Add Link
                </button>
              </div>
            )}
            isDraggable={false}
          />
        </div>
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-5">
        {sections.map(section => (
          <Show when={section.visible} key={section.id}>
            <div className="flex flex-col">
              <div className="border-b-[1.5px] border-black pb-1 mb-2">
                <InlineFormBlock
                  renderPreview={() => <h2 className="text-[14px] text-black font-bold uppercase">{section.title}</h2>}
                  renderForm={() => <FormInput label="Section Title" value={section.title} onChange={v => updateSectionTitle(section.id, v)} />}
                  isDraggable={false}
                />
              </div>
              {renderSectionContent(section)}
            </div>
          </Show>
        ))}
      </div>

    </div>
  );
}
